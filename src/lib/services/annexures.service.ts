import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type {
  AppSession,
  Annexure1FormData,
  StudentAnnexure1WorkspaceData,
  SubmitAnnexure1Result,
  Annexure6Evaluation,
} from '@/types/database.types';
import {
  getAnnexure1ByThesisId,
  getGuidePreferencesByAnnexure1Id,
  saveAnnexure1DraftRpc,
  submitAnnexure1Rpc,
  getAnnexure6EvaluationByThesisId,
} from '@/lib/dal/annexures.dal';
import { getStudentActiveThesis, checkTitleCollision } from '@/lib/dal/theses.dal';
import {
  listDepartmentFacultyForPreferences,
  listDepartmentResearchDomains,
} from '@/lib/dal/faculty.dal';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  ConflictError,
} from '@/lib/dal/errors';

/**
 * Resolves the full Annexure 1 workspace context for the authenticated student candidate.
 */
export async function getStudentAnnexure1Workspace(
  session: AppSession,
  client?: SupabaseClient
): Promise<StudentAnnexure1WorkspaceData> {
  const supabase = client || createClient();

  if (session.appUser.role_category !== 'STUDENT') {
    throw new UnauthorizedError('Annexure 1 workspace is accessible exclusively to student candidates.');
  }

  // 1. Resolve active thesis for student
  const thesis = await getStudentActiveThesis(supabase, session.appUser.id);
  if (!thesis) {
    throw new NotFoundError('Active Thesis record for candidate', session.appUser.id);
  }

  // 2. Fetch existing proposal record if already created
  const proposal = await getAnnexure1ByThesisId(supabase, thesis.id);

  // 3. Fetch existing guide preferences if proposal exists
  let preferences: any[] = [];
  if (proposal) {
    preferences = await getGuidePreferencesByAnnexure1Id(supabase, proposal.id);
  }

  // 4. Fetch department faculty choices and research domains
  const [availableFaculty, availableDomains] = await Promise.all([
    listDepartmentFacultyForPreferences(supabase, thesis.department_id),
    listDepartmentResearchDomains(supabase, thesis.department_id),
  ]);

  const isSubmitted =
    thesis.current_state !== 'DRAFT_PROPOSAL' &&
    thesis.current_state !== 'ANNEXURE_1_REVISION';

  const isLocked = isSubmitted;

  return {
    thesis,
    proposal,
    preferences,
    availableFaculty,
    availableDomains,
    isSubmitted,
    isLocked,
  };
}

/**
 * Saves draft Annexure 1 form values without altering thesis lifecycle state.
 */
export async function saveAnnexure1Draft(
  session: AppSession,
  formData: Annexure1FormData,
  client?: SupabaseClient
): Promise<{ success: boolean; annexure_1_id: string; status: string }> {
  const supabase = client || createClient();

  if (session.appUser.role_category !== 'STUDENT') {
    throw new UnauthorizedError('Draft save is restricted to student candidates.');
  }

  const thesis = await getStudentActiveThesis(supabase, session.appUser.id);
  if (!thesis) {
    throw new NotFoundError('Active Thesis for candidate', session.appUser.id);
  }

  if (thesis.current_state !== 'DRAFT_PROPOSAL' && thesis.current_state !== 'ANNEXURE_1_REVISION') {
    throw new ConflictError(
      `Cannot modify draft while dissertation is in state: ${thesis.current_state}`
    );
  }

  return await saveAnnexure1DraftRpc(supabase, thesis.id, formData);
}

/**
 * Submits Annexure 1 proposal, transitioning thesis to 'ANNEXURE_1_SUBMITTED'.
 * Validates domain rules before executing atomic database submission.
 */
export async function submitAnnexure1(
  session: AppSession,
  formData: Annexure1FormData,
  clientIp = '127.0.0.1',
  userAgent = 'Antigravity-Client',
  client?: SupabaseClient
): Promise<SubmitAnnexure1Result> {
  const supabase = client || createClient();

  if (session.appUser.role_category !== 'STUDENT') {
    throw new UnauthorizedError('Submission is restricted to student candidates.');
  }

  // 1. Resolve student thesis
  const thesis = await getStudentActiveThesis(supabase, session.appUser.id);
  if (!thesis) {
    throw new NotFoundError('Active Thesis for candidate', session.appUser.id);
  }

  if (thesis.current_state !== 'DRAFT_PROPOSAL' && thesis.current_state !== 'ANNEXURE_1_REVISION') {
    throw new ConflictError(
      `Cannot submit Annexure 1 while dissertation is in state: ${thesis.current_state}`
    );
  }

  // 2. Validate input fields
  if (!formData.proposed_title || formData.proposed_title.trim().length < 5) {
    throw new ValidationError('A meaningful proposed dissertation title is required (minimum 5 characters).');
  }
  if (!formData.broad_domain || formData.broad_domain.trim() === '') {
    throw new ValidationError('Broad research domain is required.');
  }
  if (!formData.problem_statement || formData.problem_statement.trim().length < 20) {
    throw new ValidationError('Problem statement / abstract must be at least 20 characters.');
  }
  if (!formData.expected_outcomes || formData.expected_outcomes.trim().length < 10) {
    throw new ValidationError('Expected research outcomes must be at least 10 characters.');
  }

  // 3. Validate preferences: exactly 4 distinct faculty members
  if (!formData.preferences || formData.preferences.length !== 4) {
    throw new ValidationError('Exactly four (4) ranked supervisor preferences are required.');
  }

  const facultyIds = new Set<string>();
  const ranks = new Set<number>();

  for (const pref of formData.preferences) {
    if (!pref.faculty_id || typeof pref.faculty_id !== 'string') {
      throw new ValidationError('All four preferences must designate a valid faculty supervisor.');
    }
    if (facultyIds.has(pref.faculty_id)) {
      throw new ValidationError('Duplicate faculty selected. All four supervisor preferences must be distinct.');
    }
    facultyIds.add(pref.faculty_id);

    if (pref.preference_rank < 1 || pref.preference_rank > 4) {
      throw new ValidationError('Preference ranks must be distinct integers between 1 and 4.');
    }
    if (ranks.has(pref.preference_rank)) {
      throw new ValidationError('Duplicate preference rank detected. Ranks 1 through 4 must each appear exactly once.');
    }
    ranks.add(pref.preference_rank);
  }

  // 4. Pre-validate title uniqueness against other active theses
  const isDuplicate = await checkTitleCollision(supabase, formData.proposed_title, thesis.id);
  if (isDuplicate) {
    throw new ConflictError(
      'The proposed dissertation title is already registered by another candidate. Please refine your title.'
    );
  }

  // 5. Execute atomic RPC submission
  return await submitAnnexure1Rpc(supabase, thesis.id, formData, clientIp, userAgent);
}

/**
 * Service to retrieve confidential Annexure 6 evaluation for a thesis.
 * RLS permanently blocks students from accessing this evaluation.
 */
export async function getAccessibleAnnexure6(
  session: AppSession,
  thesisId: string,
  client?: SupabaseClient
): Promise<Annexure6Evaluation> {
  if (!thesisId || typeof thesisId !== 'string') {
    throw new ValidationError('A valid thesis UUID is required.');
  }

  // Application-level guard: Students are strictly forbidden from requesting Annexure 6
  if (session.appUser.role_category === 'STUDENT') {
    throw new UnauthorizedError(
      'Students are permanently restricted from viewing confidential supervisor evaluations (Annexure 6).'
    );
  }

  const supabase = client || createClient();
  const evaluation = await getAnnexure6EvaluationByThesisId(supabase, thesisId);

  if (!evaluation) {
    throw new NotFoundError('Annexure 6 Evaluation for Thesis', thesisId);
  }

  return evaluation;
}
