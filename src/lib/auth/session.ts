import { createClient } from '@/lib/supabase/server';
import type {
  AppSession,
  User,
  UserRoleAssignment,
  StudentProfile,
  FacultyProfile,
  RoleType,
} from '@/types/database.types';

/**
 * Retrieves the currently authenticated Supabase Auth user.
 * Returns null if no active session exists or if an error occurs.
 */
export async function getCurrentAuthUser(): Promise<{ id: string; email?: string } | null> {
  const supabase = createClient();
  const result = await supabase.auth.getUser();

  if (!result || result.error || !result.data || !result.data.user) {
    return null;
  }

  return {
    id: result.data.user.id,
    email: result.data.user.email,
  };
}

/**
 * Resolves the application user identity from public.users using auth.uid().
 * Guarantees that client cannot forge or supply an arbitrary user ID.
 */
export async function getCurrentUser(userId: string): Promise<User | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role_category, full_name, phone, avatar_url, is_active, created_at, updated_at')
    .eq('id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as User;
}

/**
 * Resolves all active role assignments for the authenticated user from public.user_role_assignments.
 * Roles are strictly evaluated by database RLS and never trusted from client inputs.
 */
export async function getCurrentUserRoles(userId: string): Promise<UserRoleAssignment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_role_assignments')
    .select('id, user_id, role_id, department_id, session_id, created_at')
    .eq('user_id', userId);

  if (error || !data) {
    return [];
  }

  return data as UserRoleAssignment[];
}

/**
 * Resolves student academic profile if the user possesses student role.
 */
export async function getCurrentStudentProfile(userId: string): Promise<StudentProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as StudentProfile;
}

/**
 * Resolves faculty academic profile if the user possesses faculty roles.
 */
export async function getCurrentFacultyProfile(userId: string): Promise<FacultyProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('faculty_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as FacultyProfile;
}

/**
 * Assembles the full, authoritative AppSession for server-side authorization.
 * Combines auth.users + public.users + user_role_assignments + profiles.
 */
export async function getCurrentAppSession(): Promise<AppSession | null> {
  const authUser = await getCurrentAuthUser();
  if (!authUser) {
    return null;
  }

  const appUser = await getCurrentUser(authUser.id);
  if (!appUser) {
    return null;
  }

  const roles = await getCurrentUserRoles(authUser.id);
  const studentProfile = appUser.role_category === 'STUDENT' ? await getCurrentStudentProfile(authUser.id) : null;
  const facultyProfile = appUser.role_category === 'FACULTY' ? await getCurrentFacultyProfile(authUser.id) : null;

  // Active role default resolution (primary role or first assigned role)
  let activeRole: RoleType | null = null;
  let activeDepartmentId: string | null = null;

  if (roles.length > 0) {
    activeRole = roles[0].role_id;
    activeDepartmentId = roles[0].department_id;
  }

  if (studentProfile && !activeDepartmentId) {
    activeDepartmentId = studentProfile.department_id;
  } else if (facultyProfile && !activeDepartmentId) {
    activeDepartmentId = facultyProfile.department_id;
  }

  return {
    authUser,
    appUser,
    roles,
    activeRole,
    activeDepartmentId,
    studentProfile,
    facultyProfile,
  };
}

/**
 * Requires an authenticated AppSession. Throws UnauthorizedError if unauthenticated.
 */
export async function requireAuthenticatedUser(): Promise<AppSession> {
  const session = await getCurrentAppSession();
  if (!session) {
    throw new Error('Authentication required.');
  }
  return session;
}
