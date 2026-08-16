// Milestone Presentation (P1, P2, P3) Domain Types
// Derived directly from database/migrations/013_milestone_evaluations.sql and 024_milestone_rubric_evaluation_rpc.sql

export type MilestonePresentationType = 'P1' | 'P2' | 'P3';

export type MilestoneState =
  | 'P1_EVALUATION_SCHEDULED'
  | 'P1_EVALUATION_COMPLETED'
  | 'P2_EVALUATION_SCHEDULED'
  | 'P2_EVALUATION_COMPLETED'
  | 'P3_EVALUATION_SCHEDULED'
  | 'P3_EVALUATION_COMPLETED';

export interface EvaluationCriterionScore {
  id: string;
  milestone_evaluation_id: string;
  criterion_id: string;
  selected_level_id: string;
  awarded_marks: number;
  criterion_remarks: string | null;
}

export interface MilestoneEvaluation {
  id: string;
  thesis_id: string;
  milestone_type: MilestonePresentationType;
  rubric_version_id: string;
  total_marks_awarded: number;
  general_feedback: string | null;
  evaluated_at: string;
}

export interface MilestoneEvaluationScoreDetail {
  id: string;
  criterion_id: string;
  criterion_title: string;
  criterion_description: string | null;
  max_marks: number;
  selected_level_id: string;
  selected_level_index: number;
  selected_level_label: string;
  selected_level_descriptor: string;
  selected_level_percentage: number;
  awarded_marks: number;
  criterion_remarks: string | null;
}

export interface MilestoneEvaluationDetails {
  evaluation_id: string;
  thesis_id: string;
  tracking_number: string;
  milestone_type: MilestonePresentationType;
  total_marks_awarded: number;
  max_score: number;
  general_feedback: string | null;
  evaluated_at: string;
  rubric_version_id: string;
  rubric_version_number: number;
  rubric_title: string;
  is_contributing_to_final_grade: boolean;
  criterion_scores: MilestoneEvaluationScoreDetail[];
}

export interface DepartmentMilestoneEvaluationSummary {
  evaluation_id: string;
  total_marks_awarded: number;
  evaluated_at: string;
  rubric_version_id: string;
}

export interface DepartmentMilestoneSummary {
  thesis_id: string;
  tracking_number: string;
  current_state: string;
  current_stage: string;
  student_id: string;
  student_name: string;
  student_roll: string;
  guide_id: string | null;
  guide_name: string | null;
  co_guide_id: string | null;
  co_guide_name: string | null;
  p1_evaluation: DepartmentMilestoneEvaluationSummary | null;
  p2_evaluation: DepartmentMilestoneEvaluationSummary | null;
  p3_evaluation: DepartmentMilestoneEvaluationSummary | null;
}

export interface ScheduleMilestonePresentationInput {
  thesis_id: string;
  milestone_type: MilestonePresentationType;
  presentation_date: string;
  venue_or_url: string;
  notes?: string | null;
  client_ip?: string;
  user_agent?: string;
}

export interface CriterionScoreInput {
  criterion_id: string;
  selected_level_id: string;
  awarded_marks: number;
  criterion_remarks?: string | null;
}

export interface SubmitMilestoneEvaluationInput {
  thesis_id: string;
  milestone_type: MilestonePresentationType;
  rubric_version_id: string;
  criterion_scores: CriterionScoreInput[];
  general_feedback?: string | null;
  client_ip?: string;
  user_agent?: string;
}

export interface GetMilestoneEvaluationDetailsInput {
  thesis_id: string;
  milestone_type: MilestonePresentationType;
}

export interface ListDepartmentMilestonesInput {
  department_id: string;
  academic_session_id?: string | null;
  milestone_type?: string | null;
  status?: string | null;
}

export interface MilestoneOperationResult {
  success: boolean;
  evaluation_id?: string;
  thesis_id?: string;
  tracking_number?: string;
  milestone_type?: string;
  total_marks_awarded?: number;
  max_score?: number;
  rubric_version_id?: string;
  scheduled_state?: string;
  new_thesis_state?: string;
  is_contributing_to_final_grade?: boolean;
  presentation_date?: string;
  venue_or_url?: string;
  evaluated_at?: string;
  message?: string;
  department_id?: string;
  count?: number;
  data?: MilestoneEvaluationDetails | DepartmentMilestoneSummary[] | null;
}
