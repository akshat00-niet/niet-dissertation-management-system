import type { SupabaseClient } from '@supabase/supabase-js';
import { mapPostgrestError } from './errors';
import type {
  DCScreeningQueueItem,
  DCECScreeningQueueItem,
  VerifyDocketInput,
  RecordDcecDecisionInput,
  CreateDcecDelegationInput,
  DocketVerificationResult,
  DcecDecisionResult,
} from '@/types/dcec.types';

/**
 * Retrieves pending proposals for the authenticated DC's department.
 */
export async function getDCScreeningQueue(
  supabase: SupabaseClient
): Promise<DCScreeningQueueItem[]> {
  const { data, error } = await supabase.rpc('get_dc_screening_queue');

  if (error) {
    throw mapPostgrestError(error, '[dcec.dal.getDCScreeningQueue] ');
  }

  return (data || []) as DCScreeningQueueItem[];
}

/**
 * Retrieves dockets queued for DCEC review in the caller's department.
 */
export async function getDCECScreeningQueue(
  supabase: SupabaseClient
): Promise<DCECScreeningQueueItem[]> {
  const { data, error } = await supabase.rpc('get_dcec_screening_queue');

  if (error) {
    throw mapPostgrestError(error, '[dcec.dal.getDCECScreeningQueue] ');
  }

  return (data || []) as DCECScreeningQueueItem[];
}

/**
 * Executes atomic DC docket verification and forwarding to DCEC Chair.
 */
export async function verifyAndForwardDcecDocketRpc(
  supabase: SupabaseClient,
  input: VerifyDocketInput
): Promise<DocketVerificationResult> {
  const { data, error } = await supabase.rpc('verify_and_forward_dcec_docket', {
    p_thesis_id: input.thesis_id,
    p_is_eligible: input.is_eligible,
    p_documents_complete: input.documents_complete,
    p_dc_verification_notes: input.dc_verification_notes || null,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[dcec.dal.verifyAndForwardDcecDocketRpc] ');
  }

  return data as DocketVerificationResult;
}

/**
 * Executes atomic DCEC Chair decision recording.
 */
export async function recordDcecScreeningDecisionRpc(
  supabase: SupabaseClient,
  input: RecordDcecDecisionInput
): Promise<DcecDecisionResult> {
  const { data, error } = await supabase.rpc('record_dcec_screening_decision', {
    p_docket_id: input.docket_id,
    p_outcome: input.outcome,
    p_formal_remarks: input.formal_remarks,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[dcec.dal.recordDcecScreeningDecisionRpc] ');
  }

  return data as DcecDecisionResult;
}

/**
 * Allows HOD to create a DCEC Chair delegation to D.HOD.
 */
export async function createDcecDelegationRpc(
  supabase: SupabaseClient,
  input: CreateDcecDelegationInput
): Promise<{ success: boolean; delegation_id: string }> {
  const { data, error } = await supabase.rpc('create_dcec_delegation', {
    p_department_id: input.department_id,
    p_dhod_user_id: input.dhod_user_id,
    p_effective_from: input.effective_from,
    p_effective_until: input.effective_until,
    p_delegation_reason: input.delegation_reason,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[dcec.dal.createDcecDelegationRpc] ');
  }

  return data;
}
