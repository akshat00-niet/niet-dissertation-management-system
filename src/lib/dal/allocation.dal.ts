import type { SupabaseClient } from '@supabase/supabase-js';
import { mapPostgrestError, DatabaseError } from '@/lib/dal/errors';
import type {
  AllocationQueueItem,
  FacultyAllocationOption,
  AllocateSupervisorsInput,
  ReallocateSupervisorsInput,
  AllocationResult,
  ReallocationResult,
} from '@/types/allocation.types';

/**
 * DAL function: Fetches the allocation queue for the authenticated D.HOD's department.
 */
export async function getDhodAllocationQueue(
  supabase: SupabaseClient
): Promise<AllocationQueueItem[]> {
  const { data, error } = await supabase.rpc('get_dhod_allocation_queue');

  if (error) {
    throw mapPostgrestError(error, '[allocation.dal.getDhodAllocationQueue]');
  }

  return (data || []) as AllocationQueueItem[];
}

/**
 * DAL function: Fetches available faculty options with active loads for the department.
 */
export async function getDepartmentFacultyAllocOptions(
  supabase: SupabaseClient
): Promise<FacultyAllocationOption[]> {
  const { data, error } = await supabase.rpc('get_department_faculty_alloc_options');

  if (error) {
    throw mapPostgrestError(error, '[allocation.dal.getDepartmentFacultyAllocOptions]');
  }

  return (data || []) as FacultyAllocationOption[];
}

/**
 * DAL function: Executes atomic manual allocation of Primary Guide and Co-Guide.
 */
export async function allocateThesisSupervisorsRpc(
  supabase: SupabaseClient,
  input: AllocateSupervisorsInput
): Promise<AllocationResult> {
  const { data, error } = await supabase.rpc('allocate_thesis_supervisors', {
    p_thesis_id: input.thesis_id,
    p_guide_id: input.guide_id,
    p_co_guide_id: input.co_guide_id,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[allocation.dal.allocateThesisSupervisorsRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to allocate thesis supervisors: Invalid server response.');
  }

  return data as AllocationResult;
}

/**
 * DAL function: Executes exceptional supervisor reallocation with mandatory justification.
 */
export async function reallocateThesisSupervisorsRpc(
  supabase: SupabaseClient,
  input: ReallocateSupervisorsInput
): Promise<ReallocationResult> {
  const { data, error } = await supabase.rpc('reallocate_thesis_supervisors', {
    p_thesis_id: input.thesis_id,
    p_new_guide_id: input.new_guide_id,
    p_new_co_guide_id: input.new_co_guide_id,
    p_justification: input.justification,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[allocation.dal.reallocateThesisSupervisorsRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to reallocate thesis supervisors: Invalid server response.');
  }

  return data as ReallocationResult;
}
