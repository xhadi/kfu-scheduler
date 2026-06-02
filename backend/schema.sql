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
    pre_req VARCHAR(255),               -- Nullable, as not all courses have prerequisites
    department_id VARCHAR(20) NOT NULL,
    FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE CASCADE
);

-- 4. Sections Table (Lowest Level / Most Granular)
CREATE TABLE section (
    crn INTEGER,                        -- e.g., 53210
    section_number VARCHAR(10) NOT NULL, -- e.g., "01"
    course_id VARCHAR(20) NOT NULL,     
    teacher VARCHAR(255) NOT NULL,      -- e.g., 'مروان محمد امين الحاج'
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    start_time TIME NOT NULL,           -- e.g., '09:00:00'
    end_time TIME NOT NULL,             -- e.g., '10:15:00'
    days VARCHAR(20) NOT NULL,          -- e.g., 'ح   خ'
    PRIMARY KEY (crn, section_number, course_id),
    FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE
);

-- 5. Recommended Indexes for the Scheduling Algorithm
-- The algorithm will constantly filter by these fields, so indexing them speeds up queries drastically.
CREATE INDEX idx_section_course ON section(course_id);
CREATE INDEX idx_section_gender ON section(gender);
CREATE INDEX idx_course_department ON course(department_id);