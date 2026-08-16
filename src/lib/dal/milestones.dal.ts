import type { SupabaseClient } from '@supabase/supabase-js';
import { mapPostgrestError, DatabaseError } from '@/lib/dal/errors';
import type {
  ScheduleMilestonePresentationInput,
  SubmitMilestoneEvaluationInput,
  GetMilestoneEvaluationDetailsInput,
  ListDepartmentMilestonesInput,
  MilestoneOperationResult,
} from '@/types/milestones.types';

/**
 * DAL function: Calls schedule_milestone_presentation RPC to schedule P1, P2, or P3 presentation window.
 */
export async function scheduleMilestonePresentationRpc(
  supabase: SupabaseClient,
  input: ScheduleMilestonePresentationInput
): Promise<MilestoneOperationResult> {
  const { data, error } = await supabase.rpc('schedule_milestone_presentation', {
    p_thesis_id: input.thesis_id,
    p_milestone_type: input.milestone_type,
    p_presentation_date: input.presentation_date,
    p_venue_or_url: input.venue_or_url,
    p_notes: input.notes || null,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[milestones.dal.scheduleMilestonePresentationRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to schedule milestone presentation: Invalid server response.');
  }

  return data as MilestoneOperationResult;
}

/**
 * DAL function: Calls submit_milestone_evaluation RPC to record criterion scores and compute total marks /100.
 */
export async function submitMilestoneEvaluationRpc(
  supabase: SupabaseClient,
  input: SubmitMilestoneEvaluationInput
): Promise<MilestoneOperationResult> {
  const { data, error } = await supabase.rpc('submit_milestone_evaluation', {
    p_thesis_id: input.thesis_id,
    p_milestone_type: input.milestone_type,
    p_rubric_version_id: input.rubric_version_id,
    p_criterion_scores: input.criterion_scores,
    p_general_feedback: input.general_feedback || null,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[milestones.dal.submitMilestoneEvaluationRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to submit milestone evaluation: Invalid server response.');
  }

  return data as MilestoneOperationResult;
}

/**
 * DAL function: Calls get_milestone_evaluation_details RPC to fetch complete scorecard breakdown.
 */
export async function getMilestoneEvaluationDetailsRpc(
  supabase: SupabaseClient,
  input: GetMilestoneEvaluationDetailsInput
): Promise<MilestoneOperationResult> {
  const { data, error } = await supabase.rpc('get_milestone_evaluation_details', {
    p_thesis_id: input.thesis_id,
    p_milestone_type: input.milestone_type,
  });

  if (error) {
    throw mapPostgrestError(error, '[milestones.dal.getMilestoneEvaluationDetailsRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to fetch milestone evaluation details: Invalid server response.');
  }

  return data as MilestoneOperationResult;
}

/**
 * DAL function: Calls list_department_milestones RPC for departmental cohort oversight.
 */
export async function listDepartmentMilestonesRpc(
  supabase: SupabaseClient,
  input: ListDepartmentMilestonesInput
): Promise<MilestoneOperationResult> {
  const { data, error } = await supabase.rpc('list_department_milestones', {
    p_department_id: input.department_id,
    p_academic_session_id: input.academic_session_id || null,
    p_milestone_type: input.milestone_type || null,
    p_status: input.status || null,
  });

  if (error) {
    throw mapPostgrestError(error, '[milestones.dal.listDepartmentMilestonesRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to list department milestones: Invalid server response.');
  }

  return data as MilestoneOperationResult;
}
