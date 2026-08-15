import { redirect } from 'next/navigation';
import { getCurrentAppSession } from '@/lib/auth/session';
import type { AppSession, RoleType } from '@/types/database.types';

/**
 * Server guard requiring an active, authenticated application session.
 * Redirects to /login if no valid session or public.users mapping is found.
 */
export async function requireAuthenticatedUser(): Promise<AppSession> {
  const session = await getCurrentAppSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/**
 * Server guard requiring a specific role assignment.
 * Redirects to /unauthorized if the user lacks the required role.
 */
export async function requireRole(requiredRole: RoleType): Promise<AppSession> {
  const session = await requireAuthenticatedUser();
  const hasRole = session.roles.some((r) => r.role_id === requiredRole);

  if (!hasRole) {
    redirect(`/unauthorized?requiredRole=${encodeURIComponent(requiredRole)}`);
  }

  return session;
}

/**
 * Server guard requiring at least one role from an authorized list.
 * Redirects to /unauthorized if the user possesses none of the roles.
 */
export async function requireAnyRole(allowedRoles: RoleType[]): Promise<AppSession> {
  const session = await requireAuthenticatedUser();
  const hasRole = session.roles.some((r) => allowedRoles.includes(r.role_id));

  if (!hasRole) {
    redirect(`/unauthorized?allowedRoles=${encodeURIComponent(allowedRoles.join(','))}`);
  }

  return session;
}

/**
 * Server guard requiring tenancy match for a specified department.
 * Allows global ADMIN or users assigned to that department.
 */
export async function requireDepartmentAccess(departmentId: string): Promise<AppSession> {
  const session = await requireAuthenticatedUser();
  const isAdmin = session.roles.some((r) => r.role_id === 'ADMIN');
  const hasDeptRole = session.roles.some((r) => r.department_id === departmentId);

  if (!isAdmin && !hasDeptRole && session.activeDepartmentId !== departmentId) {
    redirect('/unauthorized?reason=cross_department_denied');
  }

  return session;
}
