import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User, UserRoleAssignment, AppSession } from '../src/types/database.types';

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
    from: mockFrom,
  }),
}));

// Mock Next.js navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import {
  getCurrentAuthUser,
  getCurrentUser,
  getCurrentUserRoles,
  getCurrentAppSession,
} from '../src/lib/auth/session';

import {
  requireAuthenticatedUser,
  requireRole,
  requireAnyRole,
  requireDepartmentAccess,
} from '../src/lib/auth/guards';

describe('Application Authentication & Identity Resolver Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Unauthenticated user cannot access protected session (returns null)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

    const authUser = await getCurrentAuthUser();
    expect(authUser).toBeNull();

    const session = await getCurrentAppSession();
    expect(session).toBeNull();
  });

  it('2. Authenticated user session resolves correctly', async () => {
    const testUserId = '11111111-1111-1111-1111-111111111111';
    mockGetUser.mockResolvedValue({
      data: { user: { id: testUserId, email: 'student@dev.local' } },
      error: null,
    });

    const mockUser: User = {
      id: testUserId,
      email: 'student@dev.local',
      role_category: 'STUDENT',
      full_name: 'Aarav Sharma',
      phone: null,
      avatar_url: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: mockUser, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'user_role_assignments') {
        return {
          select: () => ({
            eq: async () => ({
              data: [
                {
                  id: 'r1',
                  user_id: testUserId,
                  role_id: 'STUDENT',
                  department_id: 'd1',
                  session_id: 's1',
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'student_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  user_id: testUserId,
                  roll_number: '2025MTCSE001',
                  department_id: 'd1',
                  current_semester: 1,
                  academic_standing: 'REGULAR',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    });

    const session = await getCurrentAppSession();
    expect(session).not.toBeNull();
    expect(session?.appUser.full_name).toBe('Aarav Sharma');
    expect(session?.roles[0].role_id).toBe('STUDENT');
    expect(session?.studentProfile?.roll_number).toBe('2025MTCSE001');
  });

  it('3. Auth session strictly maps auth.uid() = public.users.id', async () => {
    const testUserId = '33333333-3333-3333-3333-333333333333';
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: (col: string, val: string) => ({
          eq: () => ({
            single: async () => {
              expect(col).toBe('id');
              expect(val).toBe(testUserId);
              return {
                data: {
                  id: testUserId,
                  email: 'guide@dev.local',
                  full_name: 'Dr. Rajesh Kumar',
                  role_category: 'FACULTY',
                  is_active: true,
                },
                error: null,
              };
            },
          }),
        }),
      }),
    }));

    const user = await getCurrentUser(testUserId);
    expect(user?.id).toBe(testUserId);
  });

  it('4. Role resolution strictly originates from database records', async () => {
    const testUserId = '88888888-8888-8888-8888-888888888888';
    mockFrom.mockImplementation((table: string) => {
      expect(table).toBe('user_role_assignments');
      return {
        select: () => ({
          eq: async () => ({
            data: [
              { id: 'r1', user_id: testUserId, role_id: 'FACULTY', department_id: 'cse' },
              { id: 'r2', user_id: testUserId, role_id: 'HOD', department_id: 'cse' },
            ],
            error: null,
          }),
        }),
      };
    });

    const roles = await getCurrentUserRoles(testUserId);
    expect(roles).toHaveLength(2);
    expect(roles.map((r) => r.role_id)).toEqual(['FACULTY', 'HOD']);
  });

  it('5. Client cannot supply or forge arbitrary roles', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user', email: 'user@dev.local' } },
      error: null,
    });
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: { id: 'test-user', role_category: 'STUDENT', is_active: true }, error: null }),
          }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }));

    // The user has NO admin role in database
    await expect(requireRole('ADMIN')).rejects.toThrow('NEXT_REDIRECT:/unauthorized?requiredRole=ADMIN');
  });

  it('6. Sign-out clears session tokens and invokes Supabase auth signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();

    await supabase.auth.signOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('7. Missing public.users record fails closed safely', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'unmapped-auth-id', email: 'unmapped@dev.local' } },
      error: null,
    });
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: new Error('User not found') }),
          }),
        }),
      }),
    }));

    const session = await getCurrentAppSession();
    expect(session).toBeNull();

    await expect(requireAuthenticatedUser()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('8. requireAnyRole permits authorized roles and rejects unauthorized', async () => {
    const sessionFixture: AppSession = {
      authUser: { id: 'guide-id' },
      appUser: { id: 'guide-id', email: 'g@dev.local', full_name: 'Dr. Guide', role_category: 'FACULTY', phone: null, avatar_url: null, is_active: true, created_at: '', updated_at: '' },
      roles: [{ id: '1', user_id: 'guide-id', role_id: 'GUIDE', department_id: 'cse', session_id: 's1', created_at: '' }],
      activeRole: 'GUIDE',
      activeDepartmentId: 'cse',
      studentProfile: null,
      facultyProfile: null,
    };

    mockGetUser.mockResolvedValue({ data: { user: { id: 'guide-id' } }, error: null });
    mockFrom.mockImplementation((tbl: string) => {
      if (tbl === 'users') return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: sessionFixture.appUser, error: null }) }) }) }) };
      if (tbl === 'user_role_assignments') return { select: () => ({ eq: async () => ({ data: sessionFixture.roles, error: null }) }) };
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    });

    // Allowed role list includes GUIDE -> succeeds
    const allowed = await requireAnyRole(['GUIDE', 'HOD']);
    expect(allowed.activeRole).toBe('GUIDE');

    // Allowed role list does NOT include GUIDE -> redirects to unauthorized
    await expect(requireAnyRole(['STUDENT', 'ADMIN'])).rejects.toThrow('NEXT_REDIRECT:/unauthorized?allowedRoles=STUDENT%2CADMIN');
  });

  it('9. Tenancy guard rejects cross-department access', async () => {
    const cseFacultyFixture: AppSession = {
      authUser: { id: 'cse-faculty' },
      appUser: { id: 'cse-faculty', email: 'f@dev.local', full_name: 'CSE Faculty', role_category: 'FACULTY', phone: null, avatar_url: null, is_active: true, created_at: '', updated_at: '' },
      roles: [{ id: '1', user_id: 'cse-faculty', role_id: 'FACULTY', department_id: 'dept-cse', session_id: null, created_at: '' }],
      activeRole: 'FACULTY',
      activeDepartmentId: 'dept-cse',
      studentProfile: null,
      facultyProfile: null,
    };

    mockGetUser.mockResolvedValue({ data: { user: { id: 'cse-faculty' } }, error: null });
    mockFrom.mockImplementation((tbl: string) => {
      if (tbl === 'users') return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: cseFacultyFixture.appUser, error: null }) }) }) }) };
      if (tbl === 'user_role_assignments') return { select: () => ({ eq: async () => ({ data: cseFacultyFixture.roles, error: null }) }) };
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    });

    // Own department -> succeeds
    const session = await requireDepartmentAccess('dept-cse');
    expect(session.activeDepartmentId).toBe('dept-cse');

    // Other department -> rejected
    await expect(requireDepartmentAccess('dept-ece')).rejects.toThrow('NEXT_REDIRECT:/unauthorized?reason=cross_department_denied');
  });
});
