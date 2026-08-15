-- Seed 006: Demo Supervisor Allocations
-- Target: Local Development Database ONLY

BEGIN;

INSERT INTO guide_allocations (
    id, thesis_id, guide_id, co_guide_id, allocated_by_dhod_id, allocated_at
) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555',
    '77777777-7777-7777-7777-777777777777',
    clock_timestamp() - INTERVAL '25 days'
)
ON CONFLICT (thesis_id) DO NOTHING;

COMMIT;
