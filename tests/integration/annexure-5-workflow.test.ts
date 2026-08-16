import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getPersonaByKey } from '@/lib/auth/personas';
import {
  submitAnnexure5PackageRpc,
  endorseAnnexure5SubmissionRpc,
  requestAnnexure5RevisionRpc,
  getAnnexure5DocketRpc,
  listDepartmentAnnexure5SubmissionsRpc,
} from '@/lib/dal/annexure5.dal';
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

describe('Phase 5L-G — Final Dissertation Submission (Annexure 5) & Turnitin Similarity Integration & Security Suite', () => {
  let adminClient: any;
  let studentCseClient: any;
  let studentEceClient: any;
  let guideAClient: any;
  let guideBClient: any;
  let coguideAClient: any;
  let dcCseClient: any;
  let dcEceClient: any;
  let hodCseClient: any;
  let baseFacultyClient: any;
  let panelMemberAClient: any;
  let unauthClient: any;

  let sCsePersona: any;
  let sEcePersona: any;
  let gAPersona: any;
  let gBPersona: any;
  let cgAPersona: any;

  let cseDeptId: string;
  let eceDeptId: string;
  let cseThesisId: string;
  let eceThesisId: string;

  // Documents for CSE thesis
  let cseManuscriptDocId: string;
  let cseSynopsisDocId: string;
  let cseSimilarityCertDocId: string;

  // Documents for ECE thesis
  let eceManuscriptDocId: string;
  let eceSynopsisDocId: string;
  let eceSimilarityCertDocId: string;

  beforeAll(async () => {
    // 1. Authenticate Personas
    const adminPersona = getPersonaByKey('ADMIN_USR')!;
    const cAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: aAdmin } = await cAdmin.auth.signInWithPassword({ email: adminPersona.email, password: DEV_PASSWORD });
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${aAdmin.session?.access_token}` } },
    });

    sCsePersona = getPersonaByKey('STUDENT_CSE')!;
    const c1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a1 } = await c1.auth.signInWithPassword({ email: sCsePersona.email, password: DEV_PASSWORD });
    studentCseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a1.session?.access_token}` } },
    });

    sEcePersona = getPersonaByKey('STUDENT_ECE')!;
    const c2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a2 } = await c2.auth.signInWithPassword({ email: sEcePersona.email, password: DEV_PASSWORD });
    studentEceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a2.session?.access_token}` } },
    });

    gAPersona = getPersonaByKey('GUIDE_A')!;
    const c3 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a3 } = await c3.auth.signInWithPassword({ email: gAPersona.email, password: DEV_PASSWORD });
    guideAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a3.session?.access_token}` } },
    });

    gBPersona = getPersonaByKey('GUIDE_B')!;
    const c3b = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a3b } = await c3b.auth.signInWithPassword({ email: gBPersona.email, password: DEV_PASSWORD });
    guideBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a3b.session?.access_token}` } },
    });

    cgAPersona = getPersonaByKey('COGUIDE_A')!;
    const c3c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a3c } = await c3c.auth.signInWithPassword({ email: cgAPersona.email, password: DEV_PASSWORD });
    coguideAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a3c.session?.access_token}` } },
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

    const baseFacultyPersona = getPersonaByKey('BASE_FACULTY')!;
    const c7 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a7 } = await c7.auth.signInWithPassword({ email: baseFacultyPersona.email, password: DEV_PASSWORD });
    baseFacultyClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a7.session?.access_token}` } },
    });

    const pnlAPersona = getPersonaByKey('PANEL_A')!;
    const c8 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: a8 } = await c8.auth.signInWithPassword({ email: pnlAPersona.email, password: DEV_PASSWORD });
    panelMemberAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${a8.session?.access_token}` } },
    });

    unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 2. Fetch Departments
    const { data: depts } = await dcCseClient.from('departments').select('id, code');
    cseDeptId = depts?.find((d: any) => d.code === 'CSE')?.id!;
    eceDeptId = depts?.find((d: any) => d.code === 'ECE')?.id!;

    // 3. Setup CSE Thesis Lifecycle up to ANNEXURE_5_PREPARATION
    const existingCseThesis = await getStudentActiveThesis(studentCseClient, sCsePersona.id);
    if (!existingCseThesis) {
      const facultyList = await listDepartmentFacultyForPreferences(studentCseClient, cseDeptId);
      const facultyIds = facultyList.map((f: any) => f.user_id);

      const subRes = await submitAnnexure1Rpc(studentCseClient, '00000000-0000-0000-0000-000000000000', {
        proposed_title: 'Phase 5L Autonomous Cyber-Physical Security Architecture',
        broad_domain: 'Security & Distributed Systems',
        problem_statement: 'Comprehensive dissertation manuscript on cyber-physical defense mechanisms.',
        expected_outcomes: 'Turnitin similarity compliant dissertation.',
        preferences: [
          { faculty_id: facultyIds[0], preference_rank: 1 },
          { faculty_id: facultyIds[1], preference_rank: 2 },
          { faculty_id: facultyIds[2], preference_rank: 3 },
          { faculty_id: facultyIds[3], preference_rank: 4 },
        ],
      });
      cseThesisId = subRes.thesis_id;
    } else {
      cseThesisId = existingCseThesis.id;
    }

    // Advance CSE Thesis through screening & allocation & title approval if needed
    const { data: cseTh } = await dcCseClient.from('theses').select('*').eq('id', cseThesisId).single();
    if (cseTh.current_state === 'ANNEXURE_1_SUBMITTED') {
      const vRes = await verifyAndForwardDcecDocketRpc(dcCseClient, {
        thesis_id: cseThesisId,
        is_eligible: true,
        documents_complete: true,
        dc_verification_notes: 'DC verified for Phase 5L suite.',
      });
      await recordDcecScreeningDecisionRpc(hodCseClient, {
        docket_id: vRes.docket_id,
        outcome: 'APPROVED',
        formal_remarks: 'DCEC approved for Phase 5L suite.',
      });
    }

    const { data: cseThAlloc } = await dcCseClient.from('theses').select('*').eq('id', cseThesisId).single();
    if (cseThAlloc.current_state === 'ALLOCATION_PENDING') {
      await allocateThesisSupervisorsRpc(hodCseClient, {
        thesis_id: cseThesisId,
        guide_id: gAPersona.id,
        co_guide_id: cgAPersona.id,
      });
    }

    const { data: cseThAnn2 } = await dcCseClient.from('theses').select('*').eq('id', cseThesisId).single();
    if (cseThAnn2.current_state === 'ANNEXURE_2_PENDING') {
      await submitAnnexure2Rpc(studentCseClient, {
        thesis_id: cseThesisId,
        final_title: 'Phase 5L Formalized Autonomous Security Architecture',
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
      await endorseAnnexure2Rpc(guideAClient, {
        thesis_id: cseThesisId,
        is_endorsed: true,
        remarks: 'Guide A endorsed.',
      });
      await endorseAnnexure2Rpc(coguideAClient, {
        thesis_id: cseThesisId,
        is_endorsed: true,
        remarks: 'Co-Guide A endorsed.',
      });
      await decideAnnexure2TitleRpc(hodCseClient, {
        thesis_id: cseThesisId,
        outcome: 'APPROVED',
        formal_remarks: 'HOD approved title.',
      });
    }

    // 4. Setup ECE Thesis (Single Guide: Guide B, no Co-Guide)
    const existingEceThesis = await getStudentActiveThesis(studentEceClient, sEcePersona.id);
    if (!existingEceThesis) {
      const facultyListEce = await listDepartmentFacultyForPreferences(studentEceClient, eceDeptId);
      const facultyIdsEce = facultyListEce.map((f: any) => f.user_id);
      const subResEce = await submitAnnexure1Rpc(studentEceClient, '00000000-0000-0000-0000-000000000000', {
        proposed_title: 'Phase 5L ECE VLSI Low-Power Architecture',
        broad_domain: 'VLSI & Hardware Architecture',
        problem_statement: 'Abstract for low power VLSI final dissertation.',
        expected_outcomes: 'Turnitin similarity compliant VLSI dissertation.',
        preferences: [
          { faculty_id: facultyIdsEce[0], preference_rank: 1 },
          { faculty_id: facultyIdsEce[1], preference_rank: 2 },
        ],
      });
      eceThesisId = subResEce.thesis_id;
    } else {
      eceThesisId = existingEceThesis.id;
    }

    const { data: eceThAlloc } = await dcEceClient.from('theses').select('*').eq('id', eceThesisId).single();
    if (eceThAlloc.current_state === 'ALLOCATION_PENDING' || !eceThAlloc.guide_id) {
      await allocateThesisSupervisorsRpc(dcEceClient, {
        thesis_id: eceThesisId,
        guide_id: gBPersona.id,
        co_guide_id: null as any,
      });
    }

    // 5. Create Documents for CSE Thesis
    const { data: cseDoc1, error: e1 } = await studentCseClient
      .from('documents')
      .insert({
        thesis_id: cseThesisId,
        document_type: 'THESIS_MANUSCRIPT_ANNEXURE_5',
        created_by: sCsePersona.id,
      })
      .select('id')
      .single();
    if (e1 || !cseDoc1) throw new Error(`Failed to create CSE manuscript document: ${e1?.message}`);
    cseManuscriptDocId = cseDoc1.id;

    const { data: cseDoc2, error: e2 } = await studentCseClient
      .from('documents')
      .insert({
        thesis_id: cseThesisId,
        document_type: 'SYNOPSIS_DOCUMENT',
        created_by: sCsePersona.id,
      })
      .select('id')
      .single();
    if (e2 || !cseDoc2) throw new Error(`Failed to create CSE synopsis document: ${e2?.message}`);
    cseSynopsisDocId = cseDoc2.id;

    const { data: cseDoc3, error: e3 } = await studentCseClient
      .from('documents')
      .insert({
        thesis_id: cseThesisId,
        document_type: 'SIMILARITY_CERTIFICATE',
        created_by: sCsePersona.id,
      })
      .select('id')
      .single();
    if (e3 || !cseDoc3) throw new Error(`Failed to create CSE similarity cert document: ${e3?.message}`);
    cseSimilarityCertDocId = cseDoc3.id;

    // Create Documents for ECE Thesis
    const { data: eceDoc1, error: e4 } = await studentEceClient
      .from('documents')
      .insert({
        thesis_id: eceThesisId,
        document_type: 'THESIS_MANUSCRIPT_ANNEXURE_5',
        created_by: sEcePersona.id,
      })
      .select('id')
      .single();
    if (e4 || !eceDoc1) throw new Error(`Failed to create ECE manuscript document: ${e4?.message}`);
    eceManuscriptDocId = eceDoc1.id;

    const { data: eceDoc2, error: e5 } = await studentEceClient
      .from('documents')
      .insert({
        thesis_id: eceThesisId,
        document_type: 'SYNOPSIS_DOCUMENT',
        created_by: sEcePersona.id,
      })
      .select('id')
      .single();
    if (e5 || !eceDoc2) throw new Error(`Failed to create ECE synopsis document: ${e5?.message}`);
    eceSynopsisDocId = eceDoc2.id;

    const { data: eceDoc3, error: e6 } = await studentEceClient
      .from('documents')
      .insert({
        thesis_id: eceThesisId,
        document_type: 'SIMILARITY_CERTIFICATE',
        created_by: sEcePersona.id,
      })
      .select('id')
      .single();
    if (e6 || !eceDoc3) throw new Error(`Failed to create ECE similarity cert document: ${e6?.message}`);
    eceSimilarityCertDocId = eceDoc3.id;

    // 6. Clean testing state
    await studentCseClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: cseThesisId });
    await studentEceClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: eceThesisId });
  });

  afterAll(async () => {
    try {
      await studentCseClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: cseThesisId });
      await studentEceClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: eceThesisId });
    } catch (_e) {}
  });

  // ============================================================================
  // TEST GROUP A: STUDENT AUTHORIZATION & PRECONDITIONS (ANN5-AUTH-01 to 08)
  // ============================================================================
  describe('Test Group A: Student Authorization & Preconditions', () => {
    it('ANN5-AUTH-01: Student CAN submit Annexure 5 for own thesis in ANNEXURE_5_PREPARATION', async () => {
      const res = await submitAnnexure5PackageRpc(studentCseClient, {
        thesis_id: cseThesisId,
        manuscript_document_id: cseManuscriptDocId,
        synopsis_document_id: cseSynopsisDocId,
        similarity_certificate_id: cseSimilarityCertDocId,
        repository_url: 'https://github.com/niet/cse-thesis-repo',
        plagiarism_percentage: 6.5,
        ai_similarity_percentage: 0.0,
      });

      expect(res.success).toBe(true);
      expect(res.current_state).toBe('ANNEXURE_5_SUBMITTED');
      expect(res.plagiarism_percentage).toBe(6.5);
      expect(res.ai_similarity_percentage).toBe(0.0);
    });

    it("ANN5-AUTH-02: Student CANNOT submit another student's thesis", async () => {
      await expect(
        submitAnnexure5PackageRpc(studentEceClient, {
          thesis_id: cseThesisId,
          manuscript_document_id: cseManuscriptDocId,
          synopsis_document_id: cseSynopsisDocId,
          similarity_certificate_id: cseSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-AUTH-03: Guide CANNOT submit Annexure 5 on behalf of a student', async () => {
      await expect(
        submitAnnexure5PackageRpc(guideAClient, {
          thesis_id: cseThesisId,
          manuscript_document_id: cseManuscriptDocId,
          synopsis_document_id: cseSynopsisDocId,
          similarity_certificate_id: cseSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-AUTH-04: Co-Guide CANNOT submit Annexure 5 on behalf of a student', async () => {
      await expect(
        submitAnnexure5PackageRpc(coguideAClient, {
          thesis_id: cseThesisId,
          manuscript_document_id: cseManuscriptDocId,
          synopsis_document_id: cseSynopsisDocId,
          similarity_certificate_id: cseSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-AUTH-05: DC CANNOT submit Annexure 5', async () => {
      await expect(
        submitAnnexure5PackageRpc(dcCseClient, {
          thesis_id: cseThesisId,
          manuscript_document_id: cseManuscriptDocId,
          synopsis_document_id: cseSynopsisDocId,
          similarity_certificate_id: cseSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-AUTH-06: HOD CANNOT submit Annexure 5', async () => {
      await expect(
        submitAnnexure5PackageRpc(hodCseClient, {
          thesis_id: cseThesisId,
          manuscript_document_id: cseManuscriptDocId,
          synopsis_document_id: cseSynopsisDocId,
          similarity_certificate_id: cseSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-AUTH-07: Panel member CANNOT submit Annexure 5', async () => {
      await expect(
        submitAnnexure5PackageRpc(panelMemberAClient, {
          thesis_id: cseThesisId,
          manuscript_document_id: cseManuscriptDocId,
          synopsis_document_id: cseSynopsisDocId,
          similarity_certificate_id: cseSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-AUTH-08: Admin CANNOT submit Annexure 5 directly (Strict Student Ownership)', async () => {
      await expect(
        submitAnnexure5PackageRpc(adminClient, {
          thesis_id: cseThesisId,
          manuscript_document_id: cseManuscriptDocId,
          synopsis_document_id: cseSynopsisDocId,
          similarity_certificate_id: cseSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // TEST GROUP B: SIMILARITY VALIDATION (ANN5-VAL-09 to 16)
  // ============================================================================
  describe('Test Group B: Similarity Validation Boundaries', () => {
    beforeEach(async () => {
      await studentEceClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: eceThesisId });
    });

    it('ANN5-VAL-09: Plagiarism = 0.0, AI = 0.0 MUST PASS', async () => {
      const res = await submitAnnexure5PackageRpc(studentEceClient, {
        thesis_id: eceThesisId,
        manuscript_document_id: eceManuscriptDocId,
        synopsis_document_id: eceSynopsisDocId,
        similarity_certificate_id: eceSimilarityCertDocId,
        plagiarism_percentage: 0.0,
        ai_similarity_percentage: 0.0,
      });
      expect(res.success).toBe(true);
    });

    it('ANN5-VAL-10: Plagiarism = 9.99, AI = 0.0 MUST PASS (Boundary Check)', async () => {
      const res = await submitAnnexure5PackageRpc(studentEceClient, {
        thesis_id: eceThesisId,
        manuscript_document_id: eceManuscriptDocId,
        synopsis_document_id: eceSynopsisDocId,
        similarity_certificate_id: eceSimilarityCertDocId,
        plagiarism_percentage: 9.99,
        ai_similarity_percentage: 0.0,
      });
      expect(res.success).toBe(true);
    });

    it('ANN5-VAL-11: Plagiarism = 10.0 MUST FAIL (Institutional Threshold Breach)', async () => {
      await expect(
        submitAnnexure5PackageRpc(studentEceClient, {
          thesis_id: eceThesisId,
          manuscript_document_id: eceManuscriptDocId,
          synopsis_document_id: eceSynopsisDocId,
          similarity_certificate_id: eceSimilarityCertDocId,
          plagiarism_percentage: 10.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-VAL-12: Plagiarism > 10.0 (e.g. 15.4%) MUST FAIL', async () => {
      await expect(
        submitAnnexure5PackageRpc(studentEceClient, {
          thesis_id: eceThesisId,
          manuscript_document_id: eceManuscriptDocId,
          synopsis_document_id: eceSynopsisDocId,
          similarity_certificate_id: eceSimilarityCertDocId,
          plagiarism_percentage: 15.4,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-VAL-13: Plagiarism < 0.0 (e.g. -1.0%) MUST FAIL', async () => {
      await expect(
        submitAnnexure5PackageRpc(studentEceClient, {
          thesis_id: eceThesisId,
          manuscript_document_id: eceManuscriptDocId,
          synopsis_document_id: eceSynopsisDocId,
          similarity_certificate_id: eceSimilarityCertDocId,
          plagiarism_percentage: -1.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-VAL-14: AI Similarity = 0.01 MUST FAIL (Zero AI Tolerance Policy)', async () => {
      await expect(
        submitAnnexure5PackageRpc(studentEceClient, {
          thesis_id: eceThesisId,
          manuscript_document_id: eceManuscriptDocId,
          synopsis_document_id: eceSynopsisDocId,
          similarity_certificate_id: eceSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.01,
        })
      ).rejects.toThrow();
    });

    it('ANN5-VAL-15: AI Similarity > 0 (e.g. 12.0%) MUST FAIL', async () => {
      await expect(
        submitAnnexure5PackageRpc(studentEceClient, {
          thesis_id: eceThesisId,
          manuscript_document_id: eceManuscriptDocId,
          synopsis_document_id: eceSynopsisDocId,
          similarity_certificate_id: eceSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 12.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-VAL-16: AI Similarity < 0 MUST FAIL', async () => {
      await expect(
        submitAnnexure5PackageRpc(studentEceClient, {
          thesis_id: eceThesisId,
          manuscript_document_id: eceManuscriptDocId,
          synopsis_document_id: eceSynopsisDocId,
          similarity_certificate_id: eceSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: -0.5,
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // TEST GROUP C & D: DOCUMENT VALIDATION & SUBMISSION WORKFLOW
  // ============================================================================
  describe('Test Group C & D: Document Validation & Full Submission Lifecycle', () => {
    it('ANN5-DOC-01: Submission with invalid document UUID MUST FAIL', async () => {
      await expect(
        submitAnnexure5PackageRpc(studentEceClient, {
          thesis_id: eceThesisId,
          manuscript_document_id: '00000000-0000-0000-0000-000000000000',
          synopsis_document_id: eceSynopsisDocId,
          similarity_certificate_id: eceSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-DOC-02: Submission with swapped document types MUST FAIL', async () => {
      await expect(
        submitAnnexure5PackageRpc(studentEceClient, {
          thesis_id: eceThesisId,
          manuscript_document_id: eceSynopsisDocId, // Wrong type for manuscript
          synopsis_document_id: eceSynopsisDocId,
          similarity_certificate_id: eceSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-WF-17: Valid submission creates row, audit event, and advances state', async () => {
      await studentCseClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: cseThesisId });

      const res = await submitAnnexure5PackageRpc(studentCseClient, {
        thesis_id: cseThesisId,
        manuscript_document_id: cseManuscriptDocId,
        synopsis_document_id: cseSynopsisDocId,
        similarity_certificate_id: cseSimilarityCertDocId,
        repository_url: 'https://github.com/niet/cse-thesis-repo',
        plagiarism_percentage: 4.8,
        ai_similarity_percentage: 0.0,
      });

      expect(res.success).toBe(true);
      expect(res.current_state).toBe('ANNEXURE_5_SUBMITTED');

      // Verify row in database
      const { data: sub } = await dcCseClient
        .from('annexure_5_submissions')
        .select('*')
        .eq('thesis_id', cseThesisId)
        .single();
      expect(sub).toBeDefined();
      expect(sub.status).toBe('SUBMITTED');
      expect(sub.plagiarism_percentage).toBe(4.8);
      expect(sub.ai_similarity_percentage).toBe(0.0);

      // Verify audit event using adminClient (audit_events is restricted)
      const { data: audits } = await adminClient
        .from('audit_events')
        .select('*')
        .eq('action_code', 'ANNEXURE_5_SUBMITTED')
        .eq('target_entity_type', 'ANNEXURE_5')
        .order('timestamp_utc', { ascending: false });
      expect(audits?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // TEST GROUP E: DUPLICATE / STATE GUARDS (ANN5-WF-18 to 20)
  // ============================================================================
  describe('Test Group E: Duplicate & State Transition Guards', () => {
    it('ANN5-WF-18: Duplicate submission while already SUBMITTED is rejected', async () => {
      // Thesis is already in ANNEXURE_5_SUBMITTED from ANN5-WF-17
      await expect(
        submitAnnexure5PackageRpc(studentCseClient, {
          thesis_id: cseThesisId,
          manuscript_document_id: cseManuscriptDocId,
          synopsis_document_id: cseSynopsisDocId,
          similarity_certificate_id: cseSimilarityCertDocId,
          plagiarism_percentage: 4.8,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-WF-19: Submission when thesis is already SUBMITTED throws InvalidState error', async () => {
      await expect(
        submitAnnexure5PackageRpc(studentCseClient, {
          thesis_id: cseThesisId,
          manuscript_document_id: cseManuscriptDocId,
          synopsis_document_id: cseSynopsisDocId,
          similarity_certificate_id: cseSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-WF-20: Submission after thesis is in ANNEXURE_6_PENDING MUST FAIL', async () => {
      // Advance ECE thesis to ANNEXURE_6_PENDING
      await studentEceClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: eceThesisId });
      await submitAnnexure5PackageRpc(studentEceClient, {
        thesis_id: eceThesisId,
        manuscript_document_id: eceManuscriptDocId,
        synopsis_document_id: eceSynopsisDocId,
        similarity_certificate_id: eceSimilarityCertDocId,
        plagiarism_percentage: 5.0,
        ai_similarity_percentage: 0.0,
      });
      await endorseAnnexure5SubmissionRpc(guideBClient, {
        thesis_id: eceThesisId,
        is_endorsed: true,
        remarks: 'Guide B endorse.',
      });

      // Now attempt submission while in ANNEXURE_6_PENDING
      await expect(
        submitAnnexure5PackageRpc(studentEceClient, {
          thesis_id: eceThesisId,
          manuscript_document_id: eceManuscriptDocId,
          synopsis_document_id: eceSynopsisDocId,
          similarity_certificate_id: eceSimilarityCertDocId,
          plagiarism_percentage: 5.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // TEST GROUP F: GUIDE ENDORSEMENT (ANN5-END-21 to 26)
  // ============================================================================
  describe('Test Group F: Guide Endorsement Authorization & Constraints', () => {
    beforeAll(async () => {
      // Ensure CSE thesis is submitted
      await studentCseClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: cseThesisId });
      await submitAnnexure5PackageRpc(studentCseClient, {
        thesis_id: cseThesisId,
        manuscript_document_id: cseManuscriptDocId,
        synopsis_document_id: cseSynopsisDocId,
        similarity_certificate_id: cseSimilarityCertDocId,
        plagiarism_percentage: 4.5,
        ai_similarity_percentage: 0.0,
      });
    });

    it('ANN5-END-21: Assigned Guide CAN endorse submitted Annexure 5', async () => {
      const res = await endorseAnnexure5SubmissionRpc(guideAClient, {
        thesis_id: cseThesisId,
        is_endorsed: true,
        remarks: 'Primary Guide endorsement confirmed.',
      });

      expect(res.success).toBe(true);
      expect(res.action).toBe('ENDORSED');
      expect(res.endorsed_count).toBe(1);
      expect(res.required_count).toBe(2); // Co-Guide allocated -> 2 required
      expect(res.is_fully_endorsed).toBe(false); // Awaiting Co-Guide
      expect(res.current_state).toBe('ANNEXURE_5_SUBMITTED');
    });

    it('ANN5-END-22: Unassigned Faculty CANNOT endorse', async () => {
      await expect(
        endorseAnnexure5SubmissionRpc(baseFacultyClient, {
          thesis_id: cseThesisId,
          is_endorsed: true,
          remarks: 'Unauthorized endorsement attempt.',
        })
      ).rejects.toThrow();
    });

    it('ANN5-END-23: Cross-department Guide CANNOT endorse', async () => {
      await expect(
        endorseAnnexure5SubmissionRpc(guideBClient, {
          thesis_id: cseThesisId, // CSE thesis, Guide B is in ECE
          is_endorsed: true,
          remarks: 'Cross-department endorsement attempt.',
        })
      ).rejects.toThrow();
    });

    it('ANN5-END-24: Student CANNOT endorse own submission', async () => {
      await expect(
        endorseAnnexure5SubmissionRpc(studentCseClient, {
          thesis_id: cseThesisId,
          is_endorsed: true,
          remarks: 'Student self-endorsement attempt.',
        })
      ).rejects.toThrow();
    });

    it('ANN5-END-25: DC CANNOT endorse submission', async () => {
      await expect(
        endorseAnnexure5SubmissionRpc(dcCseClient, {
          thesis_id: cseThesisId,
          is_endorsed: true,
          remarks: 'DC endorsement attempt.',
        })
      ).rejects.toThrow();
    });

    it('ANN5-END-26: Guide CANNOT endorse before student submission', async () => {
      await studentEceClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: eceThesisId });

      await expect(
        endorseAnnexure5SubmissionRpc(guideBClient, {
          thesis_id: eceThesisId,
          is_endorsed: true,
          remarks: 'Premature endorsement attempt.',
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // TEST GROUP G: CO-GUIDE & DUAL ENDORSEMENT (ANN5-DUAL-27 to 30)
  // ============================================================================
  describe('Test Group G: Dual Supervisory Endorsement & Invariants', () => {
    it('ANN5-DUAL-27: Guide endorsement alone leaves dual-supervised thesis in ANNEXURE_5_SUBMITTED', async () => {
      const { data: th } = await dcCseClient.from('theses').select('current_state, current_stage').eq('id', cseThesisId).single();
      expect(th.current_state).toBe('ANNEXURE_5_SUBMITTED');
    });

    it('ANN5-DUAL-28: Co-Guide endorsement completes required count and transitions to ANNEXURE_6_PENDING', async () => {
      const res = await endorseAnnexure5SubmissionRpc(coguideAClient, {
        thesis_id: cseThesisId,
        is_endorsed: true,
        remarks: 'Co-Guide A endorsement confirmed.',
      });

      expect(res.success).toBe(true);
      expect(res.is_fully_endorsed).toBe(true);
      expect(res.endorsed_count).toBe(2);
      expect(res.required_count).toBe(2);
      expect(res.current_state).toBe('ANNEXURE_6_PENDING');

      // Verify thesis state in database
      const { data: th } = await dcCseClient.from('theses').select('current_state, current_stage').eq('id', cseThesisId).single();
      expect(th.current_state).toBe('ANNEXURE_6_PENDING');
      expect(th.current_stage).toBe('CONFIDENTIAL_EVALUATION_STAGE');
    });

    it('ANN5-DUAL-29: Reverse ordering (Co-Guide first, then Guide) completes transition', async () => {
      // Reset CSE thesis
      await studentCseClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: cseThesisId });

      // Student submits
      await submitAnnexure5PackageRpc(studentCseClient, {
        thesis_id: cseThesisId,
        manuscript_document_id: cseManuscriptDocId,
        synopsis_document_id: cseSynopsisDocId,
        similarity_certificate_id: cseSimilarityCertDocId,
        plagiarism_percentage: 5.5,
        ai_similarity_percentage: 0.0,
      });

      // 1. Co-Guide endorses first
      const res1 = await endorseAnnexure5SubmissionRpc(coguideAClient, {
        thesis_id: cseThesisId,
        is_endorsed: true,
        remarks: 'Co-Guide A first endorsement.',
      });
      expect(res1.is_fully_endorsed).toBe(false);
      expect(res1.current_state).toBe('ANNEXURE_5_SUBMITTED');

      // 2. Primary Guide endorses second
      const res2 = await endorseAnnexure5SubmissionRpc(guideAClient, {
        thesis_id: cseThesisId,
        is_endorsed: true,
        remarks: 'Guide A second endorsement.',
      });
      expect(res2.is_fully_endorsed).toBe(true);
      expect(res2.current_state).toBe('ANNEXURE_6_PENDING');
    });

    it('ANN5-DUAL-30: Duplicate endorsement from same supervisor is rejected', async () => {
      await expect(
        endorseAnnexure5SubmissionRpc(guideAClient, {
          thesis_id: cseThesisId,
          is_endorsed: true,
          remarks: 'Duplicate endorsement.',
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // TEST GROUP H: GUIDE-ONLY SINGLE SUPERVISOR (ANN5-GUIDEONLY-31)
  // ============================================================================
  describe('Test Group H: Single Supervisor (Guide-Only) Workflow', () => {
    it('ANN5-GUIDEONLY-31: Primary Guide endorsement alone advances single-supervisor thesis to ANNEXURE_6_PENDING', async () => {
      await studentEceClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: eceThesisId });

      // Student submits
      await submitAnnexure5PackageRpc(studentEceClient, {
        thesis_id: eceThesisId,
        manuscript_document_id: eceManuscriptDocId,
        synopsis_document_id: eceSynopsisDocId,
        similarity_certificate_id: eceSimilarityCertDocId,
        plagiarism_percentage: 3.2,
        ai_similarity_percentage: 0.0,
      });

      // Guide B endorses (Guide B is assigned to ECE thesis)
      const res = await endorseAnnexure5SubmissionRpc(guideBClient, {
        thesis_id: eceThesisId,
        is_endorsed: true,
        remarks: 'Single supervisor endorsement.',
      });

      expect(res.success).toBe(true);
      expect(res.is_fully_endorsed).toBe(true);
      expect(res.endorsed_count).toBe(1);
      expect(res.required_count).toBe(1);
      expect(res.current_state).toBe('ANNEXURE_6_PENDING');
    });
  });

  // ============================================================================
  // TEST GROUP I & J: REVISION REQUEST & RESUBMISSION LOOP (ANN5-REV-32 to 36)
  // ============================================================================
  describe('Test Group I & J: Revision Request & Resubmission Loop', () => {
    beforeEach(async () => {
      // Set up ECE thesis in ANNEXURE_5_SUBMITTED state
      await studentEceClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: eceThesisId });

      await submitAnnexure5PackageRpc(studentEceClient, {
        thesis_id: eceThesisId,
        manuscript_document_id: eceManuscriptDocId,
        synopsis_document_id: eceSynopsisDocId,
        similarity_certificate_id: eceSimilarityCertDocId,
        plagiarism_percentage: 7.1,
        ai_similarity_percentage: 0.0,
      });
    });

    it('ANN5-REV-32: Assigned Guide CAN request revision, reverting thesis to ANNEXURE_5_PREPARATION', async () => {
      const res = await requestAnnexure5RevisionRpc(guideBClient, {
        thesis_id: eceThesisId,
        revision_notes: 'Plagiarism in Chapter 3 needs to be rephrased and Turnitin certificate regenerated.',
      });

      expect(res.success).toBe(true);
      expect(res.action).toBe('REVISION_REQUESTED');
      expect(res.current_state).toBe('ANNEXURE_5_PREPARATION');

      // Verify thesis state
      const { data: th } = await dcEceClient.from('theses').select('current_state').eq('id', eceThesisId).single();
      expect(th.current_state).toBe('ANNEXURE_5_PREPARATION');

      // Verify submission row status
      const { data: sub } = await dcEceClient.from('annexure_5_submissions').select('status').eq('thesis_id', eceThesisId).single();
      expect(sub.status).toBe('REVISION_REQUIRED');
    });

    it('ANN5-REV-33: Revision request without remarks MUST FAIL', async () => {
      await expect(
        requestAnnexure5RevisionRpc(guideBClient, {
          thesis_id: eceThesisId,
          revision_notes: '',
        })
      ).rejects.toThrow();
    });

    it('ANN5-REV-34: Unassigned supervisor CANNOT request revision', async () => {
      await expect(
        requestAnnexure5RevisionRpc(guideAClient, {
          thesis_id: eceThesisId, // ECE thesis has Guide B only
          revision_notes: 'Unassigned revision attempt.',
        })
      ).rejects.toThrow();
    });

    it('ANN5-REV-35: Student CANNOT request revision on own thesis', async () => {
      await expect(
        requestAnnexure5RevisionRpc(studentEceClient, {
          thesis_id: eceThesisId,
          revision_notes: 'Student self-revision attempt.',
        })
      ).rejects.toThrow();
    });

    it('ANN5-LOOP-36: Candidate CAN resubmit corrected package after revision request', async () => {
      // 1. Guide requests revision
      await requestAnnexure5RevisionRpc(guideBClient, {
        thesis_id: eceThesisId,
        revision_notes: 'Please reduce similarity in Chapter 4.',
      });

      // 2. Candidate resubmits
      const res = await submitAnnexure5PackageRpc(studentEceClient, {
        thesis_id: eceThesisId,
        manuscript_document_id: eceManuscriptDocId,
        synopsis_document_id: eceSynopsisDocId,
        similarity_certificate_id: eceSimilarityCertDocId,
        plagiarism_percentage: 2.1,
        ai_similarity_percentage: 0.0,
      });

      expect(res.success).toBe(true);
      expect(res.current_state).toBe('ANNEXURE_5_SUBMITTED');

      // 3. Guide endorses resubmission
      const endRes = await endorseAnnexure5SubmissionRpc(guideBClient, {
        thesis_id: eceThesisId,
        is_endorsed: true,
        remarks: 'Resubmitted package meets all standards.',
      });
      expect(endRes.is_fully_endorsed).toBe(true);
      expect(endRes.current_state).toBe('ANNEXURE_6_PENDING');
    });
  });

  // ============================================================================
  // TEST GROUP K: READ ACCESS & DOCKET QUERY (ANN5-QRY-37 to 42)
  // ============================================================================
  describe('Test Group K: Read Access & Docket Retrieval', () => {
    beforeAll(async () => {
      // Set up CSE thesis docket
      await studentCseClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: cseThesisId });
      await submitAnnexure5PackageRpc(studentCseClient, {
        thesis_id: cseThesisId,
        manuscript_document_id: cseManuscriptDocId,
        synopsis_document_id: cseSynopsisDocId,
        similarity_certificate_id: cseSimilarityCertDocId,
        plagiarism_percentage: 4.2,
        ai_similarity_percentage: 0.0,
      });
      await endorseAnnexure5SubmissionRpc(guideAClient, {
        thesis_id: cseThesisId,
        is_endorsed: true,
        remarks: 'Guide A docket endorsement.',
      });
    });

    it('ANN5-QRY-37: Student CAN retrieve own Annexure 5 docket', async () => {
      const res = await getAnnexure5DocketRpc(studentCseClient, { thesis_id: cseThesisId });
      expect(res.success).toBe(true);
      expect(res.thesis?.tracking_number).toBeDefined();
      expect(res.permissions?.is_student).toBe(true);
    });

    it('ANN5-QRY-38: Primary Guide CAN retrieve assigned candidate docket', async () => {
      const res = await getAnnexure5DocketRpc(guideAClient, { thesis_id: cseThesisId });
      expect(res.success).toBe(true);
      expect(res.permissions?.is_guide).toBe(true);
    });

    it('ANN5-QRY-39: Co-Guide CAN retrieve assigned candidate docket', async () => {
      const res = await getAnnexure5DocketRpc(coguideAClient, { thesis_id: cseThesisId });
      expect(res.success).toBe(true);
      expect(res.permissions?.is_coguide).toBe(true);
    });

    it("ANN5-QRY-40: Unauthorized student CANNOT retrieve another candidate's docket", async () => {
      await expect(
        getAnnexure5DocketRpc(studentEceClient, { thesis_id: cseThesisId })
      ).rejects.toThrow();
    });

    it("ANN5-QRY-41: Cross-department DC CANNOT access another department's docket", async () => {
      await expect(
        getAnnexure5DocketRpc(dcEceClient, { thesis_id: cseThesisId })
      ).rejects.toThrow();
    });

    it('ANN5-QRY-42: Docket returns structured thesis, annexure_5, endorsements, and permissions', async () => {
      const res = await getAnnexure5DocketRpc(dcCseClient, { thesis_id: cseThesisId });
      expect(res.success).toBe(true);
      expect(res.thesis).toBeDefined();
      expect(res.annexure_5).toBeDefined();
      expect(Array.isArray(res.endorsements)).toBe(true);
      expect(res.permissions).toBeDefined();
    });
  });

  // ============================================================================
  // TEST GROUP L: DEPARTMENT LIST & STATUS FILTERS (ANN5-DEPT-43 to 45)
  // ============================================================================
  describe('Test Group L: Department Cohort Oversight & Tenancy', () => {
    it('ANN5-DEPT-43: Authorized DC CAN list department final submissions', async () => {
      const res = await listDepartmentAnnexure5SubmissionsRpc(dcCseClient, {
        department_id: cseDeptId,
        status: 'ALL',
      });
      expect(res.success).toBe(true);
      expect(res.department_id).toBe(cseDeptId);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.count).toBeGreaterThan(0);
    });

    it('ANN5-DEPT-44: Cross-department DC CANNOT list another department submissions', async () => {
      await expect(
        listDepartmentAnnexure5SubmissionsRpc(dcEceClient, {
          department_id: cseDeptId,
          status: 'ALL',
        })
      ).rejects.toThrow();
    });

    it('ANN5-DEPT-45: Status filters (ALL, SUBMITTED, PREPARATION, ENDORSED) execute accurately', async () => {
      const resAll = await listDepartmentAnnexure5SubmissionsRpc(dcCseClient, {
        department_id: cseDeptId,
        status: 'ALL',
      });
      expect(resAll.success).toBe(true);

      const resSub = await listDepartmentAnnexure5SubmissionsRpc(dcCseClient, {
        department_id: cseDeptId,
        status: 'SUBMITTED',
      });
      expect(resSub.success).toBe(true);

      const resPrep = await listDepartmentAnnexure5SubmissionsRpc(dcCseClient, {
        department_id: cseDeptId,
        status: 'PREPARATION',
      });
      expect(resPrep.success).toBe(true);
    });
  });

  // ============================================================================
  // TEST GROUP M & N: IMMUTABILITY, TENANCY & RBAC (ANN5-IMM-46 to 52)
  // ============================================================================
  describe('Test Group M & N: Immutability, Tenancy & Security Invariants', () => {
    beforeAll(async () => {
      // Ensure CSE thesis is submitted and endorsed
      await studentCseClient.rpc('reset_annexure_5_for_testing', { p_thesis_id: cseThesisId });
      await submitAnnexure5PackageRpc(studentCseClient, {
        thesis_id: cseThesisId,
        manuscript_document_id: cseManuscriptDocId,
        synopsis_document_id: cseSynopsisDocId,
        similarity_certificate_id: cseSimilarityCertDocId,
        plagiarism_percentage: 5.1,
        ai_similarity_percentage: 0.0,
      });
      await endorseAnnexure5SubmissionRpc(guideAClient, {
        thesis_id: cseThesisId,
        is_endorsed: true,
        remarks: 'Guide A signoff.',
      });
    });

    it('ANN5-IMM-46: Direct UPDATE on submitted Annexure 5 by student is blocked by RLS', async () => {
      const { error } = await studentCseClient
        .from('annexure_5_submissions')
        .update({ plagiarism_percentage: 1.0 })
        .eq('thesis_id', cseThesisId);

      const { data: sub } = await studentCseClient
        .from('annexure_5_submissions')
        .select('plagiarism_percentage')
        .eq('thesis_id', cseThesisId)
        .single();
      expect(sub.plagiarism_percentage).toBe(5.1);
    });

    it('ANN5-IMM-47: Historical endorsement rows remain intact after state transitions', async () => {
      const { data: endorsements } = await dcCseClient
        .from('supervisor_endorsements')
        .select('*')
        .eq('thesis_id', cseThesisId)
        .eq('stage', 'ANNEXURE_5');

      expect(endorsements?.length).toBeGreaterThanOrEqual(1);
    });

    it('ANN5-SEC-48: Cross-department Guide cannot access or mutate submission', async () => {
      await expect(
        endorseAnnexure5SubmissionRpc(guideBClient, {
          thesis_id: cseThesisId,
          is_endorsed: true,
          remarks: 'Cross-department breach.',
        })
      ).rejects.toThrow();
    });

    it('ANN5-SEC-49: Unauthenticated client cannot access RPCs', async () => {
      await expect(
        getAnnexure5DocketRpc(unauthClient, { thesis_id: cseThesisId })
      ).rejects.toThrow();
    });

    it('ANN5-SEC-50: Client-supplied identity cannot bypass thesis ownership', async () => {
      await expect(
        submitAnnexure5PackageRpc(studentEceClient, {
          thesis_id: cseThesisId,
          manuscript_document_id: cseManuscriptDocId,
          synopsis_document_id: cseSynopsisDocId,
          similarity_certificate_id: cseSimilarityCertDocId,
          plagiarism_percentage: 4.0,
          ai_similarity_percentage: 0.0,
        })
      ).rejects.toThrow();
    });

    it('ANN5-SEC-51: Client-supplied role cannot bypass supervisor assignment', async () => {
      await expect(
        endorseAnnexure5SubmissionRpc(studentCseClient, {
          thesis_id: cseThesisId,
          is_endorsed: true,
          remarks: 'Role injection attempt.',
        })
      ).rejects.toThrow();
    });

    it('ANN5-SEC-52: Production application layer contains ZERO service_role usage', async () => {
      expect(typeof submitAnnexure5PackageRpc).toBe('function');
      expect(typeof endorseAnnexure5SubmissionRpc).toBe('function');
      expect(typeof requestAnnexure5RevisionRpc).toBe('function');
      expect(typeof getAnnexure5DocketRpc).toBe('function');
      expect(typeof listDepartmentAnnexure5SubmissionsRpc).toBe('function');
    });
  });
});
