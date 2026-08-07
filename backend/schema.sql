-- ============================================================================
-- 1. COLLEGES TABLE (Top Level)
-- ============================================================================
CREATE TABLE college (
    id VARCHAR(10) PRIMARY KEY,           -- College ID (e.g., '09')
    name VARCHAR(255) UNIQUE NOT NULL     -- College name in Arabic (e.g., 'علوم الحاسب وتقنية المعلومات')
                                          -- UNIQUE constraint allows Python scraper to look up IDs via HTML text
);


-- ============================================================================
-- 2. DEPARTMENTS TABLE
-- ============================================================================
CREATE TABLE department (
    id VARCHAR(20) PRIMARY KEY,           -- Department ID (e.g., '0921')
    name VARCHAR(255) NOT NULL,           -- Department name in Arabic (e.g., 'علوم الحاسب')
    college_id VARCHAR(10) NOT NULL,      -- Link to parent college
    
    FOREIGN KEY (college_id) REFERENCES college(id) ON DELETE CASCADE,
    CONSTRAINT unique_dept_per_college UNIQUE (name, college_id) -- Prevents duplicate depts under same college
);


-- ============================================================================
-- 3. COURSES TABLE
-- ============================================================================
CREATE TABLE course (
    id VARCHAR(20) PRIMARY KEY,           -- Course ID (e.g., '0921-120' or 'CS101')
    title VARCHAR(255) NOT NULL,          -- Course title in Arabic (e.g., 'مباديء البرمجة')
    hours INTEGER NOT NULL,               -- Credit hours (e.g., 3 or 4)
    department_id VARCHAR(20) NOT NULL,   -- Link to owning department
    
    FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE CASCADE
);


-- ============================================================================
-- 4. SECTIONS TABLE (Most Granular Unit for Scheduling)
-- ============================================================================
CREATE TABLE section (
    crn VARCHAR(20) NOT NULL,             -- CRN (Course Reference Number, e.g., '53210')
    section_number VARCHAR(10) NOT NULL,  -- Section code (e.g., '01', '02', '51')
    course_id VARCHAR(20) NOT NULL,       -- Link to parent course
    section_type VARCHAR(20),             -- Activity type (e.g., 'نظري' [Lecture] or 'عملي' [Lab])
    section_status VARCHAR(20),           -- Availability state (e.g., 'متاحة' [Open] or 'ممتلئة' [Full])
    teacher VARCHAR(255) DEFAULT 'غير محدد',-- Instructor name (defaults if unassigned/TBA)
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')), -- Male/Female section filter
    time_slots TEXT NOT NULL,             -- JSON string array storing schedule times:
                                          -- e.g., [{"day": "ح", "start": "09:00", "end": "10:15"}]
    
    PRIMARY KEY (crn, section_number, course_id),
    FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE
);



-- ============================================================================
-- 5. PERFORMANCE INDEXES (Optimized for Scheduling Algorithm)
-- ============================================================================
-- The schedule generator frequently filters sections by course, gender, and type.
-- Indexing these columns speeds up query evaluation significantly.

CREATE INDEX idx_section_course ON section(course_id);
CREATE INDEX idx_section_gender ON section(gender);
CREATE INDEX idx_section_type ON section(section_type);
CREATE INDEX idx_course_department ON course(department_id);


-- ============================================================================
-- 6. SCRAPING STATUS TABLE (Monitoring & GitHub Actions Logs)
-- Each scrape run inserts a new row; history is preserved.
-- ============================================================================
CREATE TABLE scrapestatus (
    id SERIAL PRIMARY KEY,                       -- Auto-increment per run
    status VARCHAR(20) NOT NULL DEFAULT 'idle' 
        CHECK (status IN ('idle', 'running', 'completed', 'failed')), -- Current execution state
    source VARCHAR(20) DEFAULT 'static',     -- Tracks strategy used ('static' HTML vs 'api' fallback)
    last_run_started TIMESTAMP,              -- Start timestamp of the scraping job
    last_run_finished TIMESTAMP,             -- End timestamp of the scraping job
    total_sections_scraped INTEGER DEFAULT 0,-- Metric counter for auditing completeness
    error_message TEXT                       -- Detailed error trace if job crashes
);