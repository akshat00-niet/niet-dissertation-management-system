-- Behavioral Security & RLS Test Harness Setup
-- Database: niet_dms_behavioral_security_test

-- 1. Setup Mock Supabase Auth Session Helper for Local Test Execution
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
END $$;

GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Function to set active test user session
CREATE OR REPLACE FUNCTION set_test_user(p_user_id UUID, p_dept_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('request.jwt.claim.sub', p_user_id::text, false);
    IF p_dept_id IS NOT NULL THEN
        PERFORM set_config('request.jwt.claims', json_build_object('app_metadata', json_build_object('department_id', p_dept_id::text))::text, false);
    ELSE
        PERFORM set_config('request.jwt.claims', '{}', false);
    END IF;
END $$;

-- Update auth.uid() and auth.jwt() stubs in test DB to read session settings
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB LANGUAGE sql STABLE AS $$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::JSONB, '{}'::JSONB);
$$;

-- 2. Seed Baseline Test Fixtures
BEGIN;

-- Departments
INSERT INTO departments (id, code, name, school_name) VALUES
('10000000-0000-0000-0000-000000000001', 'CSE', 'Computer Science & Engineering', 'School of Engineering'),
('10000000-0000-0000-0000-000000000002', 'ECE', 'Electronics & Communication', 'School of Engineering');

-- Academic Session & Programs
INSERT INTO academic_sessions (id, session_name, start_date, end_date, is_current) VALUES
('20000000-0000-0000-0000-000000000001', '2026-2027', '2026-08-01', '2027-07-31', TRUE);

INSERT INTO programs (id, department_id, code, name, duration_semesters) VALUES
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'MTECH-CSE', 'M.Tech CSE', 4);

INSERT INTO batches (id, program_id, session_id, name) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2026-2028');

INSERT INTO sections (id, batch_id, name) VALUES
('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'A');

-- Users
INSERT INTO users (id, institutional_email, full_name) VALUES
('11111111-1111-1111-1111-111111111111', 'student_a@niet.co.in', 'Student A (Candidate)'),
('22222222-2222-2222-2222-222222222222', 'student_b@niet.co.in', 'Student B (Candidate)'),
('33333333-3333-3333-3333-333333333333', 'guide_a@niet.co.in', 'Guide A (Faculty)'),
('44444444-4444-4444-4444-444444444444', 'guide_b@niet.co.in', 'Guide B (Faculty)'),
('55555555-5555-5555-5555-555555555555', 'coguide_a@niet.co.in', 'Co-Guide A (Faculty)'),
('66666666-6666-6666-6666-666666666666', 'dc_cse@niet.co.in', 'DC CSE (Faculty)'),
('77777777-7777-7777-7777-777777777777', 'dhod_cse@niet.co.in', 'DHOD CSE (Faculty)'),
('88888888-8888-8888-8888-888888888888', 'hod_cse@niet.co.in', 'HOD CSE (Faculty)'),
('99999999-9999-9999-9999-999999999999', 'panel_a@niet.co.in', 'Panel Member A (Faculty)'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'panel_b@niet.co.in', 'Panel Member B (Faculty)'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'faculty_rand@niet.co.in', 'Random Faculty (Faculty)'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin_user@niet.co.in', 'System Administrator');

-- Profiles
INSERT INTO student_profiles (user_id, roll_number, enrollment_number, program_id, department_id, batch_name, current_semester, is_eligible) VALUES
('11111111-1111-1111-1111-111111111111', '26MTCSE001', 'ENR26001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2026-2028', 3, TRUE),
('22222222-2222-2222-2222-222222222222', '26MTCSE002', 'ENR26002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2026-2028', 3, TRUE);

INSERT INTO faculty_profiles (user_id, employee_code, designation, department_id) VALUES
('33333333-3333-3333-3333-333333333333', 'FAC001', 'Associate Professor', '10000000-0000-0000-0000-000000000001'),
('44444444-4444-4444-4444-444444444444', 'FAC002', 'Professor', '10000000-0000-0000-0000-000000000001'),
('55555555-5555-5555-5555-555555555555', 'FAC003', 'Assistant Professor', '10000000-0000-0000-0000-000000000001'),
('66666666-6666-6666-6666-666666666666', 'FAC004', 'Associate Professor', '10000000-0000-0000-0000-000000000001'),
('77777777-7777-7777-7777-777777777777', 'FAC005', 'Professor', '10000000-0000-0000-0000-000000000001'),
('88888888-8888-8888-8888-888888888888', 'FAC006', 'Professor & HOD', '10000000-0000-0000-0000-000000000001'),
('99999999-9999-9999-9999-999999999999', 'FAC007', 'Professor', '10000000-0000-0000-0000-000000000001'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FAC008', 'Associate Professor', '10000000-0000-0000-0000-000000000001'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'FAC009', 'Assistant Professor', '10000000-0000-0000-0000-000000000001');

-- Role Assignments
INSERT INTO user_role_assignments (user_id, role_id, department_id, session_id) VALUES
('11111111-1111-1111-1111-111111111111', 'STUDENT', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('22222222-2222-2222-2222-222222222222', 'STUDENT', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('33333333-3333-3333-3333-333333333333', 'FACULTY', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('33333333-3333-3333-3333-333333333333', 'GUIDE', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('44444444-4444-4444-4444-444444444444', 'FACULTY', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('44444444-4444-4444-4444-444444444444', 'GUIDE', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('55555555-5555-5555-5555-555555555555', 'FACULTY', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('55555555-5555-5555-5555-555555555555', 'CO_GUIDE', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('66666666-6666-6666-6666-666666666666', 'FACULTY', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('66666666-6666-6666-6666-666666666666', 'DC', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('77777777-7777-7777-7777-777777777777', 'FACULTY', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('77777777-7777-7777-7777-777777777777', 'DHOD', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('88888888-8888-8888-8888-888888888888', 'FACULTY', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('88888888-8888-8888-8888-888888888888', 'HOD', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('88888888-8888-8888-8888-888888888888', 'DCEC_CHAIR', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('99999999-9999-9999-9999-999999999999', 'FACULTY', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('99999999-9999-9999-9999-999999999999', 'PANEL_MEMBER', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FACULTY', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PANEL_MEMBER', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'FACULTY', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'ADMIN', NULL, NULL);

-- Theses Fixtures
INSERT INTO theses (id, tracking_number, student_id, department_id, session_id, current_stage, current_state, guide_id, co_guide_id) VALUES
('60000000-0000-0000-0000-000000000001', 'TRK-CSE-2026-001', '11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'STAGE_1_TOPIC', 'DCEC_APPROVED', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555'),
('60000000-0000-0000-0000-000000000002', 'TRK-CSE-2026-002', '22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'STAGE_1_TOPIC', 'TOPIC_SUBMITTED', '44444444-4444-4444-4444-444444444444', NULL);

-- Annexure 1
INSERT INTO annexure_1_submissions (id, thesis_id, proposed_title, broad_domain, problem_statement, expected_outcomes, status) VALUES
('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'AI in Healthcare Analysis', 'Artificial Intelligence', 'Detailed problem statement A', 'Framework and models', 'SUBMITTED'),
('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'Quantum Computing Circuits', 'Quantum Systems', 'Detailed problem statement B', 'Simulation engine', 'SUBMITTED');

-- Annexure 6 confidential evaluation on Thesis A submitted by Guide A
INSERT INTO annexure_6_evaluations (id, thesis_id, guide_id, supervisor_score, regularity_rating, technical_proficiency, rigor_rating, confidential_remarks, defense_recommendation) VALUES
('80000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 95.0, 'EXCELLENT', 'HIGH', 'RIGOROUS', 'Outstanding work by student.', 'RECOMMENDED');

-- DCEC Docket
INSERT INTO dcec_dockets (id, thesis_id, docket_stage, dc_user_id, is_eligible, documents_complete, dc_verification_notes) VALUES
('90000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'STAGE_1_TOPIC', '66666666-6666-6666-6666-666666666666', TRUE, TRUE, 'All documents verified');

-- Rubric & Rubric Version for Viva Defenses
INSERT INTO rubrics (id, department_id, milestone_type, title, max_score) VALUES
('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'FINAL_VIVA', 'Viva Defense Standard Rubric', 100.0);

INSERT INTO rubric_versions (id, rubric_id, version_number, is_published, effective_from) VALUES
('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, FALSE, '2026-08-01');

-- Viva Defense & Defense Panel on Thesis A
INSERT INTO viva_defenses (id, thesis_id, defense_cycle_index, rubric_version_id, composite_score, outcome, scheduled_at) VALUES
('b0000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 1, 'a1000000-0000-0000-0000-000000000001', NULL, 'SCHEDULED', '2026-12-15 10:00:00+00');

INSERT INTO defense_panels (id, viva_defense_id, constituted_by_hod_id) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888');

INSERT INTO panel_member_assignments (id, panel_id, faculty_id, evaluator_role, is_panel_chair) VALUES
('d1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', 'INTERNAL_EXPERT', TRUE),
('d2000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'INTERNAL_EXPERT', FALSE);

-- Delegations: Active Delegation to DHOD for CSE, and Expired Delegation
INSERT INTO dcec_delegations (id, department_id, hod_user_id, dhod_user_id, effective_from, effective_until, is_revoked, delegation_reason) VALUES
('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', clock_timestamp() - INTERVAL '1 day', clock_timestamp() + INTERVAL '7 days', FALSE, 'HOD on academic leave'),
('e2000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', clock_timestamp() - INTERVAL '30 days', clock_timestamp() - INTERVAL '10 days', FALSE, 'Past expired delegation');

COMMIT;
