import json
import sys
from pathlib import Path
from typing import List, Dict, Set
from sqlmodel import Session, SQLModel, delete, col, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

sys.path.append(str(Path(__file__).resolve().parent.parent))

from database import engine
from models import College, Department, Course, Section, ScrapeStatus
from schemas import SectionData


def _dedup_sections(sections: List[SectionData]):
    """Deduplicate colleges, departments, courses, and sections in memory."""
    unique_colleges = {}
    unique_departments = {}
    unique_courses = {}
    unique_sections = {}

    for item in sections:
        if item.college_id not in unique_colleges:
            unique_colleges[item.college_id] = College(
                id=item.college_id,
                name=item.college_name,
            )

        if item.dept_id not in unique_departments:
            unique_departments[item.dept_id] = Department(
                id=item.dept_id,
                name=item.dept_name,
                college_id=item.college_id,
            )

        if item.course_id not in unique_courses:
            unique_courses[item.course_id] = Course(
                id=item.course_id,
                title=item.course_title,
                hours=item.hours,
                department_id=item.dept_id,
            )

        key = (item.crn, item.section_number, item.course_id)
        if key not in unique_sections:
            unique_sections[key] = Section(
                crn=item.crn,
                section_number=item.section_number,
                course_id=item.course_id,
                section_type=item.section_type,
                section_status=item.section_status,
                teacher=item.teacher,
                gender=item.gender,
                time_slots=item.time_slots,
            )
        else:
            existing = unique_sections[key]
            existing_slots = json.loads(existing.time_slots)
            new_slots = json.loads(item.time_slots)
            combined = existing_slots + new_slots
            seen = set()
            unique = []
            for slot in combined:
                slot_key = (slot["day"], slot["start"], slot["end"])
                if slot_key not in seen:
                    seen.add(slot_key)
                    unique.append(slot)
            existing.time_slots = json.dumps(unique)

    return unique_colleges, unique_departments, unique_courses, unique_sections


def _is_postgresql(db_engine) -> bool:
    return db_engine.url.drivername.startswith("postgresql")


def _bulk_upsert(session, model, rows: list, index_elements: list, update_columns: set):
    """PostgreSQL bulk upsert via INSERT ... ON CONFLICT DO UPDATE."""
    if not rows:
        return
    values = [r.model_dump() if hasattr(r, "model_dump") else r.__dict__ for r in rows]
    for v in values:
        v.pop("_sa_instance_state", None)
    stmt = pg_insert(model).values(values)
    update_cols = {col: stmt.excluded[col] for col in update_columns}
    stmt = stmt.on_conflict_do_update(index_elements=index_elements, set_=update_cols)
    session.execute(stmt)


def sync_sections_to_db(sections: List[SectionData], source_used: str, db_engine=engine):
    """
    Atomically upsert colleges, departments, courses, and sections.
    Purges CRNs not present in the current run.
    """
    unique_colleges, unique_departments, unique_courses, unique_sections = _dedup_sections(sections)

    active_crns = {item.crn for item in sections}
    use_bulk = _is_postgresql(db_engine)

    with Session(db_engine) as session:
        with session.begin():
            if use_bulk:
                # Preserve existing dept names for empty entries before bulk upsert.
                dept_ids = [d.id for d in unique_departments.values() if not d.name]
                if dept_ids:
                    existing = session.exec(
                        select(Department).where(col(Department.id).in_(dept_ids))
                    ).all()
                    name_map = {row.id: row.name for row in existing}
                    for dept in unique_departments.values():
                        if not dept.name and dept.id in name_map:
                            dept.name = name_map[dept.id]

                _bulk_upsert(session, College, list(unique_colleges.values()),
                             ["id"], {"name"})
                _bulk_upsert(session, Department, list(unique_departments.values()),
                             ["id"], {"name", "college_id"})
                _bulk_upsert(session, Course, list(unique_courses.values()),
                             ["id"], {"title", "hours", "department_id"})
                _bulk_upsert(session, Section, list(unique_sections.values()),
                             ["crn", "section_number", "course_id"],
                             {"section_type", "section_status", "teacher", "gender", "time_slots"})
            else:
                for college in unique_colleges.values():
                    session.merge(college)

                for dept in unique_departments.values():
                    if not dept.name:
                        existing = session.get(Department, dept.id)
                        if existing:
                            dept.name = existing.name
                    session.merge(dept)

                for course in unique_courses.values():
                    session.merge(course)

                for section in unique_sections.values():
                    session.merge(section)

            session.exec(delete(Section).where(Section.crn.not_in(active_crns)))

            status = session.get(ScrapeStatus, 1)
            if not status:
                status = ScrapeStatus(id=1)
                session.add(status)
            status.status = "completed"
            status.source = source_used
            status.total_sections_scraped = len(sections)
            status.error_message = None


def load_data_to_db(json_file_path: str | Path):
    """Legacy entry point for the dynamic API JSON file."""
    path = Path(json_file_path)

    if not path.exists():
        print(f"Error: Could not find {path.name}")
        return

    print(f"Reading {path.name}...")
    with open(path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    sections = []
    for raw_item in raw_data:
        try:
            sections.append(SectionData(**raw_item))
        except Exception as e:
            print(f"Skipping invalid row: {e}")

    print(f"Parsed {len(sections)} sections, syncing to DB...")
    sync_sections_to_db(sections, source_used="dynamic_api")
    print("Database load complete!")


if __name__ == "__main__":
    data_file = Path(__file__).parent / "data" / "university_courses_data.json"
    load_data_to_db(data_file)