import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createRubricVersionDraftRpc,
  publishRubricVersionRpc,
  getActiveMilestoneRubricRpc,
} from '@/lib/dal/rubrics.dal';
import { AppError, UnauthorizedError } from '@/lib/dal/errors';
import type { AppSession, UserRoleAssignment } from '@/types/database.types';
import type {
  CreateRubricVersionDraftInput,
  PublishRubricVersionInput,
  GetActiveMilestoneRubricInput,
  RubricOperationResult,
} from '@/types/rubrics.types';

/**
 * Service function: Creates a draft rubric version with structured 4-column criteria.
 */
export async function createRubricVersionDraft(
  supabase: SupabaseClient,
  session: AppSession,
  input: CreateRubricVersionDraftInput
): Promise<RubricOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to create rubric draft.');
  }

  const isAdmin = session.roles.some((r: UserRoleAssignment) => r.role_id === 'ADMIN');
  if (!isAdmin) {
    throw new AppError('Only system administrators may create or configure rubric drafts.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.department_id?.trim()) {
    throw new AppError('department_id is required to create rubric draft.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!['P1', 'P2', 'P3', 'FINAL_VIVA'].includes(input.milestone_type)) {
    throw new AppError('Invalid milestone type (must be P1, P2, P3, or FINAL_VIVA).', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.title?.trim()) {
    throw new AppError('Rubric title is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.criteria || !Array.isArray(input.criteria) || input.criteria.length === 0) {
    throw new AppError('Rubric must define at least one criterion.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  // Pre-validate criteria marks and 4-tier achievement structure
  let totalMaxMarks = 0;
  for (let i = 0; i < input.criteria.length; i++) {
    const crit = input.criteria[i];
    if (!crit.criterion_title?.trim()) {
      throw new AppError(`Criterion at index ${i + 1} must have a title.`, {
        code: 'VALIDATION_FAILED',
        statusCode: 400,
      });
    }

    if (typeof crit.max_marks !== 'number' || crit.max_marks <= 0 || crit.max_marks > 100) {
      throw new AppError(`Criterion "${crit.criterion_title}" max_marks must be between 0.1 and 100.0.`, {
        code: 'VALIDATION_FAILED',
        statusCode: 400,
      });
    }

    totalMaxMarks += crit.max_marks;

    if (!crit.achievement_levels || !Array.isArray(crit.achievement_levels) || crit.achievement_levels.length !== 4) {
      throw new AppError(`Criterion "${crit.criterion_title}" must define exactly 4 achievement tiers.`, {
        code: 'VALIDATION_FAILED',
        statusCode: 400,
      });
    }

    for (const level of crit.achievement_levels) {
      if (typeof level.level_index !== 'number' || level.level_index < 1 || level.level_index > 4) {
        throw new AppError(`Achievement level_index must be between 1 and 4.`, {
          code: 'VALIDATION_FAILED',
          statusCode: 400,
        });
      }

      if (typeof level.score_percentage !== 'number' || level.score_percentage < 0 || level.score_percentage > 1.0) {
        throw new AppError(`Achievement score_percentage must be between 0.0 and 1.0.`, {
          code: 'VALIDATION_FAILED',
          statusCode: 400,
        });
      }

      if (!level.label?.trim()) {
        throw new AppError(`Achievement level label is required for level ${level.level_index}.`, {
          code: 'VALIDATION_FAILED',
          statusCode: 400,
        });
      }
    }
  }

  return createRubricVersionDraftRpc(supabase, {
    department_id: input.department_id.trim(),
    milestone_type: input.milestone_type,
    title: input.title.trim(),
    criteria: input.criteria.map((c, idx) => ({
      criterion_title: c.criterion_title.trim(),
      description: c.description?.trim() || null,
      max_marks: c.max_marks,
      achievement_levels: c.achievement_levels.map((l) => ({
        level_index: l.level_index,
        label: l.label.trim(),
        descriptor: l.descriptor?.trim() || '',
        score_percentage: l.score_percentage,
      })),
    })),
    client_ip: input.client_ip,
    user_agent: input.user_agent,
  });
}

/**
 * Service function: Publishes an immutable rubric version for cohort milestone evaluations.
 */
export async function publishRubricVersion(
  supabase: SupabaseClient,
  session: AppSession,
  input: PublishRubricVersionInput
): Promise<RubricOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to publish rubric version.');
  }

  const isAuthorized = session.roles.some((r: UserRoleAssignment) => ['ADMIN', 'HOD'].includes(r.role_id));
  if (!isAuthorized) {
    throw new AppError('Only Department Head (HOD) or Administrator may publish rubric versions.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.rubric_version_id?.trim()) {
    throw new AppError('rubric_version_id is required to publish rubric version.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return publishRubricVersionRpc(supabase, {
    rubric_version_id: input.rubric_version_id.trim(),
    effective_from: input.effective_from?.trim() || undefined,
    justification: input.justification?.trim() || undefined,
    client_ip: input.client_ip,
    user_agent: input.user_agent,
  });
}

/**
 * Service function: Retrieves active published rubric for a department and milestone type.
 */
export async function getActiveMilestoneRubric(
  supabase: SupabaseClient,
  session: AppSession,
  input: GetActiveMilestoneRubricInput
): Promise<RubricOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to fetch active milestone rubric.');
  }

  if (!input.department_id?.trim()) {
    throw new AppError('department_id is required to fetch active rubric.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!['P1', 'P2', 'P3', 'FINAL_VIVA'].includes(input.milestone_type)) {
    throw new AppError('Invalid milestone type (must be P1, P2, P3, or FINAL_VIVA).', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return getActiveMilestoneRubricRpc(supabase, {
    department_id: input.department_id.trim(),
    milestone_type: input.milestone_type,
  });
}
