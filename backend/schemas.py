import json
from pydantic import BaseModel, Field, model_validator
from utils import parse_time_string
from scraper.fetcher import DEPARTMENT_MAP

"""
This file defines the Pydantic data model for parsing the raw JSON data fetched from the university's website.
The SectionData model includes a custom validator that handles the messy and inconsistent data formats provided by the university.
"""

class SectionData(BaseModel):
    crn: str = Field(alias="CRN")
    section_number: str = Field(alias="Division")
    section_type: str = Field(alias="Activity")
    teacher: str = Field(alias="Teacher")
    college_id: str = "unknown"
    dept_id: str = Field(alias="DEPTCode")
    course_id: str = Field(alias="Course")
    section_status: str = Field(alias="Availability")
    
    # Missing fields accessed in load_data.py
    college_name: str = Field(alias="College")
    dept_name: str = Field(alias="DEPT")
    course_title: str = Field(alias="CourseTitle")
    hours: int = Field(alias="Hours")

    # Fields that will be parsed and populated by the validator
    gender: str
    time_slots: str = "[]"

    @model_validator(mode="before")
    @classmethod
    def parse_raw_university_data(cls, data) -> dict:
        # Override the unreliable 'Colleges' array string 
        # and instead enforce the correct college mapped from the department code
        dept_code = data.get("DEPTCode")
        if dept_code in DEPARTMENT_MAP:
            data["college_id"] = DEPARTMENT_MAP[dept_code]["college_id"]
        else:
            # Fallback: use caller-provided college_id (from page context), else prefix
            data["college_id"] = data.get("college_id") or (dept_code[:2] if dept_code else "unknown")

        # 1. Handle Gender Mapping
        code = data.get("StudentsCode")
        data["gender"] = "male" if code == "11" else "female"
        
        # 2. Build time slots from raw time and days
        raw_time = data.get("Time", "")
        start, end = parse_time_string(raw_time)
        start_str = f"{start.hour:02d}:{start.minute:02d}"
        end_str = f"{end.hour:02d}:{end.minute:02d}"

        raw_days = data.get("Days", "")
        day_list = [d.strip() for d in raw_days.split() if d.strip()]

        slots = [{"day": d, "start": start_str, "end": end_str} for d in day_list]
        data["time_slots"] = json.dumps(slots) if slots else "[]"
        
        # 4. Handle Section Type
        raw_type = data.get("Activity", "").strip()
        data["section_type"] = raw_type
        
        
        return data