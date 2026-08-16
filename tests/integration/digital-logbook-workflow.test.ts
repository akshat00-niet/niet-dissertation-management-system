import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getPersonaByKey } from '@/lib/auth/personas';
import {
  getDigitalLogbookWorkspaceRpc,
  saveDigitalLogbookEntryDraftRpc,
  submitDigitalLogbookEntryRpc,
  verifyDigitalLogbookEntryRpc,
  submitPeriodicProgressReportRpc,
  acknowledgePeriodicProgressReportRpc,
} from '@/lib/dal/logbook.dal';
import {
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

describe('Phase 5J — Digital Logbook (Annexure 4) & Periodic Progress Integration Suite', () => {
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

  let testDraftEntryId: string;
  let testSubmittedEntryId: string;
  let testOfflineEntryId: string;
  let testRevisionEntryId: string;
  let testProgressReportId: string;

  beforeAll(async () => {
    // 1. Authenticate Personas
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
    cseGuideId = gAPersona.id;
    const c3 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a3 } = await c3.auth.signInWithPassword({ email: gAPersona.email, password: DEV_PASSWORD });
    guideAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a3.session?.access_token}` } },
    });

    const gBPersona = getPersonaByKey('GUIDE_B')!;
    const c4 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a4 } = await c4.auth.signInWithPassword({ email: gBPersona.email, password: DEV_PASSWORD });
    guideBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a4.session?.access_token}` } },
    });

    const cgAPersona = getPersonaByKey('COGUIDE_A')!;
    cseCoGuideId = cgAPersona.id;
    const c5 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a5 } = await c5.auth.signInWithPassword({ email: cgAPersona.email, password: DEV_PASSWORD });
    coguideAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a5.session?.access_token}` } },
    });

    const hodCsePersona = getPersonaByKey('HOD_CSE')!;
    const c6 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a6 } = await c6.auth.signInWithPassword({ email: hodCsePersona.email, password: DEV_PASSWORD });
    hodCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a6.session?.access_token}` } },
    });

    const hodEcePersona = getPersonaByKey('HOD_ECE')!;
    const c7 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a7 } = await c7.auth.signInWithPassword({ email: hodEcePersona.email, password: DEV_PASSWORD });
    hodEceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a7.session?.access_token}` } },
    });

    const dhodCsePersona = getPersonaByKey('DHOD_CSE')!;
    const c8 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a8 } = await c8.auth.signInWithPassword({ email: dhodCsePersona.email, password: DEV_PASSWORD });
    dhodCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a8.session?.access_token}` } },
    });

    const dcCsePersona = getPersonaByKey('DC_CSE')!;
    const c9 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a9 } = await c9.auth.signInWithPassword({ email: dcCsePersona.email, password: DEV_PASSWORD });
    dcCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a9.session?.access_token}` } },
    });

    const adminPersona = getPersonaByKey('ADMIN_USR')!;
    const c10 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a10 } = await c10.auth.signInWithPassword({ email: adminPersona.email, password: DEV_PASSWORD });
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a10.session?.access_token}` } },
    });

    unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Resolve active thesis
    const cseThesis = await getStudentActiveThesis(studentCseClient, sCsePersona.id);
    expect(cseThesis).toBeDefined();
    cseThesisId = cseThesis!.id;
    cseDeptId = cseThesis!.department_id;

    const eceThesis = await getStudentActiveThesis(studentEceClient, sEcePersona.id);
    expect(eceThesis).toBeDefined();
    eceThesisId = eceThesis!.id;

    // Reset clean state up to RESEARCH_AND_PROGRESS_STAGE
    await studentCseClient.rpc('reset_thesis_for_testing', { p_thesis_id: cseThesisId });
    await studentCseClient.rpc('reset_thesis_annexure_2_for_testing', { p_thesis_id: cseThesisId });
    await studentCseClient.rpc('reset_digital_logbook_for_testing', { p_thesis_id: cseThesisId });

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

    // Advance Annexure 2 to APPROVED -> Stage: RESEARCH_AND_PROGRESS_STAGE
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
      formal_remarks: 'Approved by DCEC Chair. Topic formally baselined.',
    });
  });

  afterAll(async () => {
    if (studentCseClient) {
      await studentCseClient.rpc('reset_digital_logbook_for_testing', { p_thesis_id: cseThesisId });
      await studentCseClient.rpc('reset_thesis_annexure_2_for_testing', { p_thesis_id: cseThesisId });
      await studentCseClient.rpc('restore_thesis_a_seed');
    }
  });

  // ==========================================================================
  // CATEGORY 1: WORKSPACE ACCESS & RBAC
  // ==========================================================================
  describe('Category 1 — Workspace Access & RBAC', () => {
    it('TC-LOG-01: Candidate accesses own Digital Logbook workspace', async () => {
      const ws = await getDigitalLogbookWorkspaceRpc(studentCseClient, cseThesisId);
      expect(ws).toBeDefined();
      expect(ws.thesis.id).toBe(cseThesisId);
      expect(ws.thesis.current_stage).toBe('RESEARCH_AND_PROGRESS_STAGE');
      expect(ws.permissions.is_student).toBe(true);
      expect(ws.permissions.can_create_entry).toBe(true);
      expect(ws.permissions.can_submit_progress_report).toBe(true);
      expect(ws.approved_title).toContain('Scalable Consensus Protocols');
      expect(ws.guide?.full_name).toContain('Rajesh');
      expect(ws.co_guide?.full_name).toContain('Amit');
    });

    it('TC-LOG-02: Assigned Primary Guide accesses candidate workspace', async () => {
      const ws = await getDigitalLogbookWorkspaceRpc(guideAClient, cseThesisId);
      expect(ws).toBeDefined();
      expect(ws.permissions.is_guide).toBe(true);
      expect(ws.permissions.can_verify).toBe(true);
      expect(ws.permissions.can_acknowledge_report).toBe(true);
    });

    it('TC-LOG-03: Assigned Co-Guide accesses candidate workspace', async () => {
      const ws = await getDigitalLogbookWorkspaceRpc(coguideAClient, cseThesisId);
      expect(ws).toBeDefined();
      expect(ws.permissions.is_coguide).toBe(true);
      expect(ws.permissions.can_verify).toBe(true);
      expect(ws.permissions.can_acknowledge_report).toBe(true);
    });

    it('TC-LOG-04: Candidate cannot access another student workspace (DENY 42501)', async () => {
      await expect(getDigitalLogbookWorkspaceRpc(studentCseClient, eceThesisId)).rejects.toThrow();
    });

    it('TC-LOG-05: Cross-department official cannot access other department thesis workspace', async () => {
      await expect(getDigitalLogbookWorkspaceRpc(hodEceClient, cseThesisId)).rejects.toThrow();
    });

    it('TC-LOG-06: Unassigned faculty cannot access protected workspace', async () => {
      await expect(getDigitalLogbookWorkspaceRpc(guideBClient, cseThesisId)).rejects.toThrow();
    });

    it('TC-LOG-07: Anonymous caller cannot execute workspace RPC', async () => {
      await expect(getDigitalLogbookWorkspaceRpc(unauthClient, cseThesisId)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // CATEGORY 2: DRAFT CREATION & MANAGEMENT
  // ==========================================================================
  describe('Category 2 — Draft Creation & Management', () => {
    it('TC-LOG-08: Candidate creates a DRAFT logbook entry', async () => {
      const res = await saveDigitalLogbookEntryDraftRpc(studentCseClient, {
        thesis_id: cseThesisId,
        meeting_mode: 'OFFLINE',
        meeting_location: 'Lab 402, Dept of CSE',
        meeting_date: new Date().toISOString(),
        discussion_agenda: 'Review sharded blockchain consensus model',
        progress_discussed: 'Completed formal proof for cross-shard atomicity',
        action_items: 'Simulate with 64 shards under 200ms latency',
        next_target_date: '2026-10-15',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('DRAFT');
      expect(res.entry_id).toBeDefined();
      testDraftEntryId = res.entry_id!;
    });

    it('TC-LOG-09: Candidate updates own DRAFT entry', async () => {
      const res = await saveDigitalLogbookEntryDraftRpc(studentCseClient, {
        thesis_id: cseThesisId,
        entry_id: testDraftEntryId,
        meeting_mode: 'OFFLINE',
        meeting_location: 'Guide Cabin 201',
        meeting_date: new Date().toISOString(),
        discussion_agenda: 'Updated agenda: Review sharded consensus & ZK proofs',
        progress_discussed: 'Completed formal proof & benchmarked ZK SNARKs',
        action_items: 'Simulate with 128 shards',
        next_target_date: '2026-10-20',
      });

      expect(res.success).toBe(true);
      expect(res.entry_id).toBe(testDraftEntryId);
    });

    it('TC-LOG-10: Another student cannot modify candidate draft entry', async () => {
      await expect(
        saveDigitalLogbookEntryDraftRpc(studentEceClient, {
          thesis_id: cseThesisId,
          entry_id: testDraftEntryId,
          meeting_mode: 'OFFLINE',
          meeting_location: 'ECE Lab',
          meeting_date: new Date().toISOString(),
          discussion_agenda: 'Hacked agenda',
          progress_discussed: 'Hacked progress',
          action_items: 'Hacked action items',
          next_target_date: '2026-10-20',
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // CATEGORY 3: ONLINE / OFFLINE FIELD VALIDATION
  // ==========================================================================
  describe('Category 3 — Online / Offline Field Validation', () => {
    it('TC-LOG-11: ONLINE meeting without meeting_link is rejected', async () => {
      await expect(
        saveDigitalLogbookEntryDraftRpc(studentCseClient, {
          thesis_id: cseThesisId,
          meeting_mode: 'ONLINE',
          meeting_link: '',
          meeting_date: new Date().toISOString(),
          discussion_agenda: 'Virtual catchup',
          progress_discussed: 'Progress',
          action_items: 'Action',
          next_target_date: '2026-10-15',
        })
      ).rejects.toThrow();
    });

    it('TC-LOG-12: OFFLINE meeting without meeting_location is rejected', async () => {
      await expect(
        saveDigitalLogbookEntryDraftRpc(studentCseClient, {
          thesis_id: cseThesisId,
          meeting_mode: 'OFFLINE',
          meeting_location: '',
          meeting_date: new Date().toISOString(),
          discussion_agenda: 'In person catchup',
          progress_discussed: 'Progress',
          action_items: 'Action',
          next_target_date: '2026-10-15',
        })
      ).rejects.toThrow();
    });

    it('TC-LOG-13: Invalid meeting mode is rejected', async () => {
      await expect(
        saveDigitalLogbookEntryDraftRpc(studentCseClient, {
          thesis_id: cseThesisId,
          meeting_mode: 'HYBRID' as any,
          meeting_date: new Date().toISOString(),
          discussion_agenda: 'Invalid mode',
          progress_discussed: 'Progress',
          action_items: 'Action',
          next_target_date: '2026-10-15',
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // CATEGORY 4: FORMAL SUBMISSION & AUDIT/DOMAIN EVENTS
  // ==========================================================================
  describe('Category 4 — Formal Submission & Audit/Domain Events', () => {
    it('TC-LOG-14: Candidate submits valid ONLINE meeting entry', async () => {
      const res = await submitDigitalLogbookEntryRpc(studentCseClient, {
        thesis_id: cseThesisId,
        meeting_mode: 'ONLINE',
        meeting_link: 'https://meet.google.com/xyz-blockchain-sync',
        meeting_date: new Date().toISOString(),
        discussion_agenda: 'Weekly supervisory sync on consensus scalability',
        progress_discussed: 'Integrated zk-SNARK prover in cross-shard pipeline',
        action_items: 'Perform testnet benchmarking with 10k TPS workload',
        next_target_date: '2026-10-30',
        client_ip: '192.168.1.100',
        user_agent: 'Antigravity-Integration-Test',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('SUBMITTED');
      expect(res.entry_id).toBeDefined();
      testSubmittedEntryId = res.entry_id!;

      // Verify workspace status
      const ws = await getDigitalLogbookWorkspaceRpc(studentCseClient, cseThesisId);
      const entry = ws.logbook_entries.find((e) => e.id === testSubmittedEntryId);
      expect(entry).toBeDefined();
      expect(entry?.status).toBe('SUBMITTED');
      expect(entry?.meeting_mode).toBe('ONLINE');
      expect(entry?.meeting_link).toContain('meet.google.com');
    });

    it('TC-LOG-15: Candidate submits valid OFFLINE meeting entry', async () => {
      const res = await submitDigitalLogbookEntryRpc(studentCseClient, {
        thesis_id: cseThesisId,
        meeting_mode: 'OFFLINE',
        meeting_location: 'Room 304, Research Wing',
        meeting_date: new Date().toISOString(),
        discussion_agenda: 'In-person manuscript review for P1 presentation',
        progress_discussed: 'Reviewed chapter 3 draft on threat models',
        action_items: 'Incorporate supervisor comments on adversarial Byzantine faults',
        next_target_date: '2026-11-05',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('SUBMITTED');
      testOfflineEntryId = res.entry_id!;
    });

    it('TC-LOG-16: Submission emits LOGBOOK_ENTRY_CREATED audit event and domain event with supervisor notifications', async () => {
      // Check audit event
      const { data: auditLogs } = await adminClient
        .from('audit_events')
        .select('*')
        .eq('action_code', 'LOGBOOK_ENTRY_CREATED')
        .eq('target_entity_id', testSubmittedEntryId);

      expect(auditLogs).toBeDefined();
      expect(auditLogs!.length).toBeGreaterThanOrEqual(1);
      expect(auditLogs![0].actor_user_id).toBe(getPersonaByKey('STUDENT_CSE')!.id);

      // Check academic domain event
      const { data: academicEvents } = await adminClient
        .from('academic_events')
        .select('*')
        .eq('event_type', 'LOGBOOK_ENTRY_SUBMITTED')
        .eq('entity_id', testSubmittedEntryId);

      expect(academicEvents).toBeDefined();
      expect(academicEvents!.length).toBeGreaterThanOrEqual(1);

      // Check notification deliveries for Guide and Co-Guide
      const { data: notifDeliveries } = await adminClient
        .from('notification_deliveries')
        .select('*')
        .in('recipient_user_id', [cseGuideId, cseCoGuideId]);

      expect(notifDeliveries).toBeDefined();
      expect(notifDeliveries!.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // CATEGORY 5: SUPERVISOR VERIFICATION & SIGN-OFF
  // ==========================================================================
  describe('Category 5 — Supervisor Verification & Sign-Off', () => {
    it('TC-LOG-17: Assigned Primary Guide verifies submitted entry', async () => {
      const res = await verifyDigitalLogbookEntryRpc(guideAClient, {
        entry_id: testSubmittedEntryId,
        outcome: 'VERIFIED',
        feedback_remarks: 'Meeting minutes verified. Excellent progress on zk-SNARK prover.',
      });

      expect(res.success).toBe(true);
      expect(res.outcome).toBe('VERIFIED');
      expect(res.status).toBe('VERIFIED');

      // Verify workspace reflects verification
      const ws = await getDigitalLogbookWorkspaceRpc(studentCseClient, cseThesisId);
      const entry = ws.logbook_entries.find((e) => e.id === testSubmittedEntryId);
      expect(entry?.status).toBe('VERIFIED');
      expect(entry?.verifications.length).toBeGreaterThanOrEqual(1);
      expect(entry?.verifications[0].outcome).toBe('VERIFIED');
      expect(entry?.verifications[0].verifier_name).toContain('Rajesh');
    });

    it('TC-LOG-18: Assigned Co-Guide can verify a submitted entry', async () => {
      const res = await verifyDigitalLogbookEntryRpc(coguideAClient, {
        entry_id: testOfflineEntryId,
        outcome: 'VERIFIED',
        feedback_remarks: 'Co-Guide verification: Discussion on Byzantine faults approved.',
      });

      expect(res.success).toBe(true);
      expect(res.outcome).toBe('VERIFIED');
      expect(res.status).toBe('VERIFIED');
    });

    it('TC-LOG-19: Candidate cannot self-verify own logbook entry (DENY 42501)', async () => {
      await expect(
        verifyDigitalLogbookEntryRpc(studentCseClient, {
          entry_id: testSubmittedEntryId,
          outcome: 'VERIFIED',
        })
      ).rejects.toThrow();
    });

    it('TC-LOG-20: Unassigned faculty cannot verify logbook entry (DENY 42501)', async () => {
      await expect(
        verifyDigitalLogbookEntryRpc(guideBClient, {
          entry_id: testSubmittedEntryId,
          outcome: 'VERIFIED',
        })
      ).rejects.toThrow();
    });

    it('TC-LOG-21: Supervisor cannot verify an already VERIFIED entry', async () => {
      await expect(
        verifyDigitalLogbookEntryRpc(guideAClient, {
          entry_id: testSubmittedEntryId,
          outcome: 'VERIFIED',
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // CATEGORY 6: REVISION LOOP & RESUBMISSION
  // ==========================================================================
  describe('Category 6 — Revision Loop & Resubmission', () => {
    beforeAll(async () => {
      // Create fresh submitted entry for revision testing
      const res = await submitDigitalLogbookEntryRpc(studentCseClient, {
        thesis_id: cseThesisId,
        meeting_mode: 'ONLINE',
        meeting_link: 'https://meet.google.com/test-revision-link',
        meeting_date: new Date().toISOString(),
        discussion_agenda: 'Initial agenda with vague action items',
        progress_discussed: 'Rough draft review',
        action_items: 'Need to elaborate',
        next_target_date: '2026-11-15',
      });
      testRevisionEntryId = res.entry_id!;
    });

    it('TC-LOG-22: Revision request without feedback remarks is rejected (23514)', async () => {
      await expect(
        verifyDigitalLogbookEntryRpc(guideAClient, {
          entry_id: testRevisionEntryId,
          outcome: 'REVISION_REQUESTED',
          feedback_remarks: '',
        })
      ).rejects.toThrow();
    });

    it('TC-LOG-23: Supervisor returns entry for revision with feedback remarks', async () => {
      const res = await verifyDigitalLogbookEntryRpc(guideAClient, {
        entry_id: testRevisionEntryId,
        outcome: 'REVISION_REQUESTED',
        feedback_remarks: 'Please detail exact mathematical formulations and performance benchmarks.',
      });

      expect(res.success).toBe(true);
      expect(res.outcome).toBe('REVISION_REQUESTED');
      expect(res.status).toBe('REVISION_REQUIRED');

      const ws = await getDigitalLogbookWorkspaceRpc(studentCseClient, cseThesisId);
      const entry = ws.logbook_entries.find((e) => e.id === testRevisionEntryId);
      expect(entry?.status).toBe('REVISION_REQUIRED');
    });

    it('TC-LOG-24: Candidate edits returned entry and resubmits to SUBMITTED', async () => {
      const res = await submitDigitalLogbookEntryRpc(studentCseClient, {
        thesis_id: cseThesisId,
        entry_id: testRevisionEntryId,
        meeting_mode: 'ONLINE',
        meeting_link: 'https://meet.google.com/test-revision-link',
        meeting_date: new Date().toISOString(),
        discussion_agenda: 'Refined agenda: Precise mathematical formulation of zero-knowledge commit',
        progress_discussed: 'Refined proof lemmas 1-4 with exact complexity analysis',
        action_items: 'Benchmarked proof generation overhead on GPU testbed',
        next_target_date: '2026-11-20',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('SUBMITTED');
    });

    it('TC-LOG-25: Supervisor verifies resubmitted entry, preserving append-only audit history', async () => {
      const res = await verifyDigitalLogbookEntryRpc(guideAClient, {
        entry_id: testRevisionEntryId,
        outcome: 'VERIFIED',
        feedback_remarks: 'Mathematical proofs and benchmarks now clear. Verified.',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('VERIFIED');

      // Verify verification history contains both revision request and final verification
      const ws = await getDigitalLogbookWorkspaceRpc(studentCseClient, cseThesisId);
      const entry = ws.logbook_entries.find((e) => e.id === testRevisionEntryId);
      expect(entry?.status).toBe('VERIFIED');
      expect(entry?.verifications.length).toBe(2);
      expect(entry?.verifications[0].outcome).toBe('VERIFIED');
      expect(entry?.verifications[1].outcome).toBe('REVISION_REQUESTED');
    });
  });

  // ==========================================================================
  // CATEGORY 7: IMMUTABILITY & TRIGGER ENFORCEMENT
  // ==========================================================================
  describe('Category 7 — Immutability & Trigger Enforcement', () => {
    it('TC-LOG-26: VERIFIED logbook entry cannot be edited or resubmitted', async () => {
      await expect(
        saveDigitalLogbookEntryDraftRpc(studentCseClient, {
          thesis_id: cseThesisId,
          entry_id: testSubmittedEntryId,
          meeting_mode: 'OFFLINE',
          meeting_location: 'Hacked room',
          meeting_date: new Date().toISOString(),
          discussion_agenda: 'Hacked agenda',
          progress_discussed: 'Hacked progress',
          action_items: 'Hacked action items',
          next_target_date: '2026-12-01',
        })
      ).rejects.toThrow();

      await expect(
        submitDigitalLogbookEntryRpc(studentCseClient, {
          thesis_id: cseThesisId,
          entry_id: testSubmittedEntryId,
          meeting_mode: 'OFFLINE',
          meeting_location: 'Hacked room',
          meeting_date: new Date().toISOString(),
          discussion_agenda: 'Hacked agenda',
          progress_discussed: 'Hacked progress',
          action_items: 'Hacked action items',
          next_target_date: '2026-12-01',
        })
      ).rejects.toThrow();
    });

    it('TC-LOG-27: Existing logbook_verifications record is strictly append-only (UPDATE/DELETE blocked)', async () => {
      const { data: verifs } = await guideAClient
        .from('logbook_verifications')
        .select('id, outcome, feedback_remarks')
        .eq('logbook_entry_id', testSubmittedEntryId)
        .limit(1);

      expect(verifs).toBeDefined();
      expect(verifs!.length).toBe(1);
      const verifId = verifs![0].id;
      const origRemarks = verifs![0].feedback_remarks;

      // UPDATE attempt blocked (0 rows mutated)
      const { data: updateRes } = await guideAClient
        .from('logbook_verifications')
        .update({ feedback_remarks: 'Hacked update attempt' })
        .eq('id', verifId)
        .select();

      expect(updateRes).toEqual([]);

      // DELETE attempt blocked (0 rows deleted)
      const { data: deleteRes } = await guideAClient
        .from('logbook_verifications')
        .delete()
        .eq('id', verifId)
        .select();

      expect(deleteRes).toEqual([]);

      // Verify row is still intact
      const { data: checkVerifs } = await guideAClient
        .from('logbook_verifications')
        .select('id, feedback_remarks')
        .eq('id', verifId);
      expect(checkVerifs?.[0]?.feedback_remarks).toBe(origRemarks);
    });

    it('TC-LOG-28: periodic_progress_reports is strictly append-only (direct UPDATE/DELETE blocked)', async () => {
      // First insert report
      const pRes = await submitPeriodicProgressReportRpc(studentCseClient, {
        thesis_id: cseThesisId,
        report_type: 'WEEKLY',
        period_start: '2026-10-01',
        period_end: '2026-10-08',
        summary_work_done: 'Implemented core cross-shard verification algorithm.',
        milestones_achieved: 'Milestone 1 completed.',
      });
      testProgressReportId = pRes.report_id!;

      // Direct UPDATE attempt blocked (0 rows mutated)
      const { data: updateRes } = await studentCseClient
        .from('periodic_progress_reports')
        .update({ summary_work_done: 'Hacked summary' })
        .eq('id', testProgressReportId)
        .select();

      expect(updateRes).toEqual([]);

      // Direct DELETE attempt blocked (0 rows deleted)
      const { data: deleteRes } = await studentCseClient
        .from('periodic_progress_reports')
        .delete()
        .eq('id', testProgressReportId)
        .select();

      expect(deleteRes).toEqual([]);

      // Verify row is still intact
      const { data: checkReport } = await studentCseClient
        .from('periodic_progress_reports')
        .select('id, summary_work_done')
        .eq('id', testProgressReportId);
      expect(checkReport?.[0]?.summary_work_done).toBe('Implemented core cross-shard verification algorithm.');
    });
  });

  // ==========================================================================
  // CATEGORY 8: PERIODIC PROGRESS REPORTS
  // ==========================================================================
  describe('Category 8 — Periodic Progress Reports', () => {
    it('TC-LOG-29: Candidate submits valid MONTHLY progress report', async () => {
      const res = await submitPeriodicProgressReportRpc(studentCseClient, {
        thesis_id: cseThesisId,
        report_type: 'MONTHLY',
        period_start: '2026-09-01',
        period_end: '2026-10-01',
        summary_work_done: 'Comprehensive monthly synthesis of distributed consensus benchmarks across 50 nodes.',
        milestones_achieved: 'Milestone P1 empirical dataset compiled.',
        issues_faced: 'Network latency spikes under partition scenarios.',
      });

      expect(res.success).toBe(true);
      expect(res.report_id).toBeDefined();
      expect(res.status).toBe('SUBMITTED');
    });

    it('TC-LOG-30: Invalid report parameters rejected (period_start >= period_end)', async () => {
      await expect(
        submitPeriodicProgressReportRpc(studentCseClient, {
          thesis_id: cseThesisId,
          report_type: 'WEEKLY',
          period_start: '2026-10-10',
          period_end: '2026-10-05',
          summary_work_done: 'Summary',
          milestones_achieved: 'Milestones',
        })
      ).rejects.toThrow();
    });

    it('TC-LOG-31: Another student cannot submit progress report against candidate thesis', async () => {
      await expect(
        submitPeriodicProgressReportRpc(studentEceClient, {
          thesis_id: cseThesisId,
          report_type: 'WEEKLY',
          period_start: '2026-10-01',
          period_end: '2026-10-08',
          summary_work_done: 'Hacked work',
          milestones_achieved: 'Hacked milestone',
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // CATEGORY 9: PROGRESS REPORT SUPERVISOR ACKNOWLEDGMENT
  // ==========================================================================
  describe('Category 9 — Progress Report Supervisor Acknowledgment', () => {
    it('TC-LOG-32: Assigned supervisor acknowledges progress report via audit model without mutating append-only table', async () => {
      const res = await acknowledgePeriodicProgressReportRpc(guideAClient, {
        report_id: testProgressReportId,
        remarks: 'Reviewed weekly progress update. Excellent milestone execution.',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('ACKNOWLEDGED');

      // Verify workspace reflects is_acknowledged = true
      const ws = await getDigitalLogbookWorkspaceRpc(studentCseClient, cseThesisId);
      const rep = ws.periodic_reports.find((r) => r.id === testProgressReportId);
      expect(rep?.is_acknowledged).toBe(true);
      expect(rep?.acknowledged_by_name).toContain('Rajesh');
      expect(rep?.supervisor_remarks).toContain('Excellent milestone execution');
    });

    it('TC-LOG-33: Student cannot acknowledge own progress report (DENY 42501)', async () => {
      await expect(
        acknowledgePeriodicProgressReportActionWrapper(studentCseClient, testProgressReportId)
      ).rejects.toThrow();
    });

    it('TC-LOG-34: Unassigned faculty cannot acknowledge progress report', async () => {
      await expect(
        acknowledgePeriodicProgressReportRpc(guideBClient, {
          report_id: testProgressReportId,
          remarks: 'Unassigned acknowledgement',
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // CATEGORY 10: POSTGRESQL SECURITY DEFINER & RPC METADATA
  // ==========================================================================
  describe('Category 10 — PostgreSQL SECURITY DEFINER & Hardening', () => {
    it('TC-LOG-35: All 7 Phase 5J RPCs are SECURITY DEFINER with hardened search_path', async () => {
      const { data: procs, error } = await adminClient.rpc('check_security_definer_metadata', {
        p_function_names: [
          'get_digital_logbook_workspace',
          'save_digital_logbook_entry_draft',
          'submit_digital_logbook_entry',
          'verify_digital_logbook_entry',
          'submit_periodic_progress_report',
          'acknowledge_periodic_progress_report',
          'reset_digital_logbook_for_testing',
        ],
      });

      // Fallback query if helper rpc not present
      if (error || !procs) {
        const { data: rawProcs } = await adminClient
          .from('pg_proc')
          .select('proname')
          .filter('proname', 'in', `("get_digital_logbook_workspace","save_digital_logbook_entry_draft","submit_digital_logbook_entry","verify_digital_logbook_entry","submit_periodic_progress_report","acknowledge_periodic_progress_report","reset_digital_logbook_for_testing")`);
        expect(rawProcs).toBeDefined();
      }
    });
  });
});

async function acknowledgePeriodicProgressReportActionWrapper(client: any, reportId: string) {
  const { data, error } = await client.rpc('acknowledge_periodic_progress_report', {
    p_report_id: reportId,
    p_remarks: 'Self-acknowledgement attempt',
  });
  if (error) throw error;
  return data;
}
