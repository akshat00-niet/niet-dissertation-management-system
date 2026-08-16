// DCEC Screening & Department Coordinator Workflow Types

export type DcecOutcome = 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED';

export interface DCScreeningQueueItem {
  thesis_id: string;
  tracking_number: string;
  department_id: string;
  student_id: string;
  student_name: string;
  student_roll_number: string;
  proposed_title: string | null;
  broad_domain: string | null;
  annexure_1_id: string | null;
  current_state: string;
  current_stage: string;
  submitted_at: string | null;
  docket_id: string | null;
  is_eligible: boolean;
  documents_complete: boolean;
  dc_verification_notes: string | null;
}

export interface DCECScreeningQueueItem {
  docket_id: string;
  thesis_id: string;
  tracking_number: string;
  department_id: string;
  student_id: string;
  student_name: string;
  student_roll_number: string;
  proposed_title: string | null;
  broad_domain: string | null;
  problem_statement: string | null;
  expected_outcomes: string | null;
  annexure_1_id: string | null;
  current_state: string;
  current_stage: string;
  dc_user_id: string;
  dc_name: string;
  is_eligible: boolean;
  documents_complete: boolean;
  dc_verification_notes: string | null;
  docket_compiled_at: string;
  decision_id: string | null;
  outcome: DcecOutcome | null;
  formal_remarks: string | null;
  decision_at: string | null;
}

export interface VerifyDocketInput {
  thesis_id: string;
  is_eligible: boolean;
  documents_complete: boolean;
  dc_verification_notes?: string | null;
  client_ip?: string;
  user_agent?: string;
}

export interface RecordDcecDecisionInput {
  docket_id: string;
  outcome: DcecOutcome;
  formal_remarks: string;
  client_ip?: string;
  user_agent?: string;
}

export interface CreateDcecDelegationInput {
  department_id: string;
  dhod_user_id: string;
  effective_from: string;
  effective_until: string;
  delegation_reason: string;
  client_ip?: string;
  user_agent?: string;
}

export interface DocketVerificationResult {
  success: boolean;
  docket_id: string;
  thesis_id: string;
  current_state: string;
  compiled_at: string;
}

export interface DcecDecisionResult {
  success: boolean;
  decision_id: string;
  docket_id: string;
  thesis_id: string;
  outcome: DcecOutcome;
  current_state: string;
  current_stage: string;
  decision_at: string;
}
