import type { SupabaseClient } from '@supabase/supabase-js';
import type { StudentProfile, FacultyProfile } from '@/types/database.types';
import { mapPostgrestError } from '@/lib/dal/errors';

/**
 * Fetches a student academic profile by user UUID.
 * Row-level visibility is strictly evaluated by PostgreSQL RLS.
 */
export async function getStudentProfileByUserId(
  client: SupabaseClient,
  userId: string
): Promise<StudentProfile | null> {
  const { data, error } = await client
    .from('student_profiles')
    .select(
      'user_id, roll_number, enrollment_number, program_id, department_id, batch_name, current_semester, is_eligible, created_at'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw mapPostgrestError(error, 'profiles.dal.getStudentProfileByUserId');
  }

  return (data as StudentProfile) || null;
}

/**
 * Fetches a faculty academic profile by user UUID.
 * Row-level visibility is strictly evaluated by PostgreSQL RLS.
 */
export async function getFacultyProfileByUserId(
  client: SupabaseClient,
  userId: string
): Promise<FacultyProfile | null> {
  const { data, error } = await client
    .from('faculty_profiles')
    .select(
      'user_id, employee_code, designation, department_id, active_guide_load, active_coguide_load, is_available, created_at'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw mapPostgrestError(error, 'profiles.dal.getFacultyProfileByUserId');
  }

  return (data as FacultyProfile) || null;
}
