import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const DEV_PASSWORD = process.env.DEV_AUTH_PASSWORD || '';
if (!DEV_PASSWORD) {
  throw new Error(
    'Missing required environment variable: DEV_AUTH_PASSWORD.\n' +
    'Please set DEV_AUTH_PASSWORD before running real Auth E2E tests.'
  );
}

const STUDENT_CSE_ID = '11111111-1111-1111-1111-111111111111';
const STUDENT_CSE_EMAIL = 'demo.student.cse@dev.local';

const GUIDE_A_ID = '33333333-3333-3333-3333-333333333333';
const GUIDE_A_EMAIL = 'demo.guide.a@dev.local';

const THESIS_A_ID = '60000000-0000-0000-0000-000000000001';
const THESIS_B_ID = '60000000-0000-0000-0000-000000000002';
const ANNEXURE_6_ID = '80000000-0000-0000-0000-000000000001';

describe('Real Local Supabase Auth & PostgREST RLS End-to-End Test Suite', () => {
  let studentClient: SupabaseClient;
  let guideClient: SupabaseClient;

  beforeAll(() => {
    studentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    guideClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  });

  describe('1. Real Auth Login & Session Verification — STUDENT_CSE', () => {
    it('successfully signs in STUDENT_CSE via real local Supabase Auth', async () => {
      const { data, error } = await studentClient.auth.signInWithPassword({
        email: STUDENT_CSE_EMAIL,
        password: DEV_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.session).not.toBeNull();
      expect(data.session?.access_token).toBeDefined();
      expect(typeof data.session?.access_token).toBe('string');
      expect(data.session?.access_token.length).toBeGreaterThan(20);

      // Verify JWT subject and identity
      expect(data.user).not.toBeNull();
      expect(data.user?.id).toBe(STUDENT_CSE_ID);
      expect(data.user?.email).toBe(STUDENT_CSE_EMAIL);
    });

    it('resolves active public.users record for authenticated STUDENT_CSE', async () => {
      const { data, error } = await studentClient
        .from('users')
        .select('id, institutional_email, full_name, is_active')
        .eq('id', STUDENT_CSE_ID)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBe(STUDENT_CSE_ID);
      expect(data?.institutional_email).toBe(STUDENT_CSE_EMAIL);
      expect(data?.is_active).toBe(true);
    });
  });

  describe('2. Real PostgREST & RLS Policy Verification — STUDENT_CSE', () => {
    it('ALLOW: STUDENT_CSE can SELECT own thesis (Thesis A)', async () => {
      const { data, error } = await studentClient
        .from('theses')
        .select('id, tracking_number, student_id, guide_id, department_id, current_stage, current_state')
        .eq('id', THESIS_A_ID);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(1);
      expect(data?.[0].id).toBe(THESIS_A_ID);
      expect(data?.[0].student_id).toBe(STUDENT_CSE_ID);
    });

    it('DENY: STUDENT_CSE cannot read another student thesis (Thesis B in ECE)', async () => {
      const { data, error } = await studentClient
        .from('theses')
        .select('id, tracking_number, student_id')
        .eq('id', THESIS_B_ID);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(0); // Filtered out by RLS
    });

    it('DENY: STUDENT_CSE cannot read confidential Annexure 6 evaluation', async () => {
      const { data, error } = await studentClient
        .from('annexure_6_evaluations')
        .select('id, thesis_id, guide_id, supervisor_score');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(0); // Blocked by has_role('STUDENT') = false policy
    });

    it('DENY: STUDENT_CSE cannot read other user records from public.users', async () => {
      const { data, error } = await studentClient
        .from('users')
        .select('id, institutional_email')
        .eq('id', '22222222-2222-2222-2222-222222222222');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(0); // Blocked by (auth.uid() = id OR has_role('ADMIN', 'HOD'))
    });
  });

  describe('3. Real Auth Login & Session Verification — GUIDE_A', () => {
    it('successfully signs in GUIDE_A via real local Supabase Auth', async () => {
      const { data, error } = await guideClient.auth.signInWithPassword({
        email: GUIDE_A_EMAIL,
        password: DEV_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.session).not.toBeNull();
      expect(data.session?.access_token).toBeDefined();

      // Verify JWT subject and identity
      expect(data.user).not.toBeNull();
      expect(data.user?.id).toBe(GUIDE_A_ID);
      expect(data.user?.email).toBe(GUIDE_A_EMAIL);
    });

    it('resolves active public.users record for authenticated GUIDE_A', async () => {
      const { data, error } = await guideClient
        .from('users')
        .select('id, institutional_email, full_name, is_active')
        .eq('id', GUIDE_A_ID)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBe(GUIDE_A_ID);
      expect(data?.institutional_email).toBe(GUIDE_A_EMAIL);
      expect(data?.is_active).toBe(true);
    });
  });

  describe('4. Real PostgREST & RLS Policy Verification — GUIDE_A', () => {
    it('ALLOW: GUIDE_A can SELECT assigned thesis (Thesis A)', async () => {
      const { data, error } = await guideClient
        .from('theses')
        .select('id, tracking_number, student_id, guide_id')
        .eq('id', THESIS_A_ID);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(1);
      expect(data?.[0].id).toBe(THESIS_A_ID);
      expect(data?.[0].guide_id).toBe(GUIDE_A_ID);
    });

    it('DENY: GUIDE_A cannot read unassigned thesis (Thesis B in ECE)', async () => {
      const { data, error } = await guideClient
        .from('theses')
        .select('id, tracking_number, student_id')
        .eq('id', THESIS_B_ID);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(0); // Filtered out by RLS is_assigned_guide(id) check
    });

    it('ALLOW: GUIDE_A can read Annexure 6 evaluation for assigned Thesis A', async () => {
      const { data, error } = await guideClient
        .from('annexure_6_evaluations')
        .select('id, thesis_id, guide_id, supervisor_score, defense_recommendation')
        .eq('id', ANNEXURE_6_ID);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBe(1);
      expect(data?.[0].id).toBe(ANNEXURE_6_ID);
      expect(data?.[0].guide_id).toBe(GUIDE_A_ID);
      expect(data?.[0].supervisor_score).toBe(95);
    });
  });

  describe('5. Real Session Invalidation & Logout Verification', () => {
    it('invalidates active session on signOut and rejects subsequent protected queries', async () => {
      // 1. Sign out STUDENT_CSE
      const { error: signOutError } = await studentClient.auth.signOut();
      expect(signOutError).toBeNull();

      // 2. Assert session is null
      const { data: sessionData } = await studentClient.auth.getSession();
      expect(sessionData.session).toBeNull();

      // 3. Attempt protected query without valid session
      const { data: unauthData, error: unauthError } = await studentClient
        .from('theses')
        .select('id, tracking_number');

      // Unauthenticated visitor gets 0 rows (RLS requires authenticated role)
      expect(unauthError).toBeNull();
      expect(unauthData?.length).toBe(0);
    });
  });
});
