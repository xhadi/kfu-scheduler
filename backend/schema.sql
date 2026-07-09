-- 1. Colleges Table (Highest Level)
CREATE TABLE college (
    id VARCHAR(10) PRIMARY KEY,         -- e.g., '09'
    name VARCHAR(255) NOT NULL          -- e.g., 'علوم الحاسب وتقنية المعلومات'
);

-- 2. Departments Table
CREATE TABLE department (
    id VARCHAR(20) PRIMARY KEY,         -- e.g., '0921'
    name VARCHAR(255) NOT NULL,         -- e.g., 'علوم الحاسب'
    college_id VARCHAR(10) NOT NULL,
    FOREIGN KEY (college_id) REFERENCES college(id) ON DELETE CASCADE
);

-- 3. Courses Table
CREATE TABLE course (
    id VARCHAR(20) PRIMARY KEY,         -- e.g., '0921-120'
    title VARCHAR(255) NOT NULL,        -- e.g., 'مباديء البرمجة'
    hours INTEGER NOT NULL,             -- e.g., 4
    department_id VARCHAR(20) NOT NULL,
    FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE CASCADE
);

-- 4. Sections Table (Lowest Level / Most Granular)
CREATE TABLE section (
    crn VARCHAR(20) NOT NULL,            -- e.g., '53210' (stored as string)
    section_number VARCHAR(10) NOT NULL, -- e.g., "01"
    section_type VARCHAR(20),            -- e.g., "نظري" or "عملي"
    section_status VARCHAR(20),          -- e.g., "متاح" or "ممتلئ"
    course_id VARCHAR(20) NOT NULL,     
    teacher VARCHAR(255),                -- e.g., 'مروان محمد امين الحاج'
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    time_slots TEXT NOT NULL,            -- JSON string: [{"day": "ح", "start": "09:00", "end": "10:15"}]
    PRIMARY KEY (crn, section_number, course_id),
    FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE
);

-- 5. Recommended Indexes for the Scheduling Algorithm
-- The algorithm will constantly filter by these fields, so indexing them speeds up queries drastically.
CREATE INDEX idx_section_course ON section(course_id);
CREATE INDEX idx_section_gender ON section(gender);
CREATE INDEX idx_section_type ON section(section_type);
CREATE INDEX idx_course_department ON course(department_id);

-- 5. Scraping Status Table
CREATE TABLE scrapestatus (
    id INTEGER PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'completed', 'failed')),
    last_run_started TIMESTAMP,
    last_run_finished TIMESTAMP,
    total_sections_scraped INTEGER DEFAULT 0,
    error_message TEXT
);