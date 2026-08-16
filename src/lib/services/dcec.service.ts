import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getDCScreeningQueue,
  getDCECScreeningQueue,
  verifyAndForwardDcecDocketRpc,
  recordDcecScreeningDecisionRpc,
  createDcecDelegationRpc,
} from '@/lib/dal/dcec.dal';
import { AppError, UnauthorizedError } from '@/lib/dal/errors';
import type { AppSession, UserRoleAssignment } from '@/types/database.types';
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
 * Service function: Fetches DC screening queue for authenticated DC.
 */
export async function getDepartmentCoordinatorQueue(
  supabase: SupabaseClient,
  session: AppSession
): Promise<DCScreeningQueueItem[]> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to view DC screening queue.');
  }

  const isDc = session.roles.some((r: UserRoleAssignment) => r.role_id === 'DC');
  if (!isDc) {
    throw new AppError('Only Department Coordinators may access the DC screening queue.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  return getDCScreeningQueue(supabase);
}

/**
 * Service function: Fetches DCEC screening queue for HOD, DHOD, DC, or DCEC members.
 */
export async function getDcecCommitteeQueue(
  supabase: SupabaseClient,
  session: AppSession
): Promise<DCECScreeningQueueItem[]> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to view DCEC screening queue.');
  }

  const isAuthorized = session.roles.some((r: UserRoleAssignment) =>
    ['HOD', 'DHOD', 'DC', 'DCEC_MEMBER'].includes(r.role_id)
  );
  if (!isAuthorized) {
    throw new AppError('Only authorized academic committee members may view the DCEC screening queue.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  return getDCECScreeningQueue(supabase);
}

/**
 * Service function: Verifies candidate eligibility and documentation, then forwards to DCEC Chair.
 */
export async function verifyAndForwardDocket(
  supabase: SupabaseClient,
  session: AppSession,
  input: VerifyDocketInput
): Promise<DocketVerificationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to verify screening docket.');
  }

  const isDc = session.roles.some((r: UserRoleAssignment) => r.role_id === 'DC');
  if (!isDc) {
    throw new AppError('Only Department Coordinators possess Maker verification authority.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.thesis_id) {
    throw new AppError('thesis_id is required for docket verification.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return verifyAndForwardDcecDocketRpc(supabase, input);
}

/**
 * Service function: Records binding DCEC screening decision (Checker sign-off).
 */
export async function recordDcecDecision(
  supabase: SupabaseClient,
  session: AppSession,
  input: RecordDcecDecisionInput
): Promise<DcecDecisionResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to record DCEC decision.');
  }

  const isChairCandidate = session.roles.some((r: UserRoleAssignment) =>
    ['HOD', 'DHOD'].includes(r.role_id)
  );
  if (!isChairCandidate) {
    throw new AppError('Only the Head of Department or authorized Deputy HOD may record DCEC decisions.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.docket_id) {
    throw new AppError('docket_id is required.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!['APPROVED', 'REVISION_REQUIRED', 'REJECTED'].includes(input.outcome)) {
    throw new AppError(`Invalid DCEC outcome: ${input.outcome}`, {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.formal_remarks || input.formal_remarks.trim().length === 0) {
    throw new AppError('Formal remarks are mandatory for recording a DCEC decision.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return recordDcecScreeningDecisionRpc(supabase, input);
}

/**
 * Service function: HOD delegation of Chair authority.
 */
export async function createDcecDelegation(
  supabase: SupabaseClient,
  session: AppSession,
  input: CreateDcecDelegationInput
): Promise<{ success: boolean; delegation_id: string }> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to create delegation.');
  }

  const isHod = session.roles.some((r: UserRoleAssignment) => r.role_id === 'HOD');
  if (!isHod) {
    throw new AppError('Only the Head of Department may create DCEC Chair delegations.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  return createDcecDelegationRpc(supabase, input);
}
