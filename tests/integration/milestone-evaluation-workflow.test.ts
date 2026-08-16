import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getPersonaByKey } from '@/lib/auth/personas';
import {
  createRubricVersionDraftRpc,
  publishRubricVersionRpc,
  getActiveMilestoneRubricRpc,
} from '@/lib/dal/rubrics.dal';
import {
  scheduleMilestonePresentationRpc,
  submitMilestoneEvaluationRpc,
  getMilestoneEvaluationDetailsRpc,
  listDepartmentMilestonesRpc,
} from '@/lib/dal/milestones.dal';
import { getStudentActiveThesis } from '@/lib/dal/theses.dal';
import { submitAnnexure1Rpc } from '@/lib/dal/annexures.dal';
import { verifyAndForwardDcecDocketRpc, recordDcecScreeningDecisionRpc } from '@/lib/dal/dcec.dal';
import { allocateThesisSupervisorsRpc } from '@/lib/dal/allocation.dal';
import { submitAnnexure2Rpc, endorseAnnexure2Rpc, decideAnnexure2TitleRpc } from '@/lib/dal/annexure2.dal';
import { listDepartmentFacultyForPreferences } from '@/lib/dal/faculty.dal';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM0MTI4MDB9.dummy';
const DEV_PASSWORD = process.env.DEV_AUTH_PASSWORD || 'LocalDevPassword123!';

describe('Phase 5K — Milestone Presentations (P1/P2/P3) & Dynamic Rubric Evaluation Integration Suite', () => {
  let adminClient: any;
  let studentCseClient: any;
  let studentEceClient: any;
  let guideAClient: any;
  let dcCseClient: any;
  let dcEceClient: any;
  let hodCseClient: any;
  let dcecMemberCseClient: any;
  let unauthClient: any;

  let cseDeptId: string;
  let eceDeptId: string;
  let cseThesisId: string;
  let eceThesisId: string;

  let testP1RubricVersionId: string;
  let testP2RubricVersionId: string;
  let testP3RubricVersionId: string;
  let p1CriteriaList: any[] = [];
  let p2CriteriaList: any[] = [];
  let p3CriteriaList: any[] = [];

  const STANDARD_4_LEVELS = [
    { level_index: 1, label: 'Unsatisfactory', descriptor: 'Lacks core depth.', score_percentage: 0.25 },
    { level_index: 2, label: 'Developing', descriptor: 'Meets minimum requirements.', score_percentage: 0.5 },
    { level_index: 3, label: 'Proficient', descriptor: 'Demonstrates solid execution.', score_percentage: 0.75 },
    { level_index: 4, label: 'Exemplary', descriptor: 'Exceeds standard expectations.', score_percentage: 1.0 },
  ];

  beforeAll(async () => {
    // 1. Authenticate Personas
    const adminPersona = getPersonaByKey('ADMIN_USR')!;
    const cAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: aAdmin } = await cAdmin.auth.signInWithPassword({ email: adminPersona.email, password: DEV_PASSWORD });
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${aAdmin.session?.access_token}` } },
    });

    const sCsePersona = getPersonaByKey('STUDENT_CSE')!;
    const c1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a1 } = await c1.auth.signInWithPassword({ email: sCsePersona.email, password: DEV_PASSWORD });
    studentCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a1.session?.access_token}` } },
    });

    const sEcePersona = getPersonaByKey('STUDENT_ECE')!;
    const c2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a2 } = await c2.auth.signInWithPassword({ email: sEcePersona.email, password: DEV_PASSWORD });
    studentEceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a2.session?.access_token}` } },
    });

    const gAPersona = getPersonaByKey('GUIDE_A')!;
    const c3 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a3 } = await c3.auth.signInWithPassword({ email: gAPersona.email, password: DEV_PASSWORD });
    guideAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a3.session?.access_token}` } },
    });

    const dcCsePersona = getPersonaByKey('DC_CSE')!;
    const c4 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a4 } = await c4.auth.signInWithPassword({ email: dcCsePersona.email, password: DEV_PASSWORD });
    dcCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a4.session?.access_token}` } },
    });

    const dcEcePersona = getPersonaByKey('DC_ECE')!;
    const c5 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a5 } = await c5.auth.signInWithPassword({ email: dcEcePersona.email, password: DEV_PASSWORD });
    dcEceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a5.session?.access_token}` } },
    });

    const hodCsePersona = getPersonaByKey('HOD_CSE')!;
    const c6 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a6 } = await c6.auth.signInWithPassword({ email: hodCsePersona.email, password: DEV_PASSWORD });
    hodCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a6.session?.access_token}` } },
    });

    const dcecPersona = getPersonaByKey('DCEC_MEMBER')!;
    const c7 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a7 } = await c7.auth.signInWithPassword({ email: dcecPersona.email, password: DEV_PASSWORD });
    dcecMemberCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a7.session?.access_token}` } },
    });

    unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const dhodCsePersona = getPersonaByKey('DHOD_CSE')!;
    const c8 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a8 } = await c8.auth.signInWithPassword({ email: dhodCsePersona.email, password: DEV_PASSWORD });
    const dhodCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a8.session?.access_token}` } },
    });

    const cgAPersona = getPersonaByKey('COGUIDE_A')!;
    const c9 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a9 } = await c9.auth.signInWithPassword({ email: cgAPersona.email, password: DEV_PASSWORD });
    const coguideAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a9.session?.access_token}` } },
    });

    // 2. Discover departments
    const { data: depts } = await hodCseClient.from('departments').select('id, code');
    cseDeptId = depts.find((d: any) => d.code === 'CSE').id;
    eceDeptId = depts.find((d: any) => d.code === 'ECE').id;

    // 3. Discover theses
    const cseThesis = await getStudentActiveThesis(studentCseClient, sCsePersona.id);
    expect(cseThesis).toBeDefined();
    cseThesisId = cseThesis!.id;

    const eceThesis = await getStudentActiveThesis(studentEceClient, sEcePersona.id);
    expect(eceThesis).toBeDefined();
    eceThesisId = eceThesis!.id;

    // 4. Advance CSE thesis to RESEARCH_EXECUTION via official workflow
    await studentCseClient.rpc('reset_thesis_for_testing', { p_thesis_id: cseThesisId });
    await studentCseClient.rpc('reset_thesis_annexure_2_for_testing', { p_thesis_id: cseThesisId });
    await studentCseClient.rpc('reset_digital_logbook_for_testing', { p_thesis_id: cseThesisId });
    await studentCseClient.rpc('reset_milestones_for_testing', { p_thesis_id: cseThesisId });

    const facultyList = await listDepartmentFacultyForPreferences(studentCseClient, cseDeptId);
    const facultyIds = facultyList.map((f: any) => f.user_id);
    await submitAnnexure1Rpc(studentCseClient, cseThesisId, {
      proposed_title: 'Scalable Consensus Protocols for High-Throughput Sharded Blockchains',
      broad_domain: 'Distributed Systems & Cryptography',
      problem_statement: 'Analyzing throughput bottlenecks in asynchronous cross-shard atomic commit protocols.',
      expected_outcomes: 'Novel zero-knowledge proof based atomic commit protocol with O(1) state verification.',
      preferences: [
        { faculty_id: facultyIds[0], preference_rank: 1 },
        { faculty_id: facultyIds[1], preference_rank: 2 },
        { faculty_id: facultyIds[2], preference_rank: 3 },
        { faculty_id: facultyIds[3], preference_rank: 4 },
      ],
    });

    const vRes = await verifyAndForwardDcecDocketRpc(dcCseClient, {
      thesis_id: cseThesisId,
      is_eligible: true,
      documents_complete: true,
      dc_verification_notes: 'Eligible for collaborative problem formulation.',
    });

    await recordDcecScreeningDecisionRpc(hodCseClient, {
      docket_id: vRes.docket_id,
      outcome: 'APPROVED',
      formal_remarks: 'Approved for allocation.',
    });

    await allocateThesisSupervisorsRpc(dhodCseClient, {
      thesis_id: cseThesisId,
      guide_id: gAPersona.id,
      co_guide_id: cgAPersona.id,
    });

    await submitAnnexure2Rpc(studentCseClient, {
      thesis_id: cseThesisId,
      final_title: 'Scalable Consensus Protocols for High-Throughput Sharded Blockchains with Zero-Knowledge Commit',
      refined_problem: 'Formulating provable cross-shard commit bounds with asynchronous network latency.',
      methodology: 'Formal verification via TLA+ and empirical benchmarking in simulated network testbeds.',
      timeline_milestones: [
        {
          milestone_name: 'P1 Literature & Baseline Formulation',
          target_date: '2026-09-30',
          expected_deliverables: 'Formal problem definition and comparative analysis matrix.',
        },
      ],
    });

    await endorseAnnexure2Rpc(guideAClient, { thesis_id: cseThesisId, is_endorsed: true, remarks: 'Endorsed by Guide.' });
    await endorseAnnexure2Rpc(coguideAClient, { thesis_id: cseThesisId, is_endorsed: true, remarks: 'Endorsed by Co-Guide.' });

    await decideAnnexure2TitleRpc(hodCseClient, {
      thesis_id: cseThesisId,
      outcome: 'APPROVED',
      formal_remarks: 'Approved by DCEC Chair. State -> RESEARCH_EXECUTION.',
    });
  });

  afterAll(async () => {
    if (studentCseClient) {
      await studentCseClient.rpc('reset_milestones_for_testing', { p_thesis_id: cseThesisId });
      await studentCseClient.rpc('reset_digital_logbook_for_testing', { p_thesis_id: cseThesisId });
      await studentCseClient.rpc('reset_thesis_annexure_2_for_testing', { p_thesis_id: cseThesisId });
      await studentCseClient.rpc('restore_thesis_a_seed');
    }
  });

  // ==========================================================================
  // 1. RUBRIC CREATION & VALIDATION TESTS (AUTH & BUSINESS RULES)
  // ==========================================================================
  describe('1. 4-Column Dynamic Rubric Creation & Pre-Validation', () => {
    it('AUTH-RUB-01: PROVES ADMIN can successfully create a 4-column rubric version draft', async () => {
      const criteria = [
        { criterion_title: 'Literature Review & Formulation', description: 'State of art depth', max_marks: 25, achievement_levels: STANDARD_4_LEVELS },
        { criterion_title: 'Methodology & Design Rigor', description: 'Architectural validation', max_marks: 25, achievement_levels: STANDARD_4_LEVELS },
        { criterion_title: 'Prototype & Experimentation', description: 'Experimental findings', max_marks: 25, achievement_levels: STANDARD_4_LEVELS },
        { criterion_title: 'Presentation & Q&A Mastery', description: 'Oral defense clarity', max_marks: 25, achievement_levels: STANDARD_4_LEVELS },
      ];

      const res = await createRubricVersionDraftRpc(adminClient, {
        department_id: cseDeptId,
        milestone_type: 'P1',
        title: 'CSE P1 Progress Presentation Standard Rubric',
        criteria,
      });

      expect(res.success).toBe(true);
      expect(res.rubric_version_id).toBeDefined();
      expect(res.is_published).toBe(false);
      expect(res.criteria_count).toBe(4);
      testP1RubricVersionId = res.rubric_version_id!;
    });

    it('AUTH-RUB-02: PROVES Unauthorized STUDENT cannot create a rubric draft (42501)', async () => {
      await expect(
        createRubricVersionDraftRpc(studentCseClient, {
          department_id: cseDeptId,
          milestone_type: 'P1',
          title: 'Malicious Student Rubric',
          criteria: [{ criterion_title: 'Easy Pass', max_marks: 100, achievement_levels: STANDARD_4_LEVELS }],
        })
      ).rejects.toThrow();
    });

    it('AUTH-RUB-03: PROVES GUIDE cannot create a rubric draft (42501)', async () => {
      await expect(
        createRubricVersionDraftRpc(guideAClient, {
          department_id: cseDeptId,
          milestone_type: 'P1',
          title: 'Guide Rubric Attempt',
          criteria: [{ criterion_title: 'Supervisor Weight', max_marks: 100, achievement_levels: STANDARD_4_LEVELS }],
        })
      ).rejects.toThrow();
    });

    it('AUTH-RUB-04: PROVES DC cannot create a rubric draft (42501)', async () => {
      await expect(
        createRubricVersionDraftRpc(dcCseClient, {
          department_id: cseDeptId,
          milestone_type: 'P1',
          title: 'DC Rubric Attempt',
          criteria: [{ criterion_title: 'Coordinator Weight', max_marks: 100, achievement_levels: STANDARD_4_LEVELS }],
        })
      ).rejects.toThrow();
    });

    it('AUTH-RUB-05: PROVES DCEC_MEMBER cannot create a rubric draft (42501)', async () => {
      await expect(
        createRubricVersionDraftRpc(dcecMemberCseClient, {
          department_id: cseDeptId,
          milestone_type: 'P1',
          title: 'DCEC Rubric Attempt',
          criteria: [{ criterion_title: 'Evaluator Weight', max_marks: 100, achievement_levels: STANDARD_4_LEVELS }],
        })
      ).rejects.toThrow();
    });

    it('VAL-RUB-06: PROVES Invalid milestone type is rejected by database (23514)', async () => {
      await expect(
        createRubricVersionDraftRpc(adminClient, {
          department_id: cseDeptId,
          milestone_type: 'INVALID_MILESTONE' as any,
          title: 'Invalid Milestone Rubric',
          criteria: [{ criterion_title: 'Invalid', max_marks: 100, achievement_levels: STANDARD_4_LEVELS }],
        })
      ).rejects.toThrow();
    });

    it('VAL-RUB-07: PROVES Empty criteria array is rejected (23502)', async () => {
      await expect(
        createRubricVersionDraftRpc(adminClient, {
          department_id: cseDeptId,
          milestone_type: 'P1',
          title: 'Empty Criteria Rubric',
          criteria: [],
        })
      ).rejects.toThrow();
    });

    it('VAL-RUB-08: PROVES Criterion with invalid max_marks <= 0 is rejected (23514)', async () => {
      await expect(
        createRubricVersionDraftRpc(adminClient, {
          department_id: cseDeptId,
          milestone_type: 'P1',
          title: 'Zero Marks Rubric',
          criteria: [{ criterion_title: 'Zero Weight', max_marks: 0, achievement_levels: STANDARD_4_LEVELS }],
        })
      ).rejects.toThrow();
    });

    it('VAL-RUB-09: PROVES Criterion with non-4 achievement levels is rejected (23514)', async () => {
      const threeLevels = [
        { level_index: 1, label: 'Poor', descriptor: 'Poor', score_percentage: 0.33 },
        { level_index: 2, label: 'Good', descriptor: 'Good', score_percentage: 0.66 },
        { level_index: 3, label: 'Great', descriptor: 'Great', score_percentage: 1.0 },
      ];

      await expect(
        createRubricVersionDraftRpc(adminClient, {
          department_id: cseDeptId,
          milestone_type: 'P1',
          title: '3-Column Rubric Attempt',
          criteria: [{ criterion_title: '3-Tier Criterion', max_marks: 100, achievement_levels: threeLevels }],
        })
      ).rejects.toThrow();
    });

    it('VAL-RUB-10: PROVES Criterion with invalid score percentages outside [0, 1] is rejected', async () => {
      const badPercentageLevels = [
        { level_index: 1, label: 'Level 1', descriptor: 'D1', score_percentage: -0.5 },
        { level_index: 2, label: 'Level 2', descriptor: 'D2', score_percentage: 0.5 },
        { level_index: 3, label: 'Level 3', descriptor: 'D3', score_percentage: 0.75 },
        { level_index: 4, label: 'Level 4', descriptor: 'D4', score_percentage: 1.5 },
      ];

      await expect(
        createRubricVersionDraftRpc(adminClient, {
          department_id: cseDeptId,
          milestone_type: 'P1',
          title: 'Bad Percentages Rubric',
          criteria: [{ criterion_title: 'Bad Percents', max_marks: 100, achievement_levels: badPercentageLevels }],
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // 2. RUBRIC PUBLICATION & IMMUTABILITY TESTS
  // ==========================================================================
  describe('2. Rubric Version Publication & Immutability Enforcement', () => {
    it('AUTH-PUB-11: PROVES Unauthorized STUDENT cannot publish a rubric (42501)', async () => {
      await expect(
        publishRubricVersionRpc(studentCseClient, {
          rubric_version_id: testP1RubricVersionId,
        })
      ).rejects.toThrow();
    });

    it('AUTH-PUB-12: PROVES Unauthorized GUIDE cannot publish a rubric (42501)', async () => {
      await expect(
        publishRubricVersionRpc(guideAClient, {
          rubric_version_id: testP1RubricVersionId,
        })
      ).rejects.toThrow();
    });

    it('VAL-PUB-13: PROVES Rubric version with criteria marks NOT summing to 100.0 is rejected from publication', async () => {
      // Create draft with total sum = 80
      const draftRes = await createRubricVersionDraftRpc(adminClient, {
        department_id: cseDeptId,
        milestone_type: 'P2',
        title: 'Underweight 80 Marks Rubric',
        criteria: [
          { criterion_title: 'C1', max_marks: 40, achievement_levels: STANDARD_4_LEVELS },
          { criterion_title: 'C2', max_marks: 40, achievement_levels: STANDARD_4_LEVELS },
        ],
      });

      await expect(
        publishRubricVersionRpc(hodCseClient, {
          rubric_version_id: draftRes.rubric_version_id!,
        })
      ).rejects.toThrow(/100.0 is required/);
    });

    it('AUTH-PUB-14: PROVES Authorized HOD can publish a valid 100-mark rubric version', async () => {
      const res = await publishRubricVersionRpc(hodCseClient, {
        rubric_version_id: testP1RubricVersionId,
        justification: 'Official CSE 2026 Cohort P1 Rubric Standard',
      });

      expect(res.success).toBe(true);
      expect(res.is_published).toBe(true);
      expect(res.rubric_version_id).toBe(testP1RubricVersionId);
    });

    it('AUD-PUB-15: PROVES Rubric publication generates AUD-RUB-02 audit event and academic domain event', async () => {
      const { data: auditRows } = await adminClient
        .from('audit_events')
        .select('*')
        .eq('target_entity_id', testP1RubricVersionId)
        .eq('action_code', 'RUBRIC_VERSION_PUBLISHED');

      expect(auditRows.length).toBeGreaterThanOrEqual(1);
      expect(auditRows[0].target_entity_type).toBe('RUBRIC_VERSION');

      const { data: academicRows } = await adminClient
        .from('academic_events')
        .select('*')
        .eq('entity_id', testP1RubricVersionId)
        .eq('event_type', 'RUBRIC_VERSION_PUBLISHED');

      expect(academicRows.length).toBeGreaterThanOrEqual(1);
    });

    it('IMMUT-PUB-16: PROVES Published rubric version cannot be re-published (InvalidState 23514)', async () => {
      await expect(
        publishRubricVersionRpc(hodCseClient, {
          rubric_version_id: testP1RubricVersionId,
        })
      ).rejects.toThrow(/already published/);
    });
  });

  // ==========================================================================
  // 3. ACTIVE RUBRIC QUERY & VERSION PINNING
  // ==========================================================================
  describe('3. Active Rubric Query, Version Pinning & Tenancy', () => {
    it('QRY-RUB-17: PROVES get_active_milestone_rubric returns published 4-column rubric for department', async () => {
      const res = await getActiveMilestoneRubricRpc(studentCseClient, {
        department_id: cseDeptId,
        milestone_type: 'P1',
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.rubric_version_id).toBe(testP1RubricVersionId);
      expect(res.data?.criteria.length).toBe(4);
      expect(res.data?.criteria[0].achievement_levels.length).toBe(4);
      p1CriteriaList = res.data!.criteria;
    });

    it('QRY-RUB-18: PROVES Unpublished rubric drafts are NOT returned as active rubric', async () => {
      // Create unpublished FINAL_VIVA draft
      await createRubricVersionDraftRpc(adminClient, {
        department_id: cseDeptId,
        milestone_type: 'FINAL_VIVA',
        title: 'Unpublished CSE Final Viva Draft',
        criteria: [
          { criterion_title: 'FV C1', max_marks: 50, achievement_levels: STANDARD_4_LEVELS },
          { criterion_title: 'FV C2', max_marks: 50, achievement_levels: STANDARD_4_LEVELS },
        ],
      });

      const res = await getActiveMilestoneRubricRpc(studentCseClient, {
        department_id: cseDeptId,
        milestone_type: 'FINAL_VIVA',
      });

      // Returns null data when no published version exists
      expect(res.data).toBeNull();
    });

    it('QRY-RUB-19: PROVES Department Tenancy — ECE query does not receive CSE published rubric', async () => {
      const res = await getActiveMilestoneRubricRpc(studentEceClient, {
        department_id: eceDeptId,
        milestone_type: 'P1',
      });

      expect(res.data).toBeNull();
    });
  });

  // ==========================================================================
  // 4. MILESTONE PRESENTATION SCHEDULING (P1, P2, P3)
  // ==========================================================================
  describe('4. Milestone Presentation Scheduling Workflow & RBAC', () => {
    it('AUTH-SCH-20: PROVES Unauthorized STUDENT cannot schedule a milestone presentation (42501)', async () => {
      await expect(
        scheduleMilestonePresentationRpc(studentCseClient, {
          thesis_id: cseThesisId,
          milestone_type: 'P1',
          presentation_date: new Date(Date.now() + 86400000).toISOString(),
          venue_or_url: 'Room 302',
        })
      ).rejects.toThrow();
    });

    it('AUTH-SCH-21: PROVES Unauthorized GUIDE cannot schedule a milestone presentation (42501)', async () => {
      await expect(
        scheduleMilestonePresentationRpc(guideAClient, {
          thesis_id: cseThesisId,
          milestone_type: 'P1',
          presentation_date: new Date(Date.now() + 86400000).toISOString(),
          venue_or_url: 'Room 302',
        })
      ).rejects.toThrow();
    });

    it('AUTH-SCH-22: PROVES Cross-department DC (ECE) cannot schedule CSE thesis presentation (42501)', async () => {
      await expect(
        scheduleMilestonePresentationRpc(dcEceClient, {
          thesis_id: cseThesisId,
          milestone_type: 'P1',
          presentation_date: new Date(Date.now() + 86400000).toISOString(),
          venue_or_url: 'ECE Lab',
        })
      ).rejects.toThrow();
    });

    it('VAL-SCH-23: PROVES Scheduling without active published rubric is rejected (23514)', async () => {
      // P3 has no published rubric yet on CSE
      await expect(
        scheduleMilestonePresentationRpc(dcCseClient, {
          thesis_id: cseThesisId,
          milestone_type: 'P3',
          presentation_date: new Date(Date.now() + 86400000).toISOString(),
          venue_or_url: 'Room 302',
        })
      ).rejects.toThrow(/No active published rubric/);
    });

    it('WF-SCH-24: PROVES Authorized DC can schedule P1 presentation when thesis is in RESEARCH_EXECUTION', async () => {
      const presentationDate = new Date(Date.now() + 86400000).toISOString();
      const res = await scheduleMilestonePresentationRpc(dcCseClient, {
        thesis_id: cseThesisId,
        milestone_type: 'P1',
        presentation_date: presentationDate,
        venue_or_url: 'Conference Hall A, Block 3',
        notes: 'Bring slide deck and prototype code.',
      });

      expect(res.success).toBe(true);
      expect(res.scheduled_state).toBe('P1_EVALUATION_SCHEDULED');

      // Verify thesis row updated
      const { data: tRow } = await studentCseClient.from('theses').select('current_state').eq('id', cseThesisId).single();
      expect(tRow.current_state).toBe('P1_EVALUATION_SCHEDULED');
    });

    it('AUD-SCH-25: PROVES Presentation scheduling writes AUD-MILE-01 audit event and academic domain event', async () => {
      const { data: auditRows } = await adminClient
        .from('audit_events')
        .select('*')
        .eq('target_entity_id', cseThesisId)
        .eq('action_code', 'MILESTONE_SCHEDULED');

      expect(auditRows.length).toBeGreaterThanOrEqual(1);

      const { data: acadRows } = await adminClient
        .from('academic_events')
        .select('*')
        .eq('entity_id', cseThesisId)
        .eq('event_type', 'MILESTONE_SCHEDULED');

      expect(acadRows.length).toBeGreaterThanOrEqual(1);
    });

    it('VAL-SCH-26: PROVES Thesis already in P1_EVALUATION_SCHEDULED rejects concurrent double-scheduling (23514)', async () => {
      await expect(
        scheduleMilestonePresentationRpc(dcCseClient, {
          thesis_id: cseThesisId,
          milestone_type: 'P1',
          presentation_date: new Date(Date.now() + 172800000).toISOString(),
          venue_or_url: 'Room 101',
        })
      ).rejects.toThrow(/must be RESEARCH_EXECUTION/);
    });
  });

  // ==========================================================================
  // 5. DCEC EVALUATION & DYNAMIC 4-COLUMN RUBRIC SCORING
  // ==========================================================================
  describe('5. DCEC Milestone Evaluation & Dynamic Scoring Execution', () => {
    it('AUTH-EVAL-27: PROVES Unauthorized STUDENT cannot submit milestone evaluation (42501)', async () => {
      await expect(
        submitMilestoneEvaluationRpc(studentCseClient, {
          thesis_id: cseThesisId,
          milestone_type: 'P1',
          rubric_version_id: testP1RubricVersionId,
          criterion_scores: [],
        })
      ).rejects.toThrow();
    });

    it('AUTH-EVAL-28: PROVES Unauthorized GUIDE cannot evaluate their candidate milestone presentation (42501)', async () => {
      await expect(
        submitMilestoneEvaluationRpc(guideAClient, {
          thesis_id: cseThesisId,
          milestone_type: 'P1',
          rubric_version_id: testP1RubricVersionId,
          criterion_scores: [],
        })
      ).rejects.toThrow();
    });

    it('VAL-EVAL-29: PROVES Evaluation rejects missing / incomplete criteria scoring', async () => {
      // Submit only 2 of 4 criteria
      const partialScores = [
        {
          criterion_id: p1CriteriaList[0].id,
          selected_level_id: p1CriteriaList[0].achievement_levels[2].id, // 75%
          awarded_marks: 18.75,
        },
        {
          criterion_id: p1CriteriaList[1].id,
          selected_level_id: p1CriteriaList[1].achievement_levels[3].id, // 100%
          awarded_marks: 25.0,
        },
      ];

      await expect(
        submitMilestoneEvaluationRpc(dcecMemberCseClient, {
          thesis_id: cseThesisId,
          milestone_type: 'P1',
          rubric_version_id: testP1RubricVersionId,
          criterion_scores: partialScores,
        })
      ).rejects.toThrow(/Rubric contains 4 criteria, but 2 were scored/);
    });

    it('VAL-EVAL-30: PROVES Evaluation rejects criterion marks exceeding individual criterion max_marks', async () => {
      const invalidMarksScores = p1CriteriaList.map((c) => ({
        criterion_id: c.id,
        selected_level_id: c.achievement_levels[3].id,
        awarded_marks: 99.0, // Exceeds max_marks (25)
      }));

      await expect(
        submitMilestoneEvaluationRpc(dcecMemberCseClient, {
          thesis_id: cseThesisId,
          milestone_type: 'P1',
          rubric_version_id: testP1RubricVersionId,
          criterion_scores: invalidMarksScores,
        })
      ).rejects.toThrow(/outside valid range/);
    });

    it('WF-EVAL-31: PROVES Authorized DCEC Member submits P1 evaluation with server-computed score /100', async () => {
      // 4 criteria scored at Levels 3, 4, 3, 4 => 18.75 + 25 + 18.75 + 25 = 87.5
      const validScores = [
        { criterion_id: p1CriteriaList[0].id, selected_level_id: p1CriteriaList[0].achievement_levels[2].id, awarded_marks: 18.75, criterion_remarks: 'Thorough literature' },
        { criterion_id: p1CriteriaList[1].id, selected_level_id: p1CriteriaList[1].achievement_levels[3].id, awarded_marks: 25.0, criterion_remarks: 'Excellent architecture' },
        { criterion_id: p1CriteriaList[2].id, selected_level_id: p1CriteriaList[2].achievement_levels[2].id, awarded_marks: 18.75, criterion_remarks: 'Solid prototype' },
        { criterion_id: p1CriteriaList[3].id, selected_level_id: p1CriteriaList[3].achievement_levels[3].id, awarded_marks: 25.0, criterion_remarks: 'Clear defense presentation' },
      ];

      const res = await submitMilestoneEvaluationRpc(dcecMemberCseClient, {
        thesis_id: cseThesisId,
        milestone_type: 'P1',
        rubric_version_id: testP1RubricVersionId,
        criterion_scores: validScores,
        general_feedback: 'Candidate demonstrated commendable progress during P1 review.',
      });

      expect(res.success).toBe(true);
      expect(res.evaluation_id).toBeDefined();
      expect(res.total_marks_awarded).toBe(87.5);
      expect(res.is_contributing_to_final_grade).toBe(false); // Formative invariant!
      expect(res.new_thesis_state).toBe('RESEARCH_EXECUTION'); // Returns to RESEARCH_EXECUTION!
    });

    it('WF-EVAL-32: PROVES Formative P1 completion returns thesis state to RESEARCH_EXECUTION', async () => {
      const { data: tRow } = await studentCseClient.from('theses').select('current_state, current_stage').eq('id', cseThesisId).single();
      expect(tRow.current_state).toBe('RESEARCH_EXECUTION');
    });

    it('IMMUT-EVAL-33: PROVES Duplicate evaluation submission on completed P1 is rejected (23514 / Conflict)', async () => {
      const validScores = p1CriteriaList.map((c) => ({
        criterion_id: c.id,
        selected_level_id: c.achievement_levels[3].id,
        awarded_marks: 25.0,
      }));

      await expect(
        submitMilestoneEvaluationRpc(dcecMemberCseClient, {
          thesis_id: cseThesisId,
          milestone_type: 'P1',
          rubric_version_id: testP1RubricVersionId,
          criterion_scores: validScores,
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // 6. P2 & P3 FULL WORKFLOW AND P3 GRADING EXCLUSIVITY INVARIANT
  // ==========================================================================
  describe('6. P2 & P3 Progression and P3-Only Final Grade Invariant', () => {
    it('WF-P2-34: PROVES Publishing P2 rubric, scheduling P2, and evaluating P2 returns thesis to RESEARCH_EXECUTION', async () => {
      // 1. Create & Publish P2 Rubric
      const p2Draft = await createRubricVersionDraftRpc(adminClient, {
        department_id: cseDeptId,
        milestone_type: 'P2',
        title: 'Official CSE P2 Standard Rubric',
        criteria: [
          { criterion_title: 'P2 C1', max_marks: 50, achievement_levels: STANDARD_4_LEVELS },
          { criterion_title: 'P2 C2', max_marks: 50, achievement_levels: STANDARD_4_LEVELS },
        ],
      });
      testP2RubricVersionId = p2Draft.rubric_version_id!;

      await publishRubricVersionRpc(hodCseClient, {
        rubric_version_id: testP2RubricVersionId,
        justification: 'Official CSE P2 Standard',
      });

      const p2Active = await getActiveMilestoneRubricRpc(adminClient, { department_id: cseDeptId, milestone_type: 'P2' });
      p2CriteriaList = p2Active.data!.criteria;

      // 2. Schedule P2
      const schedRes = await scheduleMilestonePresentationRpc(dcCseClient, {
        thesis_id: cseThesisId,
        milestone_type: 'P2',
        presentation_date: new Date(Date.now() + 86400000).toISOString(),
        venue_or_url: 'Seminar Hall B',
      });
      expect(schedRes.scheduled_state).toBe('P2_EVALUATION_SCHEDULED');

      // 3. Evaluate P2 (Formative, total = 90.0)
      const p2Scores = [
        { criterion_id: p2CriteriaList[0].id, selected_level_id: p2CriteriaList[0].achievement_levels[3].id, awarded_marks: 45.0 },
        { criterion_id: p2CriteriaList[1].id, selected_level_id: p2CriteriaList[1].achievement_levels[3].id, awarded_marks: 45.0 },
      ];

      const evalRes = await submitMilestoneEvaluationRpc(dcecMemberCseClient, {
        thesis_id: cseThesisId,
        milestone_type: 'P2',
        rubric_version_id: testP2RubricVersionId,
        criterion_scores: p2Scores,
        general_feedback: 'P2 mid-term findings verified.',
      });

      expect(evalRes.success).toBe(true);
      expect(evalRes.total_marks_awarded).toBe(90.0);
      expect(evalRes.is_contributing_to_final_grade).toBe(false); // Formative invariant!
      expect(evalRes.new_thesis_state).toBe('RESEARCH_EXECUTION'); // Returns to RESEARCH_EXECUTION!
    });

    it('INV-P3-35: PROVES P3 Evaluation advances thesis to ANNEXURE_5_PREPARATION and is SOLE contributor to final grade', async () => {
      // 1. Create & Publish P3 Rubric
      const p3Draft = await createRubricVersionDraftRpc(adminClient, {
        department_id: cseDeptId,
        milestone_type: 'P3',
        title: 'CSE P3 Pre-Submission Final Rubric',
        criteria: [
          { criterion_title: 'Dissertation Completeness', max_marks: 50, achievement_levels: STANDARD_4_LEVELS },
          { criterion_title: 'Publication & Impact', max_marks: 50, achievement_levels: STANDARD_4_LEVELS },
        ],
      });
      testP3RubricVersionId = p3Draft.rubric_version_id!;

      await publishRubricVersionRpc(hodCseClient, {
        rubric_version_id: testP3RubricVersionId,
        justification: 'Official CSE P3 Standard',
      });

      const p3Active = await getActiveMilestoneRubricRpc(adminClient, { department_id: cseDeptId, milestone_type: 'P3' });
      p3CriteriaList = p3Active.data!.criteria;

      // 2. Schedule P3
      const schedRes = await scheduleMilestonePresentationRpc(dcCseClient, {
        thesis_id: cseThesisId,
        milestone_type: 'P3',
        presentation_date: new Date(Date.now() + 86400000).toISOString(),
        venue_or_url: 'Senate Room, Main Building',
      });
      expect(schedRes.scheduled_state).toBe('P3_EVALUATION_SCHEDULED');

      // 3. Evaluate P3 (Summative, total = 95.0)
      const p3Scores = [
        { criterion_id: p3CriteriaList[0].id, selected_level_id: p3CriteriaList[0].achievement_levels[3].id, awarded_marks: 47.5 },
        { criterion_id: p3CriteriaList[1].id, selected_level_id: p3CriteriaList[1].achievement_levels[3].id, awarded_marks: 47.5 },
      ];

      const evalRes = await submitMilestoneEvaluationRpc(dcecMemberCseClient, {
        thesis_id: cseThesisId,
        milestone_type: 'P3',
        rubric_version_id: testP3RubricVersionId,
        criterion_scores: p3Scores,
        general_feedback: 'P3 pre-submission defense cleared with distinction.',
      });

      expect(evalRes.success).toBe(true);
      expect(evalRes.total_marks_awarded).toBe(95.0);
      expect(evalRes.is_contributing_to_final_grade).toBe(true); // Summative Invariant! (REQ-EVAL-005)
      expect(evalRes.new_thesis_state).toBe('ANNEXURE_5_PREPARATION');

      // Verify thesis state machine progression in database
      const { data: tFinal } = await studentCseClient.from('theses').select('current_state, current_stage').eq('id', cseThesisId).single();
      expect(tFinal.current_state).toBe('ANNEXURE_5_PREPARATION');
      expect(tFinal.current_stage).toBe('FINAL_SUBMISSION_STAGE');
    });

    it('QRY-EVAL-36: PROVES get_milestone_evaluation_details returns complete scorecard and pinned rubric version', async () => {
      const res = await getMilestoneEvaluationDetailsRpc(studentCseClient, {
        thesis_id: cseThesisId,
        milestone_type: 'P3',
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      const scorecard = res.data as any;
      expect(scorecard.total_marks_awarded).toBe(95.0);
      expect(scorecard.rubric_version_id).toBe(testP3RubricVersionId);
      expect(scorecard.is_contributing_to_final_grade).toBe(true);
      expect(scorecard.criterion_scores.length).toBe(2);
      expect(scorecard.criterion_scores[0].selected_level_index).toBe(4);
    });

    it('QRY-DEPT-37: PROVES list_department_milestones returns complete departmental cohort overview', async () => {
      const res = await listDepartmentMilestonesRpc(dcCseClient, {
        department_id: cseDeptId,
      });

      expect(res.success).toBe(true);
      expect(res.count).toBeGreaterThanOrEqual(1);
      const cseSummary = (res.data as any[]).find((t) => t.thesis_id === cseThesisId);
      expect(cseSummary).toBeDefined();
      expect(cseSummary.p1_evaluation).toBeDefined();
      expect(cseSummary.p2_evaluation).toBeDefined();
      expect(cseSummary.p3_evaluation).toBeDefined();
      expect(cseSummary.p3_evaluation.total_marks_awarded).toBe(95.0);
    });
  });
});
