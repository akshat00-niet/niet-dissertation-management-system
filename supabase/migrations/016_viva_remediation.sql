-- Migration: 016_viva_remediation.sql
-- Description: Create viva defense, panels, panel evaluations, re-viva remediation, and final result compilation tables.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 016 of 018

-- Table 39: viva_defenses (Oral Defense Sessions)
CREATE TABLE viva_defenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    defense_cycle_index INT NOT NULL DEFAULT 1,
    rubric_version_id UUID NOT NULL REFERENCES rubric_versions(id) ON DELETE RESTRICT,
    composite_score FLOAT DEFAULT NULL,
    outcome VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    panel_summary TEXT DEFAULT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    conducted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT chk_viva_score_range CHECK (composite_score IS NULL OR (composite_score >= 0.0 AND composite_score <= 100.0)),
    CONSTRAINT uq_viva_defense_cycle UNIQUE (thesis_id, defense_cycle_index)
);

-- Table 40: defense_panels (Appointed 2-Member Committee)
CREATE TABLE defense_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viva_defense_id UUID NOT NULL REFERENCES viva_defenses(id) ON DELETE RESTRICT,
    constituted_by_hod_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    constituted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_defense_panel_viva UNIQUE (viva_defense_id)
);

-- Table 41: panel_member_assignments (Individual Examiner Appointments)
CREATE TABLE panel_member_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id UUID NOT NULL REFERENCES defense_panels(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    evaluator_role VARCHAR(32) NOT NULL DEFAULT 'INTERNAL_EXPERT',
    is_panel_chair BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_panel_assign UNIQUE (panel_id, faculty_id)
);

-- Table 42: panel_member_evaluations (Append-Only Examiner Scorecards)
CREATE TABLE panel_member_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viva_defense_id UUID NOT NULL REFERENCES viva_defenses(id) ON DELETE RESTRICT,
    faculty_id UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    awarded_marks FLOAT NOT NULL,
    examiner_remarks TEXT NOT NULL,
    recommendation VARCHAR(32) NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_panel_eval_score CHECK (awarded_marks >= 0.0 AND awarded_marks <= 100.0),
    CONSTRAINT uq_panel_eval UNIQUE (viva_defense_id, faculty_id)
);

-- Table 43: re_viva_cycles (Remediation Cycles Tracking under Same Thesis ID)
CREATE TABLE re_viva_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    cycle_index INT NOT NULL DEFAULT 2,
    failed_viva_defense_id UUID NOT NULL REFERENCES viva_defenses(id) ON DELETE RESTRICT,
    remediation_deadline DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_re_viva_cycle UNIQUE (thesis_id, cycle_index)
);

-- Table 44: final_result_compilations (Append-Only Final Grade Compilation & Sign-Off)
CREATE TABLE final_result_compilations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    p3_score FLOAT NOT NULL,
    supervisor_score FLOAT NOT NULL,
    viva_panel_score FLOAT NOT NULL,
    final_composite_grade FLOAT NOT NULL,
    hod_sign_off_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    compiled_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_final_result_thesis UNIQUE (thesis_id),
    CONSTRAINT chk_final_p3_score CHECK (p3_score >= 0.0 AND p3_score <= 100.0),
    CONSTRAINT chk_final_sup_score CHECK (supervisor_score >= 0.0 AND supervisor_score <= 100.0),
    CONSTRAINT chk_final_viva_score CHECK (viva_panel_score >= 0.0 AND viva_panel_score <= 100.0),
    CONSTRAINT chk_final_grade CHECK (final_composite_grade >= 0.0 AND final_composite_grade <= 100.0)
);

CREATE INDEX idx_viva_defenses_thesis ON viva_defenses(thesis_id, defense_cycle_index);
CREATE INDEX idx_defense_panels_viva ON defense_panels(viva_defense_id);
CREATE INDEX idx_panel_member_assignments_panel ON panel_member_assignments(panel_id);
CREATE INDEX idx_panel_member_evaluations_viva ON panel_member_evaluations(viva_defense_id);
CREATE INDEX idx_re_viva_cycles_thesis ON re_viva_cycles(thesis_id);
CREATE INDEX idx_final_result_thesis ON final_result_compilations(thesis_id);
