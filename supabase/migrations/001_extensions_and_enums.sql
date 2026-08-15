-- Migration: 001_extensions_and_enums.sql
-- Description: Enable required PostgreSQL extensions and define all domain enumeration types.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 001 of 018

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Domain Enumeration Types

-- Thesis Workflow State Machine (22 Formal States per docs/05_STATE_MACHINES.md)
CREATE TYPE thesis_state_enum AS ENUM (
    'DRAFT_PROPOSAL',
    'ANNEXURE_1_SUBMITTED',
    'DC_VERIFICATION_QUEUE',
    'DCEC_SCREENING_QUEUE',
    'ANNEXURE_1_REVISION',
    'PROPOSAL_REJECTED_TERMINAL',
    'APPROVED_FOR_ALLOCATION',
    'SUPERVISORS_ALLOCATED',
    'COLLABORATIVE_PROBLEM_FORMULATION',
    'ANNEXURE_2_SUBMITTED',
    'ANNEXURE_2_SUPERVISOR_ENDORSED',
    'ANNEXURE_2_REVISION',
    'ANNEXURE_2_DCEC_APPROVED',
    'RESEARCH_EXECUTION',
    'P1_EVALUATION_SCHEDULED',
    'P1_EVALUATION_COMPLETED',
    'P2_EVALUATION_SCHEDULED',
    'P2_EVALUATION_COMPLETED',
    'P3_EVALUATION_SCHEDULED',
    'P3_EVALUATION_COMPLETED',
    'ANNEXURE_5_PREPARATION',
    'ANNEXURE_5_SUBMITTED',
    'ANNEXURE_5_SUPERVISOR_ENDORSED',
    'ANNEXURE_6_PENDING',
    'DEFENSE_PANEL_CONSTITUTED',
    'VIVA_DEFENSE_SCHEDULED',
    'VIVA_DEFENSE_CONDUCTED',
    'RE_VIVA_CYCLE_INITIATED',
    'HOD_FINAL_SIGN_OFF',
    'FINAL_RESULT_COMPILED',
    'ARCHIVED'
);

-- Progressive Lifecycle Stages
CREATE TYPE thesis_stage_enum AS ENUM (
    'PROPOSAL_STAGE',
    'ALLOCATION_STAGE',
    'TOPIC_APPROVAL_STAGE',
    'RESEARCH_AND_PROGRESS_STAGE',
    'MILESTONE_EVALUATION_STAGE',
    'FINAL_SUBMISSION_STAGE',
    'CONFIDENTIAL_EVALUATION_STAGE',
    'VIVA_DEFENSE_STAGE',
    'ARCHIVAL_STAGE'
);

-- Milestone Checkpoint Types
CREATE TYPE milestone_type_enum AS ENUM (
    'P1',
    'P2',
    'P3',
    'FINAL_VIVA'
);

-- Canonical Document Types (per docs/09_FILE_STORAGE.md)
CREATE TYPE document_type_enum AS ENUM (
    'ANNEXURE_1_PROPOSAL',
    'ANNEXURE_2_TITLE_DOCKET',
    'LOGBOOK_ATTACHMENT',
    'THESIS_MANUSCRIPT_ANNEXURE_5',
    'SYNOPSIS_DOCUMENT',
    'SIMILARITY_CERTIFICATE',
    'SUPERVISOR_EVAL_ANNEXURE_6',
    'VIVA_PRESENTATION_SLIDES'
);

-- Interaction / Meeting Modes (Annexure 4 Logbook)
CREATE TYPE meeting_mode_enum AS ENUM (
    'ONLINE',
    'OFFLINE'
);

-- Progress Report Frequency Types
CREATE TYPE progress_report_type_enum AS ENUM (
    'WEEKLY',
    'MONTHLY'
);

-- Viva Defense Outcome
CREATE TYPE viva_outcome_enum AS ENUM (
    'SCHEDULED',
    'PASSED',
    'PASSED_WITH_MINOR_REVISIONS',
    'MAJOR_REVISIONS_REQUIRED',
    'FAILED'
);

-- DCEC Decision Outcomes
CREATE TYPE dcec_outcome_enum AS ENUM (
    'APPROVED',
    'REVISION_REQUIRED',
    'REJECTED'
);

-- Notification Channels & Priority
CREATE TYPE notification_channel_enum AS ENUM (
    'IN_APP',
    'EMAIL',
    'SMS'
);

CREATE TYPE notification_priority_enum AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);

CREATE TYPE notification_delivery_status_enum AS ENUM (
    'PENDING',
    'DELIVERED',
    'FAILED',
    'READ'
);
