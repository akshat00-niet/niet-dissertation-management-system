-- Seed 009: Demo Documents, Versions & Confidential Evaluations
-- Target: Local Development Database ONLY

BEGIN;

-- 1. Documents (Step 1: Create rows)
INSERT INTO documents (
    id, thesis_id, document_type, current_version_id, is_student_restricted, created_by
) VALUES
(
    'f0000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'SYNOPSIS_DOCUMENT',
    NULL,
    FALSE,
    '11111111-1111-1111-1111-111111111111'
),
(
    'f0000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000001',
    'SUPERVISOR_EVAL_ANNEXURE_6',
    NULL,
    TRUE,
    '33333333-3333-3333-3333-333333333333'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Document Versions
INSERT INTO document_versions (
    id, document_id, version_number, storage_object_key, original_filename, mime_type, file_size_bytes, sha256_checksum, uploaded_by
) VALUES
(
    'f1000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    1,
    'theses/60000000-0000-0000-0000-000000000001/synopsis_v1.pdf',
    'synopsis_dissertation_aarav.pdf',
    'application/pdf',
    1048576,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    '11111111-1111-1111-1111-111111111111'
),
(
    'f1000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000002',
    1,
    'theses/60000000-0000-0000-0000-000000000001/confidential_annexure_6.pdf',
    'confidential_eval_annexure6.pdf',
    'application/pdf',
    524288,
    'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    '33333333-3333-3333-3333-333333333333'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Resolve Circular Foreign Key
UPDATE documents SET current_version_id = 'f1000000-0000-0000-0000-000000000001' WHERE id = 'f0000000-0000-0000-0000-000000000001';
UPDATE documents SET current_version_id = 'f1000000-0000-0000-0000-000000000002' WHERE id = 'f0000000-0000-0000-0000-000000000002';

-- 4. Confidential Annexure 6 Evaluation Record
INSERT INTO annexure_6_evaluations (
    id, thesis_id, guide_id, supervisor_score, regularity_rating,
    technical_proficiency, rigor_rating, confidential_remarks, defense_recommendation, submitted_at
) VALUES
(
    '80000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    95.0,
    'EXCELLENT',
    'HIGH',
    'RIGOROUS',
    'Candidate exhibits outstanding experimental design and algorithmic competence.',
    'RECOMMENDED',
    clock_timestamp() - INTERVAL '6 days'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Digital Logbook Entry
INSERT INTO digital_logbook_entries (
    id, thesis_id, student_id, meeting_mode, meeting_location,
    meeting_date, discussion_agenda, progress_discussed, action_items, next_target_date, created_at
) VALUES
(
    'f2000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'OFFLINE',
    'Faculty Cabin 304',
    clock_timestamp() - INTERVAL '7 days',
    'Detailed Chapter 1 Review & Architecture Diagram Validation',
    'Reviewed initial transformer model design for edge intrusion benchmark.',
    'Complete preliminary hyperparameter tuning and submit draft by Friday.',
    CURRENT_DATE + 7,
    clock_timestamp() - INTERVAL '7 days'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
