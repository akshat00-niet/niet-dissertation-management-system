-- Migration: 011_logbook_progress.sql
-- Description: Create digital logbook (Annexure 4), supervisor verifications, and periodic progress report tables.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 011 of 018

-- Table 28: digital_logbook_entries (Annexure 4 Meeting Logs)
CREATE TABLE digital_logbook_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
    meeting_mode VARCHAR(16) NOT NULL,
    meeting_link TEXT DEFAULT NULL,
    meeting_location VARCHAR(255) DEFAULT NULL,
    meeting_date TIMESTAMPTZ NOT NULL,
    discussion_agenda TEXT NOT NULL,
    progress_discussed TEXT NOT NULL,
    action_items TEXT NOT NULL,
    next_target_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_logbook_mode CHECK (meeting_mode IN ('ONLINE', 'OFFLINE')),
    CONSTRAINT chk_logbook_fields CHECK (
        (meeting_mode = 'ONLINE' AND meeting_link IS NOT NULL) OR
        (meeting_mode = 'OFFLINE' AND meeting_location IS NOT NULL)
    )
);

-- Table 29: logbook_verifications (Append-Only Supervisor Sign-Off)
CREATE TABLE logbook_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logbook_entry_id UUID NOT NULL REFERENCES digital_logbook_entries(id) ON DELETE RESTRICT,
    verifier_faculty_id UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    outcome VARCHAR(32) NOT NULL,
    feedback_remarks TEXT DEFAULT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_logbook_verification_outcome CHECK (outcome IN ('VERIFIED', 'REVISION_REQUESTED'))
);

-- Table 30: periodic_progress_reports (Append-Only Weekly/Monthly Progress Updates)
CREATE TABLE periodic_progress_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
    report_type VARCHAR(16) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    summary_work_done TEXT NOT NULL,
    milestones_achieved TEXT NOT NULL,
    issues_faced TEXT DEFAULT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_progress_report_type CHECK (report_type IN ('WEEKLY', 'MONTHLY')),
    CONSTRAINT chk_progress_period CHECK (period_start < period_end)
);

CREATE INDEX idx_digital_logbook_thesis ON digital_logbook_entries(thesis_id);
CREATE INDEX idx_digital_logbook_student ON digital_logbook_entries(student_id);
CREATE INDEX idx_logbook_verifications_entry ON logbook_verifications(logbook_entry_id);
CREATE INDEX idx_periodic_progress_thesis ON periodic_progress_reports(thesis_id);
