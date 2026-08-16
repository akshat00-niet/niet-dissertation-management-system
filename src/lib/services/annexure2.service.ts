import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getAnnexure2WorkspaceRpc,
  saveAnnexure2DraftRpc,
  submitAnnexure2Rpc,
  endorseAnnexure2Rpc,
  decideAnnexure2TitleRpc,
} from '@/lib/dal/annexure2.dal';
import { AppError, UnauthorizedError } from '@/lib/dal/errors';
import type { AppSession, UserRoleAssignment } from '@/types/database.types';
import type {
  Annexure2Workspace,
  SaveAnnexure2DraftInput,
  SubmitAnnexure2Input,
  EndorseAnnexure2Input,
  DecideAnnexure2TitleInput,
  Annexure2OperationResult,
} from '@/types/annexure2.types';

/**
 * Service function: Retrieves the complete Annexure 2 workspace aggregate.
 */
export async function getAnnexure2Workspace(
  supabase: SupabaseClient,
  session: AppSession,
  thesisId: string
): Promise<Annexure2Workspace> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to access Annexure 2 workspace.');
  }

  if (!thesisId) {
    throw new AppError('thesis_id is required to fetch Annexure 2 workspace.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return getAnnexure2WorkspaceRpc(supabase, thesisId);
}

/**
 * Service function: Saves a draft of collaborative problem formulation.
 */
export async function saveAnnexure2Draft(
  supabase: SupabaseClient,
  session: AppSession,
  input: SaveAnnexure2DraftInput
): Promise<Annexure2OperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to save Annexure 2 draft.');
  }

  const isStudent = session.roles.some((r: UserRoleAssignment) => r.role_id === 'STUDENT');
  if (!isStudent) {
    throw new AppError('Only student candidates may edit Annexure 2 drafts.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.thesis_id) {
    throw new AppError('thesis_id is required.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.final_title || !input.final_title.trim()) {
    throw new AppError('Finalized dissertation title cannot be empty.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return saveAnnexure2DraftRpc(supabase, {
    thesis_id: input.thesis_id,
    final_title: input.final_title.trim(),
    refined_problem: input.refined_problem ? input.refined_problem.trim() : '',
    methodology: input.methodology ? input.methodology.trim() : '',
    timeline_milestones: input.timeline_milestones || [],
  });
}

/**
 * Service function: Formally submits Annexure 2 for Dual Supervisor Endorsement.
 */
export async function submitAnnexure2(
  supabase: SupabaseClient,
  session: AppSession,
  input: SubmitAnnexure2Input
): Promise<Annexure2OperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to submit Annexure 2.');
  }

  const isStudent = session.roles.some((r: UserRoleAssignment) => r.role_id === 'STUDENT');
  if (!isStudent) {
    throw new AppError('Only the candidate student may submit Annexure 2.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.thesis_id) {
    throw new AppError('thesis_id is required for submission.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.final_title || !input.final_title.trim()) {
    throw new AppError('Finalized dissertation title is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.refined_problem || !input.refined_problem.trim()) {
    throw new AppError('Refined problem statement is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.methodology || !input.methodology.trim()) {
    throw new AppError('Research methodology description is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!Array.isArray(input.timeline_milestones) || input.timeline_milestones.length === 0) {
    throw new AppError('Timeline milestones must be provided as a non-empty array.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return submitAnnexure2Rpc(supabase, {
    thesis_id: input.thesis_id,
    final_title: input.final_title.trim(),
    refined_problem: input.refined_problem.trim(),
    methodology: input.methodology.trim(),
    timeline_milestones: input.timeline_milestones,
    client_ip: input.client_ip,
    user_agent: input.user_agent,
  });
}

/**
 * Service function: Records electronic endorsement or revision request by Guide/Co-Guide.
 */
export async function endorseAnnexure2(
  supabase: SupabaseClient,
  session: AppSession,
  input: EndorseAnnexure2Input
): Promise<Annexure2OperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to endorse Annexure 2.');
  }

  const isFaculty = session.roles.some((r: UserRoleAssignment) =>
    ['FACULTY', 'GUIDE', 'CO_GUIDE', 'HOD', 'DHOD'].includes(r.role_id)
  );
  if (!isFaculty) {
    throw new AppError('Only assigned supervisors may endorse Annexure 2.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.thesis_id) {
    throw new AppError('thesis_id is required.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (typeof input.is_endorsed !== 'boolean') {
    throw new AppError('Endorsement decision (is_endorsed) must be a boolean.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.is_endorsed && (!input.remarks || !input.remarks.trim())) {
    throw new AppError('Formal feedback remarks are mandatory when requesting revision.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return endorseAnnexure2Rpc(supabase, {
    thesis_id: input.thesis_id,
    is_endorsed: input.is_endorsed,
    remarks: input.remarks ? input.remarks.trim() : null,
    client_ip: input.client_ip,
    user_agent: input.user_agent,
  });
}

/**
 * Service function: Records binding DCEC Chair formal title approval or revision request.
 */
export async function decideAnnexure2Title(
  supabase: SupabaseClient,
  session: AppSession,
  input: DecideAnnexure2TitleInput
): Promise<Annexure2OperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to record DCEC title decision.');
  }

  const isAcademicLeader = session.roles.some((r: UserRoleAssignment) =>
    ['HOD', 'DHOD'].includes(r.role_id)
  );
  if (!isAcademicLeader) {
    throw new AppError('Only the DCEC Chair may render formal title decisions.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.thesis_id) {
    throw new AppError('thesis_id is required.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!['APPROVED', 'REVISION_REQUIRED'].includes(input.outcome)) {
    throw new AppError('Invalid title decision outcome (expected APPROVED or REVISION_REQUIRED).', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.formal_remarks || !input.formal_remarks.trim()) {
    throw new AppError('Formal remarks are mandatory for DCEC Chair title decisions.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return decideAnnexure2TitleRpc(supabase, {
    thesis_id: input.thesis_id,
    outcome: input.outcome,
    formal_remarks: input.formal_remarks.trim(),
    client_ip: input.client_ip,
    user_agent: input.user_agent,
  });
}
