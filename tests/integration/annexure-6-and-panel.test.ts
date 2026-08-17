import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getPersonaByKey } from '@/lib/auth/personas';
import { getStudentActiveThesis } from '@/lib/dal/theses.dal';
import { submitAnnexure1Rpc } from '@/lib/dal/annexures.dal';
import { verifyAndForwardDcecDocketRpc, recordDcecScreeningDecisionRpc } from '@/lib/dal/dcec.dal';
import { allocateThesisSupervisorsRpc } from '@/lib/dal/allocation.dal';
import { submitAnnexure2Rpc, endorseAnnexure2Rpc, decideAnnexure2TitleRpc } from '@/lib/dal/annexure2.dal';
import { listDepartmentFacultyForPreferences } from '@/lib/dal/faculty.dal';
import {
  submitAnnexure5PackageRpc,
  endorseAnnexure5SubmissionRpc,
} from '@/lib/dal/annexure5.dal';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM0MTI4MDB9.dummy';
const DEV_PASSWORD = process.env.DEV_AUTH_PASSWORD || 'LocalDevPassword123!';

describe('Phase 5M — Confidential Annexure 6 Evaluation & Oral Defense Panel Constitution Suite', () => {
  let adminClient: any;
  let studentCseClient: any;
  let studentEceClient: any;
  let guideAClient: any;
  let guideBClient: any;
  let coguideAClient: any;
  let dcCseClient: any;
  let dcEceClient: any;
  let hodCseClient: any;
  let hodEceClient: any;
  let baseFacultyClient: any;
  let panelMemberAClient: any;
  let panelMemberBClient: any;
  let unauthClient: any;

  let sCsePersona: any;
  let sEcePersona: any;
  let gAPersona: any;
  let gBPersona: any;
  let cgAPersona: any;
  let panelAPersona: any;
  let panelBPersona: any;

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

  const createAuthenticatedClient = async (email: string) => {
    const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await c.auth.signInWithPassword({
      email,
      password: DEV_PASSWORD,
    });
    if (error || !data.session) {
      throw new Error(`Failed to sign in persona ${email}: ${error?.message}`);
    }
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  };

  const advanceThesisToAnnexure6Pending = async (
    studentClient: any,
    guideClient: any,
    coguideClient: any,
    thesisId: string,
    manuscriptId: string,
    synopsisId: string,
    similarityId: string
  ) => {
    // 1. Submit Annexure 5
    await submitAnnexure5PackageRpc(studentClient, {
      thesis_id: thesisId,
      manuscript_document_id: manuscriptId,
      synopsis_document_id: synopsisId,
      similarity_certificate_id: similarityId,
      repository_url: 'https://github.com/niet-test/final-dissertation',
      plagiarism_percentage: 4.5,
      ai_similarity_percentage: 0.0,
      client_ip: '127.0.0.1',
      user_agent: 'Vitest Test Agent',
    });

    // 2. Guide Endorsement
    await endorseAnnexure5SubmissionRpc(guideClient, {
      thesis_id: thesisId,
      is_endorsed: true,
      remarks: 'Primary Guide verifies compliance with anti-plagiarism and formatting rules.',
      client_ip: '127.0.0.1',
      user_agent: 'Vitest Test Agent',
    });

    // 3. Co-Guide Endorsement (if assigned)
    if (coguideClient) {
      await endorseAnnexure5SubmissionRpc(coguideClient, {
        thesis_id: thesisId,
        is_endorsed: true,
        remarks: 'Co-Guide endorses final dissertation manuscript.',
        client_ip: '127.0.0.1',
        user_agent: 'Vitest Test Agent',
      });
    }
  };

  beforeAll(async () => {
    // 1. Resolve Personas
    sCsePersona = getPersonaByKey('STUDENT_CSE')!;
    sEcePersona = getPersonaByKey('STUDENT_ECE')!;
    gAPersona = getPersonaByKey('GUIDE_A')!;
    gBPersona = getPersonaByKey('GUIDE_B')!;
    cgAPersona = getPersonaByKey('COGUIDE_A')!;
    panelAPersona = getPersonaByKey('PANEL_A')!;
    panelBPersona = getPersonaByKey('PANEL_B')!;

    // 2. Authenticate Personas
    studentCseClient = await createAuthenticatedClient(sCsePersona.email);
    studentEceClient = await createAuthenticatedClient(sEcePersona.email);
    guideAClient = await createAuthenticatedClient(gAPersona.email);
    guideBClient = await createAuthenticatedClient(gBPersona.email);
    coguideAClient = await createAuthenticatedClient(cgAPersona.email);
    dcCseClient = await createAuthenticatedClient(getPersonaByKey('DC_CSE')!.email);
    dcEceClient = await createAuthenticatedClient(getPersonaByKey('DC_ECE')!.email);
    hodCseClient = await createAuthenticatedClient(getPersonaByKey('HOD_CSE')!.email);
    hodEceClient = await createAuthenticatedClient(getPersonaByKey('HOD_ECE')!.email);
    baseFacultyClient = await createAuthenticatedClient(getPersonaByKey('BASE_FACULTY')!.email);
    panelMemberAClient = await createAuthenticatedClient(panelAPersona.email);
    panelMemberBClient = await createAuthenticatedClient(panelBPersona.email);
    adminClient = await createAuthenticatedClient(getPersonaByKey('ADMIN_USR')!.email);
    unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    // 3. Resolve department IDs
    const { data: depts } = await dcCseClient.from('departments').select('id, code');
    cseDeptId = depts?.find((d: any) => d.code === 'CSE')?.id!;
    eceDeptId = depts?.find((d: any) => d.code === 'ECE')?.id!;

    // 4. Ensure Thesis Records exist and reach ANNEXURE_5_PREPARATION
    const cseThesis = await getStudentActiveThesis(studentCseClient, sCsePersona.id);
    cseThesisId = cseThesis!.id;

    const eceThesis = await getStudentActiveThesis(studentEceClient, sEcePersona.id);
    eceThesisId = eceThesis!.id;

    // 5. Seed Documents for CSE thesis using student client
    const { data: cseDoc1, error: e1 } = await studentCseClient
      .from('documents')
      .insert({
        thesis_id: cseThesisId,
        document_type: 'THESIS_MANUSCRIPT_ANNEXURE_5',
        created_by: sCsePersona.id,
      })
      .select('id')
      .single();
    if (e1 || !cseDoc1) throw new Error(`Failed to create CSE manuscript doc: ${e1?.message}`);
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
    if (e2 || !cseDoc2) throw new Error(`Failed to create CSE synopsis doc: ${e2?.message}`);
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
    if (e3 || !cseDoc3) throw new Error(`Failed to create CSE similarity cert: ${e3?.message}`);
    cseSimilarityCertDocId = cseDoc3.id;

    // 6. Reset CSE Thesis to ANNEXURE_6_PENDING for testing
    await adminClient.rpc('reset_annexure_6_for_testing', { p_thesis_id: cseThesisId });

    // 7. Seed Published FINAL_VIVA Rubric for CSE Department
    const { data: existingRubric } = await adminClient
      .from('rubrics')
      .select('id')
      .eq('department_id', cseDeptId)
      .eq('milestone_type', 'FINAL_VIVA')
      .maybeSingle();

    let rId = existingRubric?.id;
    if (!rId) {
      const { data: newR } = await adminClient
        .from('rubrics')
        .insert({
          department_id: cseDeptId,
          milestone_type: 'FINAL_VIVA',
          title: 'CSE Final Oral Viva Defense Rubric',
          max_score: 100.0,
        })
        .select('id')
        .single();
      rId = newR?.id;
    }

    if (rId) {
      const { data: existingVer } = await adminClient
        .from('rubric_versions')
        .select('id, is_published')
        .eq('rubric_id', rId)
        .maybeSingle();

      if (!existingVer) {
        const { data: newV } = await adminClient
          .from('rubric_versions')
          .insert({
            rubric_id: rId,
            version_number: 1,
            is_published: false,
            effective_from: '2026-08-01',
          })
          .select('id')
          .single();

        if (newV) {
          await adminClient.from('rubric_criteria').insert([
            { rubric_version_id: newV.id, sequence_order: 1, criterion_title: 'Presentation & Technical Rigor', max_marks: 40.0 },
            { rubric_version_id: newV.id, sequence_order: 2, criterion_title: 'Originality & Methodology', max_marks: 30.0 },
            { rubric_version_id: newV.id, sequence_order: 3, criterion_title: 'Defense of Questions & Viva Response', max_marks: 30.0 },
          ]);

          await adminClient.from('rubric_versions').update({ is_published: true }).eq('id', newV.id);
        }
      } else if (!existingVer.is_published) {
        await adminClient.from('rubric_criteria').upsert([
          { rubric_version_id: existingVer.id, sequence_order: 1, criterion_title: 'Presentation & Technical Rigor', max_marks: 40.0 },
          { rubric_version_id: existingVer.id, sequence_order: 2, criterion_title: 'Originality & Methodology', max_marks: 30.0 },
          { rubric_version_id: existingVer.id, sequence_order: 3, criterion_title: 'Defense of Questions & Viva Response', max_marks: 30.0 },
        ]);
        await adminClient.from('rubric_versions').update({ is_published: true }).eq('id', existingVer.id);
      }
    }
  });

  // ==========================================================================
  // GROUP A: GUIDE AUTHORIZATION
  // ==========================================================================
  describe('Group A: Guide Authorization for Annexure 6 Evaluation', () => {
    it('TC-A01: Primary Guide of record can submit Annexure 6 confidential evaluation', async () => {
      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 92.5,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'PROFICIENT',
        p_confidential_remarks: 'Candidate has shown outstanding research rigor and implemented novel algorithms.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.data.supervisor_score).toBe(92.5);
      expect(data.data.new_state).toBe('DEFENSE_PANEL_CONSTITUTED');
    });

    it('TC-A02: Student candidate is blocked from submitting Annexure 6 evaluation', async () => {
      await adminClient.rpc('reset_annexure_6_for_testing', { p_thesis_id: cseThesisId });

      const { data, error } = await studentCseClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 95.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: 'Student self-appraisal attempt.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Only the assigned primary Guide');
    });

    it('TC-A03: Co-Guide is blocked from submitting Annexure 6 evaluation (OD-014)', async () => {
      const { data, error } = await coguideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 88.0,
        p_regularity_rating: 'PROFICIENT',
        p_technical_proficiency: 'PROFICIENT',
        p_rigor_rating: 'PROFICIENT',
        p_confidential_remarks: 'Co-Guide evaluation attempt.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Only the assigned primary Guide');
    });

    it('TC-A04: Unassigned faculty member is blocked from submitting Annexure 6', async () => {
      const { data, error } = await baseFacultyClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 85.0,
        p_regularity_rating: 'PROFICIENT',
        p_technical_proficiency: 'PROFICIENT',
        p_rigor_rating: 'PROFICIENT',
        p_confidential_remarks: 'Unassigned faculty attempt.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Only the assigned primary Guide');
    });

    it('TC-A05: Department HOD is blocked from submitting Annexure 6 on behalf of supervisor', async () => {
      const { data, error } = await hodCseClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 90.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: 'HOD override attempt.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Only the assigned primary Guide');
    });

    it('TC-A06: Unauthenticated user is blocked from submitting Annexure 6', async () => {
      const { data, error } = await unauthClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 90.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: 'Unauthenticated attempt.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
    });
  });

  // ==========================================================================
  // GROUP B: SCORE VALIDATION
  // ==========================================================================
  describe('Group B: Supervisor Score Validation', () => {
    it('TC-B01: Negative score is rejected (< 0.0)', async () => {
      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: -5.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: 'Negative score test.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Supervisor score must be between 0.0 and 100.0');
    });

    it('TC-B02: Over-maximum score is rejected (> 100.0)', async () => {
      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 105.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: 'Over max score test.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Supervisor score must be between 0.0 and 100.0');
    });

    it('TC-B03: Boundary score 0.0 is accepted', async () => {
      await adminClient.rpc('reset_annexure_6_for_testing', { p_thesis_id: cseThesisId });

      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 0.0,
        p_regularity_rating: 'UNSATISFACTORY',
        p_technical_proficiency: 'UNSATISFACTORY',
        p_rigor_rating: 'UNSATISFACTORY',
        p_confidential_remarks: 'Candidate failed to engage in research.',
        p_defense_recommendation: 'NOT_RECOMMENDED',
      });

      expect(error).toBeNull();
      expect(data.data.supervisor_score).toBe(0.0);
    });

    it('TC-B04: Boundary score 100.0 is accepted', async () => {
      await adminClient.rpc('reset_annexure_6_for_testing', { p_thesis_id: cseThesisId });

      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 100.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: 'Flawless research and top-tier publication.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).toBeNull();
      expect(data.data.supervisor_score).toBe(100.0);
    });
  });

  // ==========================================================================
  // GROUP C: RATING VALIDATION
  // ==========================================================================
  describe('Group C: Dimensional Ratings Validation', () => {
    it('TC-C01: Invalid regularity rating is rejected', async () => {
      await adminClient.rpc('reset_annexure_6_for_testing', { p_thesis_id: cseThesisId });

      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 85.0,
        p_regularity_rating: 'INVALID_RATING',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: 'Invalid rating test.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Invalid regularity rating');
    });

    it('TC-C02: Invalid technical proficiency rating is rejected', async () => {
      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 85.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'SUPER_EXCELLENT',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: 'Invalid rating test.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Invalid technical proficiency rating');
    });

    it('TC-C03: Invalid rigor rating is rejected', async () => {
      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 85.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'UNKNOWN_VALUE',
        p_confidential_remarks: 'Invalid rating test.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Invalid rigor rating');
    });
  });

  // ==========================================================================
  // GROUP D: MANDATORY REMARKS
  // ==========================================================================
  describe('Group D: Confidential Remarks Validation', () => {
    it('TC-D01: Empty remarks are rejected', async () => {
      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 85.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: '',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Confidential appraisal remarks are mandatory');
    });

    it('TC-D02: Whitespace-only remarks are rejected', async () => {
      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 85.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: '    ',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Confidential appraisal remarks are mandatory');
    });

    it('TC-D03: Over-length remarks (> 4000 chars) are rejected', async () => {
      const longRemarks = 'A'.repeat(4001);
      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 85.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: longRemarks,
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('must not exceed 4000 characters');
    });
  });

  // ==========================================================================
  // GROUP E: RECOMMENDATION VALIDATION
  // ==========================================================================
  describe('Group E: Defense Recommendation Validation', () => {
    it('TC-E01: Invalid recommendation value is rejected', async () => {
      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 85.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: 'Valid remarks.',
        p_defense_recommendation: 'STRONGLY_APPROVED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Invalid defense recommendation');
    });

    it('TC-E02: REVISIONS_REQUIRED recommendation is accepted', async () => {
      await adminClient.rpc('reset_annexure_6_for_testing', { p_thesis_id: cseThesisId });

      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 72.0,
        p_regularity_rating: 'DEVELOPING',
        p_technical_proficiency: 'PROFICIENT',
        p_rigor_rating: 'DEVELOPING',
        p_confidential_remarks: 'Minor algorithmic clarifications required prior to oral defense.',
        p_defense_recommendation: 'REVISIONS_REQUIRED',
      });

      expect(error).toBeNull();
      expect(data.data.defense_recommendation).toBe('REVISIONS_REQUIRED');
    });
  });

  // ==========================================================================
  // GROUP F: DUPLICATE EVALUATION & IMMUTABILITY GUARD
  // ==========================================================================
  describe('Group F: Duplicate Evaluation & Immutability Guard', () => {
    it('TC-F01: Resubmission / Overwrite of Annexure 6 is rejected', async () => {
      // Evaluation was already submitted in TC-E02
      const { data, error } = await guideAClient.rpc('submit_annexure_6_evaluation', {
        p_thesis_id: cseThesisId,
        p_supervisor_score: 95.0,
        p_regularity_rating: 'EXEMPLARY',
        p_technical_proficiency: 'EXEMPLARY',
        p_rigor_rating: 'EXEMPLARY',
        p_confidential_remarks: 'Attempt to overwrite existing evaluation.',
        p_defense_recommendation: 'RECOMMENDED',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('InvalidState'); // Thesis already in DEFENSE_PANEL_CONSTITUTED
    });
  });

  // ==========================================================================
  // GROUP G: EVALUATION IMMUTABILITY (DATABASE LEVEL)
  // ==========================================================================
  describe('Group G: Database Immutability', () => {
    it('TC-G01: Client cannot execute direct UPDATE on annexure_6_evaluations', async () => {
      const { data, error } = await guideAClient
        .from('annexure_6_evaluations')
        .update({ supervisor_score: 99.0 })
        .eq('thesis_id', cseThesisId);

      // Either error or 0 rows modified (RLS denies UPDATE)
      expect(data === null || data?.length === 0).toBe(true);
    });

    it('TC-G02: Client cannot execute direct DELETE on annexure_6_evaluations', async () => {
      const { data, error } = await guideAClient
        .from('annexure_6_evaluations')
        .delete()
        .eq('thesis_id', cseThesisId);

      expect(data === null || data?.length === 0).toBe(true);
    });
  });

  // ==========================================================================
  // GROUP H: STUDENT DATABASE LOCKOUT
  // ==========================================================================
  describe('Group H: Multi-Layer Student Lockout', () => {
    it('TC-H01: Student query to annexure_6_evaluations returns 0 rows (RLS policy)', async () => {
      const { data, error } = await studentCseClient
        .from('annexure_6_evaluations')
        .select('*')
        .eq('thesis_id', cseThesisId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0); // Strict lockout
    });
  });

  // ==========================================================================
  // GROUP I: STUDENT RPC LOCKOUT
  // ==========================================================================
  describe('Group I: Student RPC Lockout', () => {
    it('TC-I01: Student get_annexure_6_docket call is rejected with authorization error', async () => {
      const { data, error } = await studentCseClient.rpc('get_annexure_6_docket', {
        p_thesis_id: cseThesisId,
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Student candidates are strictly blocked');
    });
  });

  // ==========================================================================
  // GROUP J: IDOR & CROSS-DEPARTMENT PROTECTION
  // ==========================================================================
  describe('Group J: IDOR & Cross-Department Protection', () => {
    it('TC-J01: Guide B cannot access CSE Thesis Annexure 6 docket', async () => {
      const { data, error } = await guideBClient.rpc('get_annexure_6_docket', {
        p_thesis_id: cseThesisId,
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('You do not have permission to view');
    });

    it('TC-J02: HOD ECE cannot access CSE Thesis Annexure 6 docket', async () => {
      const { data, error } = await hodEceClient.rpc('get_annexure_6_docket', {
        p_thesis_id: cseThesisId,
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('You do not have permission to view');
    });

    it('TC-J03: Primary Guide A can view own submitted Annexure 6 docket', async () => {
      const { data, error } = await guideAClient.rpc('get_annexure_6_docket', {
        p_thesis_id: cseThesisId,
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.data.is_submitted).toBe(true);
      expect(data.data.evaluation.supervisor_score).toBe(72.0);
    });

    it('TC-J04: HOD CSE can view submitted Annexure 6 docket', async () => {
      const { data, error } = await hodCseClient.rpc('get_annexure_6_docket', {
        p_thesis_id: cseThesisId,
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.data.evaluation.supervisor_score).toBe(72.0);
    });
  });

  // ==========================================================================
  // GROUP K: CO-GUIDE LOCKOUT
  // ==========================================================================
  describe('Group K: Co-Guide Lockout (OD-014 / ADR-006)', () => {
    it('TC-K01: Co-Guide is blocked from viewing confidential Annexure 6 docket', async () => {
      const { data, error } = await coguideAClient.rpc('get_annexure_6_docket', {
        p_thesis_id: cseThesisId,
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('You do not have permission to view');
    });
  });

  // ==========================================================================
  // GROUP L: STATE TRANSITION
  // ==========================================================================
  describe('Group L: State Transition to DEFENSE_PANEL_CONSTITUTED', () => {
    it('TC-L01: Thesis is now in DEFENSE_PANEL_CONSTITUTED state', async () => {
      const { data: thesis } = await hodCseClient
        .from('theses')
        .select('current_state, current_stage')
        .eq('id', cseThesisId)
        .single();

      expect(thesis.current_state).toBe('DEFENSE_PANEL_CONSTITUTED');
      expect(thesis.current_stage).toBe('CONFIDENTIAL_EVALUATION_STAGE');
    });
  });

  // ==========================================================================
  // GROUP M: PANEL CONSTITUTION AUTHORIZATION
  // ==========================================================================
  describe('Group M: Panel Constitution Authorization', () => {
    it('TC-M01: Student cannot constitute defense panel', async () => {
      const { data, error } = await studentCseClient.rpc('constitute_defense_panel', {
        p_thesis_id: cseThesisId,
        p_member_1_faculty_id: panelAPersona.id,
        p_member_2_faculty_id: panelBPersona.id,
        p_chair_faculty_id: panelAPersona.id,
        p_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        p_venue_or_link: 'Room 302, Academic Block A',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Only the HOD or DC');
    });

    it('TC-M02: Guide cannot constitute defense panel', async () => {
      const { data, error } = await guideAClient.rpc('constitute_defense_panel', {
        p_thesis_id: cseThesisId,
        p_member_1_faculty_id: panelAPersona.id,
        p_member_2_faculty_id: panelBPersona.id,
        p_chair_faculty_id: panelAPersona.id,
        p_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        p_venue_or_link: 'Room 302, Academic Block A',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Only the HOD or DC');
    });
  });

  // ==========================================================================
  // GROUP N: CROSS-DEPARTMENT PANEL ISOLATION
  // ==========================================================================
  describe('Group N: Cross-Department Panel Isolation', () => {
    it('TC-N01: HOD ECE cannot constitute panel for CSE thesis', async () => {
      const { data, error } = await hodEceClient.rpc('constitute_defense_panel', {
        p_thesis_id: cseThesisId,
        p_member_1_faculty_id: panelAPersona.id,
        p_member_2_faculty_id: panelBPersona.id,
        p_chair_faculty_id: panelAPersona.id,
        p_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        p_venue_or_link: 'Room 302, Academic Block A',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Only the HOD or DC of the candidate');
    });

    it('TC-N02: Panel member from another department is rejected', async () => {
      const { data, error } = await hodCseClient.rpc('constitute_defense_panel', {
        p_thesis_id: cseThesisId,
        p_member_1_faculty_id: gBPersona.id, // ECE Faculty
        p_member_2_faculty_id: panelBPersona.id,
        p_chair_faculty_id: panelBPersona.id,
        p_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        p_venue_or_link: 'Room 302, Academic Block A',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('does not belong to the candidate');
    });
  });

  // ==========================================================================
  // GROUP O & P: CONFLICT OF INTEREST GUARDS
  // ==========================================================================
  describe('Groups O & P: Conflict of Interest Guards', () => {
    it('TC-OP01: Primary Guide cannot be appointed as panel member', async () => {
      const { data, error } = await hodCseClient.rpc('constitute_defense_panel', {
        p_thesis_id: cseThesisId,
        p_member_1_faculty_id: gAPersona.id, // Primary Guide
        p_member_2_faculty_id: panelBPersona.id,
        p_chair_faculty_id: panelBPersona.id,
        p_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        p_venue_or_link: 'Room 302, Academic Block A',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('The primary Guide cannot be appointed as an oral defense panel member');
    });

    it('TC-OP02: Co-Guide cannot be appointed as panel member', async () => {
      const { data, error } = await hodCseClient.rpc('constitute_defense_panel', {
        p_thesis_id: cseThesisId,
        p_member_1_faculty_id: cgAPersona.id, // Co-Guide
        p_member_2_faculty_id: panelBPersona.id,
        p_chair_faculty_id: panelBPersona.id,
        p_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        p_venue_or_link: 'Room 302, Academic Block A',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('The Co-Guide cannot be appointed as an oral defense panel member');
    });
  });

  // ==========================================================================
  // GROUP Q, R, S, T: PANEL SIZE & CHAIR INVARIANTS
  // ==========================================================================
  describe('Groups Q, R, S, T: Panel Size and Chair Invariants', () => {
    it('TC-QRST01: Duplicate panel member (member 1 == member 2) is rejected', async () => {
      const { data, error } = await hodCseClient.rpc('constitute_defense_panel', {
        p_thesis_id: cseThesisId,
        p_member_1_faculty_id: panelAPersona.id,
        p_member_2_faculty_id: panelAPersona.id, // Duplicate
        p_chair_faculty_id: panelAPersona.id,
        p_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        p_venue_or_link: 'Room 302, Academic Block A',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Panel members must be two distinct faculty members');
    });

    it('TC-QRST02: Chair not matching member 1 or member 2 is rejected', async () => {
      const { data, error } = await hodCseClient.rpc('constitute_defense_panel', {
        p_thesis_id: cseThesisId,
        p_member_1_faculty_id: panelAPersona.id,
        p_member_2_faculty_id: panelBPersona.id,
        p_chair_faculty_id: getPersonaByKey('BASE_FACULTY')!.id, // Not a member
        p_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        p_venue_or_link: 'Room 302, Academic Block A',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Designated panel chair must be one of the two appointed panel members');
    });
  });

  // ==========================================================================
  // GROUP U & V: PANEL CONSTITUTION ATOMICITY & STATE TRANSITION
  // ==========================================================================
  describe('Groups U & V: Panel Constitution Atomicity & State Transition', () => {
    it('TC-UV01: HOD CSE successfully constitutes 2-member defense panel', async () => {
      const defenseDate = new Date(Date.now() + 86400000 * 3).toISOString();

      const { data, error } = await hodCseClient.rpc('constitute_defense_panel', {
        p_thesis_id: cseThesisId,
        p_member_1_faculty_id: panelAPersona.id,
        p_member_2_faculty_id: panelBPersona.id,
        p_chair_faculty_id: panelAPersona.id,
        p_scheduled_at: defenseDate,
        p_venue_or_link: 'Auditorium 1 / Google Meet: meet.google.com/xyz-test',
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.data.new_state).toBe('VIVA_DEFENSE_SCHEDULED');
      expect(data.data.new_stage).toBe('VIVA_DEFENSE_STAGE');
      expect(data.data.member_1_faculty_id).toBe(panelAPersona.id);
      expect(data.data.member_2_faculty_id).toBe(panelBPersona.id);
      expect(data.data.chair_faculty_id).toBe(panelAPersona.id);
    });

    it('TC-UV02: Verify exactly two assignments created with exactly one chair', async () => {
      const { data, error } = await hodCseClient.rpc('get_defense_panel_details', {
        p_thesis_id: cseThesisId,
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.data.is_constituted).toBe(true);
      expect(data.data.members).toHaveLength(2);

      const chairs = data.data.members.filter((m: any) => m.is_panel_chair === true);
      expect(chairs).toHaveLength(1);
      expect(chairs[0].faculty_id).toBe(panelAPersona.id);
    });

    it('TC-UV03: Panel Member A can now view Annexure 6 evaluation as appointed examiner', async () => {
      const { data, error } = await panelMemberAClient.rpc('get_annexure_6_docket', {
        p_thesis_id: cseThesisId,
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.data.evaluation.supervisor_score).toBe(72.0);
    });
  });

  // ==========================================================================
  // GROUP W: AUDIT EVENT GENERATION
  // ==========================================================================
  describe('Group W: Compliance Audit Trail', () => {
    it('TC-W01: Verify ANNEXURE_6_SUBMITTED and DEFENSE_PANEL_APPOINTED audit records', async () => {
      const { data: auditEvents } = await adminClient
        .from('audit_events')
        .select('*')
        .in('action_code', ['ANNEXURE_6_SUBMITTED', 'DEFENSE_PANEL_APPOINTED'])
        .order('timestamp_utc', { ascending: false });

      expect(auditEvents.length).toBeGreaterThanOrEqual(2);

      const ann6Event = auditEvents.find((e: any) => e.action_code === 'ANNEXURE_6_SUBMITTED');
      expect(ann6Event).toBeDefined();
      expect(ann6Event.active_role_id).toBe('GUIDE');

      const panelEvent = auditEvents.find((e: any) => e.action_code === 'DEFENSE_PANEL_APPOINTED');
      expect(panelEvent).toBeDefined();
      expect(['HOD', 'DC']).toContain(panelEvent.active_role_id);
    });
  });

  // ==========================================================================
  // GROUP X: NOTIFICATION VERIFICATION
  // ==========================================================================
  describe('Group X: Notification Verification', () => {
    it('TC-X01: Appointed Panel Members received DEFENSE category notifications', async () => {
      const { data: deliveries } = await adminClient
        .from('notification_deliveries')
        .select('*, notification_messages!inner(*)')
        .in('recipient_user_id', [panelAPersona.id, panelBPersona.id])
        .eq('notification_messages.category', 'DEFENSE');

      expect(deliveries.length).toBeGreaterThanOrEqual(2);
    });

    it('TC-X02: Student candidate received Viva Scheduled notification but ZERO Annexure 6 score leak', async () => {
      const { data: deliveries } = await adminClient
        .from('notification_deliveries')
        .select('*, notification_messages!inner(*)')
        .eq('recipient_user_id', sCsePersona.id);

      // Student must NEVER have received Annexure 6 evaluation notice
      const leakedNotice = deliveries.find(
        (d: any) =>
          d.notification_messages.title.includes('Annexure 6') ||
          d.notification_messages.summary.includes('supervisor score')
      );
      expect(leakedNotice).toBeUndefined();

      // Student DID receive viva scheduled notification
      const vivaNotice = deliveries.find((d: any) =>
        d.notification_messages.title.includes('Oral Viva Defense Scheduled')
      );
      expect(vivaNotice).toBeDefined();
    });
  });

  // ==========================================================================
  // GROUP Y: DEPARTMENT QUEUE LISTING
  // ==========================================================================
  describe('Group Y: Department Queue Listing', () => {
    it('TC-Y01: HOD CSE can query department Annexure 6 queue', async () => {
      const { data, error } = await hodCseClient.rpc('list_department_annexure_6_queue', {
        p_department_id: cseDeptId,
        p_status: 'ALL',
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      const thesisItem = data.data.find((item: any) => item.thesis_id === cseThesisId);
      expect(thesisItem).toBeDefined();
      expect(thesisItem.has_annexure_6).toBe(true);
      expect(thesisItem.has_defense_panel).toBe(true);
    });

    it('TC-Y02: DC CSE can query department queue with status filter SCHEDULED', async () => {
      const { data, error } = await dcCseClient.rpc('list_department_annexure_6_queue', {
        p_department_id: cseDeptId,
        p_status: 'SCHEDULED',
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);

      const thesisItem = data.data.find((item: any) => item.thesis_id === cseThesisId);
      expect(thesisItem).toBeDefined();
    });
  });

  // ==========================================================================
  // GROUP Z: FULL END-TO-END VERIFICATION
  // ==========================================================================
  describe('Group Z: Full End-to-End Lifecycle Verification', () => {
    it('TC-Z01: Completed lifecycle verified: ANNEXURE_6_PENDING -> DEFENSE_PANEL_CONSTITUTED -> VIVA_DEFENSE_SCHEDULED', async () => {
      const { data: finalThesis } = await hodCseClient
        .from('theses')
        .select('*')
        .eq('id', cseThesisId)
        .single();

      expect(finalThesis.current_state).toBe('VIVA_DEFENSE_SCHEDULED');
      expect(finalThesis.current_stage).toBe('VIVA_DEFENSE_STAGE');

      const { data: panelDetails, error } = await studentCseClient.rpc('get_defense_panel_details', {
        p_thesis_id: cseThesisId,
      });

      expect(error).toBeNull();
      expect(panelDetails.success).toBe(true);
      expect(panelDetails.data.is_constituted).toBe(true);
      expect(panelDetails.data.scheduled_at).toBeDefined();
    });
  });

  afterAll(async () => {
    // Restore baseline test harness state for Thesis A
    await adminClient.rpc('reset_annexure_6_for_testing', { p_thesis_id: '60000000-0000-0000-0000-000000000001' });

    // Direct re-insert baseline Annexure 6 as Guide A
    await guideAClient.from('annexure_6_evaluations').insert({
      id: '80000000-0000-0000-0000-000000000001',
      thesis_id: '60000000-0000-0000-0000-000000000001',
      guide_id: '33333333-3333-3333-3333-333333333333',
      supervisor_score: 95.0,
      regularity_rating: 'EXCELLENT',
      technical_proficiency: 'HIGH',
      rigor_rating: 'RIGOROUS',
      confidential_remarks: 'Outstanding work by student.',
      defense_recommendation: 'RECOMMENDED',
    });

    // Re-insert baseline Viva Defense and Defense Panel as HOD CSE
    await hodCseClient.from('viva_defenses').insert({
      id: 'b0000000-0000-0000-0000-000000000001',
      thesis_id: '60000000-0000-0000-0000-000000000001',
      defense_cycle_index: 1,
      rubric_version_id: 'a1000000-0000-0000-0000-000000000001',
      composite_score: null,
      outcome: 'SCHEDULED',
      scheduled_at: '2026-12-15T10:00:00+00:00',
    });

    await hodCseClient.from('defense_panels').insert({
      id: 'c0000000-0000-0000-0000-000000000001',
      viva_defense_id: 'b0000000-0000-0000-0000-000000000001',
      constituted_by_hod_id: '88888888-8888-8888-8888-888888888888',
    });

    await hodCseClient.from('panel_member_assignments').insert([
      {
        id: 'd1000000-0000-0000-0000-000000000001',
        panel_id: 'c0000000-0000-0000-0000-000000000001',
        faculty_id: '99999999-9999-9999-9999-999999999999',
        evaluator_role: 'INTERNAL_EXPERT',
        is_panel_chair: true,
      },
      {
        id: 'd2000000-0000-0000-0000-000000000001',
        panel_id: 'c0000000-0000-0000-0000-000000000001',
        faculty_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        evaluator_role: 'INTERNAL_EXPERT',
        is_panel_chair: false,
      },
    ]);
  });
});
