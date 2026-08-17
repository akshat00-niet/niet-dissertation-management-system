// Annexure 6: Confidential Evaluation & Oral Defense Panel Formation Types
// Derived directly from database/migrations/015_annexure_5_and_6.sql, 016_viva_remediation.sql, and 026_annexure_6_confidential_evaluation_and_panel_rpc.sql

export type RegularityRating =
  | 'EXEMPLARY'
  | 'PROFICIENT'
  | 'DEVELOPING'
  | 'UNSATISFACTORY';

export type TechnicalProficiency =
  | 'EXEMPLARY'
  | 'PROFICIENT'
  | 'DEVELOPING'
  | 'UNSATISFACTORY';

export type RigorRating =
  | 'EXEMPLARY'
  | 'PROFICIENT'
  | 'DEVELOPING'
  | 'UNSATISFACTORY';

export type DefenseRecommendation =
  | 'RECOMMENDED'
  | 'REVISIONS_REQUIRED'
  | 'NOT_RECOMMENDED';

export type PanelMemberRole =
  | 'INTERNAL_EXPERT'
  | 'EXTERNAL_EXPERT';

export type DepartmentAnnexure6FilterStatus =
  | 'ALL'
  | 'PENDING_EVALUATION'
  | 'PENDING_PANEL'
  | 'SCHEDULED';

/**
 * Confidential Annexure 6 supervisor evaluation record.
 * RESTRICTED: Never expose to student candidates.
 */
export interface Annexure6Evaluation {
  id: string;
  thesis_id: string;
  guide_id: string;
  supervisor_score: number;
  regularity_rating: RegularityRating;
  technical_proficiency: TechnicalProficiency;
  rigor_rating: RigorRating;
  confidential_remarks: string;
  defense_recommendation: DefenseRecommendation;
  submitted_at: string;
  evaluator_sheet_doc_id?: string | null;
  evaluation_document_id?: string | null;
}

export interface Annexure6DocketStudent {
  id: string;
  name: string;
  roll_number: string;
}

export interface Annexure6DocketFaculty {
  id: string;
  name: string;
}

export interface Annexure6Permissions {
  can_view_confidential: boolean;
  can_constitute_panel: boolean;
}

/**
 * Confidential Annexure 6 Docket
 * Available to: Guide, HOD, DC, DCEC Chair, and Appointed Panel Members.
 */
export interface Annexure6Docket {
  thesis_id: string;
  tracking_number: string;
  current_state: string;
  current_stage: string;
  student: Annexure6DocketStudent;
  guide: Annexure6DocketFaculty | null;
  evaluation: Annexure6Evaluation | null;
  permissions: Annexure6Permissions;
}

/**
 * Appointed defense panel member details.
 */
export interface DefensePanelMember {
  assignment_id: string;
  faculty_id: string;
  faculty_name: string;
  faculty_email: string;
  designation: string;
  evaluator_role: PanelMemberRole | string;
  is_panel_chair: boolean;
}

/**
 * Defense panel details and oral defense scheduling info.
 */
export interface DefensePanelDetails {
  thesis_id: string;
  is_constituted: boolean;
  viva_defense_id?: string | null;
  defense_cycle_index?: number;
  scheduled_at?: string | null;
  conducted_at?: string | null;
  outcome?: string | null;
  venue_or_link?: string | null;
  panel_id?: string | null;
  constituted_by_hod_id?: string | null;
  constituted_at?: string | null;
  members?: DefensePanelMember[];
}

/**
 * Department Annexure 6 and Defense Panel coordination queue item.
 */
export interface DepartmentAnnexure6QueueItem {
  thesis_id: string;
  tracking_number: string;
  student_id: string;
  student_name: string;
  student_email: string;
  roll_number: string;
  guide_id: string | null;
  guide_name: string | null;
  co_guide_id: string | null;
  co_guide_name: string | null;
  current_state: string;
  current_stage: string;
  has_annexure_6: boolean;
  annexure_6_submitted_at: string | null;
  defense_recommendation: DefenseRecommendation | null;
  has_defense_panel: boolean;
  viva_scheduled_at: string | null;
}

// Result types returned from database RPCs
export interface Annexure6OperationResult {
  success: boolean;
  message?: string;
  action?: string;
  data?: any;
}

// Input DTOs
export interface SubmitAnnexure6EvaluationInput {
  thesis_id: string;
  supervisor_score: number;
  regularity_rating: RegularityRating;
  technical_proficiency: TechnicalProficiency;
  rigor_rating: RigorRating;
  confidential_remarks: string;
  defense_recommendation: DefenseRecommendation;
  evaluator_sheet_doc_id?: string | null;
  evaluation_document_id?: string | null;
  client_ip?: string;
  user_agent?: string;
}

export interface GetAnnexure6DocketInput {
  thesis_id: string;
}

export interface ConstituteDefensePanelInput {
  thesis_id: string;
  member_1_faculty_id: string;
  member_2_faculty_id: string;
  chair_faculty_id: string;
  scheduled_at: string;
  venue_or_link: string;
  rubric_version_id?: string | null;
  client_ip?: string;
  user_agent?: string;
}

export interface GetDefensePanelDetailsInput {
  thesis_id: string;
}

export interface ListDepartmentAnnexure6QueueInput {
  department_id: string;
  status?: DepartmentAnnexure6FilterStatus | string;
}
