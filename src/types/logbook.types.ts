// Digital Logbook (Annexure 4) & Periodic Progress Tracking Domain Types
// Derived directly from database/migrations/011_logbook_progress.sql and 023_digital_logbook_workflow_rpc.sql

export type MeetingMode = 'ONLINE' | 'OFFLINE';

export type LogbookEntryStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'REVISION_REQUIRED';

export type LogbookVerificationOutcome = 'VERIFIED' | 'REVISION_REQUESTED';

export type ProgressReportType = 'WEEKLY' | 'MONTHLY';

export type ProgressReportSubmissionStatus = 'SUBMITTED';

export interface LogbookVerification {
  id: string;
  verifier_faculty_id: string;
  verifier_name: string;
  outcome: LogbookVerificationOutcome;
  feedback_remarks: string | null;
  verified_at: string;
}

export interface DigitalLogbookEntry {
  id: string;
  thesis_id: string;
  student_id: string;
  meeting_mode: MeetingMode;
  meeting_link: string | null;
  meeting_location: string | null;
  meeting_date: string;
  discussion_agenda: string;
  progress_discussed: string;
  action_items: string;
  next_target_date: string;
  status: LogbookEntryStatus;
  created_at: string;
  updated_at: string;
  verifications: LogbookVerification[];
}

export interface PeriodicProgressReport {
  id: string;
  thesis_id: string;
  student_id: string;
  report_type: ProgressReportType;
  period_start: string;
  period_end: string;
  summary_work_done: string;
  milestones_achieved: string;
  issues_faced: string | null;
  status: ProgressReportSubmissionStatus;
  submitted_at: string;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
  supervisor_remarks: string | null;
}

export interface LogbookWorkspacePermissions {
  is_student: boolean;
  is_guide: boolean;
  is_coguide: boolean;
  is_dept_official: boolean;
  can_create_entry: boolean;
  can_submit_progress_report: boolean;
  can_verify: boolean;
  can_acknowledge_report: boolean;
}

export interface DigitalLogbookWorkspace {
  thesis: {
    id: string;
    tracking_number: string;
    department_id: string;
    department_name: string;
    department_code: string;
    current_state: string;
    current_stage: string;
    created_at: string;
    updated_at: string;
  };
  student: {
    id: string;
    full_name: string;
    email: string;
    roll_number: string;
    enrollment_number: string;
    batch: string;
  } | null;
  guide: {
    id: string;
    full_name: string;
    email: string;
    employee_code: string;
    designation: string;
    active_guide_load: number;
    active_coguide_load: number;
  } | null;
  co_guide: {
    id: string;
    full_name: string;
    email: string;
    employee_code: string;
    designation: string;
    active_guide_load: number;
    active_coguide_load: number;
  } | null;
  approved_title: string | null;
  is_title_approved: boolean;
  logbook_entries: DigitalLogbookEntry[];
  periodic_reports: PeriodicProgressReport[];
  permissions: LogbookWorkspacePermissions;
}

export interface SaveDigitalLogbookDraftInput {
  thesis_id: string;
  entry_id?: string | null;
  meeting_mode: MeetingMode;
  meeting_link?: string | null;
  meeting_location?: string | null;
  meeting_date: string;
  discussion_agenda: string;
  progress_discussed: string;
  action_items: string;
  next_target_date: string;
}

export interface SubmitDigitalLogbookEntryInput {
  thesis_id: string;
  entry_id?: string | null;
  meeting_mode: MeetingMode;
  meeting_link?: string | null;
  meeting_location?: string | null;
  meeting_date: string;
  discussion_agenda: string;
  progress_discussed: string;
  action_items: string;
  next_target_date: string;
  client_ip?: string;
  user_agent?: string;
}

export interface VerifyDigitalLogbookEntryInput {
  entry_id: string;
  outcome: LogbookVerificationOutcome;
  feedback_remarks?: string | null;
  client_ip?: string;
  user_agent?: string;
}

export interface SubmitPeriodicProgressReportInput {
  thesis_id: string;
  report_type: ProgressReportType;
  period_start: string;
  period_end: string;
  summary_work_done: string;
  milestones_achieved: string;
  issues_faced?: string | null;
  client_ip?: string;
  user_agent?: string;
}

export interface AcknowledgePeriodicProgressReportInput {
  report_id: string;
  remarks?: string | null;
  client_ip?: string;
  user_agent?: string;
}

export interface LogbookOperationResult {
  success: boolean;
  entry_id?: string;
  report_id?: string;
  thesis_id?: string;
  outcome?: string;
  status?: string;
  message?: string;
  submitted_at?: string;
  verified_at?: string;
  acknowledged_at?: string;
}
