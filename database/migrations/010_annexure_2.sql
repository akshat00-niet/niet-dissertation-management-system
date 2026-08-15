-- Migration: 010_annexure_2.sql
-- Description: Create Annexure 2 formal title proposal and supervisor endorsement tables.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 010 of 018

-- Table 26: annexure_2_submissions (Formal Topic & Methodology Approval)
CREATE TABLE annexure_2_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    final_title TEXT NOT NULL,
    refined_problem TEXT NOT NULL,
    methodology TEXT NOT NULL,
    timeline_milestones JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_annexure_2_thesis UNIQUE (thesis_id)
);

-- Table 27: supervisor_endorsements (Append-Only Dual Guide/Co-Guide Endorsements)
CREATE TABLE supervisor_endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    faculty_id UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    supervisor_role VARCHAR(16) NOT NULL,
    stage VARCHAR(32) NOT NULL,
    is_endorsed BOOLEAN NOT NULL,
    remarks TEXT DEFAULT NULL,
    endorsed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_endorsement_role CHECK (supervisor_role IN ('GUIDE', 'CO_GUIDE')),
    CONSTRAINT chk_endorsement_stage CHECK (stage IN ('ANNEXURE_2', 'ANNEXURE_5')),
    CONSTRAINT uq_supervisor_endorsement_stage UNIQUE (thesis_id, faculty_id, stage)
);

CREATE INDEX idx_annexure_2_thesis ON annexure_2_submissions(thesis_id);
CREATE INDEX idx_supervisor_endorsements_thesis ON supervisor_endorsements(thesis_id);
CREATE INDEX idx_supervisor_endorsements_faculty ON supervisor_endorsements(faculty_id);
