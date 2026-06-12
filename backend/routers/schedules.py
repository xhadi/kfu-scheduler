import json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Dict, List, Tuple
from database import get_db_session
from models import Section, Course

router = APIRouter(
    prefix="/api/schedules",
    tags=["Schedule Generator"]
)

# ==========================================
# 1. Configuration & Rules
# ==========================================
class ScheduleRequest(BaseModel):
    course_ids: List[str]  # e.g., ["0921-101", "0411-101"]
    gender: str | None = None

# Mapping of College IDs to their Theory-to-Practical section offset
LINKING_RULES = {
    "09": { # CCSIT
        "male": 40,   # Theory 1 + 40 = Practical 41
        "female": 20  # Theory 61 + 20 = Practical 81
    },
    
    "07": { # Agricultural and Food Sciences
        "male": 50,  # Theory 1 + 50 = Practical 51
        "female": 40 # Theory 61 + 40 = Practical 101
    }
}

# ==========================================
# 2. Helper Functions
# ==========================================
def sections_conflict(sec1: Section, sec2: Section) -> bool:
    for s1 in sec1._slots:
        s1_sm = int(s1["start"][:2]) * 60 + int(s1["start"][3:])
        s1_em = int(s1["end"][:2]) * 60 + int(s1["end"][3:])
        for s2 in sec2._slots:
            if s1["day"] != s2["day"]:
                continue
            s2_sm = int(s2["start"][:2]) * 60 + int(s2["start"][3:])
            s2_em = int(s2["end"][:2]) * 60 + int(s2["end"][3:])
            if s1_sm < s2_em and s2_sm < s1_em:
                return True
    return False

def bundles_conflict(bundle1: list, bundle2: list) -> bool:
    for s1 in bundle1:
        for s2 in bundle2:
            if sections_conflict(s1, s2):
                return True
    return False

def generate_combinations(
    course_index: int,
    current_schedule: List[Tuple[int, int]],
    course_bundles: List[List[List[Section]]],
    all_valid_schedules: List[List[Section]],
    conflict: Dict[Tuple[int, int, int, int], bool],
):
    if course_index == len(course_bundles):
        schedule = []
        for ci, bi in current_schedule:
            schedule.extend(course_bundles[ci][bi])
        all_valid_schedules.append(schedule)
        return

    for bi, bundle in enumerate(course_bundles[course_index]):
        has_conflict = False
        for pi, pbi in current_schedule:
            if conflict.get((pi, course_index, pbi, bi), False):
                has_conflict = True
                break

        if not has_conflict:
            current_schedule.append((course_index, bi))
            generate_combinations(
                course_index + 1,
                current_schedule,
                course_bundles,
                all_valid_schedules,
                conflict,
            )
            current_schedule.pop()

# ==========================================
# 3. The Main Generator Endpoint
# ==========================================
@router.post("/generate")
def generate_schedules(request: ScheduleRequest, db: Session = Depends(get_db_session)):
    if not request.course_ids:
        raise HTTPException(status_code=400, detail="Please select at least one course.")

    course_bundles: List[List[List[Section]]] = []
    course_titles_cache = {} # Store titles to avoid repeated DB queries later
    
    # 1. Fetch, Filter, and Bundle sections for every course requested
    for course_id in request.course_ids:
        college_id = course_id[:2]
        
        # Fetch sections and course details
        sections = db.exec(select(Section).where(Section.course_id == course_id)).all()
        for sec in sections:
            sec._slots = json.loads(sec.time_slots)
            # _slots is an ephemeral runtime cache for conflict checks — not persisted

        course = db.get(Course, course_id)
        course_titles_cache[course_id] = course.title if course else "Unknown Course"
        
        if not sections:
            course_title = course_titles_cache[course_id]
            raise HTTPException(
                status_code=422, 
                detail=f"Course '{course_title}' has no sections available."
            )
        
        # Isolate practicals into a dictionary for instant lookup
        practicals_map = {
            sec.section_number: sec for sec in sections if sec.section_type == "عملي" and college_id in LINKING_RULES and sec.gender == request.gender
        }
        
        # Isolate other classes as our starting points
        base_sections = [
            sec for sec in sections if sec.section_type != "عملي" or college_id not in LINKING_RULES
        ]
        
        valid_bundles_for_this_course = []

        for base_sec in base_sections:
            if base_sec.gender != request.gender:
                continue
            # Check if this college requires linking Theory to Practical
            if base_sec.section_type == "نظري" and college_id in LINKING_RULES:
                gender_key = base_sec.gender # gender is stored as a direct string ('male'/'female')
                offset = LINKING_RULES[college_id].get(gender_key, 0)
                
                if offset > 0:
                    # Section numbers are strings (e.g., "01"), so we convert to int to add the offset
                    # then convert back to string, padding with zero if necessary (e.g., "51")
                    try:
                        base_num = int(base_sec.section_number)
                        target_practical_num = str(base_num + offset).zfill(2)
                        
                        if target_practical_num in practicals_map:
                            practical_sec = practicals_map[target_practical_num]
                            # Bundle the pair together
                            valid_bundles_for_this_course.append([base_sec, practical_sec])
                            continue # Move to next base section
                    except ValueError:
                        # If section_number isn't a number, skip this linking logic
                        pass
            
            # If no linking rule applies, it's a standalone bundle
            valid_bundles_for_this_course.append([base_sec])

        # If after bundling, a course has zero valid options (e.g., missing practicals), fail early
        if not valid_bundles_for_this_course:
            course_title = course_titles_cache[course_id]
            
            any_matching_gender = any(sec.gender == request.gender for sec in sections)
            if not any_matching_gender:
                raise HTTPException(
                    status_code=422, 
                    detail=f"Course '{course_title}' has no sections available for the selected gender."
                )
            else:
                # Section(s) exist but practical are missing or don't match the linking rules
                raise HTTPException(
                    status_code=422,
                    detail=f"Course '{course_title}' has no valid section pairs available based on the linking rules."
                )

        course_bundles.append(valid_bundles_for_this_course)

    # 2. Sort courses by fewest bundles first (MRV heuristic)
    sorted_indices = sorted(range(len(course_bundles)), key=lambda i: len(course_bundles[i]))
    sorted_bundles = [course_bundles[i] for i in sorted_indices]

    # 3. Pre-compute bundle conflict matrix
    conflict = {}
    n = len(sorted_bundles)
    for i in range(n):
        for j in range(i + 1, n):
            for bi in range(len(sorted_bundles[i])):
                for bj in range(len(sorted_bundles[j])):
                    if bundles_conflict(sorted_bundles[i][bi], sorted_bundles[j][bj]):
                        conflict[(i, j, bi, bj)] = True

    # 4. Run the combinatorial engine
    all_valid_combinations = []
    generate_combinations(
        course_index=0,
        current_schedule=[],
        course_bundles=sorted_bundles,
        all_valid_schedules=all_valid_combinations,
        conflict=conflict,
    )

    # 5. Format the final output to feed the React frontend
    formatted_schedules = []
    for index, combination in enumerate(all_valid_combinations):
        formatted_schedules.append({
            "schedule_id": index + 1,
            "sections": [
                {
                    "crn": sec.crn,
                    "course_id": sec.course_id,
                    "course_title": course_titles_cache.get(sec.course_id, "Unknown Course"),
                    "section_number": sec.section_number,
                    "section_type": sec.section_type,
                    "teacher": sec.teacher,
                    "gender": sec.gender,
                    "time_slots": sec._slots,
                    "status": sec.section_status
                }
                for sec in combination
            ]
        })

    return {
        "total_options_found": len(formatted_schedules),
        "options": formatted_schedules
    }