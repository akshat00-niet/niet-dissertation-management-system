// Annexure 5: Final Dissertation Submission & Turnitin Similarity Compliance Types
// Derived directly from database/migrations/015_annexure_5_and_6.sql and 025_annexure_5_submission_workflow_rpc.sql

export type Annexure5SubmissionStatus =
  | 'SUBMITTED'
  | 'REVISION_REQUIRED'
  | 'SUPERVISOR_ENDORSED';

export type SupervisorRole = 'GUIDE' | 'CO_GUIDE';

export interface Annexure5DocumentVersion {
  document_id: string;
  document_type: string;
  version_id?: string;
  version_number?: number;
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  sha256_checksum?: string;
  storage_object_key?: string;
  uploaded_at?: string;
}

export interface Annexure5Endorsement {
  id: string;
  faculty_id: string;
  faculty_name: string;
  supervisor_role: SupervisorRole;
  is_endorsed: boolean;
  remarks: string | null;
  endorsed_at: string;
}

export interface Annexure5Submission {
  id: string;
  thesis_id: string;
  manuscript_document_id?: string;
  synopsis_document_id?: string;
  similarity_certificate_id?: string;
  repository_url: string | null;
  plagiarism_percentage: number;
  ai_similarity_percentage: number;
  status: Annexure5SubmissionStatus;
  submitted_at: string;
  manuscript_document?: Annexure5DocumentVersion | null;
  synopsis_document?: Annexure5DocumentVersion | null;
  similarity_certificate_document?: Annexure5DocumentVersion | null;
}

export interface Annexure5DocketStudent {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  enrollment_number: string;
  batch: string;
}

export interface Annexure5DocketFaculty {
  id: string;
  name: string;
  email: string;
  employee_code: string;
  designation: string;
}

export interface Annexure5DocketThesis {
  id: string;
  tracking_number: string;
  department_id: string;
  current_state: string;
  current_stage: string;
  student: Annexure5DocketStudent;
  guide: Annexure5DocketFaculty | null;
  co_guide: Annexure5DocketFaculty | null;
  approved_title: string | null;
}

export interface Annexure5Permissions {
  is_student: boolean;
  is_guide: boolean;
  is_coguide: boolean;
  can_submit: boolean;
  can_endorse: boolean;
}

export interface Annexure5Docket {
  thesis: Annexure5DocketThesis;
  annexure_5: Annexure5Submission | null;
  endorsements: Annexure5Endorsement[];
  permissions: Annexure5Permissions;
}

export interface DepartmentAnnexure5Summary {
  thesis_id: string;
  tracking_number: string;
  current_state: string;
  current_stage: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  guide_id: string | null;
  guide_name: string | null;
  co_guide_id: string | null;
  co_guide_name: string | null;
  approved_title: string | null;
  annexure_5_id: string | null;
  plagiarism_percentage: number | null;
  ai_similarity_percentage: number | null;
  submission_status: Annexure5SubmissionStatus | null;
  submitted_at: string | null;
}

// Result types returned from database RPCs
export interface Annexure5OperationResult {
  success: boolean;
  action?: string;
  annexure_5_id?: string;
  endorsement_id?: string;
  thesis_id?: string;
  current_state?: string;
  current_stage?: string;
  plagiarism_percentage?: number;
  ai_similarity_percentage?: number;
  is_fully_endorsed?: boolean;
  endorsed_count?: number;
  required_count?: number;
  supervisor_role?: string;
  remarks?: string;
  submitted_at?: string;
  department_id?: string;
  count?: number;
  data?: DepartmentAnnexure5Summary[] | Annexure5Docket | any;
  thesis?: Annexure5DocketThesis;
  annexure_5?: Annexure5Submission | null;
  endorsements?: Annexure5Endorsement[];
  permissions?: Annexure5Permissions;
}

// Input DTOs
export interface SubmitAnnexure5PackageInput {
  thesis_id: string;
  manuscript_document_id: string;
  synopsis_document_id: string;
  similarity_certificate_id: string;
  repository_url?: string | null;
  plagiarism_percentage: number;
  ai_similarity_percentage?: number;
  client_ip?: string;
  user_agent?: string;
}

export interface EndorseAnnexure5SubmissionInput {
  thesis_id: string;
  is_endorsed: boolean;
  remarks?: string | null;
  client_ip?: string;
  user_agent?: string;
}

export interface RequestAnnexure5RevisionInput {
  thesis_id: string;
  revision_notes: string;
  client_ip?: string;
  user_agent?: string;
}

export interface GetAnnexure5DocketInput {
  thesis_id: string;
}

export type DepartmentAnnexure5FilterStatus =
  | 'ALL'
  | 'SUBMITTED'
  | 'PREPARATION'
  | 'ENDORSED';

export interface ListDepartmentAnnexure5SubmissionsInput {
  department_id: string;
  status?: DepartmentAnnexure5FilterStatus | string;
}
