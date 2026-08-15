-- Migration: 007_annexure_1_preferences.sql
-- Description: Create Annexure 1 proposal and four ranked guide preference tables.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 007 of 018

-- Table 19: annexure_1_submissions
CREATE TABLE annexure_1_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    proposed_title TEXT NOT NULL,
    broad_domain VARCHAR(255) NOT NULL,
    problem_statement TEXT NOT NULL,
    expected_outcomes TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_annexure_1_thesis UNIQUE (thesis_id)
);

-- Table 20: guide_preferences (Four Ranked Supervisor Preferences)
CREATE TABLE guide_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annexure_1_id UUID NOT NULL REFERENCES annexure_1_submissions(id) ON DELETE CASCADE,
    preference_rank INT NOT NULL,
    faculty_id UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    domain_justification TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_preference_rank_range CHECK (preference_rank BETWEEN 1 AND 4),
    CONSTRAINT uq_guide_pref_rank UNIQUE (annexure_1_id, preference_rank),
    CONSTRAINT uq_guide_pref_fac UNIQUE (annexure_1_id, faculty_id)
);

-- Mandatory Indexes
CREATE INDEX idx_guide_preferences_annexure_1 ON guide_preferences(annexure_1_id);
CREATE INDEX idx_guide_preferences_faculty ON guide_preferences(faculty_id);
