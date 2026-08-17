import type { SupabaseClient } from '@supabase/supabase-js';
import { mapPostgrestError, DatabaseError } from '@/lib/dal/errors';
import type {
  SubmitAnnexure6EvaluationInput,
  GetAnnexure6DocketInput,
  ConstituteDefensePanelInput,
  GetDefensePanelDetailsInput,
  ListDepartmentAnnexure6QueueInput,
  Annexure6OperationResult,
} from '@/types/annexure6.types';

/**
 * DAL function: Calls submit_annexure_6_evaluation RPC to submit Primary Guide confidential evaluation.
 */
export async function submitAnnexure6EvaluationRpc(
  supabase: SupabaseClient,
  input: SubmitAnnexure6EvaluationInput
): Promise<Annexure6OperationResult> {
  const { data, error } = await supabase.rpc('submit_annexure_6_evaluation', {
    p_thesis_id: input.thesis_id,
    p_supervisor_score: input.supervisor_score,
    p_regularity_rating: input.regularity_rating,
    p_technical_proficiency: input.technical_proficiency,
    p_rigor_rating: input.rigor_rating,
    p_confidential_remarks: input.confidential_remarks,
    p_defense_recommendation: input.defense_recommendation,
    p_evaluator_sheet_doc_id: input.evaluator_sheet_doc_id || null,
    p_evaluation_document_id: input.evaluation_document_id || null,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure6.dal.submitAnnexure6EvaluationRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to submit Annexure 6 evaluation: Invalid server response.');
  }

  return data as Annexure6OperationResult;
}

/**
 * DAL function: Calls get_annexure_6_docket RPC to fetch confidential supervisor evaluation.
 */
export async function getAnnexure6DocketRpc(
  supabase: SupabaseClient,
  input: GetAnnexure6DocketInput
): Promise<Annexure6OperationResult> {
  const { data, error } = await supabase.rpc('get_annexure_6_docket', {
    p_thesis_id: input.thesis_id,
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure6.dal.getAnnexure6DocketRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to fetch Annexure 6 docket: Invalid server response.');
  }

  return data as Annexure6OperationResult;
}

/**
 * DAL function: Calls constitute_defense_panel RPC to appoint oral defense panel and schedule defense.
 */
export async function constituteDefensePanelRpc(
  supabase: SupabaseClient,
  input: ConstituteDefensePanelInput
): Promise<Annexure6OperationResult> {
  const { data, error } = await supabase.rpc('constitute_defense_panel', {
    p_thesis_id: input.thesis_id,
    p_member_1_faculty_id: input.member_1_faculty_id,
    p_member_2_faculty_id: input.member_2_faculty_id,
    p_chair_faculty_id: input.chair_faculty_id,
    p_scheduled_at: input.scheduled_at,
    p_venue_or_link: input.venue_or_link,
    p_rubric_version_id: input.rubric_version_id || null,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure6.dal.constituteDefensePanelRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to constitute defense panel: Invalid server response.');
  }

  return data as Annexure6OperationResult;
}

/**
 * DAL function: Calls get_defense_panel_details RPC to fetch defense panel composition and schedule.
 */
export async function getDefensePanelDetailsRpc(
  supabase: SupabaseClient,
  input: GetDefensePanelDetailsInput
): Promise<Annexure6OperationResult> {
  const { data, error } = await supabase.rpc('get_defense_panel_details', {
    p_thesis_id: input.thesis_id,
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure6.dal.getDefensePanelDetailsRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to fetch defense panel details: Invalid server response.');
  }

  return data as Annexure6OperationResult;
}

/**
 * DAL function: Calls list_department_annexure_6_queue RPC to list departmental evaluation queue.
 */
export async function listDepartmentAnnexure6QueueRpc(
  supabase: SupabaseClient,
  input: ListDepartmentAnnexure6QueueInput
): Promise<Annexure6OperationResult> {
  const { data, error } = await supabase.rpc('list_department_annexure_6_queue', {
    p_department_id: input.department_id,
    p_status: input.status || 'ALL',
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure6.dal.listDepartmentAnnexure6QueueRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to list department Annexure 6 queue: Invalid server response.');
  }

  return data as Annexure6OperationResult;
}
