import type { SupabaseClient } from '@supabase/supabase-js';
import { mapPostgrestError, DatabaseError } from '@/lib/dal/errors';
import type {
  SubmitAnnexure5PackageInput,
  EndorseAnnexure5SubmissionInput,
  RequestAnnexure5RevisionInput,
  GetAnnexure5DocketInput,
  ListDepartmentAnnexure5SubmissionsInput,
  Annexure5OperationResult,
} from '@/types/annexure5.types';

/**
 * DAL function: Calls submit_annexure_5_package RPC to formally submit final manuscript and similarity certificate.
 */
export async function submitAnnexure5PackageRpc(
  supabase: SupabaseClient,
  input: SubmitAnnexure5PackageInput
): Promise<Annexure5OperationResult> {
  const { data, error } = await supabase.rpc('submit_annexure_5_package', {
    p_thesis_id: input.thesis_id,
    p_manuscript_document_id: input.manuscript_document_id,
    p_synopsis_document_id: input.synopsis_document_id,
    p_similarity_certificate_id: input.similarity_certificate_id,
    p_repository_url: input.repository_url || null,
    p_plagiarism_percentage: input.plagiarism_percentage,
    p_ai_similarity_percentage: input.ai_similarity_percentage ?? 0.0,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure5.dal.submitAnnexure5PackageRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to submit Annexure 5 package: Invalid server response.');
  }

  return data as Annexure5OperationResult;
}

/**
 * DAL function: Calls endorse_annexure_5_submission RPC for Guide or Co-Guide electronic sign-off.
 */
export async function endorseAnnexure5SubmissionRpc(
  supabase: SupabaseClient,
  input: EndorseAnnexure5SubmissionInput
): Promise<Annexure5OperationResult> {
  const { data, error } = await supabase.rpc('endorse_annexure_5_submission', {
    p_thesis_id: input.thesis_id,
    p_is_endorsed: input.is_endorsed,
    p_remarks: input.remarks || null,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure5.dal.endorseAnnexure5SubmissionRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to endorse Annexure 5 submission: Invalid server response.');
  }

  return data as Annexure5OperationResult;
}

/**
 * DAL function: Calls request_annexure_5_revision RPC to return submission to preparation state.
 */
export async function requestAnnexure5RevisionRpc(
  supabase: SupabaseClient,
  input: RequestAnnexure5RevisionInput
): Promise<Annexure5OperationResult> {
  const { data, error } = await supabase.rpc('request_annexure_5_revision', {
    p_thesis_id: input.thesis_id,
    p_revision_notes: input.revision_notes,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure5.dal.requestAnnexure5RevisionRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to request Annexure 5 revision: Invalid server response.');
  }

  return data as Annexure5OperationResult;
}

/**
 * DAL function: Calls get_annexure_5_docket RPC to fetch the full Annexure 5 dossier.
 */
export async function getAnnexure5DocketRpc(
  supabase: SupabaseClient,
  input: GetAnnexure5DocketInput
): Promise<Annexure5OperationResult> {
  const { data, error } = await supabase.rpc('get_annexure_5_docket', {
    p_thesis_id: input.thesis_id,
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure5.dal.getAnnexure5DocketRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to fetch Annexure 5 docket: Invalid server response.');
  }

  return data as Annexure5OperationResult;
}

/**
 * DAL function: Calls list_department_annexure_5_submissions RPC for departmental cohort oversight.
 */
export async function listDepartmentAnnexure5SubmissionsRpc(
  supabase: SupabaseClient,
  input: ListDepartmentAnnexure5SubmissionsInput
): Promise<Annexure5OperationResult> {
  const { data, error } = await supabase.rpc('list_department_annexure_5_submissions', {
    p_department_id: input.department_id,
    p_status: input.status || 'ALL',
  });

  if (error) {
    throw mapPostgrestError(error, '[annexure5.dal.listDepartmentAnnexure5SubmissionsRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to list department Annexure 5 submissions: Invalid server response.');
  }

  return data as Annexure5OperationResult;
}
