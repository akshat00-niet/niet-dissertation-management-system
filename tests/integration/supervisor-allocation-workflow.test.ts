import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getPersonaByKey } from '@/lib/auth/personas';
import {
  getDhodAllocationQueue,
  getDepartmentFacultyAllocOptions,
  allocateThesisSupervisorsRpc,
  reallocateThesisSupervisorsRpc,
} from '@/lib/dal/allocation.dal';
import {
  submitAnnexure1Rpc,
} from '@/lib/dal/annexures.dal';
import {
  verifyAndForwardDcecDocketRpc,
  recordDcecScreeningDecisionRpc,
} from '@/lib/dal/dcec.dal';
import { getStudentActiveThesis } from '@/lib/dal/theses.dal';
import { listDepartmentFacultyForPreferences } from '@/lib/dal/faculty.dal';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM0MTI4MDB9.dummy';
const DEV_PASSWORD = process.env.DEV_AUTH_PASSWORD || 'LocalDevPassword123!';

describe('Phase 5H — D.HOD Supervisor Allocation & Capacity Security & Integration Suite', () => {
  let dhodCseClient: any;
  let hodCseClient: any;
  let dcCseClient: any;
  let studentCseClient: any;
  let guideAClient: any;
  let adminClient: any;
  let dcEceClient: any;
  let unauthClient: any;

  let studentCseThesisId: string;
  let studentCseDeptId: string;
  let cseFacultyIds: string[] = [];
  let allocatedResult: any;

  beforeAll(async () => {
    // 1. Authenticate DHOD_CSE
    const dhodCsePersona = getPersonaByKey('DHOD_CSE')!;
    const c1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a1 } = await c1.auth.signInWithPassword({ email: dhodCsePersona.email, password: DEV_PASSWORD });
    dhodCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a1.session?.access_token}` } },
    });

    // 2. Authenticate HOD_CSE
    const hodCsePersona = getPersonaByKey('HOD_CSE')!;
    const c2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a2 } = await c2.auth.signInWithPassword({ email: hodCsePersona.email, password: DEV_PASSWORD });
    hodCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a2.session?.access_token}` } },
    });

    // 3. Authenticate DC_CSE
    const dcCsePersona = getPersonaByKey('DC_CSE')!;
    const c3 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a3 } = await c3.auth.signInWithPassword({ email: dcCsePersona.email, password: DEV_PASSWORD });
    dcCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a3.session?.access_token}` } },
    });

    // 4. Authenticate STUDENT_CSE
    const studentCsePersona = getPersonaByKey('STUDENT_CSE')!;
    const c4 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a4 } = await c4.auth.signInWithPassword({ email: studentCsePersona.email, password: DEV_PASSWORD });
    studentCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a4.session?.access_token}` } },
    });

    // 5. Authenticate GUIDE_A
    const guideAPersona = getPersonaByKey('GUIDE_A')!;
    const c5 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a5 } = await c5.auth.signInWithPassword({ email: guideAPersona.email, password: DEV_PASSWORD });
    guideAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a5.session?.access_token}` } },
    });

    // 6. Authenticate ADMIN_USR
    const adminPersona = getPersonaByKey('ADMIN_USR')!;
    const c6 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a6 } = await c6.auth.signInWithPassword({ email: adminPersona.email, password: DEV_PASSWORD });
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a6.session?.access_token}` } },
    });

    // 7. Authenticate DC_ECE
    const dcEcePersona = getPersonaByKey('DC_ECE')!;
    const c7 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a7 } = await c7.auth.signInWithPassword({ email: dcEcePersona.email, password: DEV_PASSWORD });
    dcEceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a7.session?.access_token}` } },
    });

    // 8. Unauthenticated Client
    unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Resolve student thesis and department
    const thesis = await getStudentActiveThesis(studentCseClient, studentCsePersona.id);
    studentCseThesisId = thesis!.id;
    studentCseDeptId = thesis!.department_id;

    // Fetch department faculty IDs
    const faculty = await listDepartmentFacultyForPreferences(studentCseClient, studentCseDeptId);
    cseFacultyIds = faculty.map((f) => f.user_id);

    // Setup: Advance Thesis A from DRAFT -> SUBMITTED -> DC_VERIFIED -> DCEC_APPROVED -> APPROVED_FOR_ALLOCATION
    await studentCseClient.rpc('reset_thesis_for_testing', { p_thesis_id: studentCseThesisId });
    await adminClient.from('faculty_profiles').update({ active_guide_load: 0, active_coguide_load: 0 }).eq('department_id', studentCseDeptId);

    await submitAnnexure1Rpc(studentCseClient, studentCseThesisId, {
      proposed_title: 'Scalable Consensus Protocols for Cross-Chain Decentralized Finance',
      broad_domain: 'Distributed Systems',
      problem_statement: 'High latency in atomic cross-chain settlements.',
      expected_outcomes: 'Optimized asynchronous commit protocol with mathematical proof.',
      preferences: [
        { faculty_id: cseFacultyIds[0], preference_rank: 1 },
        { faculty_id: cseFacultyIds[1], preference_rank: 2 },
        { faculty_id: cseFacultyIds[2], preference_rank: 3 },
        { faculty_id: cseFacultyIds[3], preference_rank: 4 },
      ],
    });

    const vRes = await verifyAndForwardDcecDocketRpc(dcCseClient, {
      thesis_id: studentCseThesisId,
      is_eligible: true,
      documents_complete: true,
      dc_verification_notes: 'Prerequisites cleared.',
    });

    await recordDcecScreeningDecisionRpc(hodCseClient, {
      docket_id: vRes.docket_id,
      outcome: 'APPROVED',
      formal_remarks: 'Proposal approved by DCEC Chair. Approved for supervisor allocation.',
    });
  });

  afterAll(async () => {
    // Restore seeded state for downstream test suites
    if (studentCseClient) {
      await studentCseClient.rpc('restore_thesis_a_seed');
    }
    if (adminClient && studentCseDeptId) {
      await adminClient.from('faculty_profiles').update({ active_guide_load: 0, active_coguide_load: 0 }).eq('department_id', studentCseDeptId);
    }
  });

  describe('1. D.HOD Allocation Queue & Visibility Scope', () => {
    it('TC-1: DHOD_CSE views allocation queue containing thesis in APPROVED_FOR_ALLOCATION', async () => {
      const queue = await getDhodAllocationQueue(dhodCseClient);
      expect(queue.length).toBeGreaterThanOrEqual(1);

      const item = queue.find((q) => q.thesis_id === studentCseThesisId);
      expect(item).toBeDefined();
      expect(item?.tracking_number).toBe('NIET-DIS-CSE-2025-001');
      expect(item?.current_state).toBe('APPROVED_FOR_ALLOCATION');
      expect(item?.student_preferences.length).toBe(4);
      expect(item?.student_preferences[0].preference_rank).toBe(1);
    });

    it('TC-2: DHOD_CSE fetches department faculty allocation options with live load counters', async () => {
      const options = await getDepartmentFacultyAllocOptions(dhodCseClient);
      expect(options.length).toBeGreaterThanOrEqual(4);

      for (const opt of options) {
        expect(opt.active_guide_load).toBeGreaterThanOrEqual(0);
        expect(opt.active_guide_load).toBeLessThanOrEqual(3);
        expect(opt.active_coguide_load).toBeGreaterThanOrEqual(0);
        expect(opt.active_coguide_load).toBeLessThanOrEqual(3);
      }
    });

    it('TC-3: Student cannot access get_dhod_allocation_queue RPC -> DENIED', async () => {
      await expect(getDhodAllocationQueue(studentCseClient)).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-4: DC cannot access get_dhod_allocation_queue RPC -> DENIED', async () => {
      await expect(getDhodAllocationQueue(dcCseClient)).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-5: Admin cannot access get_dhod_allocation_queue RPC -> DENIED', async () => {
      await expect(getDhodAllocationQueue(adminClient)).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });
  });

  describe('2. Negative Authorization & Invariant Violations on Initial Allocation', () => {
    it('TC-6: Student attempts executing allocate_thesis_supervisors -> DENIED', async () => {
      await expect(
        allocateThesisSupervisorsRpc(studentCseClient, {
          thesis_id: studentCseThesisId,
          guide_id: cseFacultyIds[0],
          co_guide_id: cseFacultyIds[1],
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-7: DC attempts executing allocate_thesis_supervisors -> DENIED', async () => {
      await expect(
        allocateThesisSupervisorsRpc(dcCseClient, {
          thesis_id: studentCseThesisId,
          guide_id: cseFacultyIds[0],
          co_guide_id: cseFacultyIds[1],
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-8: HOD attempts executing allocate_thesis_supervisors (D.HOD sole allocator) -> DENIED', async () => {
      await expect(
        allocateThesisSupervisorsRpc(hodCseClient, {
          thesis_id: studentCseThesisId,
          guide_id: cseFacultyIds[0],
          co_guide_id: cseFacultyIds[1],
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-9: Guide attempts executing allocate_thesis_supervisors -> DENIED', async () => {
      await expect(
        allocateThesisSupervisorsRpc(guideAClient, {
          thesis_id: studentCseThesisId,
          guide_id: cseFacultyIds[0],
          co_guide_id: cseFacultyIds[1],
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-10: Admin attempts executing allocate_thesis_supervisors (Admin ≠ Academic Allocator) -> DENIED', async () => {
      await expect(
        allocateThesisSupervisorsRpc(adminClient, {
          thesis_id: studentCseThesisId,
          guide_id: cseFacultyIds[0],
          co_guide_id: cseFacultyIds[1],
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-11: Attempting to assign same faculty as Guide and Co-Guide (Guide == Co-Guide) -> DENIED', async () => {
      await expect(
        allocateThesisSupervisorsRpc(dhodCseClient, {
          thesis_id: studentCseThesisId,
          guide_id: cseFacultyIds[0],
          co_guide_id: cseFacultyIds[0],
        })
      ).rejects.toThrow(/(IDENTICAL_SUPERVISORS|same faculty)/i);
    });

    it('TC-12: D.HOD attempts allocating for thesis in another department -> DENIED', async () => {
      // Create or locate an ECE thesis
      const { data: eceTheses } = await adminClient
        .from('theses')
        .select('id, department_id')
        .neq('department_id', studentCseDeptId)
        .limit(1);

      if (eceTheses && eceTheses.length > 0) {
        await expect(
          allocateThesisSupervisorsRpc(dhodCseClient, {
            thesis_id: eceTheses[0].id,
            guide_id: cseFacultyIds[0],
            co_guide_id: cseFacultyIds[1],
          })
        ).rejects.toThrow(/(another department|Forbidden)/i);
      }
    });
  });

  describe('3. D.HOD Initial Supervisor Allocation Happy Path & State Transitions', () => {
    it('TC-13: DHOD_CSE successfully allocates Guide (cseFacultyIds[0]) & Co-Guide (cseFacultyIds[1])', async () => {
      const res = await allocateThesisSupervisorsRpc(dhodCseClient, {
        thesis_id: studentCseThesisId,
        guide_id: cseFacultyIds[0],
        co_guide_id: cseFacultyIds[1],
      });

      expect(res.success).toBe(true);
      expect(res.allocation_id).toBeDefined();
      expect(res.current_state).toBe('SUPERVISORS_ALLOCATED');
      expect(res.current_stage).toBe('ALLOCATION_STAGE');
      allocatedResult = res;

      // Verify thesis state updated in database
      const thesis = await getStudentActiveThesis(studentCseClient, getPersonaByKey('STUDENT_CSE')!.id);
      expect(thesis?.current_state).toBe('SUPERVISORS_ALLOCATED');
      expect(thesis?.guide_id).toBe(cseFacultyIds[0]);
      expect(thesis?.co_guide_id).toBe(cseFacultyIds[1]);
    });

    it('TC-14: Guide allocation trigger updated faculty active loads', async () => {
      const { data: guideFp } = await adminClient
        .from('faculty_profiles')
        .select('active_guide_load, active_coguide_load')
        .eq('user_id', cseFacultyIds[0])
        .single();

      expect(guideFp.active_guide_load).toBeGreaterThanOrEqual(1);

      const { data: coguideFp } = await adminClient
        .from('faculty_profiles')
        .select('active_guide_load, active_coguide_load')
        .eq('user_id', cseFacultyIds[1])
        .single();

      expect(coguideFp.active_coguide_load).toBeGreaterThanOrEqual(1);
    });

    it('TC-15: Immutable Audit Event (SUPERVISOR_ALLOCATED) and Academic Domain Event recorded', async () => {
      // Verify audit event
      const { data: auditEvents } = await adminClient
        .from('audit_events')
        .select('*')
        .eq('action_code', 'SUPERVISOR_ALLOCATED')
        .eq('target_entity_id', allocatedResult.allocation_id);

      expect(auditEvents).toBeDefined();
      expect(auditEvents.length).toBeGreaterThanOrEqual(1);
      expect(auditEvents[0].actor_user_id).toBe(getPersonaByKey('DHOD_CSE')!.id);
      expect(auditEvents[0].active_role_id).toBe('DHOD');

      // Verify academic event
      const { data: academicEvents } = await adminClient
        .from('academic_events')
        .select('*')
        .eq('entity_id', studentCseThesisId)
        .eq('event_type', 'SUPERVISORS_ALLOCATED');

      expect(academicEvents).toBeDefined();
      expect(academicEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('TC-16: In-App Notifications delivered to Student, Primary Guide, and Co-Guide', async () => {
      const { data: notifDeliveries } = await adminClient
        .from('notification_deliveries')
        .select('*, notification_messages!inner(*)')
        .eq('notification_messages.category', 'ALLOCATION');

      expect(notifDeliveries).toBeDefined();
      const recipients = notifDeliveries.map((n: any) => n.recipient_user_id);

      expect(recipients).toContain(getPersonaByKey('STUDENT_CSE')!.id);
      expect(recipients).toContain(cseFacultyIds[0]);
      expect(recipients).toContain(cseFacultyIds[1]);
    });

    it('TC-17: Attempting duplicate allocate_thesis_supervisors on already allocated thesis in wrong state -> DENIED', async () => {
      await expect(
        allocateThesisSupervisorsRpc(dhodCseClient, {
          thesis_id: studentCseThesisId,
          guide_id: cseFacultyIds[0],
          co_guide_id: cseFacultyIds[1],
        })
      ).rejects.toThrow(/(InvalidState|APPROVED_FOR_ALLOCATION)/i);
    });
  });

  describe('4. Exceptional Supervisor Reallocation Lifecycle', () => {
    it('TC-18: Reallocation without justification is rejected -> DENIED', async () => {
      await expect(
        reallocateThesisSupervisorsRpc(dhodCseClient, {
          thesis_id: studentCseThesisId,
          new_guide_id: cseFacultyIds[2],
          new_co_guide_id: cseFacultyIds[3],
          justification: '',
        })
      ).rejects.toThrow(/(justification is mandatory|Validation failed)/i);
    });

    it('TC-19: Reallocation with identical new supervisors (new_guide == new_coguide) -> DENIED', async () => {
      await expect(
        reallocateThesisSupervisorsRpc(dhodCseClient, {
          thesis_id: studentCseThesisId,
          new_guide_id: cseFacultyIds[2],
          new_co_guide_id: cseFacultyIds[2],
          justification: 'Attempting invalid identical reassignment.',
        })
      ).rejects.toThrow(/(IDENTICAL_SUPERVISORS|same faculty)/i);
    });

    it('TC-20: Student/DC/HOD cannot execute reallocate_thesis_supervisors -> DENIED', async () => {
      await expect(
        reallocateThesisSupervisorsRpc(studentCseClient, {
          thesis_id: studentCseThesisId,
          new_guide_id: cseFacultyIds[2],
          new_co_guide_id: cseFacultyIds[3],
          justification: 'Student attempting reassignment.',
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);

      await expect(
        reallocateThesisSupervisorsRpc(dcCseClient, {
          thesis_id: studentCseThesisId,
          new_guide_id: cseFacultyIds[2],
          new_co_guide_id: cseFacultyIds[3],
          justification: 'DC attempting reassignment.',
        })
      ).rejects.toThrow(/(Access denied|Forbidden|permission)/i);
    });

    it('TC-21: DHOD_CSE successfully executes exceptional reallocation with formal justification', async () => {
      const res = await reallocateThesisSupervisorsRpc(dhodCseClient, {
        thesis_id: studentCseThesisId,
        new_guide_id: cseFacultyIds[2],
        new_co_guide_id: cseFacultyIds[3],
        justification: 'Previous Guide departed on funded sabbatical research fellowship.',
      });

      expect(res.success).toBe(true);
      expect(res.history_id).toBeDefined();
      expect(res.new_guide_id).toBe(cseFacultyIds[2]);
      expect(res.new_co_guide_id).toBe(cseFacultyIds[3]);

      // Verify thesis supervisors updated
      const thesis = await getStudentActiveThesis(studentCseClient, getPersonaByKey('STUDENT_CSE')!.id);
      expect(thesis?.guide_id).toBe(cseFacultyIds[2]);
      expect(thesis?.co_guide_id).toBe(cseFacultyIds[3]);

      // Verify WORM history record in guide_allocation_history
      const { data: historyData } = await dhodCseClient
        .from('guide_allocation_history')
        .select('*')
        .eq('id', res.history_id)
        .single();

      expect(historyData).toBeDefined();
      expect(historyData.previous_guide_id).toBe(cseFacultyIds[0]);
      expect(historyData.previous_co_guide_id).toBe(cseFacultyIds[1]);
      expect(historyData.new_guide_id).toBe(cseFacultyIds[2]);
      expect(historyData.new_co_guide_id).toBe(cseFacultyIds[3]);
      expect(historyData.justification).toContain('sabbatical');
    });

    it('TC-22: Reallocation audit event (SUPERVISOR_REALLOCATED) and domain events recorded', async () => {
      const { data: reallocAudits } = await adminClient
        .from('audit_events')
        .select('*')
        .eq('action_code', 'SUPERVISOR_REALLOCATED')
        .eq('target_entity_id', studentCseThesisId);

      expect(reallocAudits).toBeDefined();
      expect(reallocAudits.length).toBeGreaterThanOrEqual(1);
      expect(reallocAudits[0].actor_user_id).toBe(getPersonaByKey('DHOD_CSE')!.id);
      expect(reallocAudits[0].justification).toContain('sabbatical');
    });
  });

  describe('5. Concurrency & Capacity Constraint Verification', () => {
    it('TC-23: Check constraint and RPC block allocation if Guide load reaches maximum capacity (Load = 3)', async () => {
      // 1. Reset thesis to APPROVED_FOR_ALLOCATION
      await studentCseClient.rpc('reset_thesis_for_testing', { p_thesis_id: studentCseThesisId });
      await submitAnnexure1Rpc(studentCseClient, studentCseThesisId, {
        proposed_title: 'Capacity Test Proposal: Blockchain Scaling',
        broad_domain: 'Distributed Systems',
        problem_statement: 'Capacity verification problem statement.',
        expected_outcomes: 'Benchmarking outcomes.',
        preferences: [
          { faculty_id: cseFacultyIds[0], preference_rank: 1 },
          { faculty_id: cseFacultyIds[1], preference_rank: 2 },
          { faculty_id: cseFacultyIds[2], preference_rank: 3 },
          { faculty_id: cseFacultyIds[3], preference_rank: 4 },
        ],
      });
      const vRes = await verifyAndForwardDcecDocketRpc(dcCseClient, {
        thesis_id: studentCseThesisId,
        is_eligible: true,
        documents_complete: true,
      });
      await recordDcecScreeningDecisionRpc(hodCseClient, {
        docket_id: vRes.docket_id,
        outcome: 'APPROVED',
        formal_remarks: 'Approved for allocation test.',
      });

      // 2. Artificially set faculty load to 3
      await adminClient
        .from('faculty_profiles')
        .update({ active_guide_load: 3 })
        .eq('user_id', cseFacultyIds[0]);

      // 3. Attempt allocation -> Expect capacity breach error
      await expect(
        allocateThesisSupervisorsRpc(dhodCseClient, {
          thesis_id: studentCseThesisId,
          guide_id: cseFacultyIds[0],
          co_guide_id: cseFacultyIds[1],
        })
      ).rejects.toThrow(/(SUPERVISOR_CAPACITY_BREACH|capacity)/i);

      // 4. Restore faculty load
      await adminClient
        .from('faculty_profiles')
        .update({ active_guide_load: 0, active_coguide_load: 0 })
        .eq('user_id', cseFacultyIds[0]);
    });
  });
});
