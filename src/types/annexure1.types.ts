import type { ThesisWithActiveTitle } from './database.types';

export interface GuidePreferenceInput {
  faculty_id: string;
  preference_rank: number; // 1..4
  domain_justification?: string | null;
}

export interface GuidePreferenceViewModel {
  id: string;
  annexure_1_id: string;
  preference_rank: number;
  faculty_id: string;
  faculty_name?: string;
  faculty_designation?: string;
  department_code?: string;
  domain_justification?: string | null;
  created_at: string;
}

export interface Annexure1Submission {
  id: string;
  thesis_id: string;
  proposed_title: string;
  broad_domain: string;
  problem_statement: string;
  expected_outcomes: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REVISION_REQUIRED';
  submitted_at: string;
}

export interface Annexure1FormData {
  proposed_title: string;
  broad_domain: string;
  problem_statement: string;
  expected_outcomes: string;
  preferences: GuidePreferenceInput[];
}

export interface DepartmentFacultyOption {
  user_id: string;
  full_name: string;
  designation: string;
  department_code: string;
  is_available: boolean;
  active_guide_load: number;
  active_coguide_load: number;
}

export interface StudentAnnexure1WorkspaceData {
  thesis: ThesisWithActiveTitle;
  proposal: Annexure1Submission | null;
  preferences: GuidePreferenceViewModel[];
  availableFaculty: DepartmentFacultyOption[];
  availableDomains: { id: string; code: string; name: string }[];
  isSubmitted: boolean;
  isLocked: boolean;
}

export interface SubmitAnnexure1Result {
  success: boolean;
  thesis_id: string;
  tracking_number: string;
  current_state: string;
  annexure_1_id: string;
  submitted_at: string;
}
