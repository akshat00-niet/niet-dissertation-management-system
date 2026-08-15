-- Behavioral Security & RLS Execution Test Suite
-- Database: niet_dms_behavioral_security_test

\set ON_ERROR_STOP off

-- Switch to non-superuser authenticated role
SET ROLE authenticated;

\echo '============================================================'
\echo 'TEST GROUP 1: STUDENT ISOLATION (S-01 to S-05)'
\echo '============================================================'

-- S-01: Student A reads own thesis
SELECT set_test_user('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000001');
\echo '--- Test S-01: Student A reads Student A thesis (Expected: 1 row) ---'
SELECT id, student_id, current_state FROM theses WHERE id = '60000000-0000-0000-0000-000000000001';

-- S-02: Student A reads Student B thesis
\echo '--- Test S-02: Student A reads Student B thesis (Expected: 0 rows) ---'
SELECT id, student_id, current_state FROM theses WHERE id = '60000000-0000-0000-0000-000000000002';

-- S-03: Student A attempts to update Student B thesis
\echo '--- Test S-03: Student A attempts to update Student B thesis (Expected: UPDATE 0) ---'
UPDATE theses SET current_state = 'DCEC_APPROVED' WHERE id = '60000000-0000-0000-0000-000000000002';

-- S-04: Student A attempts to insert Annexure 1 for Student B
\echo '--- Test S-04: Student A attempts to insert Annexure 1 on Student B thesis (Expected: ERROR WITH CHECK) ---'
INSERT INTO annexure_1_submissions (thesis_id, proposed_title, broad_domain, problem_statement, expected_outcomes) 
VALUES ('60000000-0000-0000-0000-000000000002', 'Malicious Title Override', 'Security', 'Malicious statement', 'Malicious outcome');

-- S-05: Student A attempts to read Annexure 6 (Confidential Supervisor Evaluation)
\echo '--- Test S-05: Student A attempts to SELECT Annexure 6 on own thesis (Expected: 0 rows) ---'
SELECT id, thesis_id, supervisor_score, confidential_remarks FROM annexure_6_evaluations WHERE thesis_id = '60000000-0000-0000-0000-000000000001';


\echo '============================================================'
\echo 'TEST GROUP 2: GUIDE & CO-GUIDE ISOLATION (G-01 to G-05, COG-01 to COG-03)'
\echo '============================================================'

-- G-01: Guide A reads assigned Student A thesis
SELECT set_test_user('33333333-3333-3333-3333-333333333333', '10000000-0000-0000-0000-000000000001');
\echo '--- Test G-01: Guide A reads assigned Thesis A (Expected: 1 row) ---'
SELECT id, student_id, guide_id FROM theses WHERE id = '60000000-0000-0000-0000-000000000001';

-- G-02: Guide A reads unassigned Thesis B
\echo '--- Test G-02: Guide A reads unassigned Thesis B (Expected: 0 rows) ---'
SELECT id, student_id, guide_id FROM theses WHERE id = '60000000-0000-0000-0000-000000000002';

-- G-03: Guide A reads Annexure 6 on assigned Thesis A
\echo '--- Test G-03: Guide A reads Annexure 6 on assigned Thesis A (Expected: 1 row) ---'
SELECT id, thesis_id, guide_id, supervisor_score FROM annexure_6_evaluations WHERE thesis_id = '60000000-0000-0000-0000-000000000001';

-- G-04: Guide B attempts to read Annexure 6 on Thesis A (Unassigned Guide)
SELECT set_test_user('44444444-4444-4444-4444-444444444444', '10000000-0000-0000-0000-000000000001');
\echo '--- Test G-04: Guide B attempts to read Annexure 6 on Thesis A (Expected: 0 rows) ---'
SELECT id, thesis_id, supervisor_score FROM annexure_6_evaluations WHERE thesis_id = '60000000-0000-0000-0000-000000000001';

-- G-05: Guide A attempts to update submitted Annexure 6 (WORM Immutability Test)
SELECT set_test_user('33333333-3333-3333-3333-333333333333', '10000000-0000-0000-0000-000000000001');
\echo '--- Test G-05: Guide A attempts to UPDATE submitted Annexure 6 (Expected: WORM Trigger Exception) ---'
UPDATE annexure_6_evaluations SET supervisor_score = 90.0 WHERE id = '80000000-0000-0000-0000-000000000001';

-- COG-01: Co-Guide A reads assigned Thesis A
SELECT set_test_user('55555555-5555-5555-5555-555555555555', '10000000-0000-0000-0000-000000000001');
\echo '--- Test COG-01: Co-Guide A reads assigned Thesis A (Expected: 1 row) ---'
SELECT id, student_id, co_guide_id FROM theses WHERE id = '60000000-0000-0000-0000-000000000001';

-- COG-02: Co-Guide A attempts to read Annexure 6 (OD-014 Invariant: Blocked by Default)
\echo '--- Test COG-02: Co-Guide A attempts to read Annexure 6 on Thesis A (Expected: 0 rows) ---'
SELECT id, thesis_id, supervisor_score FROM annexure_6_evaluations WHERE thesis_id = '60000000-0000-0000-0000-000000000001';

-- COG-03: Co-Guide A attempts to submit Annexure 6
\echo '--- Test COG-03: Co-Guide A attempts to submit Annexure 6 on Thesis A (Expected: ERROR WITH CHECK) ---'
INSERT INTO annexure_6_evaluations (thesis_id, guide_id, supervisor_score, regularity_rating, technical_proficiency, rigor_rating, confidential_remarks, defense_recommendation)
VALUES ('60000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 80, 'GOOD', 'MEDIUM', 'AVERAGE', 'Co-guide attempt', 'RECOMMENDED');


\echo '============================================================'
\echo 'TEST GROUP 3: DCEC MAKER-CHECKER & DELEGATION (DC-01, HOD-01, DHOD-01 to DHOD-03)'
\echo '============================================================'

-- DC-01: DC CSE creates new docket for Thesis B
SELECT set_test_user('66666666-6666-6666-6666-666666666666', '10000000-0000-0000-0000-000000000001');
\echo '--- Test DC-01: DC CSE creates docket for Thesis B (Expected: INSERT 1) ---'
INSERT INTO dcec_dockets (thesis_id, docket_stage, dc_user_id, is_eligible, documents_complete, dc_verification_notes) 
VALUES ('60000000-0000-0000-0000-000000000002', 'STAGE_1_TOPIC', '66666666-6666-6666-6666-666666666666', TRUE, TRUE, 'All documents verified');

-- DC-02: DC CSE attempts to approve docket (Maker attempting to act as Checker)
\echo '--- Test DC-02: DC CSE attempts to sign DCEC Decision (Expected: ERROR WITH CHECK) ---'
INSERT INTO dcec_decisions (docket_id, chair_user_id, outcome, formal_remarks)
VALUES ('90000000-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', 'APPROVED', 'DC unauthorized approval attempt');

-- HOD-01: HOD CSE signs DCEC Decision
SELECT set_test_user('88888888-8888-8888-8888-888888888888', '10000000-0000-0000-0000-000000000001');
\echo '--- Test HOD-01: HOD CSE signs DCEC Decision (Expected: INSERT 1) ---'
INSERT INTO dcec_decisions (docket_id, chair_user_id, outcome, formal_remarks)
VALUES ('90000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'APPROVED', 'HOD official approval');

-- DHOD-01: Delegated DHOD signs DCEC Decision with Active Delegation
SELECT set_test_user('77777777-7777-7777-7777-777777777777', '10000000-0000-0000-0000-000000000001');
\echo '--- Test DHOD-01: Delegated DHOD CSE signs DCEC Decision (Expected: INSERT 1) ---'
INSERT INTO dcec_decisions (docket_id, chair_user_id, outcome, formal_remarks)
VALUES ('90000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', 'APPROVED', 'Delegated DHOD official approval');

-- DHOD-02: DHOD attempts DCEC Decision in ECE Department (No Delegation in ECE)
\echo '--- Test DHOD-02: DHOD CSE attempts DCEC Decision in ECE Department (Expected: f) ---'
SELECT public.is_active_dcec_chair('10000000-0000-0000-0000-000000000002') as is_chair_in_ece;

-- DHOD-03: DHOD allocates Guide & Co-Guide (Annexure 2 Allocation Authority)
\echo '--- Test DHOD-03: DHOD CSE inserts guide_allocation (Expected: INSERT 1) ---'
INSERT INTO guide_allocations (thesis_id, guide_id, co_guide_id, allocated_by_dhod_id)
VALUES ('60000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777');


\echo '============================================================'
\echo 'TEST GROUP 4: PANEL MEMBER & VIVA EVALUATION (PNL-01 to PNL-03)'
\echo '============================================================'

-- PNL-01: Assigned Panel Member A reads Thesis A
SELECT set_test_user('99999999-9999-9999-9999-999999999999', '10000000-0000-0000-0000-000000000001');
\echo '--- Test PNL-01: Assigned Panel Member A reads Thesis A (Expected: 1 row) ---'
SELECT id, student_id FROM theses WHERE id = '60000000-0000-0000-0000-000000000001';

-- PNL-02: Assigned Panel Member A submits Viva Evaluation Score
\echo '--- Test PNL-02: Assigned Panel Member A submits score (Expected: INSERT 1) ---'
INSERT INTO panel_member_evaluations (viva_defense_id, faculty_id, awarded_marks, examiner_remarks, recommendation)
VALUES ('b0000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', 88.5, 'Strong presentation and domain defense.', 'PASSED');

-- PNL-03: Unassigned Faculty attempts to submit Viva Score on Thesis A
SELECT set_test_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '10000000-0000-0000-0000-000000000001');
\echo '--- Test PNL-03: Unassigned Faculty attempts score injection (Expected: ERROR WITH CHECK) ---'
INSERT INTO panel_member_evaluations (viva_defense_id, faculty_id, awarded_marks, examiner_remarks, recommendation)
VALUES ('b0000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 99.0, 'Unauthorized score injection', 'PASSED');


\echo '============================================================'
\echo 'TEST GROUP 5: TECHNICAL ADMIN SEPARATION (ADM-01 to ADM-05)'
\echo '============================================================'

SELECT set_test_user('cccccccc-cccc-cccc-cccc-cccccccccccc', NULL);

-- ADM-01: Admin updates runtime system parameter
\echo '--- Test ADM-01: Admin updates system parameter (Expected: UPDATE 1) ---'
UPDATE system_configurations SET value = '10485760' WHERE key = 'PROTOTYPE_MAX_FILE_SIZE_BYTES';

-- ADM-02: Admin attempts to submit DCEC Decision (Academic Approval Separation)
\echo '--- Test ADM-02: Admin attempts to sign DCEC Decision (Expected: ERROR WITH CHECK) ---'
INSERT INTO dcec_decisions (docket_id, chair_user_id, outcome, formal_remarks)
VALUES ('90000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'APPROVED', 'Admin unauthorized academic decision');

-- ADM-03: Admin attempts to submit Annexure 6 Evaluation
\echo '--- Test ADM-03: Admin attempts to submit Annexure 6 (Expected: ERROR WITH CHECK) ---'
INSERT INTO annexure_6_evaluations (thesis_id, guide_id, supervisor_score, regularity_rating, technical_proficiency, rigor_rating, confidential_remarks, defense_recommendation)
VALUES ('60000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 100, 'EXCELLENT', 'HIGH', 'RIGOROUS', 'Admin evaluation attempt', 'RECOMMENDED');

-- ADM-04: Admin reads compliance audit trail
\echo '--- Test ADM-04: Admin reads audit_events table (Expected: count row) ---'
SELECT count(*) as audit_events_count FROM audit_events;

-- ADM-05: Admin attempts to DELETE from audit_events (WORM Immutability Test)
\echo '--- Test ADM-05: Admin attempts to DELETE audit_events (Expected: WORM Trigger Exception) ---'
DELETE FROM audit_events;


\echo '============================================================'
\echo 'TEST GROUP 6: IDOR & PRIVILEGE ESCALATION (SEC-01 to SEC-03)'
\echo '============================================================'

-- SEC-01: Student A attempts to grant himself ROLE_ADMIN in user_role_assignments
SELECT set_test_user('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000001');
\echo '--- Test SEC-01: Student A attempts privilege escalation into ADMIN (Expected: ERROR WITH CHECK) ---'
INSERT INTO user_role_assignments (user_id, role_id) 
VALUES ('11111111-1111-1111-1111-111111111111', 'ADMIN');

-- SEC-02: Student A attempts to create digital logbook entry pretending to be Student B
\echo '--- Test SEC-02: Student A attempts to submit logbook for Student B (Expected: ERROR WITH CHECK) ---'
INSERT INTO digital_logbook_entries (thesis_id, student_id, meeting_mode, meeting_location, meeting_date, discussion_agenda, progress_discussed, action_items, next_target_date)
VALUES ('60000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'OFFLINE', 'Room 204', clock_timestamp(), 'Falsified agenda', 'Falsified progress', 'Falsified action', CURRENT_DATE + 7);

-- SEC-03: Random Faculty attempts to grant himself HOD role
SELECT set_test_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '10000000-0000-0000-0000-000000000001');
\echo '--- Test SEC-03: Faculty attempts self-promotion to HOD (Expected: ERROR WITH CHECK) ---'
INSERT INTO user_role_assignments (user_id, role_id, department_id)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'HOD', '10000000-0000-0000-0000-000000000001');

\echo '============================================================'
\echo 'ALL BEHAVIORAL SECURITY TESTS EXECUTED.'
\echo '============================================================'
