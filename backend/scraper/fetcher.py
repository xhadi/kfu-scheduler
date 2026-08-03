import json
import time
import requests
import os

# Configuration
BASE_URL = "https://www.kfu.edu.sa/_vti_bin/StudySchedules/StudySchedules.svc/GetCoursesByDept"
HIJRI_YEAR = "1448"

# 11 for male, 12 for female
GENDERS = ["11", "12"] 

# Mapping of department IDs to their corresponding college and department information
DEPARTMENT_MAP = {
    # College of Agricultural and Food Sciences
    "0151": {"college_id": "01", "dept_id": "ABCS", "name": "الأعمال الزراعية وعلوم المستهلك"},
    "0153": {"college_id": "01", "dept_id": "AFP", "name": "الإنتاج الحيواني والسمكي"},
    "0154": {"college_id": "01", "dept_id": "EANR", "name": "البيئة والمصادر الطبيعية الزراعية"},
    "0155": {"college_id": "01", "dept_id": "ABT", "name": "التقنية الحيوية الزراعية"},
    "0156": {"college_id": "01", "dept_id": "ALA", "name": "زراعة الأراضي القاحلة"},
    "0157": {"college_id": "01", "dept_id": "FSN", "name": "علوم الغذاء والتغذية"},
    "0158": {"college_id": "01", "dept_id": "BFS", "name": "علوم الأغذية الحيوية"},
    # College of Business
    "0608": {"college_id": "06", "dept_id": "CLA", "name": " Commercial Law"},
    "0673": {"college_id": "06", "dept_id": "BA", "name": "Business Administration"},
    "0674": {"college_id": "06", "dept_id": "ACC", "name": "Accountant"},
    "0675": {"college_id": "06", "dept_id": "FIN", "name": "Finance"},
    "0676": {"college_id": "06", "dept_id": "ASS", "name": "Assurance"},
    "0677": {"college_id": "06", "dept_id": "MIT", "name": "Management Information Technology"},
    "0678": {"college_id": "06", "dept_id": "ECO", "name": "Economy"},
    # College of Science
    "0814": {"college_id": "08", "dept_id": "PHY", "name": "Physics"},
    "0824": {"college_id": "08", "dept_id": "PHY", "name": "Physics"},
    "0815": {"college_id": "08", "dept_id": "CHEM", "name": "Chemistry"},
    "0825": {"college_id": "08", "dept_id": "CHEM", "name": "Chemistry"},
    "0816": {"college_id": "08", "dept_id": "BIO", "name": "Biology"},
    "0826": {"college_id": "08", "dept_id": "BIO", "name": "Biology"},
    "0817": {"college_id": "08", "dept_id": "MATH", "name": "Mathematics"},
    "0827": {"college_id": "08", "dept_id": "MATH", "name": "Mathematics"},
    # College of Computer Science and Information Technology
    "0911": {"college_id": "09", "dept_id": "CS", "name": "Computer Science"},
    "0921": {"college_id": "09", "dept_id": "CS", "name": "Computer Science"},
    "0912": {"college_id": "09", "dept_id": "IS", "name": "Information Systems"},
    "0922": {"college_id": "09", "dept_id": "IS", "name": "Information Systems"},
    "0913": {"college_id": "09", "dept_id": "CE", "name": "Computer Engineering"},
    "0923": {"college_id": "09", "dept_id": "CE", "name": "Computer Engineering"},
    "0914": {"college_id": "09", "dept_id": "CN", "name": "Computer Networks"},
    "0924": {"college_id": "09", "dept_id": "CN", "name": "Computer Networks"},
    # College of Engineering
    "2000": {"college_id": "20", "dept_id": "GNE", "name": "General Engineering"},
    "2201": {"college_id": "20", "dept_id": "ME", "name": "Mechanical Engineering"},
    "2202": {"college_id": "20", "dept_id": "EE", "name": "Electrical Engineering"},
    "2203": {"college_id": "20", "dept_id": "CE", "name": "Civil Engineering"},
    "2204": {"college_id": "20", "dept_id": "CHE", "name": "Chemical Engineering"},
    "2206": {"college_id": "20", "dept_id": "BME", "name": "Biomedical Engineering"},
}

# Create a 'data' directory inside the scraper folder to store the raw file
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

RAW_JSON_PATH = os.path.join(DATA_DIR, "university_courses_data.json")

def fetch_university_courses_data():
    headers = {
        # 1. Tells the server you are a real desktop browser
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    
    # 2. Tells the server what kind of data you want back
    "Accept": "application/json, text/plain, */*",
    
    # 3. Tells the server what format your request payload is (if doing POST)
    "Content-Type": "application/json",
    
    # 4. Useful if the server checks where the request originated from
    "Referer": "https://www.kfu.edu.sa/",
    "Origin": "https://www.kfu.edu.sa"
    }
    
    all_courses = []
    
    # Loop through each department and gender combination to fetch the course data
    for deptId in DEPARTMENT_MAP:
        collegeId = DEPARTMENT_MAP[deptId]["college_id"]
        print(f"Processing College {collegeId} -> Department {deptId}...")
        
        for gender in GENDERS:
            gender_label = "Male" if gender == "11" else "Female"
            
            params = {
                "deptId": deptId,
                "stdGnr": gender,
                "hijriYear": HIJRI_YEAR
            }
            
            try:
                # Make the GET request to fetch course sections for the current department and gender
                response = requests.get(BASE_URL, headers=headers, params=params, timeout=10)
                response.raise_for_status()
                sections = response.json()
    
                if sections:
                    print(f"    Found {len(sections)} sections")
                    all_courses.extend(sections)
                else:
                    print(f"    No sections found for {gender_label}")
                
                # Wait 2 seconds between requests to be polite to the server
                time.sleep(2) 
            except requests.RequestException as e:
                print(f"    Error fetching data for {gender_label}: {e}")
                continue
            
    # Save the raw data to a JSON file
    with open(RAW_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(all_courses, f, ensure_ascii=False, indent=4)
    print(f"Data fetching complete. Total sections fetched: {len(all_courses)}")
    return RAW_JSON_PATH
                
if __name__ == "__main__":
    from load_data import load_data_to_db
    json_path = fetch_university_courses_data()
    load_data_to_db(json_path)