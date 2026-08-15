-- Migration: 015_annexure_5_and_6.sql
-- Description: Create Annexure 5 (final dissertation package) and Annexure 6 (confidential supervisor evaluation) tables.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 015 of 018

-- Table 37: annexure_5_submissions (Final Thesis Package & Similarity Compliance)
CREATE TABLE annexure_5_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    manuscript_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    synopsis_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    similarity_certificate_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    repository_url TEXT DEFAULT NULL,
    plagiarism_percentage FLOAT NOT NULL,
    ai_similarity_percentage FLOAT NOT NULL DEFAULT 0.0,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_annexure_5_thesis UNIQUE (thesis_id),
    CONSTRAINT chk_plagiarism_benchmark CHECK (plagiarism_percentage >= 0.0 AND plagiarism_percentage < 10.0),
    CONSTRAINT chk_ai_benchmark CHECK (ai_similarity_percentage = 0.0)
);

-- Table 38: annexure_6_evaluations (Confidential Supervisor Evaluation - Append-Only Lock)
CREATE TABLE annexure_6_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    guide_id UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    supervisor_score FLOAT NOT NULL,
    regularity_rating VARCHAR(32) NOT NULL,
    technical_proficiency VARCHAR(32) NOT NULL,
    rigor_rating VARCHAR(32) NOT NULL,
    confidential_remarks TEXT NOT NULL,
    defense_recommendation VARCHAR(32) NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_annexure_6_thesis UNIQUE (thesis_id),
    CONSTRAINT chk_annexure_6_score_range CHECK (supervisor_score BETWEEN 0.0 AND 100.0),
    CONSTRAINT chk_defense_recommendation CHECK (defense_recommendation IN ('RECOMMENDED', 'REVISIONS_REQUIRED', 'NOT_RECOMMENDED'))
);

CREATE INDEX idx_annexure_5_thesis ON annexure_5_submissions(thesis_id);
CREATE INDEX idx_annexure_6_thesis ON annexure_6_evaluations(thesis_id);
CREATE INDEX idx_annexure_6_guide ON annexure_6_evaluations(guide_id);
