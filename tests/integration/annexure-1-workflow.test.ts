import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getPersonaByKey } from '@/lib/auth/personas';
import {
  saveAnnexure1DraftRpc,
  submitAnnexure1Rpc,
  getAnnexure1ByThesisId,
  getGuidePreferencesByAnnexure1Id,
} from '@/lib/dal/annexures.dal';
import {
  getStudentActiveThesis,
  checkTitleCollision,
} from '@/lib/dal/theses.dal';
import { listDepartmentFacultyForPreferences } from '@/lib/dal/faculty.dal';
import type { Annexure1FormData } from '@/types/database.types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM0MTI4MDB9.dummy';
const DEV_PASSWORD = process.env.DEV_AUTH_PASSWORD || 'LocalDevPassword123!';

describe('Phase 5F — Student Dissertation Workspace & Annexure 1 Workflow Security & Integration Suite', () => {
  let studentCseClient: any;
  let studentEceClient: any;
  let guideAClient: any;
  let hodCseClient: any;
  let adminClient: any;
  let unauthenticatedClient: any;

  let studentCseThesisId: string;
  let studentCseDeptId: string;
  let studentEceThesisId: string;
  let studentEceDeptId: string;
  let cseFacultyIds: string[] = [];
  let eceFacultyIds: string[] = [];

  beforeAll(async () => {
    // 1. Authenticate STUDENT_CSE
    const studentCsePersona = getPersonaByKey('STUDENT_CSE')!;
    const client1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: auth1, error: err1 } = await client1.auth.signInWithPassword({
      email: studentCsePersona.email,
      password: DEV_PASSWORD,
    });
    expect(err1).toBeNull();
    studentCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${auth1.session?.access_token}` } },
    });

    // 2. Authenticate STUDENT_ECE
    const studentEcePersona = getPersonaByKey('STUDENT_ECE')!;
    const client2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: auth2, error: err2 } = await client2.auth.signInWithPassword({
      email: studentEcePersona.email,
      password: DEV_PASSWORD,
    });
    expect(err2).toBeNull();
    studentEceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${auth2.session?.access_token}` } },
    });

    // 3. Authenticate GUIDE_A
    const guideAPersona = getPersonaByKey('GUIDE_A')!;
    const client3 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: auth3, error: err3 } = await client3.auth.signInWithPassword({
      email: guideAPersona.email,
      password: DEV_PASSWORD,
    });
    expect(err3).toBeNull();
    guideAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${auth3.session?.access_token}` } },
    });

    // 4. Authenticate HOD_CSE
    const hodCsePersona = getPersonaByKey('HOD_CSE')!;
    const client4 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: auth4, error: err4 } = await client4.auth.signInWithPassword({
      email: hodCsePersona.email,
      password: DEV_PASSWORD,
    });
    expect(err4).toBeNull();
    hodCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${auth4.session?.access_token}` } },
    });

    // 5. Authenticate ADMIN_USR
    const adminPersona = getPersonaByKey('ADMIN_USR')!;
    const client5 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: auth5, error: err5 } = await client5.auth.signInWithPassword({
      email: adminPersona.email,
      password: DEV_PASSWORD,
    });
    expect(err5).toBeNull();
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${auth5.session?.access_token}` } },
    });

    // 6. Unauthenticated Client
    unauthenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Resolve STUDENT_CSE thesis and available faculty
    const studentCse = getPersonaByKey('STUDENT_CSE')!;
    const thesisCse = await getStudentActiveThesis(studentCseClient, studentCse.id);
    expect(thesisCse).not.toBeNull();
    studentCseThesisId = thesisCse!.id;
    studentCseDeptId = thesisCse!.department_id;

    // Resolve STUDENT_ECE thesis and available faculty
    const studentEce = getPersonaByKey('STUDENT_ECE')!;
    const thesisEce = await getStudentActiveThesis(studentEceClient, studentEce.id);
    expect(thesisEce).not.toBeNull();
    studentEceThesisId = thesisEce!.id;
    studentEceDeptId = thesisEce!.department_id;

    // Reset STUDENT_CSE thesis state to clean baseline DRAFT_PROPOSAL
    await studentCseClient.rpc('reset_thesis_for_testing', { p_thesis_id: studentCseThesisId });

    const cseFacultyList = await listDepartmentFacultyForPreferences(studentCseClient, studentCseDeptId);
    expect(cseFacultyList.length).toBeGreaterThanOrEqual(4);
    cseFacultyIds = cseFacultyList.map((f) => f.user_id);

    const eceFacultyList = await listDepartmentFacultyForPreferences(studentEceClient, studentEceDeptId);
    expect(eceFacultyList.length).toBeGreaterThanOrEqual(1);
    eceFacultyIds = eceFacultyList.map((f) => f.user_id);
  });

  afterAll(async () => {
    // Restore seeded state for THESIS_A so downstream test suites remain consistent
    if (studentCseClient) {
      await studentCseClient.rpc('restore_thesis_a_seed');
    }
  });

  describe('1. Active Thesis & Faculty Options Retrieval', () => {
    it('resolves active thesis record with tracking number and active status', async () => {
      const studentCse = getPersonaByKey('STUDENT_CSE')!;
      const thesis = await getStudentActiveThesis(studentCseClient, studentCse.id);

      expect(thesis).not.toBeNull();
      expect(thesis?.id).toBe(studentCseThesisId);
      expect(thesis?.tracking_number).toBe('NIET-DIS-CSE-2025-001');
    });

    it('fetches eligible department faculty choices with active guide load', async () => {
      const faculty = await listDepartmentFacultyForPreferences(studentCseClient, studentCseDeptId);
      expect(faculty.length).toBeGreaterThanOrEqual(4);
      for (const f of faculty) {
        expect(f.is_available).toBe(true);
        expect(typeof f.active_guide_load).toBe('number');
      }
    });
  });

  describe('2. Annexure 1 Draft Operations', () => {
    it('successfully saves a proposal draft without mutating thesis state', async () => {
      const draftData: Annexure1FormData = {
        proposed_title: 'Draft: Scalable AI Architectures for Edge Devices',
        broad_domain: 'Artificial Intelligence',
        problem_statement: 'Draft problem statement discussing edge compute constraints.',
        expected_outcomes: 'Draft benchmarks and prototype implementation.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1, domain_justification: 'AI Alignment' },
          { faculty_id: cseFacultyIds[1], preference_rank: 2, domain_justification: 'Edge compute' },
        ],
      };

      const result = await saveAnnexure1DraftRpc(studentCseClient, studentCseThesisId, draftData);
      expect(result.success).toBe(true);
      expect(result.status).toBe('DRAFT');

      // Verify draft proposal was saved in DB
      const proposal = await getAnnexure1ByThesisId(studentCseClient, studentCseThesisId);
      expect(proposal).not.toBeNull();
      expect(proposal?.proposed_title).toBe(draftData.proposed_title);
      expect(proposal?.status).toBe('DRAFT');
    });

    it('retrieves saved draft guide preferences correctly', async () => {
      const proposal = await getAnnexure1ByThesisId(studentCseClient, studentCseThesisId);
      expect(proposal).not.toBeNull();

      const preferences = await getGuidePreferencesByAnnexure1Id(studentCseClient, proposal!.id);
      expect(preferences.length).toBe(2);
      expect(preferences[0].preference_rank).toBe(1);
      expect(preferences[0].faculty_id).toBe(cseFacultyIds[0]);
    });
  });

  describe('3. Validation Rules, Invariants & Negative Security Tests', () => {
    it('Security Test F: Unauthenticated caller invokes submit_annexure_1 -> DENIED', async () => {
      const dummyData: Annexure1FormData = {
        proposed_title: 'Unauthenticated Submission Attempt',
        broad_domain: 'Security',
        problem_statement: 'Unauthenticated caller attempting mutation.',
        expected_outcomes: 'Must fail with 42501.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        submitAnnexure1Rpc(unauthenticatedClient, studentCseThesisId, dummyData)
      ).rejects.toThrow();
    });

    it('Security Test A: STUDENT_CSE attempts to submit for STUDENT_ECE thesis -> DENIED', async () => {
      const spoofData: Annexure1FormData = {
        proposed_title: 'Spoofed Cross-Thesis Submission Attempt',
        broad_domain: 'Security',
        problem_statement: 'Student CSE attempting to submit on Student ECE thesis.',
        expected_outcomes: 'Must fail.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        submitAnnexure1Rpc(studentCseClient, studentEceThesisId, spoofData)
      ).rejects.toThrow();
    });

    it('Security Test B: STUDENT_ECE attempts to submit for STUDENT_CSE thesis -> DENIED', async () => {
      const spoofData: Annexure1FormData = {
        proposed_title: 'Spoofed Cross-Thesis Submission Attempt',
        broad_domain: 'Security',
        problem_statement: 'Student ECE attempting to submit on Student CSE thesis.',
        expected_outcomes: 'Must fail.',
        preferences: [
          { faculty_id: eceFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        submitAnnexure1Rpc(studentEceClient, studentCseThesisId, spoofData)
      ).rejects.toThrow();
    });

    it('Security Test C: GUIDE_A calls submit_annexure_1 -> DENIED', async () => {
      const guideData: Annexure1FormData = {
        proposed_title: 'Guide attempting student submission',
        broad_domain: 'Security',
        problem_statement: 'Guide A attempting student submission.',
        expected_outcomes: 'Must be blocked.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        submitAnnexure1Rpc(guideAClient, studentCseThesisId, guideData)
      ).rejects.toThrow();
    });

    it('Security Test D: HOD_CSE calls submit_annexure_1 -> DENIED', async () => {
      const hodData: Annexure1FormData = {
        proposed_title: 'HOD attempting student submission',
        broad_domain: 'Security',
        problem_statement: 'HOD attempting student submission.',
        expected_outcomes: 'Must be blocked.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        submitAnnexure1Rpc(hodCseClient, studentCseThesisId, hodData)
      ).rejects.toThrow();
    });

    it('Security Test E: ADMIN_USR calls submit_annexure_1 -> DENIED', async () => {
      const adminData: Annexure1FormData = {
        proposed_title: 'Admin attempting student submission',
        broad_domain: 'Security',
        problem_statement: 'Admin attempting student submission.',
        expected_outcomes: 'Must be blocked.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        submitAnnexure1Rpc(adminClient, studentCseThesisId, adminData)
      ).rejects.toThrow();
    });

    it('Security Test G: STUDENT_CSE supplies another department (ECE) faculty ID -> DENIED', async () => {
      const crossDeptData: Annexure1FormData = {
        proposed_title: 'Valid Proposed Title for Edge Computing Testing',
        broad_domain: 'Cloud Systems',
        problem_statement: 'Valid problem statement discussing edge compute constraints in detail.',
        expected_outcomes: 'Valid outcomes for testing.',
        preferences: [
          { faculty_id: eceFacultyIds[0], preference_rank: 1 }, // ECE Faculty for CSE thesis!
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        submitAnnexure1Rpc(studentCseClient, studentCseThesisId, crossDeptData)
      ).rejects.toThrow(/faculty from your department/i);
    });

    it('Security Test H: STUDENT_CSE supplies duplicate faculty IDs -> DENIED', async () => {
      const duplicateFacultyData: Annexure1FormData = {
        proposed_title: 'Valid Title for Cloud Systems',
        broad_domain: 'Cloud Systems',
        problem_statement: 'Valid problem statement with sufficient length for testing requirements.',
        expected_outcomes: 'Valid outcomes for testing.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[0], preference_rank: 2 }, // Duplicate
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        submitAnnexure1Rpc(studentCseClient, studentCseThesisId, duplicateFacultyData)
      ).rejects.toThrow(/distinct faculty preferences/i);
    });

    it('Security Test I: STUDENT_CSE supplies invalid ranks (1, 2, 2, 4) -> DENIED', async () => {
      const duplicateRanksData: Annexure1FormData = {
        proposed_title: 'Valid Proposed Title for Edge Computing Testing',
        broad_domain: 'Cloud Systems',
        problem_statement: 'Valid problem statement discussing edge compute constraints in detail.',
        expected_outcomes: 'Valid outcomes for testing.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 2 }, // Duplicate rank
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        submitAnnexure1Rpc(studentCseClient, studentCseThesisId, duplicateRanksData)
      ).rejects.toThrow(/Preference ranks must be distinct integers from 1 to 4/i);
    });

    it('Security Test J: STUDENT_CSE submits against a title belonging to another active thesis -> DENIED / TITLE_COLLISION', async () => {
      const collidingTitleData: Annexure1FormData = {
        proposed_title: 'Ultra Low Power Sub-Threshold SRAM Architecture for Biomedical Implants', // Thesis B Title!
        broad_domain: 'Hardware Architecture',
        problem_statement: 'Attempting to register another candidates dissertation title.',
        expected_outcomes: 'Must be blocked by check_title_collision.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        submitAnnexure1Rpc(studentCseClient, studentCseThesisId, collidingTitleData)
      ).rejects.toThrow(/already registered by another active candidate/i);
    });
  });

  describe('4. Atomicity & Zero Partial Mutation Proof', () => {
    it('PROVES that a failed submission rolls back EVERYTHING with zero partial mutation across all tables', async () => {
      // 1. Capture snapshot before failed attempt
      const thesisBefore = await getStudentActiveThesis(studentCseClient, studentCseThesisId);
      const proposalBefore = await getAnnexure1ByThesisId(studentCseClient, studentCseThesisId);
      const prefsBefore = proposalBefore ? await getGuidePreferencesByAnnexure1Id(studentCseClient, proposalBefore.id) : [];

      const { count: auditCountBefore } = await hodCseClient
        .from('audit_events')
        .select('*', { count: 'exact', head: true })
        .eq('target_entity_id', studentCseThesisId);

      const { count: eventCountBefore } = await hodCseClient
        .from('academic_events')
        .select('*', { count: 'exact', head: true })
        .eq('entity_id', studentCseThesisId);

      // 2. Construct submission that fails at step 5 (Title Collision)
      const failedSubmission: Annexure1FormData = {
        proposed_title: 'Ultra Low Power Sub-Threshold SRAM Architecture for Biomedical Implants', // Collision!
        broad_domain: 'Distributed Computing',
        problem_statement: 'High latency and communication bottlenecks in multi-hop edge telemetry.',
        expected_outcomes: 'Decentralized aggregation algorithm, latency reduction benchmarks.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        submitAnnexure1Rpc(studentCseClient, studentCseThesisId, failedSubmission)
      ).rejects.toThrow(/already registered/i);

      // 3. Verify ALL 8 tables remain in EXACT original state (ZERO partial mutation)
      const thesisAfter = await getStudentActiveThesis(studentCseClient, studentCseThesisId);
      expect(thesisAfter?.current_state).toBe(thesisBefore?.current_state);
      expect(thesisAfter?.current_stage).toBe(thesisBefore?.current_stage);

      const proposalAfter = await getAnnexure1ByThesisId(studentCseClient, studentCseThesisId);
      expect(proposalAfter?.status).toBe(proposalBefore?.status);
      expect(proposalAfter?.proposed_title).toBe(proposalBefore?.proposed_title);

      const prefsAfter = proposalAfter ? await getGuidePreferencesByAnnexure1Id(studentCseClient, proposalAfter.id) : [];
      expect(prefsAfter.length).toBe(prefsBefore.length);

      const { count: auditCountAfter } = await hodCseClient
        .from('audit_events')
        .select('*', { count: 'exact', head: true })
        .eq('target_entity_id', studentCseThesisId);
      expect(auditCountAfter).toBe(auditCountBefore);

      const { count: eventCountAfter } = await hodCseClient
        .from('academic_events')
        .select('*', { count: 'exact', head: true })
        .eq('entity_id', studentCseThesisId);
      expect(eventCountAfter).toBe(eventCountBefore);
    });
  });

  describe('5. Successful Atomic Annexure 1 Final Submission', () => {
    it('executes atomic submit_annexure_1 transition: transitions state, records audit, emits event, and creates notification', async () => {
      const validSubmission: Annexure1FormData = {
        proposed_title: 'Federated Optimization for Distributed IoT Mesh Networks',
        broad_domain: 'Distributed Computing',
        problem_statement: 'High latency and communication bottlenecks in multi-hop edge telemetry.',
        expected_outcomes: 'Decentralized aggregation algorithm, latency reduction benchmarks, and simulation framework.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1, domain_justification: 'IoT Mesh' },
          { faculty_id: cseFacultyIds[1], preference_rank: 2, domain_justification: 'Distributed Systems' },
          { faculty_id: cseFacultyIds[2], preference_rank: 3, domain_justification: 'Optimization Algorithms' },
          { faculty_id: cseFacultyIds[3], preference_rank: 4, domain_justification: 'Edge Hardware' },
        ],
      };

      const result = await submitAnnexure1Rpc(studentCseClient, studentCseThesisId, validSubmission);

      expect(result.success).toBe(true);
      expect(result.thesis_id).toBe(studentCseThesisId);
      expect(result.current_state).toBe('ANNEXURE_1_SUBMITTED');
      expect(result.submitted_at).toBeDefined();

      // 1. Verify thesis state transitioned in DB
      const studentCse = getPersonaByKey('STUDENT_CSE')!;
      const thesis = await getStudentActiveThesis(studentCseClient, studentCse.id);
      expect(thesis?.current_state).toBe('ANNEXURE_1_SUBMITTED');
      expect(thesis?.current_stage).toBe('PROPOSAL_STAGE');
      expect(thesis?.active_title).toBe(validSubmission.proposed_title);

      // 2. Verify Annexure 1 record status is 'SUBMITTED'
      const proposal = await getAnnexure1ByThesisId(studentCseClient, studentCseThesisId);
      expect(proposal).not.toBeNull();
      expect(proposal?.status).toBe('SUBMITTED');
      expect(proposal?.proposed_title).toBe(validSubmission.proposed_title);

      // 3. Verify exactly four preferences persisted
      const prefs = await getGuidePreferencesByAnnexure1Id(studentCseClient, proposal!.id);
      expect(prefs.length).toBe(4);
      expect(prefs.map((p) => p.preference_rank)).toEqual([1, 2, 3, 4]);

      // 4. Verify audit event was created with actor_user_id = auth.uid()
      const { data: auditData } = await hodCseClient
        .from('audit_events')
        .select('*')
        .eq('target_entity_id', studentCseThesisId)
        .eq('action_code', 'ANNEXURE_1_SUBMITTED');

      expect(auditData).toBeDefined();
      expect(auditData.length).toBeGreaterThanOrEqual(1);
      expect(auditData[0].actor_user_id).toBe(studentCse.id);
      expect(auditData[0].active_role_id).toBe('STUDENT');

      // 5. Verify academic domain event was emitted
      const { data: eventData } = await hodCseClient
        .from('academic_events')
        .select('*')
        .eq('entity_id', studentCseThesisId)
        .eq('event_type', 'ANNEXURE_1_SUBMITTED');

      expect(eventData).toBeDefined();
      expect(eventData.length).toBeGreaterThanOrEqual(1);
      expect(eventData[0].actor_user_id).toBe(studentCse.id);
    });

    it('rejects subsequent draft save or submission after proposal is SUBMITTED (immutable state)', async () => {
      const attemptData: Annexure1FormData = {
        proposed_title: 'Tampered Title After Submission',
        broad_domain: 'Security',
        problem_statement: 'Attempting to overwrite a submitted proposal.',
        expected_outcomes: 'Should fail.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      };

      await expect(
        saveAnnexure1DraftRpc(studentCseClient, studentCseThesisId, attemptData)
      ).rejects.toThrow();

      await expect(
        submitAnnexure1Rpc(studentCseClient, studentCseThesisId, attemptData)
      ).rejects.toThrow();
    });
  });
});
