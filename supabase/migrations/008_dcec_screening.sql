-- Migration: 008_dcec_screening.sql
-- Description: Create DCEC screening dockets (Maker), decisions (Checker), and Chair delegation tables.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 008 of 018

-- Table 21: dcec_dockets (Compiled by Department Coordinator - Maker)
CREATE TABLE dcec_dockets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    docket_stage VARCHAR(32) NOT NULL,
    dc_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    documents_complete BOOLEAN NOT NULL DEFAULT TRUE,
    dc_verification_notes TEXT DEFAULT NULL,
    compiled_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Table 22: dcec_decisions (Signed by DCEC Chair - Checker, Append-Only)
CREATE TABLE dcec_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docket_id UUID NOT NULL REFERENCES dcec_dockets(id) ON DELETE RESTRICT,
    chair_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    outcome VARCHAR(32) NOT NULL,
    formal_remarks TEXT NOT NULL,
    decision_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Table 23: dcec_delegations (HOD to D.HOD Chair Authority Delegation)
CREATE TABLE dcec_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    hod_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    dhod_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_until TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    delegation_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_delegation_dates CHECK (effective_from < effective_until)
);

CREATE INDEX idx_dcec_dockets_thesis ON dcec_dockets(thesis_id);
CREATE INDEX idx_dcec_dockets_stage_dept ON dcec_dockets(docket_stage);
CREATE INDEX idx_dcec_decisions_docket ON dcec_decisions(docket_id);
CREATE INDEX idx_dcec_delegations_active ON dcec_delegations(department_id, dhod_user_id) WHERE is_revoked = FALSE;
