-- ============================================================================
-- REFERENCE ONLY: PostgreSQL DDL that mirrors backend/models.py.
--
-- This file is never executed. The live schema is created by
-- database.init_db() from the SQLModel metadata (main.py lifespan and
-- run_scraper.py). If you change models.py, regenerate this file to match:
-- compile CreateTable/CreateIndex for SQLModel.metadata with the postgresql
-- dialect.
--
-- Defaults marked "(ORM)" are applied by SQLModel in Python, not by the
-- database. Value conventions marked "(convention)" are not enforced by any
-- constraint.
-- ============================================================================


-- ============================================================================
-- 1. COLLEGES TABLE (Top Level)
-- ============================================================================
CREATE TABLE college (
    id VARCHAR NOT NULL,                  -- College ID (e.g., '09')
    name VARCHAR NOT NULL,                -- College name in Arabic (e.g., 'علوم الحاسب وتقنية المعلومات')

    PRIMARY KEY (id)
);


-- ============================================================================
-- 2. DEPARTMENTS TABLE
-- ============================================================================
CREATE TABLE department (
    id VARCHAR NOT NULL,                  -- Department ID (e.g., '0921')
    name VARCHAR NOT NULL,                -- Department name in Arabic (e.g., 'علوم الحاسب')
    college_id VARCHAR NOT NULL,          -- Link to parent college

    PRIMARY KEY (id),
    FOREIGN KEY (college_id) REFERENCES college (id)
);


-- ============================================================================
-- 3. COURSES TABLE
-- ============================================================================
CREATE TABLE course (
    id VARCHAR NOT NULL,                  -- Course ID (e.g., '0921-120')
    title VARCHAR NOT NULL,               -- Course title in Arabic (e.g., 'مباديء البرمجة')
    hours INTEGER NOT NULL,               -- Credit hours (e.g., 3 or 4)
    department_id VARCHAR NOT NULL,       -- Link to owning department

    PRIMARY KEY (id),
    FOREIGN KEY (department_id) REFERENCES department (id)
);

-- Course list endpoint filters by department_id; Postgres doesn't index FKs automatically.
CREATE INDEX idx_course_department ON course (department_id);


-- ============================================================================
-- 4. SECTIONS TABLE (Most Granular Unit for Scheduling)
-- ============================================================================
CREATE TABLE section (
    crn VARCHAR NOT NULL,                 -- CRN (e.g., '53210'); KFU reuses CRNs, so it is not unique alone
    section_number VARCHAR NOT NULL,      -- Section code as a string (e.g., '01', '41')
    section_type VARCHAR,                 -- Activity type (e.g., 'نظري' [Lecture] or 'عملي' [Lab])
    section_status VARCHAR,               -- 'متاحة' | 'ممتلئة' | 'غير متاحة' (normalized by the scraper)
    course_id VARCHAR NOT NULL,           -- Link to parent course
    teacher VARCHAR,                      -- Instructor name; the scraper fills blanks with 'غير محدد'
    gender VARCHAR NOT NULL,              -- 'male' | 'female' (convention)
    time_slots VARCHAR NOT NULL,          -- JSON string array of schedule times:
                                          -- e.g., [{"day": "ح", "start": "09:00", "end": "10:15"}]

    PRIMARY KEY (crn, section_number, course_id),
    FOREIGN KEY (course_id) REFERENCES course (id)
);

-- Schedule generator filters by course_id, which is the last PK column,
-- so the primary key index can't serve that lookup.
CREATE INDEX idx_section_course ON section (course_id);


-- ============================================================================
-- 5. SCRAPING STATUS TABLE (Monitoring & GitHub Actions Logs)
-- Each scrape run inserts a new row; history is preserved.
-- ============================================================================
CREATE TABLE scrapestatus (
    id SERIAL NOT NULL,                   -- Auto-increment per run
    status VARCHAR NOT NULL,              -- 'idle' | 'running' | 'completed' | 'failed' (convention); default 'idle' (ORM)
    source VARCHAR,                       -- 'static_html' | 'dynamic_api' (convention); default NULL
    last_run_started TIMESTAMP WITHOUT TIME ZONE,   -- Start of the run (written as UTC)
    last_run_finished TIMESTAMP WITHOUT TIME ZONE,  -- End of the run (written as UTC)
    total_sections_scraped INTEGER NOT NULL,        -- Sections in the accepted result; default 0 (ORM)
    error_message VARCHAR,                -- Failure message, or the purge-skipped note on success

    PRIMARY KEY (id)
);
