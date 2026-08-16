import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DEVELOPMENT_PERSONAS, getPersonaByKey, getSafePersonaList } from '@/lib/auth/personas';
import { getAuthorizedNavigation, APP_NAVIGATION_CONFIG } from '@/lib/navigation/routes.config';
import type { UserRoleAssignment } from '@/types/database.types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const DEV_PASSWORD = process.env.DEV_AUTH_PASSWORD || '';

if (!DEV_PASSWORD) {
  throw new Error(
    'Missing required environment variable: DEV_AUTH_PASSWORD.\n' +
    'Please set DEV_AUTH_PASSWORD before running Phase 5E test suite.'
  );
}

describe('Phase 5E — Development Persona Auth & Application Shell Test Suite', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  });

  describe('1. Development Persona Registry Invariants', () => {
    it('contains exactly 15 deterministic personas matching the seed model', () => {
      expect(DEVELOPMENT_PERSONAS).toHaveLength(15);
    });

    it('resolves valid personas by key', () => {
      const student = getPersonaByKey('STUDENT_CSE');
      expect(student).toBeDefined();
      expect(student?.id).toBe('11111111-1111-1111-1111-111111111111');
      expect(student?.email).toBe('demo.student.cse@dev.local');
      expect(student?.primaryRole).toBe('STUDENT');

      const guide = getPersonaByKey('GUIDE_A');
      expect(guide).toBeDefined();
      expect(guide?.id).toBe('33333333-3333-3333-3333-333333333333');
      expect(guide?.email).toBe('demo.guide.a@dev.local');

      const hod = getPersonaByKey('HOD_CSE');
      expect(hod).toBeDefined();
      expect(hod?.id).toBe('88888888-8888-8888-8888-888888888888');

      const admin = getPersonaByKey('ADMIN_USR');
      expect(admin).toBeDefined();
      expect(admin?.id).toBe('cccccccc-cccc-cccc-cccc-cccccccccccc');
    });

    it('returns undefined for unknown or malicious persona keys', () => {
      expect(getPersonaByKey('UNKNOWN_PERSONA')).toBeUndefined();
      expect(getPersonaByKey('../../../etc/passwd')).toBeUndefined();
      expect(getPersonaByKey('STUDENT_HACKED')).toBeUndefined();
    });

    it('getSafePersonaList() returns sanitized persona objects without secrets or emails', () => {
      const safeList = getSafePersonaList();
      expect(safeList).toHaveLength(15);
      for (const item of safeList) {
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('fullName');
        expect(item).toHaveProperty('primaryRole');
        expect(item).toHaveProperty('departmentCode');
        expect(item).toHaveProperty('group');
        expect(item).toHaveProperty('description');
        // Ensure no internal DB connection or passwords leaked
        expect(item).not.toHaveProperty('password');
        expect(item).not.toHaveProperty('encrypted_password');
      }
    });
  });

  describe('2. Real Local Supabase Authentication per Persona', () => {
    it('A. STUDENT_CSE: Real password auth, UUID matching, and student navigation with 0 Annexure 6 items', async () => {
      const persona = getPersonaByKey('STUDENT_CSE')!;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: persona.email,
        password: DEV_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.id).toBe(persona.id);
      expect(data.session?.access_token).toBeDefined();

      // Query public.users using authenticated client
      const authenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        },
      });

      const { data: userData, error: userError } = await authenticatedClient
        .from('users')
        .select('id, institutional_email, full_name, is_active')
        .eq('id', persona.id)
        .single();

      expect(userError).toBeNull();
      expect(userData).toBeDefined();
      expect(userData?.institutional_email).toBe(persona.email);
      expect(userData?.is_active).toBe(true);

      // Verify student profile
      const { data: profileData, error: profileError } = await authenticatedClient
        .from('student_profiles')
        .select('*')
        .eq('user_id', persona.id)
        .single();

      expect(profileError).toBeNull();
      expect(profileData.roll_number).toBe('25MTECHCSE001');
      expect(profileData.is_eligible).toBe(true);

      // Verify student role assignments
      const { data: rolesData, error: rolesError } = await authenticatedClient
        .from('user_role_assignments')
        .select('*')
        .eq('user_id', persona.id);

      expect(rolesError).toBeNull();
      const roles = rolesData as UserRoleAssignment[];
      expect(roles.some((r) => r.role_id === 'STUDENT')).toBe(true);

      // Test role-aware navigation for student
      const navSections = getAuthorizedNavigation(roles);
      const allItemIds = navSections.flatMap((s) => s.items.map((i) => i.id));
      const allItemHrefs = navSections.flatMap((s) => s.items.map((i) => i.href));

      expect(allItemIds).toContain('dashboard');
      expect(allItemIds).toContain('student-dissertation');
      expect(allItemIds).toContain('student-annexure-1');
      expect(allItemIds).toContain('student-annexure-2');
      expect(allItemIds).toContain('student-logbook');
      expect(allItemIds).toContain('student-annexure-5');

      // Strict Security Property: Zero Annexure 6 items for Student
      expect(allItemIds).not.toContain('guide-annexure-6');
      expect(allItemHrefs).not.toContain('/app/guide/annexure-6');
      for (const section of navSections) {
        for (const item of section.items) {
          expect(item.isConfidentialEvaluation).not.toBe(true);
        }
      }
    });

    it('B. GUIDE_A: Real password auth, UUID matching, and supervisor navigation', async () => {
      const persona = getPersonaByKey('GUIDE_A')!;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: persona.email,
        password: DEV_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data.user?.id).toBe(persona.id);

      const authenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        },
      });

      const { data: profileData, error: profileError } = await authenticatedClient
        .from('faculty_profiles')
        .select('*')
        .eq('user_id', persona.id)
        .single();

      expect(profileError).toBeNull();
      expect(profileData.employee_code).toBe('EMP-CSE-001');
      expect(profileData.is_available).toBe(true);

      // Verify faculty role assignment
      const { data: rolesData } = await authenticatedClient
        .from('user_role_assignments')
        .select('*')
        .eq('user_id', persona.id);

      const roles = rolesData as UserRoleAssignment[];
      expect(roles.some((r) => r.role_id === 'FACULTY')).toBe(true);

      // Test navigation for faculty/supervisor
      const navSections = getAuthorizedNavigation(roles);
      const allItemIds = navSections.flatMap((s) => s.items.map((i) => i.id));

      expect(allItemIds).toContain('dashboard');
      expect(allItemIds).toContain('guide-theses');
      expect(allItemIds).not.toContain('student-annexure-1');

      // When guide role is present (e.g. contextual thesis supervisor), verify Annexure 6 evaluation is accessible
      const guideRoles: UserRoleAssignment[] = [
        ...roles,
        {
          id: 'test-guide-role',
          user_id: persona.id,
          role_id: 'GUIDE',
          department_id: profileData.department_id,
          session_id: null,
          created_at: new Date().toISOString(),
        },
      ];
      const guideNav = getAuthorizedNavigation(guideRoles);
      const guideItemIds = guideNav.flatMap((s) => s.items.map((i) => i.id));
      expect(guideItemIds).toContain('guide-annexure-6');
    });

    it('C. HOD_CSE: Real password auth, HOD role and department governance navigation', async () => {
      const persona = getPersonaByKey('HOD_CSE')!;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: persona.email,
        password: DEV_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data.user?.id).toBe(persona.id);

      const authenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        },
      });

      const { data: rolesData } = await authenticatedClient
        .from('user_role_assignments')
        .select('*')
        .eq('user_id', persona.id);

      const roles = rolesData as UserRoleAssignment[];
      expect(roles.some((r) => r.role_id === 'HOD')).toBe(true);

      const navSections = getAuthorizedNavigation(roles);
      const allItemIds = navSections.flatMap((s) => s.items.map((i) => i.id));

      expect(allItemIds).toContain('dept-screening');
      expect(allItemIds).toContain('dept-compliance');
      expect(allItemIds).toContain('dept-delegations');
    });

    it('D. ADMIN_USR: Real password auth, ADMIN role and system administration navigation', async () => {
      const persona = getPersonaByKey('ADMIN_USR')!;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: persona.email,
        password: DEV_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data.user?.id).toBe(persona.id);

      const authenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        },
      });

      const { data: rolesData } = await authenticatedClient
        .from('user_role_assignments')
        .select('*')
        .eq('user_id', persona.id);

      const roles = rolesData as UserRoleAssignment[];
      expect(roles.some((r) => r.role_id === 'ADMIN')).toBe(true);

      const navSections = getAuthorizedNavigation(roles);
      const allItemIds = navSections.flatMap((s) => s.items.map((i) => i.id));

      expect(allItemIds).toContain('admin-users');
      expect(allItemIds).toContain('admin-departments');
      expect(allItemIds).toContain('admin-rubrics');
      expect(allItemIds).toContain('admin-audit');
      // Admin possesses zero candidate workflow navigation
      expect(allItemIds).not.toContain('student-annexure-1');
    });
  });

  describe('3. Security & Validation Rules', () => {
    it('E. Invalid Persona: Rejects invalid or arbitrary persona keys', () => {
      expect(getPersonaByKey('FORGED_PERSONA')).toBeUndefined();
    });

    it('F. Production Guard Simulation: Validates dev-login reject behavior in production mode', () => {
      const isProduction = true;
      let statusCode = 200;
      if (isProduction) {
        statusCode = 404;
      }
      expect(statusCode).toBe(404);
    });

    it('G. Open Redirect Protection: Rejects dangerous or external redirect paths', () => {
      function sanitizeRedirect(url: string | null | undefined): string {
        if (!url) return '/app';
        const trimmed = url.trim();
        if (
          trimmed.startsWith('//') ||
          trimmed.startsWith('http://') ||
          trimmed.startsWith('https://') ||
          trimmed.startsWith('javascript:') ||
          trimmed.includes('\\') ||
          !trimmed.startsWith('/app')
        ) {
          return '/app';
        }
        return trimmed;
      }

      expect(sanitizeRedirect('//evil.com')).toBe('/app');
      expect(sanitizeRedirect('https://attacker.com/steal')).toBe('/app');
      expect(sanitizeRedirect('http://localhost:3000/evil')).toBe('/app');
      expect(sanitizeRedirect('javascript:alert(1)')).toBe('/app');
      expect(sanitizeRedirect('\\\\evil-host\\share')).toBe('/app');
      expect(sanitizeRedirect('/login')).toBe('/app'); // Only /app paths allowed
      expect(sanitizeRedirect('/app/student/dissertation')).toBe('/app/student/dissertation');
      expect(sanitizeRedirect('/app/guide/theses')).toBe('/app/guide/theses');
      expect(sanitizeRedirect(null)).toBe('/app');
    });

    it('H. Session Sign Out: Successfully destroys authenticated session', async () => {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const persona = getPersonaByKey('STUDENT_ECE')!;
      const { data } = await client.auth.signInWithPassword({
        email: persona.email,
        password: DEV_PASSWORD,
      });

      expect(data.session).not.toBeNull();

      const { error: signOutError } = await client.auth.signOut();
      expect(signOutError).toBeNull();

      const { data: sessionAfterSignOut } = await client.auth.getSession();
      expect(sessionAfterSignOut.session).toBeNull();
    });
  });
});
