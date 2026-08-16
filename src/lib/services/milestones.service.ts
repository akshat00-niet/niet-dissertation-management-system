import type { SupabaseClient } from '@supabase/supabase-js';
import {
  scheduleMilestonePresentationRpc,
  submitMilestoneEvaluationRpc,
  getMilestoneEvaluationDetailsRpc,
  listDepartmentMilestonesRpc,
} from '@/lib/dal/milestones.dal';
import { AppError, UnauthorizedError } from '@/lib/dal/errors';
import type { AppSession, UserRoleAssignment } from '@/types/database.types';
import type {
  ScheduleMilestonePresentationInput,
  SubmitMilestoneEvaluationInput,
  GetMilestoneEvaluationDetailsInput,
  ListDepartmentMilestonesInput,
  MilestoneOperationResult,
} from '@/types/milestones.types';

/**
 * Service function: Department Coordinator schedules a P1, P2, or P3 presentation window.
 */
export async function scheduleMilestonePresentation(
  supabase: SupabaseClient,
  session: AppSession,
  input: ScheduleMilestonePresentationInput
): Promise<MilestoneOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to schedule milestone presentation.');
  }

  const isAuthorized = session.roles.some((r: UserRoleAssignment) =>
    ['DC', 'HOD', 'ADMIN'].includes(r.role_id)
  );
  if (!isAuthorized) {
    throw new AppError('Only Department Coordinator (DC) or HOD may schedule milestone presentations.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.thesis_id?.trim()) {
    throw new AppError('thesis_id is required to schedule presentation.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!['P1', 'P2', 'P3'].includes(input.milestone_type)) {
    throw new AppError('Invalid milestone type (must be P1, P2, or P3).', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.presentation_date?.trim()) {
    throw new AppError('Presentation date/time is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  const parsedDate = new Date(input.presentation_date);
  if (isNaN(parsedDate.getTime())) {
    throw new AppError('Invalid presentation date/time format.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.venue_or_url?.trim()) {
    throw new AppError('Presentation venue or meeting URL is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return scheduleMilestonePresentationRpc(supabase, {
    thesis_id: input.thesis_id.trim(),
    milestone_type: input.milestone_type,
    presentation_date: input.presentation_date.trim(),
    venue_or_url: input.venue_or_url.trim(),
    notes: input.notes?.trim() || null,
    client_ip: input.client_ip,
    user_agent: input.user_agent,
  });
}

/**
 * Service function: DCEC Member or Committee submits evaluation with dynamic 4-column rubric scoring.
 * Enforces P3-only final grade contribution invariant server-side (client cannot override).
 */
export async function submitMilestoneEvaluation(
  supabase: SupabaseClient,
  session: AppSession,
  input: SubmitMilestoneEvaluationInput
): Promise<MilestoneOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to submit milestone evaluation.');
  }

  const isAuthorized = session.roles.some((r: UserRoleAssignment) =>
    ['DCEC_MEMBER', 'DCEC_CHAIR', 'HOD', 'ADMIN'].includes(r.role_id)
  );
  if (!isAuthorized) {
    throw new AppError('Only DCEC Committee members or HOD may submit milestone evaluations.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.thesis_id?.trim()) {
    throw new AppError('thesis_id is required to submit evaluation.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!['P1', 'P2', 'P3'].includes(input.milestone_type)) {
    throw new AppError('Invalid milestone type (must be P1, P2, or P3).', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.rubric_version_id?.trim()) {
    throw new AppError('rubric_version_id is mandatory to pin evaluation scorecard.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.criterion_scores || !Array.isArray(input.criterion_scores) || input.criterion_scores.length === 0) {
    throw new AppError('Criterion scores array is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  // Pre-validate uniqueness of scored criteria and marks bounds
  const seenCriteria = new Set<string>();
  let totalAwarded = 0;

  for (let i = 0; i < input.criterion_scores.length; i++) {
    const score = input.criterion_scores[i];
    if (!score.criterion_id?.trim()) {
      throw new AppError(`Score item at index ${i + 1} missing criterion_id.`, {
        code: 'VALIDATION_FAILED',
        statusCode: 400,
      });
    }

    if (seenCriteria.has(score.criterion_id)) {
      throw new AppError(`Duplicate score submitted for criterion ${score.criterion_id}.`, {
        code: 'VALIDATION_FAILED',
        statusCode: 400,
      });
    }
    seenCriteria.add(score.criterion_id);

    if (!score.selected_level_id?.trim()) {
      throw new AppError(`Score item for criterion ${score.criterion_id} missing selected_level_id.`, {
        code: 'VALIDATION_FAILED',
        statusCode: 400,
      });
    }

    if (typeof score.awarded_marks !== 'number' || score.awarded_marks < 0 || score.awarded_marks > 100) {
      throw new AppError(`Invalid awarded marks for criterion ${score.criterion_id} (must be between 0.0 and 100.0).`, {
        code: 'VALIDATION_FAILED',
        statusCode: 400,
      });
    }

    totalAwarded += score.awarded_marks;
  }

  if (totalAwarded < 0 || totalAwarded > 100.0) {
    throw new AppError(`Total awarded marks (${totalAwarded}) must be between 0.0 and 100.0.`, {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return submitMilestoneEvaluationRpc(supabase, {
    thesis_id: input.thesis_id.trim(),
    milestone_type: input.milestone_type,
    rubric_version_id: input.rubric_version_id.trim(),
    criterion_scores: input.criterion_scores.map((s) => ({
      criterion_id: s.criterion_id.trim(),
      selected_level_id: s.selected_level_id.trim(),
      awarded_marks: s.awarded_marks,
      criterion_remarks: s.criterion_remarks?.trim() || null,
    })),
    general_feedback: input.general_feedback?.trim() || null,
    client_ip: input.client_ip,
    user_agent: input.user_agent,
  });
}

/**
 * Service function: Retrieves complete evaluation details with pinned rubric and granular criteria.
 */
export async function getMilestoneEvaluationDetails(
  supabase: SupabaseClient,
  session: AppSession,
  input: GetMilestoneEvaluationDetailsInput
): Promise<MilestoneOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to view milestone evaluation details.');
  }

  if (!input.thesis_id?.trim()) {
    throw new AppError('thesis_id is required to fetch evaluation details.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!['P1', 'P2', 'P3'].includes(input.milestone_type)) {
    throw new AppError('Invalid milestone type (must be P1, P2, or P3).', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return getMilestoneEvaluationDetailsRpc(supabase, {
    thesis_id: input.thesis_id.trim(),
    milestone_type: input.milestone_type,
  });
}

/**
 * Service function: Departmental oversight query for cohort milestone presentations and evaluations.
 */
export async function listDepartmentMilestones(
  supabase: SupabaseClient,
  session: AppSession,
  input: ListDepartmentMilestonesInput
): Promise<MilestoneOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to list department milestones.');
  }

  const isAuthorized = session.roles.some((r: UserRoleAssignment) =>
    ['DC', 'HOD', 'DHOD', 'DCEC_MEMBER', 'DCEC_CHAIR', 'ADMIN'].includes(r.role_id)
  );
  if (!isAuthorized) {
    throw new AppError('Only Department Officials or Committee may access department milestone overview.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.department_id?.trim()) {
    throw new AppError('department_id is required to list department milestones.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return listDepartmentMilestonesRpc(supabase, {
    department_id: input.department_id.trim(),
    academic_session_id: input.academic_session_id?.trim() || null,
    milestone_type: input.milestone_type?.trim() || null,
    status: input.status?.trim() || null,
  });
}
