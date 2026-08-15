-- Migration: 006_thesis_core.sql
-- Description: Create core thesis aggregate root, title tracking, version snapshots, and domain mapping tables.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 006 of 018

-- Table 15: theses (Aggregate Root)
CREATE TABLE theses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number VARCHAR(64) NOT NULL,
    student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE RESTRICT,
    current_state VARCHAR(64) NOT NULL DEFAULT 'DRAFT_PROPOSAL',
    current_stage VARCHAR(64) NOT NULL DEFAULT 'PROPOSAL_STAGE',
    guide_id UUID DEFAULT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    co_guide_id UUID DEFAULT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    defense_cycle_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_theses_tracking UNIQUE (tracking_number),
    CONSTRAINT chk_theses_guide_distinct CHECK (guide_id IS NULL OR co_guide_id IS NULL OR guide_id != co_guide_id),
    CONSTRAINT chk_defense_cycle_positive CHECK (defense_cycle_index > 0)
);

-- Partial Unique Index: Exactly 1 active dissertation per candidate
CREATE UNIQUE INDEX uq_theses_active_student_candidate
ON theses(student_id)
WHERE current_state NOT IN ('ARCHIVED', 'PROPOSAL_REJECTED_TERMINAL');

-- Table 16: thesis_titles
CREATE TABLE thesis_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    proposed_title TEXT NOT NULL,
    final_approved_title TEXT DEFAULT NULL,
    normalized_title TEXT NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_thesis_titles_thesis UNIQUE (thesis_id)
);

-- Functional Unique Index for Case-Insensitive Normalized Title
CREATE UNIQUE INDEX uq_thesis_titles_normalized ON thesis_titles(lower(normalized_title));

-- Title Normalization Helper Function & Trigger
CREATE OR REPLACE FUNCTION public.fn_normalize_thesis_title()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Trim whitespace, collapse consecutive spaces to single space, convert to lowercase
    NEW.normalized_title := lower(regexp_replace(trim(both from NEW.proposed_title), '\s+', ' ', 'g'));
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_thesis_title_insert
BEFORE INSERT OR UPDATE OF proposed_title ON thesis_titles
FOR EACH ROW
EXECUTE FUNCTION public.fn_normalize_thesis_title();

-- Table 17: thesis_versions (Append-Only Snapshot Table)
CREATE TABLE thesis_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    version_number INT NOT NULL,
    state_snapshot VARCHAR(64) NOT NULL,
    snapshot_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_thesis_versions_num UNIQUE (thesis_id, version_number)
);

-- Table 18: thesis_domain_mappings
CREATE TABLE thesis_domain_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES research_domains(id) ON DELETE RESTRICT,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_thesis_domain UNIQUE (thesis_id, domain_id)
);

-- Core Lookup Indexes
CREATE INDEX idx_theses_department_id ON theses(department_id);
CREATE INDEX idx_theses_student_id ON theses(student_id);
CREATE INDEX idx_theses_current_state ON theses(current_state);
CREATE INDEX idx_theses_guide_id ON theses(guide_id);
CREATE INDEX idx_theses_co_guide_id ON theses(co_guide_id);
CREATE INDEX idx_theses_session_id ON theses(session_id);
CREATE INDEX idx_thesis_versions_thesis ON thesis_versions(thesis_id);
