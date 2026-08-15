-- Additional Document & Workflow Fixtures for Comprehensive Test Suite
-- Target Database: niet_dms_behavioral_security_test

BEGIN;

-- Documents on Thesis A
-- Doc 1: Public Synopsis (Student allowed)
INSERT INTO documents (id, thesis_id, document_type, current_version_id, is_student_restricted, created_by) VALUES
('f0000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'SYNOPSIS_DOCUMENT', NULL, FALSE, '11111111-1111-1111-1111-111111111111');

-- Doc 2: Confidential Supervisor Report (Student restricted)
INSERT INTO documents (id, thesis_id, document_type, current_version_id, is_student_restricted, created_by) VALUES
('f0000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'SUPERVISOR_EVAL_ANNEXURE_6', NULL, TRUE, '33333333-3333-3333-3333-333333333333');

-- Document Versions
INSERT INTO document_versions (id, document_id, version_number, storage_object_key, original_filename, mime_type, file_size_bytes, sha256_checksum, uploaded_by) VALUES
('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 1, 'theses/60000000-0000-0000-0000-000000000001/synopsis_v1.pdf', 'synopsis.pdf', 'application/pdf', 1048576, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', '11111111-1111-1111-1111-111111111111'),
('f1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 1, 'theses/60000000-0000-0000-0000-000000000001/eval_v1.pdf', 'confidential_eval.pdf', 'application/pdf', 524288, 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e', '33333333-3333-3333-3333-333333333333');

-- Update circular FK current_version_id
UPDATE documents SET current_version_id = 'f1000000-0000-0000-0000-000000000001' WHERE id = 'f0000000-0000-0000-0000-000000000001';
UPDATE documents SET current_version_id = 'f1000000-0000-0000-0000-000000000002' WHERE id = 'f0000000-0000-0000-0000-000000000002';

-- Logbook entry for Thesis A
INSERT INTO digital_logbook_entries (id, thesis_id, student_id, meeting_mode, meeting_location, meeting_date, discussion_agenda, progress_discussed, action_items, next_target_date) VALUES
('f2000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'OFFLINE', 'Lab 301', clock_timestamp() - INTERVAL '2 days', 'Chapter 1 review', 'Intro written', 'Draft Chapter 2', CURRENT_DATE + 7);

COMMIT;
