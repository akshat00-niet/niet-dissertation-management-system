import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getPersonaByKey } from '@/lib/auth/personas';
import {
  getDCScreeningQueue,
  getDCECScreeningQueue,
  verifyAndForwardDcecDocketRpc,
  recordDcecScreeningDecisionRpc,
  createDcecDelegationRpc,
} from '@/lib/dal/dcec.dal';
import {
  submitAnnexure1Rpc,
  saveAnnexure1DraftRpc,
  getAnnexure1ByThesisId,
} from '@/lib/dal/annexures.dal';
import { getStudentActiveThesis } from '@/lib/dal/theses.dal';
import { listDepartmentFacultyForPreferences } from '@/lib/dal/faculty.dal';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM0MTI4MDB9.dummy';
const DEV_PASSWORD = process.env.DEV_AUTH_PASSWORD || 'LocalDevPassword123!';

describe('Phase 5G — DC Screening & DCEC Chair Decision Workflow Security & Integration Suite', () => {
  let dcCseClient: any;
  let dcEceClient: any;
  let hodCseClient: any;
  let dhodCseClient: any;
  let studentCseClient: any;
  let guideAClient: any;
  let adminClient: any;
  let unauthClient: any;

  let studentCseThesisId: string;
  let studentCseDeptId: string;
  let cseFacultyIds: string[] = [];
  let testDocketId: string;

  beforeAll(async () => {
    // 1. Authenticate DC_CSE
    const dcCsePersona = getPersonaByKey('DC_CSE')!;
    const c1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a1 } = await c1.auth.signInWithPassword({ email: dcCsePersona.email, password: DEV_PASSWORD });
    dcCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a1.session?.access_token}` } },
    });

    // 2. Authenticate DC_ECE
    const dcEcePersona = getPersonaByKey('DC_ECE')!;
    const c2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a2 } = await c2.auth.signInWithPassword({ email: dcEcePersona.email, password: DEV_PASSWORD });
    dcEceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a2.session?.access_token}` } },
    });

    // 3. Authenticate HOD_CSE
    const hodCsePersona = getPersonaByKey('HOD_CSE')!;
    const c3 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a3 } = await c3.auth.signInWithPassword({ email: hodCsePersona.email, password: DEV_PASSWORD });
    hodCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a3.session?.access_token}` } },
    });

    // 4. Authenticate DHOD_CSE
    const dhodCsePersona = getPersonaByKey('DHOD_CSE')!;
    const c4 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a4 } = await c4.auth.signInWithPassword({ email: dhodCsePersona.email, password: DEV_PASSWORD });
    dhodCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a4.session?.access_token}` } },
    });

    // 5. Authenticate STUDENT_CSE
    const studentCsePersona = getPersonaByKey('STUDENT_CSE')!;
    const c5 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a5 } = await c5.auth.signInWithPassword({ email: studentCsePersona.email, password: DEV_PASSWORD });
    studentCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a5.session?.access_token}` } },
    });

    // 6. Authenticate GUIDE_A
    const guideAPersona = getPersonaByKey('GUIDE_A')!;
    const c6 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a6 } = await c6.auth.signInWithPassword({ email: guideAPersona.email, password: DEV_PASSWORD });
    guideAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a6.session?.access_token}` } },
    });

    // 7. Authenticate ADMIN_USR
    const adminPersona = getPersonaByKey('ADMIN_USR')!;
    const c7 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a7 } = await c7.auth.signInWithPassword({ email: adminPersona.email, password: DEV_PASSWORD });
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a7.session?.access_token}` } },
    });

    // 8. Unauthenticated Client
    unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Resolve student thesis and department
    const thesis = await getStudentActiveThesis(studentCseClient, studentCsePersona.id);
    studentCseThesisId = thesis!.id;
    studentCseDeptId = thesis!.department_id;

    // Reset thesis and clear any unrevoked delegations to start with a clean baseline
    await studentCseClient.rpc('reset_thesis_for_testing', { p_thesis_id: studentCseThesisId });
    await hodCseClient.from('dcec_delegations').update({ is_revoked: true }).eq('department_id', studentCseDeptId);

    const faculty = await listDepartmentFacultyForPreferences(studentCseClient, studentCseDeptId);
    cseFacultyIds = faculty.map((f) => f.user_id);

    await submitAnnexure1Rpc(studentCseClient, studentCseThesisId, {
      proposed_title: 'Automated Formal Verification of Distributed Smart Contracts',
      broad_domain: 'Distributed Systems & Security',
      problem_statement: 'Vulnerabilities in complex smart contract state transitions lead to fund loss.',
      expected_outcomes: 'Symbolic execution framework and automated theorem proving toolchain.',
      preferences: [
        { faculty_id: cseFacultyIds[0], preference_rank: 1 },
        { faculty_id: cseFacultyIds[1], preference_rank: 2 },
        { faculty_id: cseFacultyIds[2], preference_rank: 3 },
        { faculty_id: cseFacultyIds[3], preference_rank: 4 },
      ],
    });
  });

  afterAll(async () => {
    // Restore seeded state for downstream tests and revoke temporary delegations
    if (studentCseClient) {
      await studentCseClient.rpc('restore_thesis_a_seed');
    }
    if (hodCseClient && studentCseDeptId) {
      await hodCseClient.from('dcec_delegations').update({ is_revoked: true }).eq('department_id', studentCseDeptId);
    }
  });

  describe('1. Department Coordinator (DC) Screening Queue & Isolation', () => {
    it('TC-1: DC sees own department queue containing submitted thesis', async () => {
      const queue = await getDCScreeningQueue(dcCseClient);
      expect(queue.length).toBeGreaterThanOrEqual(1);

      const item = queue.find((q) => q.thesis_id === studentCseThesisId);
      expect(item).toBeDefined();
      expect(item?.tracking_number).toBe('NIET-DIS-CSE-2025-001');
      expect(item?.current_state).toBe('ANNEXURE_1_SUBMITTED');
    });

    it('TC-2: DC cannot see another department queue (Cross-department isolation)', async () => {
      const eceQueue = await getDCScreeningQueue(dcEceClient);
      const cseItemInEce = eceQueue.find((q) => q.thesis_id === studentCseThesisId);
      expect(cseItemInEce).toBeUndefined();
    });

    it('TC-3: Student cannot access get_dc_screening_queue RPC -> DENIED', async () => {
      await expect(getDCScreeningQueue(studentCseClient)).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-4: Unauthenticated caller cannot access get_dc_screening_queue RPC -> DENIED', async () => {
      await expect(getDCScreeningQueue(unauthClient)).rejects.toThrow();
    });
  });

  describe('2. DC Maker Verification & Docket Forwarding', () => {
    it('TC-5: Student cannot execute verify_and_forward_dcec_docket RPC -> DENIED', async () => {
      await expect(
        verifyAndForwardDcecDocketRpc(studentCseClient, {
          thesis_id: studentCseThesisId,
          is_eligible: true,
          documents_complete: true,
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-6: DC_ECE cannot verify CSE thesis (Cross-department verification blocked) -> DENIED', async () => {
      await expect(
        verifyAndForwardDcecDocketRpc(dcEceClient, {
          thesis_id: studentCseThesisId,
          is_eligible: true,
          documents_complete: true,
        })
      ).rejects.toThrow(/(Access denied|Forbidden|another department|permission)/i);
    });

    it('TC-7: DC_CSE verifies valid submitted thesis -> transitions to DCEC_SCREENING_QUEUE', async () => {
      const result = await verifyAndForwardDcecDocketRpc(dcCseClient, {
        thesis_id: studentCseThesisId,
        is_eligible: true,
        documents_complete: true,
        dc_verification_notes: 'All prerequisites verified and 4 preferences checked.',
      });

      expect(result.success).toBe(true);
      expect(result.docket_id).toBeDefined();
      expect(result.current_state).toBe('DCEC_SCREENING_QUEUE');
      testDocketId = result.docket_id;

      // Verify thesis state updated
      const thesis = await getStudentActiveThesis(studentCseClient, getPersonaByKey('STUDENT_CSE')!.id);
      expect(thesis?.current_state).toBe('DCEC_SCREENING_QUEUE');
    });

    it('TC-8: DC cannot verify a thesis that is not in ANNEXURE_1_SUBMITTED (Invalid state) -> DENIED', async () => {
      await expect(
        verifyAndForwardDcecDocketRpc(dcCseClient, {
          thesis_id: studentCseThesisId,
          is_eligible: true,
          documents_complete: true,
        })
      ).rejects.toThrow(/cannot be verified in state/i);
    });
  });

  describe('3. DCEC Review Queue & Academic Decision Authorization', () => {
    it('TC-9: HOD_CSE sees verified docket in DCEC screening queue', async () => {
      const queue = await getDCECScreeningQueue(hodCseClient);
      expect(queue.length).toBeGreaterThanOrEqual(1);

      const item = queue.find((q) => q.docket_id === testDocketId);
      expect(item).toBeDefined();
      expect(item?.tracking_number).toBe('NIET-DIS-CSE-2025-001');
      expect(item?.is_eligible).toBe(true);
      expect(item?.documents_complete).toBe(true);
      expect(item?.current_state).toBe('DCEC_SCREENING_QUEUE');
    });

    it('TC-10: DC attempts executing record_dcec_screening_decision (Maker-Checker violation) -> DENIED', async () => {
      await expect(
        recordDcecScreeningDecisionRpc(dcCseClient, {
          docket_id: testDocketId,
          outcome: 'APPROVED',
          formal_remarks: 'DC attempting approval',
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-11: Student attempts executing record_dcec_screening_decision -> DENIED', async () => {
      await expect(
        recordDcecScreeningDecisionRpc(studentCseClient, {
          docket_id: testDocketId,
          outcome: 'APPROVED',
          formal_remarks: 'Student attempting self approval',
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-12: Guide_A attempts executing record_dcec_screening_decision -> DENIED', async () => {
      await expect(
        recordDcecScreeningDecisionRpc(guideAClient, {
          docket_id: testDocketId,
          outcome: 'APPROVED',
          formal_remarks: 'Guide attempting decision',
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-13: Admin attempts executing record_dcec_screening_decision (Admin ≠ Chair) -> DENIED', async () => {
      await expect(
        recordDcecScreeningDecisionRpc(adminClient, {
          docket_id: testDocketId,
          outcome: 'APPROVED',
          formal_remarks: 'Admin attempting academic decision',
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-14: D.HOD without active delegation attempts deciding -> DENIED', async () => {
      await expect(
        recordDcecScreeningDecisionRpc(dhodCseClient, {
          docket_id: testDocketId,
          outcome: 'APPROVED',
          formal_remarks: 'D.HOD attempting decision without delegation',
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-15: Decision with empty formal remarks is rejected -> DENIED', async () => {
      await expect(
        recordDcecScreeningDecisionRpc(hodCseClient, {
          docket_id: testDocketId,
          outcome: 'APPROVED',
          formal_remarks: '',
        })
      ).rejects.toThrow(/Formal remarks are mandatory/i);
    });

    it('TC-16: Decision with invalid outcome string is rejected -> DENIED', async () => {
      await expect(
        recordDcecScreeningDecisionRpc(hodCseClient, {
          docket_id: testDocketId,
          outcome: 'INVALID_OUTCOME' as any,
          formal_remarks: 'Invalid outcome test',
        })
      ).rejects.toThrow(/Invalid DCEC screening outcome/i);
    });
  });

  describe('4. HOD DCEC Chair Binding Decision & State Transitions', () => {
    it('TC-17: HOD_CSE records binding APPROVED decision -> transitions to APPROVED_FOR_ALLOCATION', async () => {
      const result = await recordDcecScreeningDecisionRpc(hodCseClient, {
        docket_id: testDocketId,
        outcome: 'APPROVED',
        formal_remarks: 'Proposal is academically rigorous and addresses significant distributed systems challenges.',
      });

      expect(result.success).toBe(true);
      expect(result.outcome).toBe('APPROVED');
      expect(result.current_state).toBe('APPROVED_FOR_ALLOCATION');
      expect(result.current_stage).toBe('ALLOCATION_STAGE');

      // Verify thesis state updated in DB
      const thesis = await getStudentActiveThesis(studentCseClient, getPersonaByKey('STUDENT_CSE')!.id);
      expect(thesis?.current_state).toBe('APPROVED_FOR_ALLOCATION');
      expect(thesis?.current_stage).toBe('ALLOCATION_STAGE');

      // Verify audit event recorded
      const { data: auditData } = await hodCseClient
        .from('audit_events')
        .select('*')
        .eq('action_code', 'DCEC_DECISION_RECORDED')
        .eq('target_entity_id', result.decision_id);

      expect(auditData).toBeDefined();
      expect(auditData.length).toBeGreaterThanOrEqual(1);
      expect(auditData[0].actor_user_id).toBe(getPersonaByKey('HOD_CSE')!.id);
      expect(auditData[0].active_role_id).toBe('HOD');
    });

    it('TC-18: Replay / duplicate decision on already decided docket -> DENIED', async () => {
      await expect(
        recordDcecScreeningDecisionRpc(hodCseClient, {
          docket_id: testDocketId,
          outcome: 'APPROVED',
          formal_remarks: 'Duplicate decision attempt',
        })
      ).rejects.toThrow();
    });
  });

  describe('5. DCEC Chair Delegation to D.HOD & Delegated Decisions', () => {
    it('TC-19: HOD_CSE creates active Chair delegation for DHOD_CSE', async () => {
      const now = new Date();
      const future = new Date(Date.now() + 3600 * 1000 * 24 * 7); // 7 days

      const res = await createDcecDelegationRpc(hodCseClient, {
        department_id: studentCseDeptId,
        dhod_user_id: getPersonaByKey('DHOD_CSE')!.id,
        effective_from: now.toISOString(),
        effective_until: future.toISOString(),
        delegation_reason: 'HOD conference travel coverage.',
      });

      expect(res.success).toBe(true);
      expect(res.delegation_id).toBeDefined();
    });

    it('TC-20: Admin or DC cannot create DCEC Chair delegation -> DENIED', async () => {
      const now = new Date();
      const future = new Date(Date.now() + 3600 * 1000);

      await expect(
        createDcecDelegationRpc(adminClient, {
          department_id: studentCseDeptId,
          dhod_user_id: getPersonaByKey('DHOD_CSE')!.id,
          effective_from: now.toISOString(),
          effective_until: future.toISOString(),
          delegation_reason: 'Admin attempting delegation',
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);

      await expect(
        createDcecDelegationRpc(dcCseClient, {
          department_id: studentCseDeptId,
          dhod_user_id: getPersonaByKey('DHOD_CSE')!.id,
          effective_from: now.toISOString(),
          effective_until: future.toISOString(),
          delegation_reason: 'DC attempting delegation',
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-21: Delegated DHOD_CSE successfully records decision on new docket', async () => {
      // 1. Reset thesis to DRAFT_PROPOSAL
      await studentCseClient.rpc('reset_thesis_for_testing', { p_thesis_id: studentCseThesisId });

      // 2. Submit Annexure 1
      await submitAnnexure1Rpc(studentCseClient, studentCseThesisId, {
        proposed_title: 'Delegated Decision Test: Scalable Consensus for Blockchains',
        broad_domain: 'Distributed Systems',
        problem_statement: 'High latency in Byzantine Fault Tolerant consensus algorithms.',
        expected_outcomes: 'Optimistic asynchronous pipelining algorithm and benchmarks.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      });

      // 3. DC verifies
      const vRes = await verifyAndForwardDcecDocketRpc(dcCseClient, {
        thesis_id: studentCseThesisId,
        is_eligible: true,
        documents_complete: true,
      });

      // 4. Delegated DHOD records decision
      const dRes = await recordDcecScreeningDecisionRpc(dhodCseClient, {
        docket_id: vRes.docket_id,
        outcome: 'APPROVED',
        formal_remarks: 'Approved by Deputy HOD under active departmental delegation.',
      });

      expect(dRes.success).toBe(true);
      expect(dRes.outcome).toBe('APPROVED');
      expect(dRes.current_state).toBe('APPROVED_FOR_ALLOCATION');
    });
  });

  describe('6. Revision and Terminal Rejection Workflows', () => {
    it('TC-22: DCEC Chair requests revision -> transitions to ANNEXURE_1_REVISION & candidate can resubmit', async () => {
      // 1. Reset thesis
      await studentCseClient.rpc('reset_thesis_for_testing', { p_thesis_id: studentCseThesisId });

      // 2. Submit Annexure 1
      await submitAnnexure1Rpc(studentCseClient, studentCseThesisId, {
        proposed_title: 'Revision Test Proposal: Edge Computing Frameworks',
        broad_domain: 'Edge Computing',
        problem_statement: 'Resource constraints on edge devices require specialized orchestration.',
        expected_outcomes: 'Lightweight container runtime and benchmark reports.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      });

      // 3. DC verifies
      const vRes = await verifyAndForwardDcecDocketRpc(dcCseClient, {
        thesis_id: studentCseThesisId,
        is_eligible: true,
        documents_complete: true,
      });

      // 4. Chair requests revision
      const revRes = await recordDcecScreeningDecisionRpc(hodCseClient, {
        docket_id: vRes.docket_id,
        outcome: 'REVISION_REQUIRED',
        formal_remarks: 'Please narrow the benchmark methodology and clarify edge device hardware specs.',
      });

      expect(revRes.success).toBe(true);
      expect(revRes.outcome).toBe('REVISION_REQUIRED');
      expect(revRes.current_state).toBe('ANNEXURE_1_REVISION');

      // 5. Candidate edits and saves draft in revision state
      const draftRes = await saveAnnexure1DraftRpc(studentCseClient, studentCseThesisId, {
        proposed_title: 'Revised: Edge Computing Frameworks with Benchmarks',
        broad_domain: 'Edge Computing',
        problem_statement: 'Revised problem statement with clarified hardware specifications.',
        expected_outcomes: 'Revised outcomes and prototype benchmarks.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      });
      expect(draftRes.success).toBe(true);

      // 6. Candidate resubmits
      const resubRes = await submitAnnexure1Rpc(studentCseClient, studentCseThesisId, {
        proposed_title: 'Revised: Edge Computing Frameworks with Benchmarks',
        broad_domain: 'Edge Computing',
        problem_statement: 'Revised problem statement with clarified hardware specifications in detail.',
        expected_outcomes: 'Revised outcomes and prototype benchmarks.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      });
      expect(resubRes.success).toBe(true);
      expect(resubRes.current_state).toBe('ANNEXURE_1_SUBMITTED');
    });

    it('TC-23: DCEC Chair rejects proposal -> transitions to PROPOSAL_REJECTED_TERMINAL', async () => {
      // 1. DC verifies the resubmitted proposal
      const vRes = await verifyAndForwardDcecDocketRpc(dcCseClient, {
        thesis_id: studentCseThesisId,
        is_eligible: true,
        documents_complete: true,
      });

      // 2. Chair rejects proposal
      const rejRes = await recordDcecScreeningDecisionRpc(hodCseClient, {
        docket_id: vRes.docket_id,
        outcome: 'REJECTED',
        formal_remarks: 'Proposal does not meet academic research criteria for M.Tech dissertation.',
      });

      expect(rejRes.success).toBe(true);
      expect(rejRes.outcome).toBe('REJECTED');
      expect(rejRes.current_state).toBe('PROPOSAL_REJECTED_TERMINAL');

      // 3. Verify proposal status updated
      const prop = await getAnnexure1ByThesisId(studentCseClient, studentCseThesisId);
      expect(prop?.status).toBe('REJECTED');
    });
  });
});
