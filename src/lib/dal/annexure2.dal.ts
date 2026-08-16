import type { SupabaseClient } from '@supabase/supabase-js';
import { mapPostgrestError, DatabaseError } from '@/lib/dal/errors';
import type {
  Annexure2Workspace,
  SaveAnnexure2DraftInput,
  SubmitAnnexure2Input,
  EndorseAnnexure2Input,
  DecideAnnexure2TitleInput,
  Annexure2OperationResult,
} from '@/types/annexure2.types';

/**
 * DAL function: Fetches the complete Annexure 2 workspace aggregate.
 */
export async function getAnnexure2WorkspaceRpc(
  supabase: SupabaseClient,
  thesisId: string
): Promise<Annexure2Workspace> {
  const { data, error } = await supabase.rpc('get_annexure_2_workspace', {
    p_thesis_id: thesisId,
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure2.dal.getAnnexure2WorkspaceRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to fetch Annexure 2 workspace: Invalid server response.');
  }

  return data as Annexure2Workspace;
}

/**
 * DAL function: Saves draft of collaborative problem formulation and finalized title.
 */
export async function saveAnnexure2DraftRpc(
  supabase: SupabaseClient,
  input: SaveAnnexure2DraftInput
): Promise<Annexure2OperationResult> {
  const { data, error } = await supabase.rpc('save_annexure_2_draft', {
    p_thesis_id: input.thesis_id,
    p_final_title: input.final_title,
    p_refined_problem: input.refined_problem,
    p_methodology: input.methodology,
    p_timeline_milestones: input.timeline_milestones,
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure2.dal.saveAnnexure2DraftRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to save Annexure 2 draft: Invalid server response.');
  }

  return data as Annexure2OperationResult;
}

/**
 * DAL function: Formally submits Annexure 2 for Dual Supervisor Endorsement.
 */
export async function submitAnnexure2Rpc(
  supabase: SupabaseClient,
  input: SubmitAnnexure2Input
): Promise<Annexure2OperationResult> {
  const { data, error } = await supabase.rpc('submit_annexure_2', {
    p_thesis_id: input.thesis_id,
    p_final_title: input.final_title,
    p_refined_problem: input.refined_problem,
    p_methodology: input.methodology,
    p_timeline_milestones: input.timeline_milestones,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure2.dal.submitAnnexure2Rpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to submit Annexure 2: Invalid server response.');
  }

  return data as Annexure2OperationResult;
}

/**
 * DAL function: Executes electronic endorsement or revision request by Primary Guide or Co-Guide.
 */
export async function endorseAnnexure2Rpc(
  supabase: SupabaseClient,
  input: EndorseAnnexure2Input
): Promise<Annexure2OperationResult> {
  const { data, error } = await supabase.rpc('endorse_annexure_2', {
    p_thesis_id: input.thesis_id,
    p_is_endorsed: input.is_endorsed,
    p_remarks: input.remarks || null,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure2.dal.endorseAnnexure2Rpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to record supervisor endorsement: Invalid server response.');
  }

  return data as Annexure2OperationResult;
}

/**
 * DAL function: Executes binding DCEC Chair title decision (Approval or Revision Order).
 */
export async function decideAnnexure2TitleRpc(
  supabase: SupabaseClient,
  input: DecideAnnexure2TitleInput
): Promise<Annexure2OperationResult> {
  const { data, error } = await supabase.rpc('decide_annexure_2_title_dcec', {
    p_thesis_id: input.thesis_id,
    p_outcome: input.outcome,
    p_formal_remarks: input.formal_remarks,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure2.dal.decideAnnexure2TitleRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to record DCEC title decision: Invalid server response.');
  }

  return data as Annexure2OperationResult;
}
