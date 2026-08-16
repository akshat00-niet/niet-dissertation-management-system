import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppSession } from '@/types/database.types';
import { ValidationError, UnauthorizedError } from '@/lib/dal/errors';
import {
  submitAnnexure5PackageRpc,
  endorseAnnexure5SubmissionRpc,
  requestAnnexure5RevisionRpc,
  getAnnexure5DocketRpc,
  listDepartmentAnnexure5SubmissionsRpc,
} from '@/lib/dal/annexure5.dal';
import type {
  SubmitAnnexure5PackageInput,
  EndorseAnnexure5SubmissionInput,
  RequestAnnexure5RevisionInput,
  GetAnnexure5DocketInput,
  ListDepartmentAnnexure5SubmissionsInput,
  Annexure5OperationResult,
} from '@/types/annexure5.types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUuid(id: string, fieldName: string): void {
  if (!id || !UUID_REGEX.test(id)) {
    throw new ValidationError(`Invalid ${fieldName}: Must be a valid UUID.`);
  }
}

/**
 * Domain Service: Validates and processes Annexure 5 final dissertation submission.
 */
export async function submitAnnexure5Package(
  supabase: SupabaseClient,
  session: AppSession | null,
  input: SubmitAnnexure5PackageInput
): Promise<Annexure5OperationResult> {
  if (!session) {
    throw new UnauthorizedError('Authentication required to submit Annexure 5.');
  }

  validateUuid(input.thesis_id, 'thesis_id');
  validateUuid(input.manuscript_document_id, 'manuscript_document_id');
  validateUuid(input.synopsis_document_id, 'synopsis_document_id');
  validateUuid(input.similarity_certificate_id, 'similarity_certificate_id');

  if (
    typeof input.plagiarism_percentage !== 'number' ||
    isNaN(input.plagiarism_percentage) ||
    input.plagiarism_percentage < 0.0 ||
    input.plagiarism_percentage >= 10.0
  ) {
    throw new ValidationError(
      `Institutional Plagiarism Benchmark violated: Plagiarism similarity must be >= 0.0% and < 10.0% (received ${input.plagiarism_percentage}%).`
    );
  }

  const aiPercentage = input.ai_similarity_percentage ?? 0.0;
  if (typeof aiPercentage !== 'number' || isNaN(aiPercentage) || aiPercentage !== 0.0) {
    throw new ValidationError(
      `Institutional AI Content Benchmark violated: AI similarity must be strictly 0.0% (received ${aiPercentage}%).`
    );
  }

  if (input.repository_url) {
    const trimmedUrl = input.repository_url.trim();
    if (trimmedUrl.length > 0 && !/^https?:\/\/.+/i.test(trimmedUrl)) {
      throw new ValidationError('Repository URL must be a valid HTTP or HTTPS web address.');
    }
  }

  return submitAnnexure5PackageRpc(supabase, {
    ...input,
    repository_url: input.repository_url ? input.repository_url.trim() : null,
    ai_similarity_percentage: aiPercentage,
  });
}

/**
 * Domain Service: Validates and processes Guide / Co-Guide Annexure 5 electronic endorsement.
 */
export async function endorseAnnexure5Submission(
  supabase: SupabaseClient,
  session: AppSession | null,
  input: EndorseAnnexure5SubmissionInput
): Promise<Annexure5OperationResult> {
  if (!session) {
    throw new UnauthorizedError('Authentication required to endorse Annexure 5.');
  }

  validateUuid(input.thesis_id, 'thesis_id');

  if (typeof input.is_endorsed !== 'boolean') {
    throw new ValidationError('Endorsement decision (is_endorsed) must be a boolean value.');
  }

  if (input.is_endorsed === false && (!input.remarks || input.remarks.trim().length === 0)) {
    throw new ValidationError('Formal feedback remarks are mandatory when requesting revision on Annexure 5.');
  }

  return endorseAnnexure5SubmissionRpc(supabase, {
    ...input,
    remarks: input.remarks ? input.remarks.trim() : null,
  });
}

/**
 * Domain Service: Validates and processes Guide / Co-Guide Annexure 5 revision request.
 */
export async function requestAnnexure5Revision(
  supabase: SupabaseClient,
  session: AppSession | null,
  input: RequestAnnexure5RevisionInput
): Promise<Annexure5OperationResult> {
  if (!session) {
    throw new UnauthorizedError('Authentication required to request Annexure 5 revision.');
  }

  validateUuid(input.thesis_id, 'thesis_id');

  if (!input.revision_notes || input.revision_notes.trim().length === 0) {
    throw new ValidationError('Revision notes are mandatory when requesting corrections on Annexure 5.');
  }

  if (input.revision_notes.trim().length > 4000) {
    throw new ValidationError('Revision notes must not exceed 4000 characters.');
  }

  return requestAnnexure5RevisionRpc(supabase, {
    ...input,
    revision_notes: input.revision_notes.trim(),
  });
}

/**
 * Domain Service: Fetches full Annexure 5 dossier with candidate and supervisor details.
 */
export async function getAnnexure5Docket(
  supabase: SupabaseClient,
  session: AppSession | null,
  input: GetAnnexure5DocketInput
): Promise<Annexure5OperationResult> {
  if (!session) {
    throw new UnauthorizedError('Authentication required to access Annexure 5 docket.');
  }

  validateUuid(input.thesis_id, 'thesis_id');

  return getAnnexure5DocketRpc(supabase, input);
}

/**
 * Domain Service: Lists cohort final dissertation submissions for department administration.
 */
export async function listDepartmentAnnexure5Submissions(
  supabase: SupabaseClient,
  session: AppSession | null,
  input: ListDepartmentAnnexure5SubmissionsInput
): Promise<Annexure5OperationResult> {
  if (!session) {
    throw new UnauthorizedError('Authentication required to list department final submissions.');
  }

  validateUuid(input.department_id, 'department_id');

  const allowedStatuses = ['ALL', 'SUBMITTED', 'PREPARATION', 'ENDORSED'];
  const status = input.status || 'ALL';
  if (!allowedStatuses.includes(status)) {
    throw new ValidationError(`Invalid status filter. Allowed values: ${allowedStatuses.join(', ')}`);
  }

  return listDepartmentAnnexure5SubmissionsRpc(supabase, {
    department_id: input.department_id,
    status,
  });
}
