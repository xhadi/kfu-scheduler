"""
Database loader and synchronization module.
Deduplicates scraped section entities in memory, handles bulk upsert for PostgreSQL and session merging for SQLite,
and atomically purges stale section records not present in the current scrape run.
"""

import json
import sys
from pathlib import Path
from typing import List, NamedTuple
from sqlmodel import Session, delete, col, select, func
from sqlalchemy import tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert

sys.path.append(str(Path(__file__).resolve().parent.parent))

from database import engine
from models import College, Department, Course, Section
from schemas import SectionData
from scraper import config



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


class SyncResult(NamedTuple):
    purged: bool
    existing_sections: int
    new_sections: int


def sync_sections_to_db(sections: List[SectionData], source_used: str, db_engine=engine,
                        force_purge: bool = False,
                        min_ratio: float = config.PURGE_MIN_RATIO) -> SyncResult:
    """
    Atomically upsert colleges, departments, courses, and sections, then purge rows not in this run.
    The purge is skipped when the run is much smaller than the DB (likely a partial scrape),
    unless force_purge is set. Upserts always apply.
    """
    unique_colleges, unique_departments, unique_courses, unique_sections = _dedup_sections(sections)

    use_bulk = _is_postgresql(db_engine)

    with Session(db_engine) as session:
        with session.begin():
            existing_count = session.exec(select(func.count()).select_from(Section)).one()
            new_count = len(unique_sections)
            purge = force_purge or new_count >= existing_count * min_ratio

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

            if purge:
                # Purge everything not in this run, children first to satisfy foreign keys.
                # Sections use the full composite key: KFU reuses CRNs across terms for different courses.
                _purge_stale(session, Section,
                             (Section.crn, Section.section_number, Section.course_id),
                             unique_sections.keys())
                # Courses offered only in an earlier term have no sections left, so drop them too.
                _purge_stale(session, Course, (Course.id,), unique_courses.keys())
                _purge_stale(session, Department, (Department.id,), unique_departments.keys())
                _purge_stale(session, College, (College.id,), unique_colleges.keys())

    return SyncResult(purged=purge, existing_sections=existing_count, new_sections=new_count)


def _purge_stale(session, model, key_columns: tuple, current_keys, chunk_size: int = 500):
    """Delete rows of `model` whose key is not among `current_keys`."""
    composite = len(key_columns) > 1
    # A single-column select returns plain values; a multi-column one returns rows.
    rows = session.exec(select(*key_columns)).all()
    existing = {tuple(r) for r in rows} if composite else set(rows)
    stale = list(existing - set(current_keys))
    key_expr = tuple_(*key_columns) if composite else key_columns[0]
    for i in range(0, len(stale), chunk_size):
        session.exec(delete(model).where(key_expr.in_(stale[i:i + chunk_size])))


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