from typing import List, Optional
from datetime import time
from enum import Enum
from sqlmodel import Field, Relationship, SQLModel

"""
This file defines the data models for our schedule maker API using SQLModel.
We have four main tables: College, Department, Course, and Section.
Each table has its own fields and relationships to other tables.
"""

class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"

# --- TABLES ---

class College(SQLModel, table=True):
    id: str = Field(primary_key=True)  # Example: "09"
    name: str                          # Example: "علوم الحاسب وتقنية المعلومات"

    # Link to departments
    departments: List["Department"] = Relationship(back_populates="college")

class Department(SQLModel, table=True):
    id: str = Field(primary_key=True)  # Example: "0921"
    name: str                          # Example: "علوم الحاسب"
    college_id: str = Field(foreign_key="college.id")

    # Links
    college: College = Relationship(back_populates="departments")
    courses: List["Course"] = Relationship(back_populates="department")

class Course(SQLModel, table=True):
    id: str = Field(primary_key=True)  # Example: "0921-120"
    title: str                         # Example: "مباديء البرمجة"
    hours: int                         # Example: 4
    pre_req: Optional[str] = None
    department_id: str = Field(foreign_key="department.id")

    # Links
    department: Department = Relationship(back_populates="courses")
    sections: List["Section"] = Relationship(back_populates="course")

class Section(SQLModel, table=True):
    crn: int = Field(primary_key=True) # Example: 53210
    section_number: str = Field(primary_key=True)  # Example: "01"
    section_type: str = Field(nullable = True)         # Example: "نظري"
    section_status: str = Field(nullable = True)       # Example: "متاح"
    course_id: str = Field(foreign_key="course.id", primary_key=True)
    teacher: str = Field(nullable = True)                      # Example: "مروان محمد امين الحاج"
    gender: str                        
    
    # We will populate these using the parser
    start_time: time
    end_time: time
    days: str                          

    # Links
    course: Course = Relationship(back_populates="sections")