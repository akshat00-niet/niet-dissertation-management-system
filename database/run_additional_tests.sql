-- Additional Behavioral Security Tests
-- Database: niet_dms_behavioral_security_test

\set ON_ERROR_STOP off

SET ROLE authenticated;

\echo '============================================================'
\echo 'TEST GROUP 7: EXPIRED DELEGATION & OWNERSHIP TAMPERING'
\echo '============================================================'

-- EXP-01: DHOD attempts DCEC Decision under EXPIRED delegation (e2000000...)
-- Let's test public.is_active_dcec_chair for DHOD when active delegation is revoked
SELECT set_test_user('77777777-7777-7777-7777-777777777777', '10000000-0000-0000-0000-000000000001');

-- First revoke the active delegation to simulate expiry / revocation
SET ROLE postgres;
UPDATE dcec_delegations SET is_revoked = TRUE WHERE id = 'e1000000-0000-0000-0000-000000000001';
SET ROLE authenticated;

\echo '--- Test EXP-01: Revoked/Expired Delegation Chair Check (Expected: f) ---'
SELECT public.is_active_dcec_chair('10000000-0000-0000-0000-000000000001') as is_chair_after_revocation;

\echo '--- Test EXP-02: Revoked/Expired DHOD attempts DCEC Decision (Expected: ERROR WITH CHECK) ---'
INSERT INTO dcec_decisions (docket_id, chair_user_id, outcome, formal_remarks)
VALUES ('90000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', 'APPROVED', 'Expired delegation attempt');

-- OWN-01: Student A attempts to insert thesis claiming student_id = Student B
SELECT set_test_user('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000001');
\echo '--- Test OWN-01: Student A attempts to insert thesis for Student B (Expected: ERROR WITH CHECK) ---'
INSERT INTO theses (tracking_number, student_id, department_id, session_id, current_stage, current_state)
VALUES ('TRK-TAMPER-001', '22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'PROPOSAL_STAGE', 'DRAFT_PROPOSAL');

\echo '============================================================'
\echo 'ADDITIONAL TESTS COMPLETED.'
\echo '============================================================'
