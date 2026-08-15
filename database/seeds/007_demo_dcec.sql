-- Seed 007: Demo DCEC Screening, Decisions & Delegations
-- Target: Local Development Database ONLY

BEGIN;

-- 1. DCEC Dockets
INSERT INTO dcec_dockets (
    id, thesis_id, docket_stage, dc_user_id, is_eligible, documents_complete, dc_verification_notes, compiled_at
) VALUES
(
    '90000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'STAGE_1_TOPIC',
    '66666666-6666-6666-6666-666666666666',
    TRUE,
    TRUE,
    'Candidate meets all pre-requisite course credits and Annexure 1 proposal aligns with department focus.',
    clock_timestamp() - INTERVAL '26 days'
),
(
    '90000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000002',
    'STAGE_1_TOPIC',
    '66666666-eeee-6666-eeee-666666666666',
    TRUE,
    TRUE,
    'ECE Topic proposal verified against lab resource availability.',
    clock_timestamp() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- 2. DCEC Decisions
INSERT INTO dcec_decisions (
    id, docket_id, chair_user_id, outcome, formal_remarks, decision_at
) VALUES
(
    '91000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    '88888888-8888-8888-8888-888888888888',
    'APPROVED',
    'DCEC Committee unanimously approved dissertation topic and allocated primary domain AI/ML.',
    clock_timestamp() - INTERVAL '25 days'
)
ON CONFLICT (id) DO NOTHING;

-- 3. DCEC Delegations
INSERT INTO dcec_delegations (
    id, department_id, hod_user_id, dhod_user_id, effective_from, effective_until, is_revoked, delegation_reason
) VALUES
(
    'e1000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '88888888-8888-8888-8888-888888888888',
    '77777777-7777-7777-7777-777777777777',
    clock_timestamp() - INTERVAL '1 day',
    clock_timestamp() + INTERVAL '14 days',
    FALSE,
    'HOD on academic conference delegation'
),
(
    'e2000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '88888888-8888-8888-8888-888888888888',
    '77777777-7777-7777-7777-777777777777',
    clock_timestamp() - INTERVAL '30 days',
    clock_timestamp() - INTERVAL '10 days',
    FALSE,
    'Past expired delegation for historical test validation'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
