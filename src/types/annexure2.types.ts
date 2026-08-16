// Annexure 2 Collaborative Problem Formulation & Formal Title Approval Domain Types

export type Annexure2Status =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ENDORSED'
  | 'REVISION_REQUIRED'
  | 'APPROVED';

export type Annexure2Outcome = 'APPROVED' | 'REVISION_REQUIRED';

export interface TimelineMilestone {
  milestone_name: string;
  target_date: string;
  expected_deliverables: string;
  planned_work_packages?: string[];
}

export interface Annexure2Submission {
  id: string;
  thesis_id: string;
  final_title: string;
  refined_problem: string;
  methodology: string;
  timeline_milestones: TimelineMilestone[];
  status: Annexure2Status;
  submitted_at: string;
}

export interface SupervisorEndorsement {
  id: string;
  faculty_id: string;
  faculty_name: string;
  supervisor_role: 'GUIDE' | 'CO_GUIDE';
  stage: 'ANNEXURE_2' | 'ANNEXURE_5';
  is_endorsed: boolean;
  remarks: string | null;
  endorsed_at: string;
}

export interface Annexure2WorkspacePermissions {
  is_student: boolean;
  is_guide: boolean;
  is_coguide: boolean;
  is_dcec_chair: boolean;
  can_edit: boolean;
  can_submit: boolean;
  can_endorse: boolean;
  can_approve: boolean;
}

export interface Annexure2Workspace {
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
  annexure_1: {
    id: string;
    proposed_title: string;
    broad_domain: string;
    problem_statement: string;
    expected_outcomes: string;
    status: string;
    submitted_at: string;
  } | null;
  annexure_2: Annexure2Submission | null;
  endorsements: SupervisorEndorsement[];
  title_record: {
    id: string;
    proposed_title: string;
    final_approved_title: string | null;
    normalized_title: string;
    is_approved: boolean;
    approved_at: string | null;
  } | null;
  permissions: Annexure2WorkspacePermissions;
}

export interface SaveAnnexure2DraftInput {
  thesis_id: string;
  final_title: string;
  refined_problem: string;
  methodology: string;
  timeline_milestones: TimelineMilestone[];
}

export interface SubmitAnnexure2Input {
  thesis_id: string;
  final_title: string;
  refined_problem: string;
  methodology: string;
  timeline_milestones: TimelineMilestone[];
  client_ip?: string;
  user_agent?: string;
}

export interface EndorseAnnexure2Input {
  thesis_id: string;
  is_endorsed: boolean;
  remarks?: string | null;
  client_ip?: string;
  user_agent?: string;
}

export interface DecideAnnexure2TitleInput {
  thesis_id: string;
  outcome: Annexure2Outcome;
  formal_remarks: string;
  client_ip?: string;
  user_agent?: string;
}

export interface Annexure2OperationResult {
  success: boolean;
  annexure_2_id?: string;
  thesis_id: string;
  endorsement_id?: string;
  supervisor_role?: string;
  is_endorsed?: boolean;
  is_fully_endorsed?: boolean;
  outcome?: string;
  final_approved_title?: string | null;
  status?: string;
  current_state: string;
  current_stage?: string;
  submitted_at?: string;
  endorsed_at?: string;
  decided_at?: string;
}
