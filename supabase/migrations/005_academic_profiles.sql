-- Migration: 005_academic_profiles.sql
-- Description: Create academic profile and taxonomy tables (research_domains, student_profiles, faculty_profiles, faculty_expertise).
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 005 of 018

-- Table 14: research_domains (Created first so faculty_expertise can reference it)
CREATE TABLE research_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_research_domains_code UNIQUE (code),
    CONSTRAINT uq_research_domains_dept_name UNIQUE (department_id, name)
);

-- Table 11: student_profiles
CREATE TABLE student_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    roll_number VARCHAR(32) NOT NULL,
    enrollment_number VARCHAR(32) NOT NULL,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    batch_name VARCHAR(32) NOT NULL,
    current_semester INT NOT NULL DEFAULT 3,
    is_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_student_roll UNIQUE (roll_number),
    CONSTRAINT uq_student_enroll UNIQUE (enrollment_number),
    CONSTRAINT chk_student_semester CHECK (current_semester > 0)
);

-- Table 12: faculty_profiles
CREATE TABLE faculty_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    employee_code VARCHAR(32) NOT NULL,
    designation VARCHAR(64) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    active_guide_load INT NOT NULL DEFAULT 0,
    active_coguide_load INT NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_faculty_empcode UNIQUE (employee_code),
    CONSTRAINT chk_faculty_guide_load CHECK (active_guide_load BETWEEN 0 AND 3),
    CONSTRAINT chk_faculty_coguide_load CHECK (active_coguide_load BETWEEN 0 AND 3)
);

-- Table 13: faculty_expertise
CREATE TABLE faculty_expertise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES research_domains(id) ON DELETE RESTRICT,
    expertise_level VARCHAR(32) NOT NULL DEFAULT 'PRIMARY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_faculty_domain UNIQUE (faculty_id, domain_id)
);

CREATE INDEX idx_student_profiles_dept ON student_profiles(department_id);
CREATE INDEX idx_faculty_profiles_dept ON faculty_profiles(department_id);
CREATE INDEX idx_faculty_profiles_loads ON faculty_profiles(active_guide_load, active_coguide_load);
CREATE INDEX idx_faculty_expertise_faculty ON faculty_expertise(faculty_id);
