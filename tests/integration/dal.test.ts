import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AppSession } from '@/types/database.types';
import {
  getThesisById,
  getThesisWithActiveTitle,
  listTheses,
} from '@/lib/dal/theses.dal';
import {
  getStudentProfileByUserId,
  getFacultyProfileByUserId,
} from '@/lib/dal/profiles.dal';
import { getAnnexure6EvaluationByThesisId } from '@/lib/dal/annexures.dal';
import {
  getAccessibleThesis,
  listAccessibleTheses,
  getAccessibleAnnexure6,
} from '@/lib/services/theses.service';
import { getCallerAcademicProfile } from '@/lib/services/profiles.service';
import { NotFoundError, UnauthorizedError } from '@/lib/dal/errors';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const DEV_PASSWORD = process.env.DEV_AUTH_PASSWORD || '';

if (!DEV_PASSWORD) {
  throw new Error(
    'Missing required environment variable: DEV_AUTH_PASSWORD.\n' +
    'Please set DEV_AUTH_PASSWORD before running DAL integration tests.'
  );
}

const STUDENT_CSE_ID = '11111111-1111-1111-1111-111111111111';
const STUDENT_CSE_EMAIL = 'demo.student.cse@dev.local';

const GUIDE_A_ID = '33333333-3333-3333-3333-333333333333';
const GUIDE_A_EMAIL = 'demo.guide.a@dev.local';

const THESIS_A_ID = '60000000-0000-0000-0000-000000000001';
const THESIS_B_ID = '60000000-0000-0000-0000-000000000002';

describe('Real Local Supabase DAL & Service Integration Test Suite', () => {
  let studentClient: SupabaseClient;
  let guideClient: SupabaseClient;
  let studentSession: AppSession;
  let guideSession: AppSession;

  beforeAll(async () => {
    // 1. Initialize Real Supabase Clients
    studentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    guideClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 2. Real Login for STUDENT_CSE
    const { data: studentAuth, error: studentAuthErr } =
      await studentClient.auth.signInWithPassword({
        email: STUDENT_CSE_EMAIL,
        password: DEV_PASSWORD,
      });
    expect(studentAuthErr).toBeNull();
    expect(studentAuth.session).not.toBeNull();

    // 3. Real Login for GUIDE_A
    const { data: guideAuth, error: guideAuthErr } =
      await guideClient.auth.signInWithPassword({
        email: GUIDE_A_EMAIL,
        password: DEV_PASSWORD,
      });
    expect(guideAuthErr).toBeNull();
    expect(guideAuth.session).not.toBeNull();

    // 4. Construct synthetic AppSession contexts for services
    studentSession = {
      authUser: { id: STUDENT_CSE_ID, email: STUDENT_CSE_EMAIL },
      appUser: {
        id: STUDENT_CSE_ID,
        email: STUDENT_CSE_EMAIL,
        role_category: 'STUDENT',
        full_name: 'Aarav Sharma (Demo Student CSE)',
        phone: null,
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      roles: [
        {
          id: 'mock-role-student',
          user_id: STUDENT_CSE_ID,
          role_id: 'STUDENT',
          department_id: '10000000-0000-0000-0000-000000000001',
          session_id: null,
          created_at: new Date().toISOString(),
        },
      ],
      activeRole: 'STUDENT',
      activeDepartmentId: '10000000-0000-0000-0000-000000000001',
      studentProfile: null,
      facultyProfile: null,
    };

    guideSession = {
      authUser: { id: GUIDE_A_ID, email: GUIDE_A_EMAIL },
      appUser: {
        id: GUIDE_A_ID,
        email: GUIDE_A_EMAIL,
        role_category: 'FACULTY',
        full_name: 'Dr. Rajesh Kumar (Demo Guide A)',
        phone: null,
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      roles: [
        {
          id: 'mock-role-faculty',
          user_id: GUIDE_A_ID,
          role_id: 'FACULTY',
          department_id: '10000000-0000-0000-0000-000000000001',
          session_id: null,
          created_at: new Date().toISOString(),
        },
      ],
      activeRole: 'FACULTY',
      activeDepartmentId: '10000000-0000-0000-0000-000000000001',
      studentProfile: null,
      facultyProfile: null,
    };
  });

  describe('1. STUDENT_CSE — DAL & Service Evaluation', () => {
    it('ALLOW: getThesisById retrieves own thesis (Thesis A)', async () => {
      const thesis = await getThesisById(studentClient, THESIS_A_ID);
      expect(thesis).not.toBeNull();
      expect(thesis?.id).toBe(THESIS_A_ID);
      expect(thesis?.student_id).toBe(STUDENT_CSE_ID);
      expect(thesis?.tracking_number).toBe('NIET-DIS-CSE-2025-001');
    });

    it('ALLOW: getThesisWithActiveTitle retrieves thesis with active title', async () => {
      const thesis = await getThesisWithActiveTitle(studentClient, THESIS_A_ID);
      expect(thesis).not.toBeNull();
      expect(thesis?.id).toBe(THESIS_A_ID);
      expect(thesis?.active_title).toBe('Deep Learning Based Anomaly Detection for Critical Healthcare IoT Infrastructure');
    });

    it('DENY: getThesisById on Thesis B (ECE student) returns null (filtered by RLS)', async () => {
      const thesis = await getThesisById(studentClient, THESIS_B_ID);
      expect(thesis).toBeNull();
    });

    it('DENY: thesesService.getAccessibleThesis throws NotFoundError on unowned Thesis B', async () => {
      await expect(
        getAccessibleThesis(studentSession, THESIS_B_ID, studentClient)
      ).rejects.toThrow(NotFoundError);
    });

    it('ALLOW: listTheses returns array containing only own accessible thesis', async () => {
      const theses = await listTheses(studentClient);
      expect(theses).toBeDefined();
      expect(theses.length).toBe(1);
      expect(theses[0].id).toBe(THESIS_A_ID);
    });

    it('ALLOW: listAccessibleTheses service returns only accessible theses', async () => {
      const theses = await listAccessibleTheses(studentSession, undefined, studentClient);
      expect(theses.length).toBe(1);
      expect(theses[0].id).toBe(THESIS_A_ID);
    });

    it('DENY: getAnnexure6EvaluationByThesisId returns null (student restricted by RLS)', async () => {
      const evaluation = await getAnnexure6EvaluationByThesisId(studentClient, THESIS_A_ID);
      expect(evaluation).toBeNull();
    });

    it('DENY: thesesService.getAccessibleAnnexure6 throws UnauthorizedError for student', async () => {
      await expect(
        getAccessibleAnnexure6(studentSession, THESIS_A_ID, studentClient)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('ALLOW: profiles.dal.getStudentProfileByUserId returns own student profile', async () => {
      const profile = await getStudentProfileByUserId(studentClient, STUDENT_CSE_ID);
      expect(profile).not.toBeNull();
      expect(profile?.user_id).toBe(STUDENT_CSE_ID);
      expect(profile?.roll_number).toBe('25MTECHCSE001');
    });

    it('ALLOW: profilesService.getCallerAcademicProfile returns student profile', async () => {
      const result = await getCallerAcademicProfile(studentSession, studentClient);
      expect(result.roleCategory).toBe('STUDENT');
      expect(result.studentProfile?.roll_number).toBe('25MTECHCSE001');
      expect(result.facultyProfile).toBeNull();
    });
  });

  describe('2. GUIDE_A — DAL & Service Evaluation', () => {
    it('ALLOW: getThesisById retrieves assigned thesis (Thesis A)', async () => {
      const thesis = await getThesisById(guideClient, THESIS_A_ID);
      expect(thesis).not.toBeNull();
      expect(thesis?.id).toBe(THESIS_A_ID);
      expect(thesis?.guide_id).toBe(GUIDE_A_ID);
    });

    it('ALLOW: getThesisWithActiveTitle retrieves assigned thesis with active title', async () => {
      const thesis = await getThesisWithActiveTitle(guideClient, THESIS_A_ID);
      expect(thesis).not.toBeNull();
      expect(thesis?.active_title).toBe('Deep Learning Based Anomaly Detection for Critical Healthcare IoT Infrastructure');
    });

    it('DENY: getThesisById on Thesis B (unassigned ECE thesis) returns null (filtered by RLS)', async () => {
      const thesis = await getThesisById(guideClient, THESIS_B_ID);
      expect(thesis).toBeNull();
    });

    it('DENY: thesesService.getAccessibleThesis throws NotFoundError on unassigned Thesis B', async () => {
      await expect(
        getAccessibleThesis(guideSession, THESIS_B_ID, guideClient)
      ).rejects.toThrow(NotFoundError);
    });

    it('ALLOW: getAnnexure6EvaluationByThesisId retrieves Annexure 6 evaluation for assigned thesis', async () => {
      const evaluation = await getAnnexure6EvaluationByThesisId(guideClient, THESIS_A_ID);
      expect(evaluation).not.toBeNull();
      expect(evaluation?.thesis_id).toBe(THESIS_A_ID);
      expect(evaluation?.guide_id).toBe(GUIDE_A_ID);
      expect(evaluation?.supervisor_score).toBe(95);
      expect(evaluation?.defense_recommendation).toBe('RECOMMENDED');
    });

    it('ALLOW: thesesService.getAccessibleAnnexure6 succeeds for assigned Guide', async () => {
      const evaluation = await getAccessibleAnnexure6(guideSession, THESIS_A_ID, guideClient);
      expect(evaluation.supervisor_score).toBe(95);
    });

    it('ALLOW: profiles.dal.getFacultyProfileByUserId returns faculty profile', async () => {
      const profile = await getFacultyProfileByUserId(guideClient, GUIDE_A_ID);
      expect(profile).not.toBeNull();
      expect(profile?.user_id).toBe(GUIDE_A_ID);
      expect(profile?.employee_code).toBe('EMP-CSE-001');
      expect(profile?.designation).toBe('Associate Professor');
    });

    it('ALLOW: profilesService.getCallerAcademicProfile returns faculty profile', async () => {
      const result = await getCallerAcademicProfile(guideSession, guideClient);
      expect(result.roleCategory).toBe('FACULTY');
      expect(result.facultyProfile?.employee_code).toBe('EMP-CSE-001');
      expect(result.studentProfile).toBeNull();
    });
  });
});
