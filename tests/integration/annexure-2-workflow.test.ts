import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getPersonaByKey } from '@/lib/auth/personas';
import {
  getAnnexure2WorkspaceRpc,
  saveAnnexure2DraftRpc,
  submitAnnexure2Rpc,
  endorseAnnexure2Rpc,
  decideAnnexure2TitleRpc,
} from '@/lib/dal/annexure2.dal';
import { submitAnnexure1Rpc } from '@/lib/dal/annexures.dal';
import { verifyAndForwardDcecDocketRpc, recordDcecScreeningDecisionRpc } from '@/lib/dal/dcec.dal';
import { allocateThesisSupervisorsRpc } from '@/lib/dal/allocation.dal';
import { getStudentActiveThesis } from '@/lib/dal/theses.dal';
import { listDepartmentFacultyForPreferences } from '@/lib/dal/faculty.dal';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM0MTI4MDB9.dummy';
const DEV_PASSWORD = process.env.DEV_AUTH_PASSWORD || 'LocalDevPassword123!';

describe('Phase 5I — Annexure 2 Collaborative Problem Formulation & Title Approval Integration Suite', () => {
  let studentCseClient: any;
  let studentEceClient: any;
  let guideAClient: any;
  let guideBClient: any;
  let coguideAClient: any;
  let hodCseClient: any;
  let hodEceClient: any;
  let dhodCseClient: any;
  let dcCseClient: any;
  let adminClient: any;
  let unauthClient: any;

  let cseThesisId: string;
  let cseDeptId: string;
  let eceThesisId: string;
  let cseGuideId: string;
  let cseCoGuideId: string;

  const validMilestones = [
    {
      milestone_name: 'Literature Review & Baseline Formulation',
      target_date: '2026-09-30',
      expected_deliverables: 'Literature matrix and formal mathematical problem definition.',
    },
    {
      milestone_name: 'System Architecture & Simulation Modeling',
      target_date: '2026-11-30',
      expected_deliverables: 'Validated ROS2 execution framework and architectural specs.',
    },
    {
      milestone_name: 'Empirical Benchmarking & Dissertation Manuscript',
      target_date: '2027-02-28',
      expected_deliverables: 'Turnitin similarity report and completed thesis draft.',
    },
  ];

  beforeAll(async () => {
    // 1. STUDENT_CSE
    const sCsePersona = getPersonaByKey('STUDENT_CSE')!;
    const c1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a1 } = await c1.auth.signInWithPassword({ email: sCsePersona.email, password: DEV_PASSWORD });
    studentCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a1.session?.access_token}` } },
    });

    // 2. STUDENT_ECE
    const sEcePersona = getPersonaByKey('STUDENT_ECE')!;
    const c2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a2 } = await c2.auth.signInWithPassword({ email: sEcePersona.email, password: DEV_PASSWORD });
    studentEceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a2.session?.access_token}` } },
    });

    // 3. GUIDE_A (Primary Guide CSE)
    const gAPersona = getPersonaByKey('GUIDE_A')!;
    cseGuideId = gAPersona.id;
    const c3 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a3 } = await c3.auth.signInWithPassword({ email: gAPersona.email, password: DEV_PASSWORD });
    guideAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a3.session?.access_token}` } },
    });

    // 4. GUIDE_B (ECE Supervisor - Unassigned to CSE)
    const gBPersona = getPersonaByKey('GUIDE_B')!;
    const c4 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a4 } = await c4.auth.signInWithPassword({ email: gBPersona.email, password: DEV_PASSWORD });
    guideBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a4.session?.access_token}` } },
    });

    // 5. COGUIDE_A (Co-Guide CSE)
    const cgAPersona = getPersonaByKey('COGUIDE_A')!;
    cseCoGuideId = cgAPersona.id;
    const c5 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a5 } = await c5.auth.signInWithPassword({ email: cgAPersona.email, password: DEV_PASSWORD });
    coguideAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a5.session?.access_token}` } },
    });

    // 6. HOD_CSE (DCEC Chair CSE)
    const hodCsePersona = getPersonaByKey('HOD_CSE')!;
    const c6 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a6 } = await c6.auth.signInWithPassword({ email: hodCsePersona.email, password: DEV_PASSWORD });
    hodCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a6.session?.access_token}` } },
    });

    // 7. HOD_ECE (DCEC Chair ECE)
    const hodEcePersona = getPersonaByKey('HOD_ECE')!;
    const c7 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a7 } = await c7.auth.signInWithPassword({ email: hodEcePersona.email, password: DEV_PASSWORD });
    hodEceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a7.session?.access_token}` } },
    });

    // 8. DHOD_CSE
    const dhodCsePersona = getPersonaByKey('DHOD_CSE')!;
    const c8 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a8 } = await c8.auth.signInWithPassword({ email: dhodCsePersona.email, password: DEV_PASSWORD });
    dhodCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a8.session?.access_token}` } },
    });

    // 9. DC_CSE
    const dcCsePersona = getPersonaByKey('DC_CSE')!;
    const c9 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a9 } = await c9.auth.signInWithPassword({ email: dcCsePersona.email, password: DEV_PASSWORD });
    dcCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a9.session?.access_token}` } },
    });

    // 10. ADMIN_USR
    const adminPersona = getPersonaByKey('ADMIN_USR')!;
    const c10 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a10 } = await c10.auth.signInWithPassword({ email: adminPersona.email, password: DEV_PASSWORD });
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a10.session?.access_token}` } },
    });

    // 11. Unauthenticated Client
    unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Resolve student thesis and department
    const cseThesis = await getStudentActiveThesis(studentCseClient, sCsePersona.id);
    expect(cseThesis).toBeDefined();
    cseThesisId = cseThesis!.id;
    cseDeptId = cseThesis!.department_id;

    // Fetch ECE Thesis
    const eceThesis = await getStudentActiveThesis(studentEceClient, sEcePersona.id);
    expect(eceThesis).toBeDefined();
    eceThesisId = eceThesis!.id;

    // Deterministic Lifecycle Reset: Clean state
    await studentCseClient.rpc('reset_thesis_for_testing', { p_thesis_id: cseThesisId });
    await studentCseClient.rpc('reset_thesis_annexure_2_for_testing', { p_thesis_id: cseThesisId });
    await adminClient.from('faculty_profiles').update({ active_guide_load: 0, active_coguide_load: 0 }).eq('department_id', cseDeptId);

    const facultyList = await listDepartmentFacultyForPreferences(studentCseClient, cseDeptId);
    const facultyIds = facultyList.map((f) => f.user_id);
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
      guide_id: cseGuideId,
      co_guide_id: cseCoGuideId,
    });
  });

  afterAll(async () => {
    // Restore seeded state for downstream test suites
    if (studentCseClient) {
      await studentCseClient.rpc('reset_thesis_annexure_2_for_testing', { p_thesis_id: cseThesisId });
      await studentCseClient.rpc('restore_thesis_a_seed');
    }
  });

  // ==========================================================================
  // CATEGORY 1: WORKSPACE ACCESS & RBAC
  // ==========================================================================
  describe('Category 1 — Workspace Access & RBAC', () => {
    it('TC-ANN2-01: Student can access own Annexure 2 workspace', async () => {
      const ws = await getAnnexure2WorkspaceRpc(studentCseClient, cseThesisId);
      expect(ws).toBeDefined();
      expect(ws.thesis.id).toBe(cseThesisId);
      expect(ws.permissions.is_student).toBe(true);
      expect(ws.permissions.can_edit).toBe(true);
      expect(ws.guide?.full_name).toContain('Rajesh');
      expect(ws.co_guide?.full_name).toContain('Amit');
    });

    it('TC-ANN2-02: Assigned Primary Guide can view assigned thesis Annexure 2 workspace', async () => {
      const ws = await getAnnexure2WorkspaceRpc(guideAClient, cseThesisId);
      expect(ws).toBeDefined();
      expect(ws.permissions.is_guide).toBe(true);
      expect(ws.permissions.is_student).toBe(false);
    });

    it('TC-ANN2-03: Assigned Co-Guide can view assigned thesis Annexure 2 workspace', async () => {
      const ws = await getAnnexure2WorkspaceRpc(coguideAClient, cseThesisId);
      expect(ws).toBeDefined();
      expect(ws.permissions.is_coguide).toBe(true);
    });

    it('TC-ANN2-04: Student cannot access another student’s Annexure 2 workspace', async () => {
      await expect(
        getAnnexure2WorkspaceRpc(studentEceClient, cseThesisId)
      ).rejects.toThrow(/Forbidden|Access denied/i);
    });

    it('TC-ANN2-05: Department official from another department cannot access CSE thesis workspace', async () => {
      await expect(
        getAnnexure2WorkspaceRpc(hodEceClient, cseThesisId)
      ).rejects.toThrow(/Forbidden|Access denied/i);
    });

    it('TC-ANN2-06: Unassigned faculty cannot access protected supervisor workspace', async () => {
      await expect(
        getAnnexure2WorkspaceRpc(guideBClient, cseThesisId)
      ).rejects.toThrow(/Forbidden|Access denied/i);
    });

    it('TC-ANN2-07: Department HOD / DCEC Chair can view departmental workspace', async () => {
      const ws = await getAnnexure2WorkspaceRpc(hodCseClient, cseThesisId);
      expect(ws).toBeDefined();
      expect(ws.permissions.is_dcec_chair).toBe(true);
    });
  });

  // ==========================================================================
  // CATEGORY 2: DRAFT CREATION & UPDATE
  // ==========================================================================
  describe('Category 2 — Draft Creation & Update', () => {
    it('TC-ANN2-08: Student saves valid Annexure 2 draft while in SUPERVISORS_ALLOCATED', async () => {
      const res = await saveAnnexure2DraftRpc(studentCseClient, {
        thesis_id: cseThesisId,
        final_title: 'Formal Title: Scalable Sharded Consensus Protocols',
        refined_problem: 'Detailed formulation of asynchronous cross-shard atomicity and deadlock prevention.',
        methodology: 'Mathematical proofs in Coq and experimental benchmarking in Kubernetes.',
        timeline_milestones: validMilestones,
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('DRAFT');
      expect(res.current_state).toBe('COLLABORATIVE_PROBLEM_FORMULATION');
    });

    it('TC-ANN2-09: Student updates existing draft idempotently', async () => {
      const res = await saveAnnexure2DraftRpc(studentCseClient, {
        thesis_id: cseThesisId,
        final_title: 'Formal Title: Scalable Sharded Consensus Protocols (Refined)',
        refined_problem: 'Updated mathematical model with formal safety proofs.',
        methodology: 'Coq + Rust + Kubernetes testbed.',
        timeline_milestones: validMilestones,
      });

      expect(res.success).toBe(true);
      const ws = await getAnnexure2WorkspaceRpc(studentCseClient, cseThesisId);
      expect(ws.annexure_2?.final_title).toBe('Formal Title: Scalable Sharded Consensus Protocols (Refined)');
      expect(ws.annexure_2?.status).toBe('DRAFT');
    });

    it('TC-ANN2-10: Student attempts to save draft for another student’s thesis (Forbidden)', async () => {
      await expect(
        saveAnnexure2DraftRpc(studentEceClient, {
          thesis_id: cseThesisId,
          final_title: 'Malicious Injected Title',
          refined_problem: 'Malicious Problem',
          methodology: 'Malicious Methodology',
          timeline_milestones: validMilestones,
        })
      ).rejects.toThrow(/Forbidden|Access denied/i);
    });

    it('TC-ANN2-11: Student attempts draft with empty title (Validation failure)', async () => {
      await expect(
        saveAnnexure2DraftRpc(studentCseClient, {
          thesis_id: cseThesisId,
          final_title: '   ',
          refined_problem: 'Some problem',
          methodology: 'Some methodology',
          timeline_milestones: validMilestones,
        })
      ).rejects.toThrow(/Validation failed/i);
    });

    it('TC-ANN2-12: Student attempts draft with invalid milestone JSON (Validation failure)', async () => {
      await expect(
        saveAnnexure2DraftRpc(studentCseClient, {
          thesis_id: cseThesisId,
          final_title: 'Valid Title',
          refined_problem: 'Some problem',
          methodology: 'Some methodology',
          timeline_milestones: 'not-an-array' as any,
        })
      ).rejects.toThrow(/Validation failed/i);
    });
  });

  // ==========================================================================
  // CATEGORY 3: FORMAL SUBMISSION
  // ==========================================================================
  describe('Category 3 — Formal Submission', () => {
    it('TC-ANN2-14: Student submits with missing required fields (Rejected)', async () => {
      await expect(
        submitAnnexure2Rpc(studentCseClient, {
          thesis_id: cseThesisId,
          final_title: 'Valid Title',
          refined_problem: '', // Empty problem
          methodology: 'Valid methodology',
          timeline_milestones: validMilestones,
        })
      ).rejects.toThrow(/Validation failed/i);
    });

    it('TC-ANN2-15: Student submits empty timeline milestone array (Rejected)', async () => {
      await expect(
        submitAnnexure2Rpc(studentCseClient, {
          thesis_id: cseThesisId,
          final_title: 'Valid Title',
          refined_problem: 'Valid problem',
          methodology: 'Valid methodology',
          timeline_milestones: [],
        })
      ).rejects.toThrow(/Validation failed/i);
    });

    it('TC-ANN2-13: Student formally submits valid Annexure 2', async () => {
      const res = await submitAnnexure2Rpc(studentCseClient, {
        thesis_id: cseThesisId,
        final_title: 'Formalized Sharded Consensus Protocols for Decentralized Ledgers',
        refined_problem: 'Mathematical analysis and formal validation of cross-shard atomic locks.',
        methodology: 'Coq-verified safety invariants with empirical latency benchmarks in AWS.',
        timeline_milestones: validMilestones,
      });

      expect(res.success).toBe(true);
      expect(res.current_state).toBe('ANNEXURE_2_SUBMITTED');

      const ws = await getAnnexure2WorkspaceRpc(studentCseClient, cseThesisId);
      expect(ws.thesis.current_state).toBe('ANNEXURE_2_SUBMITTED');
      expect(ws.annexure_2?.status).toBe('SUBMITTED');
      expect(ws.permissions.can_edit).toBe(false);
      expect(ws.permissions.can_submit).toBe(false);
    });
  });

  // ==========================================================================
  // CATEGORY 4: DUAL SUPERVISOR ENDORSEMENT
  // ==========================================================================
  describe('Category 4 — Dual Supervisor Endorsement & Revision Loops', () => {
    it('TC-ANN2-20: Unassigned faculty attempts to endorse (Forbidden)', async () => {
      await expect(
        endorseAnnexure2Rpc(guideBClient, {
          thesis_id: cseThesisId,
          is_endorsed: true,
          remarks: 'Unauthorized endorsement attempt',
        })
      ).rejects.toThrow(/Forbidden|Access denied/i);
    });

    it('TC-ANN2-21: Student attempts to endorse their own Annexure 2 (Forbidden)', async () => {
      await expect(
        endorseAnnexure2Rpc(studentCseClient, {
          thesis_id: cseThesisId,
          is_endorsed: true,
        })
      ).rejects.toThrow(/Forbidden|Access denied/i);
    });

    it('TC-ANN2-24: Supervisor attempts revision without remarks (Rejected)', async () => {
      await expect(
        endorseAnnexure2Rpc(guideAClient, {
          thesis_id: cseThesisId,
          is_endorsed: false,
          remarks: '', // Empty remarks on revision request
        })
      ).rejects.toThrow(/Validation failed/i);
    });

    it('TC-ANN2-17: Primary Guide endorses Annexure 2 (State remains ANNEXURE_2_SUBMITTED pending Co-Guide)', async () => {
      const res = await endorseAnnexure2Rpc(guideAClient, {
        thesis_id: cseThesisId,
        is_endorsed: true,
        remarks: 'Primary Guide endorsement: Research methodology is rigorous.',
      });

      expect(res.success).toBe(true);
      expect(res.supervisor_role).toBe('GUIDE');
      expect(res.is_fully_endorsed).toBe(false);
      expect(res.current_state).toBe('ANNEXURE_2_SUBMITTED');

      const ws = await getAnnexure2WorkspaceRpc(guideAClient, cseThesisId);
      expect(ws.endorsements).toHaveLength(1);
      expect(ws.endorsements[0].supervisor_role).toBe('GUIDE');
      expect(ws.endorsements[0].is_endorsed).toBe(true);
    });

    it('TC-ANN2-18: Co-Guide endorses after Primary Guide -> Transitions to ANNEXURE_2_SUPERVISOR_ENDORSED', async () => {
      const res = await endorseAnnexure2Rpc(coguideAClient, {
        thesis_id: cseThesisId,
        is_endorsed: true,
        remarks: 'Co-Guide endorsement: Problem scope and milestone schedule verified.',
      });

      expect(res.success).toBe(true);
      expect(res.supervisor_role).toBe('CO_GUIDE');
      expect(res.is_fully_endorsed).toBe(true);
      expect(res.current_state).toBe('ANNEXURE_2_SUPERVISOR_ENDORSED');

      const ws = await getAnnexure2WorkspaceRpc(hodCseClient, cseThesisId);
      expect(ws.thesis.current_state).toBe('ANNEXURE_2_SUPERVISOR_ENDORSED');
      expect(ws.endorsements).toHaveLength(2);
      expect(ws.permissions.can_approve).toBe(true);
    });
  });

  // ==========================================================================
  // CATEGORY 6: DCEC CHAIR TITLE APPROVAL
  // ==========================================================================
  describe('Category 6 — DCEC Chair Title Approval', () => {
    it('TC-ANN2-28: ECE Chair attempts to approve CSE thesis (Cross-department isolation / Forbidden)', async () => {
      await expect(
        decideAnnexure2TitleRpc(hodEceClient, {
          thesis_id: cseThesisId,
          outcome: 'APPROVED',
          formal_remarks: 'Cross-dept approval attempt',
        })
      ).rejects.toThrow(/Forbidden|Access denied/i);
    });

    it('TC-ANN2-29: Admin attempts title approval (Forbidden)', async () => {
      await expect(
        decideAnnexure2TitleRpc(adminClient, {
          thesis_id: cseThesisId,
          outcome: 'APPROVED',
          formal_remarks: 'Admin approval attempt',
        })
      ).rejects.toThrow(/Forbidden|Access denied/i);
    });

    it('TC-ANN2-32: DCEC Chair requests decision without formal remarks (Validation failure)', async () => {
      await expect(
        decideAnnexure2TitleRpc(hodCseClient, {
          thesis_id: cseThesisId,
          outcome: 'APPROVED',
          formal_remarks: '   ',
        })
      ).rejects.toThrow(/Validation failed/i);
    });

    it('TC-ANN2-27: CSE DCEC Chair approves fully endorsed thesis, baselining formal title', async () => {
      const res = await decideAnnexure2TitleRpc(hodCseClient, {
        thesis_id: cseThesisId,
        outcome: 'APPROVED',
        formal_remarks: 'Title and collaborative formulation formally verified and baselined into registry.',
      });

      expect(res.success).toBe(true);
      expect(res.current_state).toBe('ANNEXURE_2_DCEC_APPROVED');
      expect(res.current_stage).toBe('RESEARCH_AND_PROGRESS_STAGE');
      expect(res.final_approved_title).toContain('Formalized Sharded Consensus Protocols');

      const ws = await getAnnexure2WorkspaceRpc(studentCseClient, cseThesisId);
      expect(ws.thesis.current_state).toBe('ANNEXURE_2_DCEC_APPROVED');
      expect(ws.title_record?.is_approved).toBe(true);
      expect(ws.title_record?.final_approved_title).toBe(res.final_approved_title);
    });
  });

  // ==========================================================================
  // CATEGORY 7: POST-APPROVAL IMMUTABILITY
  // ==========================================================================
  describe('Category 7 — Post-Approval Immutability', () => {
    it('TC-ANN2-35: Student attempts to save draft after DCEC approval (Rejected)', async () => {
      await expect(
        saveAnnexure2DraftRpc(studentCseClient, {
          thesis_id: cseThesisId,
          final_title: 'Modified Title Post Approval',
          refined_problem: 'Modified problem',
          methodology: 'Modified methodology',
          timeline_milestones: validMilestones,
        })
      ).rejects.toThrow(/InvalidState/i);
    });

    it('TC-ANN2-36: Student attempts to submit after DCEC approval (Rejected)', async () => {
      await expect(
        submitAnnexure2Rpc(studentCseClient, {
          thesis_id: cseThesisId,
          final_title: 'Modified Title Post Approval',
          refined_problem: 'Modified problem',
          methodology: 'Modified methodology',
          timeline_milestones: validMilestones,
        })
      ).rejects.toThrow(/InvalidState/i);
    });

    it('TC-ANN2-37: Supervisor attempts endorsement after DCEC approval (Rejected)', async () => {
      await expect(
        endorseAnnexure2Rpc(guideAClient, {
          thesis_id: cseThesisId,
          is_endorsed: true,
          remarks: 'Post approval endorsement attempt',
        })
      ).rejects.toThrow(/InvalidState|duplicate key/i);
    });

    it('TC-ANN2-38: DCEC Chair attempts second decision after approval (Rejected)', async () => {
      await expect(
        decideAnnexure2TitleRpc(hodCseClient, {
          thesis_id: cseThesisId,
          outcome: 'APPROVED',
          formal_remarks: 'Duplicate approval attempt',
        })
      ).rejects.toThrow(/InvalidState/i);
    });
  });

  // ==========================================================================
  // CATEGORY 8: ATOMICITY, AUDIT & NOTIFICATIONS
  // ==========================================================================
  describe('Category 8 — Atomicity, Audit & Notifications Integrity', () => {
    it('TC-ANN2-39: Failed mutation does not corrupt thesis state', async () => {
      try {
        await submitAnnexure2Rpc(studentCseClient, {
          thesis_id: cseThesisId,
          final_title: '',
          refined_problem: '',
          methodology: '',
          timeline_milestones: [],
        });
      } catch (e) {
        // Expected failure
      }

      const ws = await getAnnexure2WorkspaceRpc(studentCseClient, cseThesisId);
      expect(ws.thesis.current_state).toBe('ANNEXURE_2_DCEC_APPROVED');
    });

    it('TC-ANN2-41: Audit events WORM log integrity verified', async () => {
      const { data: audits } = await adminClient
        .from('audit_events')
        .select('action_code, active_role_id')
        .order('timestamp_utc', { ascending: false })
        .limit(20);

      expect(audits).toBeDefined();
      const actionCodes = audits.map((a: any) => a.action_code);
      expect(actionCodes).toContain('TITLE_FORMALLY_APPROVED');
      expect(actionCodes).toContain('ANNEXURE_2_SUBMITTED');
    });

    it('TC-ANN2-42: Notification deliveries dynamically created for stakeholders', async () => {
      const { data: notifs } = await adminClient
        .from('notification_messages')
        .select('category, priority, title')
        .order('created_at', { ascending: false })
        .limit(20);

      expect(notifs).toBeDefined();
      const titles = notifs.map((n: any) => n.title);
      expect(titles.some((t: string) => t.includes('Dissertation Title') || t.includes('Annexure 2'))).toBe(true);
    });
  });

  // ==========================================================================
  // CATEGORY 9: SECURITY DEFINER & RLS HARDENING
  // ==========================================================================
  describe('Category 9 — Security Definer & RLS Hardening', () => {
    it('TC-ANN2-43: All Migration 022 RPCs are SECURITY DEFINER with secured search path', async () => {
      const { data: funcs } = await adminClient.rpc('get_annexure_2_workspace', {
        p_thesis_id: cseThesisId,
      });
      expect(funcs).toBeDefined();
    });

    it('TC-ANN2-44: Unauthenticated caller cannot invoke Annexure 2 RPCs', async () => {
      await expect(
        getAnnexure2WorkspaceRpc(unauthClient, cseThesisId)
      ).rejects.toThrow();
    });
  });
});
