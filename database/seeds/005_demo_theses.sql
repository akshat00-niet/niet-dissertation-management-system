-- Seed 005: Demo Dissertation Theses, Titles, Annexure 1 & Guide Preferences
-- Target: Local Development Database ONLY

BEGIN;

-- 1. Thesis Aggregate Roots
INSERT INTO theses (
    id, tracking_number, student_id, department_id, session_id,
    current_stage, current_state, guide_id, co_guide_id, defense_cycle_index, created_at, updated_at
) VALUES
(
    '60000000-0000-0000-0000-000000000001',
    'NIET-DIS-CSE-2025-001',
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'STAGE_3_PROGRESS',
    'PROPOSAL_APPROVED',
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555',
    1,
    clock_timestamp() - INTERVAL '30 days',
    clock_timestamp() - INTERVAL '5 days'
),
(
    '60000000-0000-0000-0000-000000000002',
    'NIET-DIS-ECE-2025-001',
    '22222222-2222-2222-2222-222222222222',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    'STAGE_1_TOPIC',
    'TOPIC_SUBMITTED',
    '44444444-4444-4444-4444-444444444444',
    NULL,
    1,
    clock_timestamp() - INTERVAL '5 days',
    clock_timestamp() - INTERVAL '5 days'
)
ON CONFLICT (id) DO UPDATE SET
    current_stage = EXCLUDED.current_stage,
    current_state = EXCLUDED.current_state;

-- 2. Thesis Titles
INSERT INTO thesis_titles (
    id, thesis_id, proposed_title, final_approved_title, normalized_title, is_approved, approved_at
) VALUES
(
    '61000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'Deep Learning Based Anomaly Detection for Critical Healthcare IoT Infrastructure',
    'Deep Learning Based Anomaly Detection for Critical Healthcare IoT Infrastructure',
    'deep learning based anomaly detection for critical healthcare iot infrastructure',
    TRUE,
    clock_timestamp() - INTERVAL '25 days'
),
(
    '61000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000002',
    'Ultra Low Power Sub-Threshold SRAM Architecture for Biomedical Implants',
    NULL,
    'ultra low power sub-threshold sram architecture for biomedical implants',
    FALSE,
    NULL
)
ON CONFLICT (thesis_id) DO NOTHING;

-- 3. Thesis Domain Mappings
INSERT INTO thesis_domain_mappings (
    id, thesis_id, domain_id, is_primary
) VALUES
(
    '62000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    TRUE
),
(
    '62000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000003',
    TRUE
)
ON CONFLICT (thesis_id, domain_id) DO NOTHING;

-- 4. Annexure 1 Submissions
INSERT INTO annexure_1_submissions (
    id, thesis_id, proposed_title, broad_domain, problem_statement, expected_outcomes, status, submitted_at
) VALUES
(
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'Deep Learning Based Anomaly Detection for Critical Healthcare IoT Infrastructure',
    'Artificial Intelligence & Machine Learning',
    'Healthcare IoT devices are increasingly vulnerable to telemetry-based zero-day intrusion patterns.',
    'A lightweight transformer model running on ARM Cortex edge microcontrollers with <10ms inference latency.',
    'APPROVED',
    clock_timestamp() - INTERVAL '28 days'
),
(
    '70000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000002',
    'Ultra Low Power Sub-Threshold SRAM Architecture for Biomedical Implants',
    'VLSI & Low-Power Embedded Systems',
    'Sub-threshold SRAM suffers from severe read/write stability degradation under process variations.',
    'An 8T SRAM cell operating reliably at 0.3V with 40% reduced static power dissipation.',
    'SUBMITTED',
    clock_timestamp() - INTERVAL '4 days'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Guide Preferences (Ranked 1..4)
INSERT INTO guide_preferences (
    id, annexure_1_id, preference_rank, faculty_id, domain_justification
) VALUES
(
    '71000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    1,
    '33333333-3333-3333-3333-333333333333',
    'Dr. Rajesh Kumar specializes in ML anomaly detection algorithms.'
),
(
    '71000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000001',
    2,
    '55555555-5555-5555-5555-555555555555',
    'Dr. Amit Patel specializes in cybersecurity and edge architectures.'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
