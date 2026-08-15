-- Seed 010: Demo Academic Policy Configurations & Sample Audit Trail
-- Target: Local Development Database ONLY
-- Clearly Marked Synthetic Development Data

BEGIN;

-- 1. Departmental Academic Policy Configurations
INSERT INTO academic_policy_configurations (
    id, department_id, policy_key, policy_value, effective_from, effective_until, updated_by
) VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'CSE_MAX_SUPERVISOR_LOAD_LIMIT',
    '{"primary_guide": 3, "coguide": 3, "description": "CSE strict capacity limit"}'::JSONB,
    clock_timestamp() - INTERVAL '60 days',
    NULL,
    '88888888-8888-8888-8888-888888888888'
),
(
    'e0000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'ECE_MAX_SUPERVISOR_LOAD_LIMIT',
    '{"primary_guide": 3, "coguide": 3, "description": "ECE strict capacity limit"}'::JSONB,
    clock_timestamp() - INTERVAL '60 days',
    NULL,
    '88888888-eeee-8888-eeee-888888888888'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Synthetic Audit Trail (Explicitly Marked DEVELOPMENT_DEMO)
INSERT INTO audit_events (
    id, actor_user_id, active_role_id, action_code, target_entity_type, target_entity_id,
    previous_state, new_state, justification, client_ip, user_agent, correlation_id, timestamp_utc
) VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'STUDENT',
    'SUBMIT_ANNEXURE_1',
    'THESIS',
    '60000000-0000-0000-0000-000000000001',
    NULL,
    '{"status": "SUBMITTED", "demo": true}'::JSONB,
    'Synthetic development fixture for audit trail testing',
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DemoHarness/1.0',
    '00000000-0000-0000-0000-000000000001',
    clock_timestamp() - INTERVAL '30 days'
),
(
    'd0000000-0000-0000-0000-000000000002',
    '88888888-8888-8888-8888-888888888888',
    'HOD',
    'APPROVE_DCEC_DOCKET',
    'DCEC_DOCKET',
    '90000000-0000-0000-0000-000000000001',
    '{"status": "PENDING"}'::JSONB,
    '{"status": "APPROVED", "demo": true}'::JSONB,
    'Synthetic development fixture for DCEC approval audit trail',
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DemoHarness/1.0',
    '00000000-0000-0000-0000-000000000002',
    clock_timestamp() - INTERVAL '25 days'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
