from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import List
from datetime import time

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
    """Checks if two individual sections overlap in days AND time."""
    days1 = set(sec1.days.split(","))
    days2 = set(sec2.days.split(","))
    
    # If they share no days (or if one is "TBA"), they do not conflict
    if not days1.intersection(days2):
        return False

    # Check for time overlap
    return sec1.start_time < sec2.end_time and sec2.start_time < sec1.end_time

def generate_combinations(
    course_index: int,
    current_schedule: List[Section],
    course_bundles: List[List[List[Section]]],
    all_valid_schedules: List[List[Section]]
):
    """
    Recursive backtracking algorithm. 
    It tests 'bundles' of sections (e.g., a standalone Theory, or a [Theory + Practical] pair).
    """
    # Base Case: We found a valid bundle for every requested course
    if course_index == len(course_bundles):
        all_valid_schedules.append(list(current_schedule))
        return

    # Loop through all available bundles for the current course
    for bundle in course_bundles[course_index]:
        has_conflict = False
        
        # Check if ANY section inside this bundle conflicts with ANY section already picked
        for sec_in_bundle in bundle:
            for picked_sec in current_schedule:
                if sections_conflict(sec_in_bundle, picked_sec):
                    has_conflict = True
                    break
            if has_conflict:
                break

        # If the entire bundle fits perfectly, tentatively add it and move to the next course
        if not has_conflict:
            # Add all sections in the bundle to the current path
            for sec in bundle:
                current_schedule.append(sec)
                
            generate_combinations(
                course_index + 1, 
                current_schedule, 
                course_bundles, 
                all_valid_schedules
            )
            
            # Backtrack: Remove the sections we just added to try the next bundle
            for _ in bundle:
                current_schedule.pop()

# ==========================================
# 3. The Main Generator Endpoint
# ==========================================
@router.post("/generate")
def generate_schedules(request: ScheduleRequest, db: Session = Depends(get_db_session)):
    if not request.course_ids:
        raise HTTPException(status_code=400, detail="Please select at least one course.")

    course_bundles: List[List[List[Section]]] = []
    
    # 1. Fetch, Filter, and Bundle sections for every course requested
    for course_id in request.course_ids:
        college_id = course_id[:2]
        sections = db.exec(select(Section).where(Section.course_id == course_id)).all()
        
        if not sections:
            course = db.get(Course, course_id)
            course_title = course.title if course else course_id
            raise HTTPException(
                status_code=422, 
                detail=f"Course '{course_title}' has no sections available."
            )
        
        # Isolate practicals into a dictionary for instant lookup
        practicals_map = {
            sec.section_number: sec for sec in sections if sec.section_type == "Practical"
        }
        
        # Isolate other classes as our starting points
        base_sections = [
            sec for sec in sections if sec.section_type != "Practical"
        ]
        
        valid_bundles_for_this_course = []

        for base_sec in base_sections:
            # Check if this college requires linking Theory to Practical
            if base_sec.section_type == "Theory" and college_id in LINKING_RULES:
                gender_key = base_sec.gender.value
                offset = LINKING_RULES[college_id].get(gender_key, 0)
                
                if offset > 0:
                    target_practical_num = base_sec.section_number + offset
                    
                    if target_practical_num in practicals_map:
                        practical_sec = practicals_map[target_practical_num]
                        # Bundle the pair together
                        valid_bundles_for_this_course.append([base_sec, practical_sec])
                    continue # Move to next base section
            
            # If no linking rule applies, it's a standalone bundle
            valid_bundles_for_this_course.append([base_sec])

        # If after bundling, a course has zero valid options (e.g., missing practicals), fail early
        if not valid_bundles_for_this_course:
            raise HTTPException(
                status_code=422, 
                detail=f"Course '{course_id}' has invalid section configurations (missing practicals)."
            )

        course_bundles.append(valid_bundles_for_this_course)

    # 2. Run the combinatorial engine
    all_valid_combinations = []
    generate_combinations(
        course_index=0,
        current_schedule=[],
        course_bundles=course_bundles,
        all_valid_schedules=all_valid_combinations
    )

    # 3. Format the final output to feed the React frontend
    formatted_schedules = []
    for index, combination in enumerate(all_valid_combinations):
        formatted_schedules.append({
            "schedule_id": index + 1,
            "sections": [
                {
                    "crn": sec.crn,
                    "course_id": sec.course_id,
                    "section_number": sec.section_number,
                    "section_type": sec.section_type,
                    "teacher": sec.teacher,
                    "gender": sec.gender,
                    "days": sec.days.split(","),
                    "start_time": sec.start_time.strftime("%H:%M"),
                    "end_time": sec.end_time.strftime("%H:%M"),
                    "status": sec.status
                }
                for sec in combination
            ]
        })

    return {
        "total_options_found": len(formatted_schedules),
        "options": formatted_schedules
    }