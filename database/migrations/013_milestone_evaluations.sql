-- Migration: 013_milestone_evaluations.sql
-- Description: Create milestone presentation assessments (P1, P2, P3) and criterion score breakdown tables.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 013 of 018

-- Table 35: milestone_evaluations (Append-Only Evaluation Headers, Pinned to Rubric Version)
CREATE TABLE milestone_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    milestone_type VARCHAR(32) NOT NULL,
    rubric_version_id UUID NOT NULL REFERENCES rubric_versions(id) ON DELETE RESTRICT,
    total_marks_awarded FLOAT NOT NULL,
    general_feedback TEXT DEFAULT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_milestone_type CHECK (milestone_type IN ('P1', 'P2', 'P3')),
    CONSTRAINT chk_p1_marks_range CHECK (total_marks_awarded BETWEEN 0.0 AND 100.0),
    CONSTRAINT uq_milestone_eval UNIQUE (thesis_id, milestone_type)
);

-- Table 36: evaluation_criterion_scores (Append-Only Scored Row Breakdown)
CREATE TABLE evaluation_criterion_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_evaluation_id UUID NOT NULL REFERENCES milestone_evaluations(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE RESTRICT,
    selected_level_id UUID NOT NULL REFERENCES rubric_achievement_levels(id) ON DELETE RESTRICT,
    awarded_marks FLOAT NOT NULL,
    criterion_remarks TEXT DEFAULT NULL,
    CONSTRAINT chk_eval_awarded_marks CHECK (awarded_marks >= 0.0),
    CONSTRAINT uq_eval_criterion_score UNIQUE (milestone_evaluation_id, criterion_id)
);

CREATE INDEX idx_milestone_eval_thesis ON milestone_evaluations(thesis_id, milestone_type);
CREATE INDEX idx_milestone_eval_rubric ON milestone_evaluations(rubric_version_id);
CREATE INDEX idx_eval_criterion_scores_eval ON evaluation_criterion_scores(milestone_evaluation_id);
CREATE INDEX idx_eval_criterion_scores_criterion ON evaluation_criterion_scores(criterion_id);
