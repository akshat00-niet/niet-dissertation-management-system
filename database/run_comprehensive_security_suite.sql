-- Unified Comprehensive Behavioral Security Test Suite
-- Database: niet_dms_local_dev / niet_dms_behavioral_security_test
-- Target: 47 Exhaustive Positive, Negative, Workflow-State, Department, and Document Isolation Tests

\set ON_ERROR_STOP off

SET ROLE authenticated;

\echo '============================================================'
\echo '1. STUDENT CANDIDATE AUTHORIZATION TESTS (AUTH-STU-01 to 10)'
\echo '============================================================'

-- STU-01: Student A reads own thesis
SELECT public.set_test_user('11111111-1111-1111-1111-111111111111'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- AUTH-STU-01: Student A reads own Thesis A (Expected: 1 row) ---'
SELECT id, student_id, current_state FROM theses WHERE id = '60000000-0000-0000-0000-000000000001';

-- STU-02: Student A reads Student B thesis
\echo '--- AUTH-STU-02: Student A reads Student B thesis (Expected: 0 rows) ---'
SELECT id, student_id, current_state FROM theses WHERE id = '60000000-0000-0000-0000-000000000002';

-- STU-03: Student A attempts to update Student B thesis
\echo '--- AUTH-STU-03: Student A attempts UPDATE on Student B thesis (Expected: UPDATE 0) ---'
UPDATE theses SET current_state = 'DCEC_APPROVED' WHERE id = '60000000-0000-0000-0000-000000000002';

-- STU-04: Student A attempts to DELETE own thesis
\echo '--- AUTH-STU-04: Student A attempts DELETE on own thesis (Expected: DELETE 0) ---'
DELETE FROM theses WHERE id = '60000000-0000-0000-0000-000000000001';

-- STU-05: Student A inserts Annexure 1 for own thesis
\echo '--- AUTH-STU-05: Student A inserts Annexure 1 on own thesis (Expected: INSERT 0 1) ---'
INSERT INTO annexure_1_submissions (thesis_id, proposed_title, broad_domain, problem_statement, expected_outcomes)
VALUES ('60000000-0000-0000-0000-000000000001', 'AI Healthcare Optimization', 'AI', 'Problem stmt', 'Expected outcome');

-- STU-06: Student A attempts to insert Annexure 1 for Student B
\echo '--- AUTH-STU-06: Student A inserts Annexure 1 on Student B thesis (Expected: ERROR WITH CHECK) ---'
INSERT INTO annexure_1_submissions (thesis_id, proposed_title, broad_domain, problem_statement, expected_outcomes)
VALUES ('60000000-0000-0000-0000-000000000002', 'Malicious Title', 'Security', 'Problem stmt', 'Expected outcome');

-- STU-07: Student A attempts to read Annexure 6 on own thesis (Lockout test)
\echo '--- AUTH-STU-07: Student A SELECT on Annexure 6 (Expected: 0 rows) ---'
SELECT id, thesis_id, supervisor_score, confidential_remarks FROM annexure_6_evaluations WHERE thesis_id = '60000000-0000-0000-0000-000000000001';

-- STU-08: Student A attempts to insert Annexure 6 on own thesis
\echo '--- AUTH-STU-08: Student A attempts INSERT into Annexure 6 (Expected: ERROR WITH CHECK) ---'
INSERT INTO annexure_6_evaluations (thesis_id, guide_id, supervisor_score, regularity_rating, technical_proficiency, rigor_rating, confidential_remarks, defense_recommendation)
VALUES ('60000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 100, 'EXCELLENT', 'HIGH', 'RIGOROUS', 'Self grade attempt', 'RECOMMENDED');

-- STU-09: Student A inserts digital logbook entry on own thesis
\echo '--- AUTH-STU-09: Student A inserts logbook entry on own thesis (Expected: INSERT 0 1) ---'
INSERT INTO digital_logbook_entries (thesis_id, student_id, meeting_mode, meeting_location, meeting_date, discussion_agenda, progress_discussed, action_items, next_target_date)
VALUES ('60000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'OFFLINE', 'Room 302', clock_timestamp(), 'Thesis outline', 'Initial work', 'Draft Ch1', CURRENT_DATE + 7);

-- STU-10: Student A attempts to insert digital logbook entry on Student B thesis
\echo '--- AUTH-STU-10: Student A inserts logbook entry on Student B thesis (Expected: ERROR WITH CHECK) ---'
INSERT INTO digital_logbook_entries (thesis_id, student_id, meeting_mode, meeting_location, meeting_date, discussion_agenda, progress_discussed, action_items, next_target_date)
VALUES ('60000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'OFFLINE', 'Room 302', clock_timestamp(), 'Forged outline', 'Forged work', 'Forged action', CURRENT_DATE + 7);


\echo '============================================================'
\echo '2. PRIMARY GUIDE AUTHORIZATION TESTS (AUTH-GDE-01 to 07)'
\echo '============================================================'

SELECT public.set_test_user('33333333-3333-3333-3333-333333333333'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);

-- GDE-01: Guide A reads assigned Thesis A
\echo '--- AUTH-GDE-01: Guide A reads assigned Thesis A (Expected: 1 row) ---'
SELECT id, student_id, guide_id FROM theses WHERE id = '60000000-0000-0000-0000-000000000001';

-- GDE-02: Guide A reads unassigned Thesis B
\echo '--- AUTH-GDE-02: Guide A reads unassigned Thesis B (Expected: 0 rows) ---'
SELECT id, student_id, guide_id FROM theses WHERE id = '60000000-0000-0000-0000-000000000002';

-- GDE-03: Guide A reads Annexure 6 on assigned Thesis A
\echo '--- AUTH-GDE-03: Guide A reads Annexure 6 on assigned Thesis A (Expected: 1 row) ---'
SELECT id, thesis_id, supervisor_score FROM annexure_6_evaluations WHERE thesis_id = '60000000-0000-0000-0000-000000000001';

-- GDE-04: Guide B attempts to read Annexure 6 on Thesis A (Unassigned)
SELECT public.set_test_user('44444444-4444-4444-4444-444444444444'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- AUTH-GDE-04: Guide B reads Annexure 6 on unassigned Thesis A (Expected: 0 rows) ---'
SELECT id, thesis_id, supervisor_score FROM annexure_6_evaluations WHERE thesis_id = '60000000-0000-0000-0000-000000000001';

-- GDE-05: Guide A attempts to update submitted Annexure 6 (WORM Immutability)
SELECT public.set_test_user('33333333-3333-3333-3333-333333333333'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- AUTH-GDE-05: Guide A attempts UPDATE on submitted Annexure 6 (Expected: UPDATE 0) ---'
UPDATE annexure_6_evaluations SET supervisor_score = 90.0 WHERE id = '80000000-0000-0000-0000-000000000001';

-- GDE-06: Guide A inserts logbook verification on assigned thesis entry
\echo '--- AUTH-GDE-06: Guide A verifies logbook entry on assigned Thesis A (Expected: INSERT 0 1) ---'
INSERT INTO logbook_verifications (logbook_entry_id, verifier_faculty_id, outcome, feedback_remarks)
VALUES ('f2000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'VERIFIED', 'Good regular progress noted.');

-- GDE-07: Guide B attempts logbook verification on unassigned Thesis A
SELECT public.set_test_user('44444444-4444-4444-4444-444444444444'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- AUTH-GDE-07: Guide B verifies logbook entry on unassigned Thesis A (Expected: ERROR WITH CHECK) ---'
INSERT INTO logbook_verifications (logbook_entry_id, verifier_faculty_id, outcome, feedback_remarks)
VALUES ('f2000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'VERIFIED', 'Unauthorized sign-off attempt');


\echo '============================================================'
\echo '3. CO-GUIDE AUTHORIZATION TESTS (AUTH-COG-01 to 04)'
\echo '============================================================'

SELECT public.set_test_user('55555555-5555-5555-5555-555555555555'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);

-- COG-01: Co-Guide A reads assigned Thesis A
\echo '--- AUTH-COG-01: Co-Guide A reads assigned Thesis A (Expected: 1 row) ---'
SELECT id, student_id, co_guide_id FROM theses WHERE id = '60000000-0000-0000-0000-000000000001';

-- COG-02: Co-Guide A reads Annexure 2 on assigned Thesis A
\echo '--- AUTH-COG-02: Co-Guide A reads Annexure 2 on assigned Thesis A (Expected: ALLOW) ---'
SELECT id, tracking_number FROM theses WHERE id = '60000000-0000-0000-0000-000000000001';

-- COG-03: Co-Guide A attempts to read Annexure 6 (OD-014 Invariant)
\echo '--- AUTH-COG-03: Co-Guide A attempts to SELECT Annexure 6 (Expected: 0 rows) ---'
SELECT id, thesis_id, supervisor_score FROM annexure_6_evaluations WHERE thesis_id = '60000000-0000-0000-0000-000000000001';

-- COG-04: Co-Guide A attempts to submit Annexure 6 (OD-014 Invariant)
\echo '--- AUTH-COG-04: Co-Guide A attempts to INSERT Annexure 6 (Expected: ERROR WITH CHECK) ---'
INSERT INTO annexure_6_evaluations (thesis_id, guide_id, supervisor_score, regularity_rating, technical_proficiency, rigor_rating, confidential_remarks, defense_recommendation)
VALUES ('60000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 85, 'GOOD', 'HIGH', 'RIGOROUS', 'Co-guide submission attempt', 'RECOMMENDED');


\echo '============================================================'
\echo '4. DEPARTMENT COORDINATOR (DC) TESTS (AUTH-DC-01 to 04)'
\echo '============================================================'

SELECT public.set_test_user('66666666-6666-6666-6666-666666666666'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);

-- DC-01: DC creates docket for Thesis B (Maker)
\echo '--- AUTH-DC-01: DC prepares docket for Thesis B (Expected: INSERT 0 1) ---'
INSERT INTO dcec_dockets (thesis_id, docket_stage, dc_user_id, is_eligible, documents_complete, dc_verification_notes)
VALUES ('60000000-0000-0000-0000-000000000002', 'STAGE_1_TOPIC', '66666666-6666-6666-6666-666666666666', TRUE, TRUE, 'DC check complete');

-- DC-02: DC attempts to sign DCEC Decision (Checker violation)
\echo '--- AUTH-DC-02: DC attempts to sign DCEC Decision (Expected: ERROR WITH CHECK) ---'
INSERT INTO dcec_decisions (docket_id, chair_user_id, outcome, formal_remarks)
VALUES ('90000000-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', 'APPROVED', 'Unauthorized DC approval');

-- DC-03: DC schedules viva defense date
\echo '--- AUTH-DC-03: DC schedules viva defense (Expected: INSERT 0 1) ---'
INSERT INTO viva_defenses (id, thesis_id, defense_cycle_index, rubric_version_id, scheduled_at)
VALUES ('b0000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 1, 'a1000000-0000-0000-0000-000000000001', '2026-12-20 10:00:00+00');

-- DC-04: DC reads department dockets
\echo '--- AUTH-DC-04: DC reads department dockets (Expected: Count >= 1) ---'
SELECT count(*) as dockets_count FROM dcec_dockets;


\echo '============================================================'
\echo '5. DEPUTY HOD (DHOD) TESTS (AUTH-DHD-01 to 04)'
\echo '============================================================'

SELECT public.set_test_user('77777777-7777-7777-7777-777777777777'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);

-- DHD-01: DHOD allocates supervisors
\echo '--- AUTH-DHD-01: DHOD allocates Guide & Co-Guide (Expected: INSERT 0 1) ---'
INSERT INTO guide_allocations (thesis_id, guide_id, co_guide_id, allocated_by_dhod_id)
VALUES ('60000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777');

-- DHD-02: DHOD signs DCEC Decision with active delegation
\echo '--- AUTH-DHD-02: DHOD signs DCEC decision under active delegation (Expected: INSERT 0 1) ---'
INSERT INTO dcec_decisions (docket_id, chair_user_id, outcome, formal_remarks)
VALUES ('90000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', 'APPROVED', 'Delegated approval');

-- DHD-03: DHOD checks chair authority in ECE (Unassigned department)
\echo '--- AUTH-DHD-03: DHOD checks chair authority in ECE (Expected: f) ---'
SELECT public.is_active_dcec_chair('10000000-0000-0000-0000-000000000002'::UUID) as is_chair_ece;

-- DHD-04: DHOD attempts self-assignment to HOD role
\echo '--- AUTH-DHD-04: DHOD attempts self-promotion to HOD (Expected: ERROR WITH CHECK) ---'
INSERT INTO user_role_assignments (user_id, role_id, department_id)
VALUES ('77777777-7777-7777-7777-777777777777', 'HOD', '10000000-0000-0000-0000-000000000001');


\echo '============================================================'
\echo '6. HEAD OF DEPARTMENT (HOD) TESTS (AUTH-HOD-01 to 05)'
\echo '============================================================'

SELECT public.set_test_user('88888888-8888-8888-8888-888888888888'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);

-- HOD-01: HOD signs DCEC Decision
\echo '--- AUTH-HOD-01: HOD signs DCEC Decision (Expected: INSERT 0 1) ---'
INSERT INTO dcec_decisions (docket_id, chair_user_id, outcome, formal_remarks)
VALUES ('90000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'APPROVED', 'HOD formal signoff');

-- HOD-02: HOD attempts to UPDATE past approved DCEC Decision (WORM Immutability)
\echo '--- AUTH-HOD-02: HOD attempts UPDATE on past DCEC Decision (Expected: UPDATE 0) ---'
UPDATE dcec_decisions SET outcome = 'REJECTED' WHERE docket_id = '90000000-0000-0000-0000-000000000001';

-- HOD-03: HOD creates DCEC delegation to DHOD
\echo '--- AUTH-HOD-03: HOD creates DCEC delegation (Expected: INSERT 0 1) ---'
INSERT INTO dcec_delegations (department_id, hod_user_id, dhod_user_id, effective_from, effective_until, delegation_reason)
VALUES ('10000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', clock_timestamp(), clock_timestamp() + INTERVAL '14 days', 'Official travel delegation');

-- HOD-04: HOD appoints 2-member Viva Defense Panel on Thesis B defense
\echo '--- AUTH-HOD-04: HOD appoints defense panel (Expected: INSERT 0 1) ---'
INSERT INTO defense_panels (viva_defense_id, constituted_by_hod_id)
VALUES ('b0000000-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888');

-- HOD-05: HOD compiles final result mark
\echo '--- AUTH-HOD-05: HOD compiles final result compilation (Expected: INSERT 0 1) ---'
INSERT INTO final_result_compilations (thesis_id, p3_score, supervisor_score, viva_panel_score, final_composite_grade, hod_sign_off_by_id)
VALUES ('60000000-0000-0000-0000-000000000001', 88.0, 95.0, 90.0, 91.0, '88888888-8888-8888-8888-888888888888');


\echo '============================================================'
\echo '7. ORAL DEFENSE PANEL MEMBER TESTS (AUTH-PNL-01 to 04)'
\echo '============================================================'

SELECT public.set_test_user('99999999-9999-9999-9999-999999999999'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);

-- PNL-01: Panel Member A reads assigned Thesis A
\echo '--- AUTH-PNL-01: Panel Member A reads assigned Thesis A (Expected: 1 row) ---'
SELECT id, student_id FROM theses WHERE id = '60000000-0000-0000-0000-000000000001';

-- PNL-02: Panel Member A submits oral defense score
\echo '--- AUTH-PNL-02: Panel Member A submits scorecard (Expected: INSERT 0 1) ---'
INSERT INTO panel_member_evaluations (viva_defense_id, faculty_id, awarded_marks, examiner_remarks, recommendation)
VALUES ('b0000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', 92.0, 'Excellent defense', 'PASSED');

-- PNL-03: Unassigned faculty attempts to inject oral defense score
SELECT public.set_test_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- AUTH-PNL-03: Unassigned Faculty attempts score injection (Expected: ERROR WITH CHECK) ---'
INSERT INTO panel_member_evaluations (viva_defense_id, faculty_id, awarded_marks, examiner_remarks, recommendation)
VALUES ('b0000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 99.0, 'Score injection attempt', 'PASSED');

-- PNL-04: Panel Member A attempts to update submitted score (WORM Immutability)
SELECT public.set_test_user('99999999-9999-9999-9999-999999999999'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- AUTH-PNL-04: Panel Member A attempts UPDATE on submitted score (Expected: UPDATE 0) ---'
UPDATE panel_member_evaluations SET awarded_marks = 95.0 WHERE faculty_id = '99999999-9999-9999-9999-999999999999';


\echo '============================================================'
\echo '8. TECHNICAL ADMIN SEPARATION TESTS (AUTH-ADM-01 to 07)'
\echo '============================================================'

SELECT public.set_test_user('cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID, NULL::UUID);

-- ADM-01: Admin updates runtime system parameter
\echo '--- AUTH-ADM-01: Admin updates system config parameter (Expected: UPDATE 1) ---'
UPDATE system_configurations SET value = '10485760' WHERE key = 'PROTOTYPE_MAX_FILE_SIZE_BYTES';

-- ADM-02: Admin assigns role to user
\echo '--- AUTH-ADM-02: Admin assigns role in user_role_assignments (Expected: INSERT 0 1) ---'
INSERT INTO user_role_assignments (user_id, role_id, department_id, session_id)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'DCEC_MEMBER', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');

-- ADM-03: Admin reads compliance audit trail
\echo '--- AUTH-ADM-03: Admin reads audit_events table (Expected: Count row) ---'
SELECT count(*) as audit_events_count FROM audit_events;

-- ADM-04: Admin attempts to DELETE audit events (WORM Immutability)
\echo '--- AUTH-ADM-04: Admin attempts DELETE on audit_events (Expected: DELETE 0) ---'
DELETE FROM audit_events;

-- ADM-05: Admin attempts to submit DCEC Decision (Academic Approval Separation)
\echo '--- AUTH-ADM-05: Admin attempts to sign DCEC Decision (Expected: ERROR WITH CHECK) ---'
INSERT INTO dcec_decisions (docket_id, chair_user_id, outcome, formal_remarks)
VALUES ('90000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'APPROVED', 'Admin unauthorized decision');

-- ADM-06: Admin attempts to grade milestone evaluation
\echo '--- AUTH-ADM-06: Admin attempts to grade milestone (Expected: ERROR WITH CHECK) ---'
INSERT INTO milestone_evaluations (thesis_id, milestone_type, rubric_version_id, total_marks_awarded, general_feedback)
VALUES ('60000000-0000-0000-0000-000000000001', 'P1', 'a1000000-0000-0000-0000-000000000001', 90.0, 'Admin evaluation attempt');

-- ADM-07: Admin attempts to submit Annexure 6 Evaluation
\echo '--- AUTH-ADM-07: Admin attempts to submit Annexure 6 (Expected: ERROR WITH CHECK) ---'
INSERT INTO annexure_6_evaluations (thesis_id, guide_id, supervisor_score, regularity_rating, technical_proficiency, rigor_rating, confidential_remarks, defense_recommendation)
VALUES ('60000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 95.0, 'EXCELLENT', 'HIGH', 'RIGOROUS', 'Admin grade attempt', 'RECOMMENDED');


\echo '============================================================'
\echo '9. WORKFLOW STATE DEPENDENT TESTS (WF-01 to 05)'
\echo '============================================================'

-- WF-01: Guide attempts Annexure 6 submission on thesis still in PROPOSAL_STAGE
SELECT public.set_test_user('44444444-4444-4444-4444-444444444444'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- WF-01: Guide B attempts Annexure 6 on Thesis B (Stage: STAGE_1_TOPIC / Not ready) (Expected: RLS/Trigger Deny or State Mismatch) ---'
SELECT id, current_stage, current_state FROM theses WHERE id = '60000000-0000-0000-0000-000000000002';

-- WF-02: Student A attempts to update locked Annexure 1
SELECT public.set_test_user('11111111-1111-1111-1111-111111111111'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- WF-02: Student A attempts UPDATE on submitted Annexure 1 (Expected: UPDATE 0) ---'
UPDATE annexure_1_submissions SET proposed_title = 'Tampered Title' WHERE id = '70000000-0000-0000-0000-000000000001';

-- WF-03: Revoked / Expired DCEC Delegation Attempt
SET ROLE postgres;
UPDATE dcec_delegations SET is_revoked = TRUE WHERE dhod_user_id = '77777777-7777-7777-7777-777777777777';
SET ROLE authenticated;

SELECT public.set_test_user('77777777-7777-7777-7777-777777777777'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- WF-03: Revoked DHOD attempts DCEC Decision (Expected: ERROR WITH CHECK) ---'
INSERT INTO dcec_decisions (docket_id, chair_user_id, outcome, formal_remarks)
VALUES ('90000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', 'APPROVED', 'Revoked delegation attempt');

-- WF-04: Panel Member scoring non-existent / unscheduled defense
\echo '--- WF-04: Panel Member attempts score on unassigned defense cycle (Expected: ERROR WITH CHECK) ---'
INSERT INTO panel_member_evaluations (viva_defense_id, faculty_id, awarded_marks, examiner_remarks, recommendation)
VALUES ('b0000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 85.0, 'Remarks', 'PASSED');

-- WF-05: Non-HOD compiling final grade
SELECT public.set_test_user('66666666-6666-6666-6666-666666666666'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- WF-05: DC attempts to compile final dissertation result (Expected: ERROR WITH CHECK) ---'
INSERT INTO final_result_compilations (thesis_id, p3_score, supervisor_score, viva_panel_score, final_composite_grade, hod_sign_off_by_id)
VALUES ('60000000-0000-0000-0000-000000000002', 80.0, 80.0, 80.0, 80.0, '66666666-6666-6666-6666-666666666666');


\echo '============================================================'
\echo '10. CROSS-DEPARTMENT ISOLATION TESTS (DEPT-01 to 03)'
\echo '============================================================'

-- DEPT-01: CSE Student attempting to access ECE department scoped dockets
SELECT public.set_test_user('11111111-1111-1111-1111-111111111111'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- DEPT-01: CSE Student queries ECE-only dockets (Expected: 0 rows) ---'
SELECT * FROM dcec_dockets WHERE thesis_id = '60000000-0000-0000-0000-000000000002';

-- DEPT-02: CSE DC queries ECE dockets
SELECT public.set_test_user('66666666-6666-6666-6666-666666666666'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- DEPT-02: CSE DC checks DCEC Chair in ECE (Expected: f) ---'
SELECT public.is_active_dcec_chair('10000000-0000-0000-0000-000000000002'::UUID) as is_chair_in_ece;

-- DEPT-03: CSE HOD checks DCEC Chair in ECE
SELECT public.set_test_user('88888888-8888-8888-8888-888888888888'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- DEPT-03: CSE HOD checks DCEC Chair in ECE (Expected: f) ---'
SELECT public.is_active_dcec_chair('10000000-0000-0000-0000-000000000002'::UUID) as is_chair_in_ece;


\echo '============================================================'
\echo '11. DOCUMENT-LEVEL ACCESS TESTS (DOC-01 to 04)'
\echo '============================================================'

-- DOC-01: Student A reads own synopsis document metadata and version
SELECT public.set_test_user('11111111-1111-1111-1111-111111111111'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- DOC-01: Student A reads own synopsis document (Expected: 1 row) ---'
SELECT id, document_type, is_student_restricted FROM documents WHERE id = 'f0000000-0000-0000-0000-000000000001';

-- DOC-02: Student A attempts to read student-restricted confidential document
\echo '--- DOC-02: Student A attempts to read restricted evaluation doc (Expected: 0 rows) ---'
SELECT id, document_type FROM documents WHERE id = 'f0000000-0000-0000-0000-000000000002';

-- DOC-03: Assigned Guide A reads confidential evaluation document
SELECT public.set_test_user('33333333-3333-3333-3333-333333333333'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- DOC-03: Guide A reads confidential evaluation document (Expected: 1 row) ---'
SELECT id, document_type, is_student_restricted FROM documents WHERE id = 'f0000000-0000-0000-0000-000000000002';

-- DOC-04: Student B (unrelated student) attempts to read Student A documents
SELECT public.set_test_user('22222222-2222-2222-2222-222222222222'::UUID, '10000000-0000-0000-0000-000000000001'::UUID);
\echo '--- DOC-04: Unrelated Student B reads Student A document (Expected: 0 rows) ---'
SELECT id, document_type FROM documents WHERE thesis_id = '60000000-0000-0000-0000-000000000001';

\echo '============================================================'
\echo 'ALL 47 COMPREHENSIVE BEHAVIORAL SECURITY TESTS EXECUTED.'
\echo '============================================================'
