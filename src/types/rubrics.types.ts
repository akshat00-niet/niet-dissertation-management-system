// Dynamic 4-Column Rubric Domain Types
// Derived directly from database/migrations/012_dynamic_rubrics.sql and 024_milestone_rubric_evaluation_rpc.sql

export type MilestoneType = 'P1' | 'P2' | 'P3' | 'FINAL_VIVA';

export interface Rubric {
  id: string;
  department_id: string;
  milestone_type: MilestoneType | string;
  title: string;
  max_score: number;
  created_at: string;
}

export interface RubricVersion {
  id: string;
  rubric_id: string;
  version_number: number;
  is_published: boolean;
  effective_from: string;
  effective_until: string | null;
  created_at: string;
}

export interface RubricCriterion {
  id: string;
  rubric_version_id: string;
  sequence_order: number;
  criterion_title: string;
  description: string | null;
  max_marks: number;
}

export interface RubricAchievementLevel {
  id: string;
  criterion_id: string;
  level_index: number;
  label: string;
  descriptor: string;
  score_percentage: number;
  calculated_score?: number;
}

export interface ActiveCriterionWithLevels {
  id: string;
  sequence_order: number;
  criterion_title: string;
  description: string | null;
  max_marks: number;
  achievement_levels: RubricAchievementLevel[];
}

export interface ActiveMilestoneRubric {
  rubric_id: string;
  rubric_version_id: string;
  version_number: number;
  milestone_type: string;
  title: string;
  max_score: number;
  effective_from: string;
  criteria: ActiveCriterionWithLevels[];
}

export interface CreateRubricAchievementLevelInput {
  level_index: number;
  label: string;
  descriptor: string;
  score_percentage: number;
}

export interface CreateRubricCriterionInput {
  criterion_title: string;
  description?: string | null;
  max_marks: number;
  achievement_levels: CreateRubricAchievementLevelInput[];
}

export interface CreateRubricVersionDraftInput {
  department_id: string;
  milestone_type: MilestoneType;
  title: string;
  criteria: CreateRubricCriterionInput[];
  client_ip?: string;
  user_agent?: string;
}

export interface PublishRubricVersionInput {
  rubric_version_id: string;
  effective_from?: string;
  justification?: string;
  client_ip?: string;
  user_agent?: string;
}

export interface GetActiveMilestoneRubricInput {
  department_id: string;
  milestone_type: MilestoneType | string;
}

export interface RubricOperationResult {
  success: boolean;
  rubric_id?: string;
  rubric_version_id?: string;
  version_number?: number;
  milestone_type?: string;
  is_published?: boolean;
  effective_from?: string;
  criteria_count?: number;
  message?: string;
  data?: ActiveMilestoneRubric | null;
}
