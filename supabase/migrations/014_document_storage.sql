-- Migration: 014_document_storage.sql
-- Description: Create document metadata, versions, and access policies with resolved circular foreign keys.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 014 of 018

-- Table 47: document_access_policies (Static Access Reference)
CREATE TABLE document_access_policies (
    id VARCHAR(64) PRIMARY KEY,
    description TEXT NOT NULL,
    allowed_roles VARCHAR(32)[] NOT NULL,
    requires_supervisor_binding BOOLEAN NOT NULL DEFAULT FALSE,
    is_student_blocked BOOLEAN NOT NULL DEFAULT FALSE
);

-- Insert Default Access Policy Metadata
INSERT INTO document_access_policies (id, description, allowed_roles, requires_supervisor_binding, is_student_blocked) VALUES
('ANNEXURE_1_PROPOSAL', 'Initial thesis proposal document', ARRAY['STUDENT', 'DC', 'DHOD', 'HOD', 'DCEC_MEMBER'], FALSE, FALSE),
('ANNEXURE_2_TITLE_DOCKET', 'Formal title approval docket', ARRAY['STUDENT', 'GUIDE', 'CO_GUIDE', 'DC', 'HOD', 'DCEC_MEMBER'], TRUE, FALSE),
('LOGBOOK_ATTACHMENT', 'Supervisory meeting supplementary file', ARRAY['STUDENT', 'GUIDE', 'CO_GUIDE'], TRUE, FALSE),
('THESIS_MANUSCRIPT_ANNEXURE_5', 'Final complete dissertation manuscript PDF', ARRAY['STUDENT', 'GUIDE', 'CO_GUIDE', 'PANEL_MEMBER', 'HOD', 'DC'], TRUE, FALSE),
('SYNOPSIS_DOCUMENT', 'Executive dissertation synopsis', ARRAY['STUDENT', 'GUIDE', 'CO_GUIDE', 'PANEL_MEMBER', 'HOD', 'DC'], TRUE, FALSE),
('SIMILARITY_CERTIFICATE', 'Turnitin/DrillBit similarity certificate', ARRAY['STUDENT', 'GUIDE', 'CO_GUIDE', 'PANEL_MEMBER', 'HOD', 'DC'], TRUE, FALSE),
('SUPERVISOR_EVAL_ANNEXURE_6', 'Confidential supervisor evaluation document', ARRAY['GUIDE', 'HOD', 'DCEC_CHAIR', 'PANEL_MEMBER'], TRUE, TRUE),
('VIVA_PRESENTATION_SLIDES', 'Oral defense slide presentation', ARRAY['STUDENT', 'GUIDE', 'CO_GUIDE', 'PANEL_MEMBER', 'HOD'], TRUE, FALSE);

-- Table 45: documents (Step 1: Create without circular FK constraint)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    document_type VARCHAR(64) NOT NULL,
    current_version_id UUID DEFAULT NULL,
    is_student_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Table 46: document_versions (Step 2: Create versions pointing to documents)
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    version_number INT NOT NULL,
    storage_object_key TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_checksum VARCHAR(64) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_document_size_limit CHECK (file_size_bytes <= 5242880), -- 5 MB Prototype Limit
    CONSTRAINT chk_document_size_positive CHECK (file_size_bytes > 0),
    CONSTRAINT uq_document_versions_key UNIQUE (storage_object_key),
    CONSTRAINT uq_document_versions_num UNIQUE (document_id, version_number)
);

-- Step 3: Add the circular Foreign Key Constraint on documents.current_version_id
ALTER TABLE documents
ADD CONSTRAINT fk_documents_current_version
FOREIGN KEY (current_version_id)
REFERENCES document_versions(id)
ON DELETE RESTRICT;

CREATE INDEX idx_documents_thesis ON documents(thesis_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_document_versions_doc ON document_versions(document_id);
CREATE INDEX idx_document_versions_uploader ON document_versions(uploaded_by);
