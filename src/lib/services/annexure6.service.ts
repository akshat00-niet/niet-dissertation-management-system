import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppSession } from '@/types/database.types';
import { ValidationError, UnauthorizedError } from '@/lib/dal/errors';
import {
  submitAnnexure6EvaluationRpc,
  getAnnexure6DocketRpc,
  constituteDefensePanelRpc,
  getDefensePanelDetailsRpc,
  listDepartmentAnnexure6QueueRpc,
} from '@/lib/dal/annexure6.dal';
import type {
  SubmitAnnexure6EvaluationInput,
  GetAnnexure6DocketInput,
  ConstituteDefensePanelInput,
  GetDefensePanelDetailsInput,
  ListDepartmentAnnexure6QueueInput,
  Annexure6OperationResult,
  RegularityRating,
  TechnicalProficiency,
  RigorRating,
  DefenseRecommendation,
  DepartmentAnnexure6FilterStatus,
} from '@/types/annexure6.types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_RATINGS = new Set<string>([
  'EXEMPLARY',
  'PROFICIENT',
  'DEVELOPING',
  'UNSATISFACTORY',
]);

const VALID_RECOMMENDATIONS = new Set<string>([
  'RECOMMENDED',
  'REVISIONS_REQUIRED',
  'NOT_RECOMMENDED',
]);

const VALID_QUEUE_STATUSES = new Set<string>([
  'ALL',
  'PENDING_EVALUATION',
  'PENDING_PANEL',
  'SCHEDULED',
]);

function validateUuid(id: string, fieldName: string): void {
  if (!id || !UUID_REGEX.test(id)) {
    throw new ValidationError(`Invalid ${fieldName}: Must be a valid UUID.`);
  }
}

/**
 * Domain Service: Validates and processes Primary Guide Annexure 6 confidential evaluation.
 */
export async function submitAnnexure6Evaluation(
  supabase: SupabaseClient,
  session: AppSession | null,
  input: SubmitAnnexure6EvaluationInput
): Promise<Annexure6OperationResult> {
  if (!session) {
    throw new UnauthorizedError('Authentication required to submit Annexure 6 evaluation.');
  }

  validateUuid(input.thesis_id, 'thesis_id');

  if (
    typeof input.supervisor_score !== 'number' ||
    isNaN(input.supervisor_score) ||
    input.supervisor_score < 0.0 ||
    input.supervisor_score > 100.0
  ) {
    throw new ValidationError(
      `Supervisor evaluation score must be between 0.0 and 100.0 marks (received: ${input.supervisor_score}).`
    );
  }

  if (!VALID_RATINGS.has(input.regularity_rating)) {
    throw new ValidationError(
      `Invalid regularity rating: "${input.regularity_rating}". Must be one of: EXEMPLARY, PROFICIENT, DEVELOPING, UNSATISFACTORY.`
    );
  }

  if (!VALID_RATINGS.has(input.technical_proficiency)) {
    throw new ValidationError(
      `Invalid technical proficiency: "${input.technical_proficiency}". Must be one of: EXEMPLARY, PROFICIENT, DEVELOPING, UNSATISFACTORY.`
    );
  }

  if (!VALID_RATINGS.has(input.rigor_rating)) {
    throw new ValidationError(
      `Invalid rigor rating: "${input.rigor_rating}". Must be one of: EXEMPLARY, PROFICIENT, DEVELOPING, UNSATISFACTORY.`
    );
  }

  if (!VALID_RECOMMENDATIONS.has(input.defense_recommendation)) {
    throw new ValidationError(
      `Invalid defense recommendation: "${input.defense_recommendation}". Must be one of: RECOMMENDED, REVISIONS_REQUIRED, NOT_RECOMMENDED.`
    );
  }

  if (!input.confidential_remarks || input.confidential_remarks.trim().length === 0) {
    throw new ValidationError('Confidential supervisor remarks are mandatory for Annexure 6 evaluation.');
  }

  if (input.confidential_remarks.trim().length > 4000) {
    throw new ValidationError('Confidential remarks must not exceed 4000 characters.');
  }

  if (input.evaluator_sheet_doc_id) {
    validateUuid(input.evaluator_sheet_doc_id, 'evaluator_sheet_doc_id');
  }

  if (input.evaluation_document_id) {
    validateUuid(input.evaluation_document_id, 'evaluation_document_id');
  }

  return submitAnnexure6EvaluationRpc(supabase, {
    ...input,
    regularity_rating: input.regularity_rating as RegularityRating,
    technical_proficiency: input.technical_proficiency as TechnicalProficiency,
    rigor_rating: input.rigor_rating as RigorRating,
    defense_recommendation: input.defense_recommendation as DefenseRecommendation,
    confidential_remarks: input.confidential_remarks.trim(),
  });
}

/**
 * Domain Service: Fetches confidential Annexure 6 dossier with security checks.
 */
export async function getAnnexure6Docket(
  supabase: SupabaseClient,
  session: AppSession | null,
  input: GetAnnexure6DocketInput
): Promise<Annexure6OperationResult> {
  if (!session) {
    throw new UnauthorizedError('Authentication required to access Annexure 6 docket.');
  }

  validateUuid(input.thesis_id, 'thesis_id');

  return getAnnexure6DocketRpc(supabase, input);
}

/**
 * Domain Service: Validates and processes oral defense panel constitution and viva scheduling.
 */
export async function constituteDefensePanel(
  supabase: SupabaseClient,
  session: AppSession | null,
  input: ConstituteDefensePanelInput
): Promise<Annexure6OperationResult> {
  if (!session) {
    throw new UnauthorizedError('Authentication required to constitute oral defense panel.');
  }

  validateUuid(input.thesis_id, 'thesis_id');
  validateUuid(input.member_1_faculty_id, 'member_1_faculty_id');
  validateUuid(input.member_2_faculty_id, 'member_2_faculty_id');
  validateUuid(input.chair_faculty_id, 'chair_faculty_id');

  if (input.member_1_faculty_id === input.member_2_faculty_id) {
    throw new ValidationError('Defense panel must consist of exactly two distinct faculty members.');
  }

  if (
    input.chair_faculty_id !== input.member_1_faculty_id &&
    input.chair_faculty_id !== input.member_2_faculty_id
  ) {
    throw new ValidationError('Designated panel chair must be one of the two appointed panel members.');
  }

  if (!input.scheduled_at) {
    throw new ValidationError('Oral defense scheduled timestamp is required.');
  }

  const scheduledDate = new Date(input.scheduled_at);
  if (isNaN(scheduledDate.getTime())) {
    throw new ValidationError('Invalid scheduled_at: Must be a valid ISO 8601 date string.');
  }

  if (scheduledDate.getTime() <= Date.now()) {
    throw new ValidationError('Oral defense must be scheduled for a future date and time.');
  }

  if (!input.venue_or_link || input.venue_or_link.trim().length === 0) {
    throw new ValidationError('Defense venue / virtual meeting link is mandatory.');
  }

  if (input.venue_or_link.trim().length > 500) {
    throw new ValidationError('Defense venue or link must not exceed 500 characters.');
  }

  if (input.rubric_version_id) {
    validateUuid(input.rubric_version_id, 'rubric_version_id');
  }

  return constituteDefensePanelRpc(supabase, {
    ...input,
    venue_or_link: input.venue_or_link.trim(),
  });
}

/**
 * Domain Service: Fetches constituted defense panel roster and schedule.
 */
export async function getDefensePanelDetails(
  supabase: SupabaseClient,
  session: AppSession | null,
  input: GetDefensePanelDetailsInput
): Promise<Annexure6OperationResult> {
  if (!session) {
    throw new UnauthorizedError('Authentication required to access defense panel details.');
  }

  validateUuid(input.thesis_id, 'thesis_id');

  return getDefensePanelDetailsRpc(supabase, input);
}

/**
 * Domain Service: Lists departmental Annexure 6 evaluation and defense panel queue.
 */
export async function listDepartmentAnnexure6Queue(
  supabase: SupabaseClient,
  session: AppSession | null,
  input: ListDepartmentAnnexure6QueueInput
): Promise<Annexure6OperationResult> {
  if (!session) {
    throw new UnauthorizedError('Authentication required to list department Annexure 6 queue.');
  }

  validateUuid(input.department_id, 'department_id');

  const status = (input.status || 'ALL').toUpperCase();
  if (!VALID_QUEUE_STATUSES.has(status)) {
    throw new ValidationError(
      `Invalid status filter: "${input.status}". Must be one of: ALL, PENDING_EVALUATION, PENDING_PANEL, SCHEDULED.`
    );
  }

  return listDepartmentAnnexure6QueueRpc(supabase, {
    department_id: input.department_id,
    status: status as DepartmentAnnexure6FilterStatus,
  });
}
