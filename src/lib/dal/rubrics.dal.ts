import type { SupabaseClient } from '@supabase/supabase-js';
import { mapPostgrestError, DatabaseError } from '@/lib/dal/errors';
import type {
  CreateRubricVersionDraftInput,
  PublishRubricVersionInput,
  GetActiveMilestoneRubricInput,
  RubricOperationResult,
} from '@/types/rubrics.types';

/**
 * DAL function: Calls create_rubric_version_draft RPC to create a draft rubric version with 4-column criteria.
 */
export async function createRubricVersionDraftRpc(
  supabase: SupabaseClient,
  input: CreateRubricVersionDraftInput
): Promise<RubricOperationResult> {
  const { data, error } = await supabase.rpc('create_rubric_version_draft', {
    p_department_id: input.department_id,
    p_milestone_type: input.milestone_type,
    p_title: input.title,
    p_criteria: input.criteria,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[rubrics.dal.createRubricVersionDraftRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to create rubric draft: Invalid server response.');
  }

  return data as RubricOperationResult;
}

/**
 * DAL function: Calls publish_rubric_version RPC to publish an immutable rubric version for a cohort.
 */
export async function publishRubricVersionRpc(
  supabase: SupabaseClient,
  input: PublishRubricVersionInput
): Promise<RubricOperationResult> {
  const { data, error } = await supabase.rpc('publish_rubric_version', {
    p_rubric_version_id: input.rubric_version_id,
    p_effective_from: input.effective_from || new Date().toISOString().split('T')[0],
    p_justification: input.justification || 'Official cohort rubric publication',
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[rubrics.dal.publishRubricVersionRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to publish rubric version: Invalid server response.');
  }

  return data as RubricOperationResult;
}

/**
 * DAL function: Calls get_active_milestone_rubric RPC to fetch active published rubric with criteria.
 */
export async function getActiveMilestoneRubricRpc(
  supabase: SupabaseClient,
  input: GetActiveMilestoneRubricInput
): Promise<RubricOperationResult> {
  const { data, error } = await supabase.rpc('get_active_milestone_rubric', {
    p_department_id: input.department_id,
    p_milestone_type: input.milestone_type,
  });

  if (error) {
    throw mapPostgrestError(error, '[rubrics.dal.getActiveMilestoneRubricRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to fetch active milestone rubric: Invalid server response.');
  }

  return data as RubricOperationResult;
}
