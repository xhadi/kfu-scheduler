from pydantic import BaseModel, Field, model_validator
from datetime import time
from enum import Enum
from utils import parse_time_string, clean_days_string 
from scraper.fetcher import DEPARTMENT_MAP

"""
This file defines the Pydantic data model for parsing the raw JSON data fetched from the university's website.
The SectionData model includes a custom validator that handles the messy and inconsistent data formats provided by the university.
"""

class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"

class SectionData(BaseModel):
    crn: int = Field(alias="CRN")
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
    gender: GenderEnum
    start_time: time = None
    end_time: time = None
    days: str = None

    @model_validator(mode="before")
    @classmethod
    def parse_raw_university_data(cls, data) -> dict:
        # Override the unreliable 'Colleges' array string 
        # and instead enforce the correct college mapped from the department code
        dept_code = data.get("DEPTCode")
        if dept_code in DEPARTMENT_MAP:
            data["college_id"] = DEPARTMENT_MAP[dept_code]["college_id"]
        else:
            # Fallback if somehow a new code slipped in, take the first two numbers
            data["college_id"] = dept_code[:2] if dept_code else "unknown"

        # 1. Handle Gender Mapping
        code = data.get("StudentsCode")
        data["gender"] = GenderEnum.MALE if code == "11" else GenderEnum.FEMALE
        
        # 2. Handle Time Slicing using helper
        raw_time = data.get("Time", "")
        start, end = parse_time_string(raw_time)
        data["start_time"] = start
        data["end_time"] = end
        
        # 3. Handle Days Formatting using helper
        raw_days = data.get("Days", "")
        data["days"] = clean_days_string(raw_days)
        
        # 4. Handle Section Type Mapping
        # Since 'section_type' is aliased to 'Activity', we must update the 'Activity' key
        # so Pydantic picks up the new value during initialization.
        raw_type = data.get("Activity", "").strip() 
        if "عملي" == raw_type:
            data["Activity"] = "Practical"
        elif "نظري" == raw_type:
            data["Activity"] = "Theory"
        else:
            data["Activity"] = raw_type  # Keep it as is if it's something unexpected
        
        return data