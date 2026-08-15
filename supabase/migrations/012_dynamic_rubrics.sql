-- Migration: 012_dynamic_rubrics.sql
-- Description: Create dynamic 4-column rubric builder, versions, criteria, achievement levels, and total validation trigger.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 012 of 018

-- Table 31: rubrics (Master Rubric Template Header)
CREATE TABLE rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    milestone_type VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    max_score FLOAT NOT NULL DEFAULT 100.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_rubric_max_score CHECK (max_score = 100.0)
);

-- Table 32: rubric_versions (Immutable Version Snapshots)
CREATE TABLE rubric_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE RESTRICT,
    version_number INT NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    effective_from DATE NOT NULL,
    effective_until DATE DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_rubric_ver_num UNIQUE (rubric_id, version_number)
);

-- Table 33: rubric_criteria (Dimension Rows)
CREATE TABLE rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_version_id UUID NOT NULL REFERENCES rubric_versions(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL DEFAULT 1,
    criterion_title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    max_marks FLOAT NOT NULL,
    CONSTRAINT chk_criteria_max_marks CHECK (max_marks > 0.0 AND max_marks <= 100.0),
    CONSTRAINT uq_rubric_criteria_seq UNIQUE (rubric_version_id, sequence_order)
);

-- Table 34: rubric_achievement_levels (Dynamic 4 Achievement Columns)
CREATE TABLE rubric_achievement_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    criterion_id UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
    level_index INT NOT NULL,
    label VARCHAR(64) NOT NULL,
    descriptor TEXT NOT NULL,
    score_percentage FLOAT NOT NULL,
    CONSTRAINT chk_level_index CHECK (level_index BETWEEN 1 AND 4),
    CONSTRAINT chk_score_percentage CHECK (score_percentage >= 0.0 AND score_percentage <= 1.0),
    CONSTRAINT uq_rubric_level_idx UNIQUE (criterion_id, level_index)
);

-- Rubric Criteria Total Validation Trigger (SUM = 100.0 before publication)
CREATE OR REPLACE FUNCTION public.fn_validate_rubric_version_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_marks FLOAT;
BEGIN
    -- Only enforce validation when rubric is being published
    IF NEW.is_published = TRUE AND (OLD.is_published IS NULL OR OLD.is_published = FALSE) THEN
        SELECT COALESCE(SUM(max_marks), 0.0) INTO v_total_marks
        FROM public.rubric_criteria
        WHERE rubric_version_id = NEW.id;

        IF v_total_marks != 100.0 THEN
            RAISE EXCEPTION 'Cannot publish rubric version: Total criteria marks sum to %, but exactly 100.0 is required.', v_total_marks;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_rubric_publication
BEFORE UPDATE OF is_published ON rubric_versions
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_rubric_version_publication();

CREATE INDEX idx_rubrics_dept ON rubrics(department_id);
CREATE INDEX idx_rubric_versions_rubric ON rubric_versions(rubric_id, version_number);
CREATE INDEX idx_rubric_criteria_version ON rubric_criteria(rubric_version_id);
CREATE INDEX idx_rubric_levels_criterion ON rubric_achievement_levels(criterion_id);
