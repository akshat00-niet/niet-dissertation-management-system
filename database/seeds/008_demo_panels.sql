-- Seed 008: Demo Rubrics, Viva Defenses & Defense Panels
-- Target: Local Development Database ONLY

BEGIN;

-- 1. Assessment Rubrics & Versions
INSERT INTO rubrics (
    id, department_id, milestone_type, title, max_score
) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'P3',
    'Final Dissertation Oral Defense Rubric',
    100.0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO rubric_versions (
    id, rubric_id, version_number, is_published, effective_from
) VALUES
(
    'a1000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    1,
    FALSE,
    '2025-08-01'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Viva Defenses
INSERT INTO viva_defenses (
    id, thesis_id, defense_cycle_index, rubric_version_id, scheduled_at
) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    1,
    'a1000000-0000-0000-0000-000000000001',
    '2026-12-15 10:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Defense Panels
INSERT INTO defense_panels (
    id, viva_defense_id, constituted_by_hod_id
) VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '88888888-8888-8888-8888-888888888888'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Panel Member Assignments
INSERT INTO panel_member_assignments (
    id, panel_id, faculty_id, evaluator_role, is_panel_chair
) VALUES
(
    'c1000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    '99999999-9999-9999-9999-999999999999',
    'EXTERNAL_EXPERT',
    TRUE
),
(
    'c1000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'INTERNAL_EXPERT',
    FALSE
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
