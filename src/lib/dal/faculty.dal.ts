import type { SupabaseClient } from '@supabase/supabase-js';
import type { DepartmentFacultyOption } from '@/types/annexure1.types';
import { mapPostgrestError } from '@/lib/dal/errors';

/**
 * Fetches the active available faculty members in a department for guide preference selection via RPC.
 */
export async function listDepartmentFacultyForPreferences(
  client: SupabaseClient,
  departmentId: string
): Promise<DepartmentFacultyOption[]> {
  const { data, error } = await client.rpc('get_department_faculty_options', {
    p_department_id: departmentId,
  });

  if (error) {
    throw mapPostgrestError(error, 'faculty.dal.listDepartmentFacultyForPreferences');
  }

  if (!data) return [];

  return (data as DepartmentFacultyOption[]).sort((a, b) =>
    a.full_name.localeCompare(b.full_name)
  );
}

/**
 * Fetches active research domains for a department.
 */
export async function listDepartmentResearchDomains(
  client: SupabaseClient,
  departmentId: string
): Promise<{ id: string; code: string; name: string }[]> {
  const { data, error } = await client
    .from('research_domains')
    .select('id, code, name')
    .eq('department_id', departmentId)
    .order('name', { ascending: true });

  if (error) {
    throw mapPostgrestError(error, 'faculty.dal.listDepartmentResearchDomains');
  }

  return data || [];
}
