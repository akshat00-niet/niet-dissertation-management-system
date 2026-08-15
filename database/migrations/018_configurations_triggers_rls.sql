-- Migration: 018_configurations_triggers_rls.sql
-- Description: Create configuration tables, immutability triggers, enable RLS across all 54 tables, and establish complete RLS policies.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 018 of 018

-- ============================================================================
-- 1. Configuration & Audit Tables
-- ============================================================================

-- Table 52: system_configurations (Global Runtime Parameters)
CREATE TABLE system_configurations (
    key VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL,
    data_type VARCHAR(16) NOT NULL DEFAULT 'STRING',
    description TEXT NOT NULL,
    is_mutable BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_config_data_type CHECK (data_type IN ('STRING', 'INT', 'FLOAT', 'BOOLEAN', 'JSON'))
);

-- Seed Default Baseline Runtime Parameters
INSERT INTO system_configurations (key, value, data_type, description, is_mutable) VALUES
('PROTOTYPE_MAX_FILE_SIZE_BYTES', '5242880', 'INT', 'Maximum allowable file upload size (5 MB prototype limit)', TRUE),
('RATE_LIMIT_LOGIN_MAX', '10', 'INT', 'Maximum failed login attempts per minute before rate limit lockout', TRUE),
('SESSION_MAX_AGE_SEC', '86400', 'INT', 'Absolute session duration in seconds (24 hours)', TRUE),
('MAX_GUIDE_LOAD_LIMIT', '3', 'INT', 'Hard supervisor capacity limit for primary guides', FALSE),
('MAX_CO_GUIDE_LOAD_LIMIT', '3', 'INT', 'Hard supervisor capacity limit for co-guides', FALSE),
('PLAGIARISM_MAX_BENCHMARK', '10.0', 'FLOAT', 'Maximum acceptable plagiarism similarity percentage (<10%)', FALSE),
('AI_SIMILARITY_MAX_BENCHMARK', '0.0', 'FLOAT', 'Maximum acceptable AI content similarity percentage (=0%)', FALSE);

-- Table 53: academic_policy_configurations (Departmental Academic Policy Parameters)
CREATE TABLE academic_policy_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    policy_key VARCHAR(64) NOT NULL,
    policy_value JSONB NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    effective_until TIMESTAMPTZ DEFAULT NULL,
    updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_policy_dates CHECK (effective_until IS NULL OR effective_from < effective_until)
);

-- Table 54: configuration_change_logs (Strictly Append-Only WORM Audit Trail)
CREATE TABLE configuration_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_type VARCHAR(32) NOT NULL,
    config_key VARCHAR(64) NOT NULL,
    department_id UUID DEFAULT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    previous_value JSONB DEFAULT NULL,
    new_value JSONB NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    justification TEXT NOT NULL,
    client_ip VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    correlation_id UUID NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_config_change_type CHECK (config_type IN ('SYSTEM', 'ACADEMIC_POLICY'))
);

CREATE INDEX idx_system_configs_mutable ON system_configurations(is_mutable);
CREATE INDEX idx_academic_policy_dept_key ON academic_policy_configurations(department_id, policy_key);
CREATE INDEX idx_config_change_logs_key ON configuration_change_logs(config_type, config_key);
CREATE INDEX idx_config_change_logs_timestamp ON configuration_change_logs(changed_at DESC);

-- ============================================================================
-- 2. Immutability & Updated-At Triggers
-- ============================================================================

-- Generic Updated-At Trigger Function
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers on mutable operational tables
CREATE TRIGGER trg_set_updated_at_departments BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_set_updated_at_academic_sessions BEFORE UPDATE ON academic_sessions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_set_updated_at_theses BEFORE UPDATE ON theses FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_set_updated_at_digital_logbook BEFORE UPDATE ON digital_logbook_entries FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_set_updated_at_documents BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_set_updated_at_system_configs BEFORE UPDATE ON system_configurations FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_set_updated_at_policy_configs BEFORE UPDATE ON academic_policy_configurations FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Enforce Strict WORM Immutability on Audit Tables
CREATE OR REPLACE FUNCTION public.fn_prevent_mutation_on_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Illegal Operation: Table % is strictly append-only. UPDATE and DELETE operations are permanently prohibited.', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER trg_immutable_audit_events
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_config_change_logs
BEFORE UPDATE OR DELETE ON configuration_change_logs
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_thesis_versions
BEFORE UPDATE OR DELETE ON thesis_versions
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_guide_alloc_history
BEFORE UPDATE OR DELETE ON guide_allocation_history
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_supervisor_endorsements
BEFORE UPDATE OR DELETE ON supervisor_endorsements
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_logbook_verifications
BEFORE UPDATE OR DELETE ON logbook_verifications
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_periodic_progress
BEFORE UPDATE OR DELETE ON periodic_progress_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_milestone_evaluations
BEFORE UPDATE OR DELETE ON milestone_evaluations
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_eval_criterion_scores
BEFORE UPDATE OR DELETE ON evaluation_criterion_scores
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_annexure_6
BEFORE UPDATE OR DELETE ON annexure_6_evaluations
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_panel_evaluations
BEFORE UPDATE OR DELETE ON panel_member_evaluations
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_final_results
BEFORE UPDATE OR DELETE ON final_result_compilations
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_document_versions
BEFORE UPDATE OR DELETE ON document_versions
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

CREATE TRIGGER trg_immutable_academic_events
BEFORE UPDATE OR DELETE ON academic_events
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_on_append_only();

-- ============================================================================
-- 3. Enable Row Level Security Across All 54 Tables
-- ============================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_expertise ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE theses ENABLE ROW LEVEL SECURITY;
ALTER TABLE thesis_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE thesis_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE thesis_domain_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE annexure_1_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dcec_dockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dcec_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dcec_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_allocation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE annexure_2_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_logbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbook_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodic_progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_achievement_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criterion_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE annexure_5_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE annexure_6_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE viva_defenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_member_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_member_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE re_viva_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_result_compilations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_policy_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_change_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Authoritative Row Level Security Policies
-- ============================================================================

-- Organizational Structure (Tables 1-5)
CREATE POLICY p_departments_select ON departments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_departments_admin ON departments FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_sessions_select ON academic_sessions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_sessions_admin ON academic_sessions FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_programs_select ON programs FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_programs_admin ON programs FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_batches_select ON batches FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_batches_admin ON batches FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_sections_select ON sections FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_sections_admin ON sections FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

-- Identity & RBAC (Tables 6-10)
CREATE POLICY p_users_select ON users FOR SELECT TO authenticated USING (auth.uid() = id OR auth.has_role('ADMIN', 'HOD'));
CREATE POLICY p_users_admin ON users FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_roles_select ON roles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_roles_admin ON roles FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_permissions_select ON permissions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_permissions_admin ON permissions FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_role_permissions_select ON role_permissions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_role_permissions_admin ON role_permissions FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_user_role_assignments_select ON user_role_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.has_role('ADMIN', 'HOD'));
CREATE POLICY p_user_role_assignments_admin ON user_role_assignments FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

-- Academic Identity & Taxonomies (Tables 11-14)
CREATE POLICY p_student_profiles_select ON student_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.has_role('ADMIN', 'HOD', 'DC', 'DHOD', 'FACULTY'));
CREATE POLICY p_student_profiles_admin ON student_profiles FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_faculty_profiles_select ON faculty_profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_faculty_profiles_admin ON faculty_profiles FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_faculty_expertise_select ON faculty_expertise FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_faculty_expertise_modify ON faculty_expertise FOR ALL TO authenticated USING (auth.uid() = faculty_id OR auth.has_role('ADMIN')) WITH CHECK (auth.uid() = faculty_id OR auth.has_role('ADMIN'));

CREATE POLICY p_research_domains_select ON research_domains FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_research_domains_admin ON research_domains FOR ALL TO authenticated USING (auth.has_role('ADMIN', 'HOD')) WITH CHECK (auth.has_role('ADMIN', 'HOD'));

-- Thesis Core & Titles (Tables 15-18)
CREATE POLICY p_theses_select ON theses FOR SELECT TO authenticated USING (
    auth.uid() = student_id
    OR auth.is_assigned_guide(id)
    OR auth.is_assigned_coguide(id)
    OR (department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DC', 'DHOD', 'DCEC_MEMBER'))
    OR auth.is_assigned_panel_member(id)
);
CREATE POLICY p_theses_insert ON theses FOR INSERT TO authenticated WITH CHECK (auth.has_role('STUDENT') AND auth.uid() = student_id);

CREATE POLICY p_thesis_titles_select ON thesis_titles FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR auth.is_assigned_guide(t.id)
        OR auth.is_assigned_coguide(t.id)
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DC', 'DHOD', 'DCEC_MEMBER'))
        OR auth.is_assigned_panel_member(t.id)
    ))
);
CREATE POLICY p_thesis_titles_insert ON thesis_titles FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND t.student_id = auth.uid())
);

CREATE POLICY p_thesis_versions_select ON thesis_versions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR auth.is_assigned_guide(t.id)
        OR auth.is_assigned_coguide(t.id)
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DC', 'DHOD', 'DCEC_MEMBER'))
        OR auth.is_assigned_panel_member(t.id)
    ))
);

CREATE POLICY p_thesis_domain_mappings_select ON thesis_domain_mappings FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR auth.is_assigned_guide(t.id)
        OR auth.is_assigned_coguide(t.id)
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DC', 'DHOD', 'DCEC_MEMBER'))
        OR auth.is_assigned_panel_member(t.id)
    ))
);
CREATE POLICY p_thesis_domain_mappings_modify ON thesis_domain_mappings FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND t.student_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND t.student_id = auth.uid())
);

-- Annexure 1 & Preferences (Tables 19-20)
CREATE POLICY p_annexure_1_select ON annexure_1_submissions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('DC', 'HOD', 'DHOD', 'DCEC_MEMBER'))
    ))
);
CREATE POLICY p_annexure_1_insert ON annexure_1_submissions FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND t.student_id = auth.uid())
);

CREATE POLICY p_guide_preferences_select ON guide_preferences FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM annexure_1_submissions a1
        JOIN theses t ON t.id = a1.thesis_id
        WHERE a1.id = annexure_1_id AND (
            auth.uid() = t.student_id
            OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('DC', 'HOD', 'DHOD', 'DCEC_MEMBER'))
        )
    )
);
CREATE POLICY p_guide_preferences_insert ON guide_preferences FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM annexure_1_submissions a1
        JOIN theses t ON t.id = a1.thesis_id
        WHERE a1.id = annexure_1_id AND t.student_id = auth.uid()
    )
);

-- DCEC Screening & Allocation (Tables 21-25)
CREATE POLICY p_dcec_dockets_select ON dcec_dockets FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND t.department_id = auth.jwt_dept_id() AND auth.has_role('DC', 'HOD', 'DHOD', 'DCEC_MEMBER'))
);
CREATE POLICY p_dcec_dockets_modify ON dcec_dockets FOR ALL TO authenticated USING (
    auth.has_role('DC')
) WITH CHECK (
    auth.has_role('DC')
);

CREATE POLICY p_dcec_decisions_select ON dcec_decisions FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM dcec_dockets dd
        JOIN theses t ON t.id = dd.thesis_id
        WHERE dd.id = docket_id AND (
            auth.uid() = t.student_id
            OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('DC', 'HOD', 'DHOD', 'DCEC_MEMBER'))
        )
    )
);
CREATE POLICY p_dcec_decisions_insert ON dcec_decisions FOR INSERT TO authenticated WITH CHECK (
    auth.is_active_dcec_chair((SELECT t.department_id FROM dcec_dockets dd JOIN theses t ON t.id = dd.thesis_id WHERE dd.id = docket_id))
);

CREATE POLICY p_dcec_delegations_select ON dcec_delegations FOR SELECT TO authenticated USING (
    department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DHOD', 'ADMIN')
);
CREATE POLICY p_dcec_delegations_admin ON dcec_delegations FOR ALL TO authenticated USING (
    department_id = auth.jwt_dept_id() AND auth.has_role('HOD')
) WITH CHECK (
    department_id = auth.jwt_dept_id() AND auth.has_role('HOD')
);

CREATE POLICY p_guide_allocations_select ON guide_allocations FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR auth.uid() IN (guide_id, co_guide_id)
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('DHOD', 'HOD', 'DC'))
    ))
);
CREATE POLICY p_guide_allocations_dhod ON guide_allocations FOR ALL TO authenticated USING (
    auth.has_role('DHOD')
) WITH CHECK (
    auth.has_role('DHOD')
);

CREATE POLICY p_guide_allocation_history_select ON guide_allocation_history FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('DHOD', 'HOD', 'DC'))
    ))
);

-- Annexure 2 & Endorsements (Tables 26-27)
CREATE POLICY p_annexure_2_select ON annexure_2_submissions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR auth.is_assigned_guide(t.id)
        OR auth.is_assigned_coguide(t.id)
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DC', 'DCEC_MEMBER'))
    ))
);
CREATE POLICY p_annexure_2_insert ON annexure_2_submissions FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND t.student_id = auth.uid())
);

CREATE POLICY p_supervisor_endorsements_select ON supervisor_endorsements FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR auth.is_assigned_guide(t.id)
        OR auth.is_assigned_coguide(t.id)
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DC', 'DCEC_MEMBER'))
    ))
);
CREATE POLICY p_supervisor_endorsements_insert ON supervisor_endorsements FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = faculty_id AND (auth.is_assigned_guide(thesis_id) OR auth.is_assigned_coguide(thesis_id))
);

-- Logbook & Progress (Tables 28-30)
CREATE POLICY p_digital_logbook_select ON digital_logbook_entries FOR SELECT TO authenticated USING (
    auth.uid() = student_id
    OR auth.is_assigned_guide(thesis_id)
    OR auth.is_assigned_coguide(thesis_id)
);
CREATE POLICY p_digital_logbook_insert ON digital_logbook_entries FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = student_id
);

CREATE POLICY p_logbook_verifications_select ON logbook_verifications FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM digital_logbook_entries dle
        WHERE dle.id = logbook_entry_id AND (
            auth.uid() = dle.student_id
            OR auth.is_assigned_guide(dle.thesis_id)
            OR auth.is_assigned_coguide(dle.thesis_id)
        )
    )
);
CREATE POLICY p_logbook_verifications_insert ON logbook_verifications FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = verifier_faculty_id
    AND EXISTS (
        SELECT 1 FROM digital_logbook_entries dle
        WHERE dle.id = logbook_entry_id AND (
            auth.is_assigned_guide(dle.thesis_id) OR auth.is_assigned_coguide(dle.thesis_id)
        )
    )
);

CREATE POLICY p_periodic_progress_select ON periodic_progress_reports FOR SELECT TO authenticated USING (
    auth.uid() = student_id
    OR auth.is_assigned_guide(thesis_id)
    OR auth.is_assigned_coguide(thesis_id)
);
CREATE POLICY p_periodic_progress_insert ON periodic_progress_reports FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = student_id
);

-- Dynamic Rubrics (Tables 31-34)
CREATE POLICY p_rubrics_select ON rubrics FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_rubrics_admin ON rubrics FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_rubric_versions_select ON rubric_versions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_rubric_versions_admin ON rubric_versions FOR ALL TO authenticated USING (auth.has_role('ADMIN', 'HOD')) WITH CHECK (auth.has_role('ADMIN', 'HOD'));

CREATE POLICY p_rubric_criteria_select ON rubric_criteria FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_rubric_criteria_admin ON rubric_criteria FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_rubric_levels_select ON rubric_achievement_levels FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_rubric_levels_admin ON rubric_achievement_levels FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

-- Milestone Evaluations (Tables 35-36)
CREATE POLICY p_milestone_evaluations_select ON milestone_evaluations FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR auth.is_assigned_guide(t.id)
        OR auth.is_assigned_coguide(t.id)
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('DC', 'HOD', 'DCEC_MEMBER'))
    ))
);
CREATE POLICY p_milestone_evaluations_insert ON milestone_evaluations FOR INSERT TO authenticated WITH CHECK (
    auth.has_role('DCEC_MEMBER', 'HOD')
);

CREATE POLICY p_eval_criterion_scores_select ON evaluation_criterion_scores FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM milestone_evaluations me
        JOIN theses t ON t.id = me.thesis_id
        WHERE me.id = milestone_evaluation_id AND (
            auth.uid() = t.student_id
            OR auth.is_assigned_guide(t.id)
            OR auth.is_assigned_coguide(t.id)
            OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('DC', 'HOD', 'DCEC_MEMBER'))
        )
    )
);
CREATE POLICY p_eval_criterion_scores_insert ON evaluation_criterion_scores FOR INSERT TO authenticated WITH CHECK (
    auth.has_role('DCEC_MEMBER', 'HOD')
);

-- Documents & Storage (Tables 45-47)
CREATE POLICY p_documents_select ON documents FOR SELECT TO authenticated USING (
    (is_student_restricted = FALSE OR auth.has_role('STUDENT') = FALSE)
    AND EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR auth.is_assigned_guide(t.id)
        OR auth.is_assigned_coguide(t.id)
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('DC', 'HOD', 'DHOD', 'DCEC_MEMBER'))
        OR auth.is_assigned_panel_member(t.id)
    ))
);
CREATE POLICY p_documents_insert ON documents FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = created_by
);

CREATE POLICY p_document_versions_select ON document_versions FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM documents d
        JOIN theses t ON t.id = d.thesis_id
        WHERE d.id = document_id
          AND (d.is_student_restricted = FALSE OR auth.has_role('STUDENT') = FALSE)
          AND (
            auth.uid() = t.student_id
            OR auth.is_assigned_guide(t.id)
            OR auth.is_assigned_coguide(t.id)
            OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('DC', 'HOD', 'DHOD', 'DCEC_MEMBER'))
            OR auth.is_assigned_panel_member(t.id)
          )
    )
);
CREATE POLICY p_document_versions_insert ON document_versions FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = uploaded_by
);

CREATE POLICY p_doc_access_policies_select ON document_access_policies FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_doc_access_policies_admin ON document_access_policies FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

-- Annexure 5 & Annexure 6 (Tables 37-38)
CREATE POLICY p_annexure_5_select ON annexure_5_submissions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR auth.is_assigned_guide(t.id)
        OR auth.is_assigned_coguide(t.id)
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DC'))
        OR auth.is_assigned_panel_member(t.id)
    ))
);
CREATE POLICY p_annexure_5_insert ON annexure_5_submissions FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND t.student_id = auth.uid())
);

-- CRITICAL SECURITY RULE: Student Access Permanently Blocked from Annexure 6 at RLS Layer
CREATE POLICY p_annexure_6_select ON annexure_6_evaluations FOR SELECT TO authenticated USING (
    auth.has_role('STUDENT') = FALSE
    AND (
        auth.uid() = guide_id
        OR (EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DCEC_CHAIR')))
        OR auth.is_assigned_panel_member(thesis_id)
    )
);
CREATE POLICY p_annexure_6_insert ON annexure_6_evaluations FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = guide_id AND auth.is_assigned_guide(thesis_id) AND auth.has_role('STUDENT') = FALSE
);

-- Viva Defense & Remediation (Tables 39-44)
CREATE POLICY p_viva_defenses_select ON viva_defenses FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR auth.is_assigned_panel_member(t.id)
        OR auth.is_assigned_guide(t.id)
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DC'))
    ))
);
CREATE POLICY p_viva_defenses_admin ON viva_defenses FOR ALL TO authenticated USING (
    auth.has_role('DC', 'HOD')
) WITH CHECK (
    auth.has_role('DC', 'HOD')
);

CREATE POLICY p_defense_panels_select ON defense_panels FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM viva_defenses vd
        JOIN theses t ON t.id = vd.thesis_id
        WHERE vd.id = viva_defense_id AND (
            auth.uid() = t.student_id
            OR auth.is_assigned_panel_member(t.id)
            OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DC'))
        )
    )
);
CREATE POLICY p_defense_panels_admin ON defense_panels FOR ALL TO authenticated USING (
    auth.has_role('HOD')
) WITH CHECK (
    auth.has_role('HOD')
);

CREATE POLICY p_panel_member_assignments_select ON panel_member_assignments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_panel_member_assignments_admin ON panel_member_assignments FOR ALL TO authenticated USING (
    auth.has_role('HOD')
) WITH CHECK (
    auth.has_role('HOD')
);

CREATE POLICY p_panel_member_evaluations_select ON panel_member_evaluations FOR SELECT TO authenticated USING (
    auth.uid() = faculty_id
    OR EXISTS (
        SELECT 1 FROM viva_defenses vd
        JOIN theses t ON t.id = vd.thesis_id
        WHERE vd.id = viva_defense_id AND t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD')
    )
);
CREATE POLICY p_panel_member_evaluations_insert ON panel_member_evaluations FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = faculty_id
    AND auth.is_assigned_panel_member((SELECT thesis_id FROM viva_defenses WHERE id = viva_defense_id))
);

CREATE POLICY p_re_viva_cycles_select ON re_viva_cycles FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR auth.is_assigned_guide(t.id)
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'DC'))
    ))
);

CREATE POLICY p_final_result_compilations_select ON final_result_compilations FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM theses t WHERE t.id = thesis_id AND (
        auth.uid() = t.student_id
        OR (t.department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'ADMIN'))
    ))
);
CREATE POLICY p_final_result_compilations_insert ON final_result_compilations FOR INSERT TO authenticated WITH CHECK (
    auth.has_role('HOD')
);

-- Notifications & Audit (Tables 48-51)
CREATE POLICY p_academic_events_select ON academic_events FOR SELECT TO authenticated USING (auth.has_role('ADMIN', 'HOD'));

CREATE POLICY p_notification_messages_select ON notification_messages FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM notification_deliveries nd WHERE nd.message_id = id AND nd.recipient_user_id = auth.uid())
    OR auth.has_role('ADMIN')
);

CREATE POLICY p_notification_deliveries_select ON notification_deliveries FOR SELECT TO authenticated USING (
    recipient_user_id = auth.uid() OR auth.has_role('ADMIN')
);
CREATE POLICY p_notification_deliveries_update ON notification_deliveries FOR UPDATE TO authenticated USING (
    recipient_user_id = auth.uid()
) WITH CHECK (
    recipient_user_id = auth.uid()
);

CREATE POLICY p_audit_events_select ON audit_events FOR SELECT TO authenticated USING (
    auth.has_role('ADMIN', 'HOD')
);

-- Configuration & Change Logs (Tables 52-54)
CREATE POLICY p_system_configs_select ON system_configurations FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_system_configs_admin ON system_configurations FOR ALL TO authenticated USING (auth.has_role('ADMIN')) WITH CHECK (auth.has_role('ADMIN'));

CREATE POLICY p_policy_configs_select ON academic_policy_configurations FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY p_policy_configs_admin ON academic_policy_configurations FOR ALL TO authenticated USING (
    department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'ADMIN')
) WITH CHECK (
    department_id = auth.jwt_dept_id() AND auth.has_role('HOD', 'ADMIN')
);

CREATE POLICY p_config_change_logs_select ON configuration_change_logs FOR SELECT TO authenticated USING (
    auth.has_role('ADMIN', 'HOD')
);
