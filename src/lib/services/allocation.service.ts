import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getDhodAllocationQueue,
  getDepartmentFacultyAllocOptions,
  allocateThesisSupervisorsRpc,
  reallocateThesisSupervisorsRpc,
} from '@/lib/dal/allocation.dal';
import { AppError, UnauthorizedError } from '@/lib/dal/errors';
import type { AppSession, UserRoleAssignment } from '@/types/database.types';
import type {
  AllocationQueueItem,
  FacultyAllocationOption,
  AllocateSupervisorsInput,
  ReallocateSupervisorsInput,
  AllocationResult,
  ReallocationResult,
} from '@/types/allocation.types';

/**
 * Service function: Fetches the allocation queue for authenticated D.HOD.
 */
export async function getDepartmentAllocationQueue(
  supabase: SupabaseClient,
  session: AppSession
): Promise<AllocationQueueItem[]> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to view allocation queue.');
  }

  const isDhod = session.roles.some((r: UserRoleAssignment) => r.role_id === 'DHOD');
  if (!isDhod) {
    throw new AppError('Only the Deputy Head of Department (D.HOD) possesses allocation authority.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  return getDhodAllocationQueue(supabase);
}

/**
 * Service function: Fetches available faculty options in caller's department.
 */
export async function getFacultyAllocationOptions(
  supabase: SupabaseClient,
  session: AppSession
): Promise<FacultyAllocationOption[]> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to view faculty allocation options.');
  }

  const isAuthorized = session.roles.some((r: UserRoleAssignment) =>
    ['DHOD', 'HOD'].includes(r.role_id)
  );
  if (!isAuthorized) {
    throw new AppError('Only department academic leaders may view supervisor capacity lists.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  return getDepartmentFacultyAllocOptions(supabase);
}

/**
 * Service function: Allocates Primary Guide and Co-Guide for a thesis.
 */
export async function allocateSupervisors(
  supabase: SupabaseClient,
  session: AppSession,
  input: AllocateSupervisorsInput
): Promise<AllocationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to allocate supervisors.');
  }

  const isDhod = session.roles.some((r: UserRoleAssignment) => r.role_id === 'DHOD');
  if (!isDhod) {
    throw new AppError('Only the Deputy Head of Department (D.HOD) possesses allocation authority.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.thesis_id) {
    throw new AppError('thesis_id is required for supervisor allocation.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.guide_id || !input.co_guide_id) {
    throw new AppError('Both Primary Guide and Co-Guide must be selected.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (input.guide_id === input.co_guide_id) {
    throw new AppError('Primary Guide and Co-Guide cannot be the same faculty member.', {
      code: 'IDENTICAL_SUPERVISORS',
      statusCode: 409,
    });
  }

  return allocateThesisSupervisorsRpc(supabase, input);
}

/**
 * Service function: Reallocates supervisors with mandatory institutional justification.
 */
export async function reallocateSupervisors(
  supabase: SupabaseClient,
  session: AppSession,
  input: ReallocateSupervisorsInput
): Promise<ReallocationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to reallocate supervisors.');
  }

  const isDhod = session.roles.some((r: UserRoleAssignment) => r.role_id === 'DHOD');
  if (!isDhod) {
    throw new AppError('Only the Deputy Head of Department (D.HOD) possesses supervisor reallocation authority.', {
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

  if (!input.new_guide_id || !input.new_co_guide_id) {
    throw new AppError('Both new Primary Guide and new Co-Guide must be specified.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (input.new_guide_id === input.new_co_guide_id) {
    throw new AppError('New Primary Guide and new Co-Guide cannot be the same faculty member.', {
      code: 'IDENTICAL_SUPERVISORS',
      statusCode: 409,
    });
  }

  if (!input.justification || input.justification.trim().length === 0) {
    throw new AppError('Explicit institutional justification is mandatory for supervisor reallocation.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return reallocateThesisSupervisorsRpc(supabase, input);
}
