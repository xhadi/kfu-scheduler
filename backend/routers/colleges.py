from fastapi import APIRouter, Depends, HTTPException  # pyright: ignore[reportMissingImports]
from sqlmodel import Session, select
from typing import List
from database import get_db_session
from models import College, Department, Course

# Create a router instance
router = APIRouter(
    prefix="/api",
    tags=["University Structure"]
)

@router.get("/colleges", response_model=List[College])
def get_all_colleges(db: Session = Depends(get_db_session)):
    """Returns a list of all colleges in the university."""
    # select(College) is SQLModel's way of saying 'SELECT * FROM college'
    colleges = db.exec(select(College)).all()
    return colleges

@router.get("/colleges/{college_id}/departments", response_model=List[Department])
def get_departments_by_college(college_id: str, db: Session = Depends(get_db_session)):
    """Returns all departments belonging to a specific college ID."""
    departments = db.exec(
        select(Department).where(Department.college_id == college_id)
    ).all()
    
    if not departments:
        raise HTTPException(status_code=404, detail="College not found or has no departments")
    
    return departments

@router.get("/departments/{dept_id}/courses", response_model=List[Course])
def get_courses_by_department(dept_id: str, db: Session = Depends(get_db_session)):
    """Returns all courses belonging to a specific department ID."""
    courses = db.exec(
        select(Course).where(Course.department_id == dept_id)
    ).all()
    
    if not courses:
        raise HTTPException(status_code=404, detail="Department not found or has no courses")
    
    return courses