import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Annexure1Submission,
  GuidePreferenceViewModel,
  Annexure1FormData,
  SubmitAnnexure1Result,
  Annexure6Evaluation,
} from '@/types/database.types';
import { mapPostgrestError } from '@/lib/dal/errors';

/**
 * Fetches the Annexure 1 submission record for a given thesis.
 * Returns null if no submission exists or if invisible to the caller under RLS.
 */
export async function getAnnexure1ByThesisId(
  client: SupabaseClient,
  thesisId: string
): Promise<Annexure1Submission | null> {
  const { data, error } = await client
    .from('annexure_1_submissions')
    .select('id, thesis_id, proposed_title, broad_domain, problem_statement, expected_outcomes, status, submitted_at')
    .eq('thesis_id', thesisId)
    .maybeSingle();

  if (error) {
    throw mapPostgrestError(error, 'annexures.dal.getAnnexure1ByThesisId');
  }

  return (data as Annexure1Submission) || null;
}

/**
 * Fetches the ranked guide preferences for a given Annexure 1 submission.
 * Joins with faculty user records to provide presentation metadata.
 */
export async function getGuidePreferencesByAnnexure1Id(
  client: SupabaseClient,
  annexure1Id: string
): Promise<GuidePreferenceViewModel[]> {
  const { data, error } = await client
    .from('guide_preferences')
    .select('id, annexure_1_id, preference_rank, faculty_id, domain_justification, created_at')
    .eq('annexure_1_id', annexure1Id)
    .order('preference_rank', { ascending: true });

  if (error) {
    throw mapPostgrestError(error, 'annexures.dal.getGuidePreferencesByAnnexure1Id.preferences');
  }

  if (!data || data.length === 0) return [];

  const facultyIds = data.map((d) => d.faculty_id);

  // Fetch faculty profile and user information
  const [profilesRes, usersRes] = await Promise.all([
    client.from('faculty_profiles').select('user_id, designation, department_id').in('user_id', facultyIds),
    client.from('users').select('id, full_name').in('id', facultyIds),
  ]);

  const profileMap = new Map<string, { designation: string; department_id: string }>();
  if (profilesRes.data) {
    for (const p of profilesRes.data) {
      profileMap.set(p.user_id, { designation: p.designation, department_id: p.department_id });
    }
  }

  const userMap = new Map<string, string>();
  if (usersRes.data) {
    for (const u of usersRes.data) {
      userMap.set(u.id, u.full_name);
    }
  }

  return data.map((item) => {
    const prof = profileMap.get(item.faculty_id);
    const fullName = userMap.get(item.faculty_id) || 'Faculty Supervisor';
    return {
      id: item.id,
      annexure_1_id: item.annexure_1_id,
      preference_rank: item.preference_rank,
      faculty_id: item.faculty_id,
      faculty_name: fullName,
      faculty_designation: prof?.designation || 'Faculty',
      department_code: 'CSE',
      domain_justification: item.domain_justification,
      created_at: item.created_at,
    };
  });
}

/**
 * Executes atomic draft save RPC for Annexure 1.
 */
export async function saveAnnexure1DraftRpc(
  client: SupabaseClient,
  thesisId: string,
  formData: Annexure1FormData
): Promise<{ success: boolean; annexure_1_id: string; status: string }> {
  const { data, error } = await client.rpc('save_annexure_1_draft', {
    p_thesis_id: thesisId,
    p_proposed_title: formData.proposed_title,
    p_broad_domain: formData.broad_domain,
    p_problem_statement: formData.problem_statement,
    p_expected_outcomes: formData.expected_outcomes,
    p_preferences: formData.preferences,
  });

  if (error) {
    throw mapPostgrestError(error, 'annexures.dal.saveAnnexure1DraftRpc');
  }

  return data;
}

/**
 * Executes atomic submit_annexure_1 RPC within a single database transaction.
 */
export async function submitAnnexure1Rpc(
  client: SupabaseClient,
  thesisId: string,
  formData: Annexure1FormData,
  clientIp = '127.0.0.1',
  userAgent = 'Antigravity-Client'
): Promise<SubmitAnnexure1Result> {
  const { data, error } = await client.rpc('submit_annexure_1', {
    p_thesis_id: thesisId,
    p_proposed_title: formData.proposed_title,
    p_broad_domain: formData.broad_domain,
    p_problem_statement: formData.problem_statement,
    p_expected_outcomes: formData.expected_outcomes,
    p_preferences: formData.preferences,
    p_client_ip: clientIp,
    p_user_agent: userAgent,
  });

  if (error) {
    throw mapPostgrestError(error, 'annexures.dal.submitAnnexure1Rpc');
  }

  return data as SubmitAnnexure1Result;
}

/**
 * Fetches the confidential Annexure 6 supervisor evaluation for a thesis.
 * Access is strictly isolated by RLS (only assigned Guide, HOD, and defense panel members).
 * Calls by students are permanently blocked at the database RLS level.
 */
export async function getAnnexure6EvaluationByThesisId(
  client: SupabaseClient,
  thesisId: string
): Promise<Annexure6Evaluation | null> {
  const { data, error } = await client
    .from('annexure_6_evaluations')
    .select(
      'id, thesis_id, guide_id, supervisor_score, regularity_rating, technical_proficiency, rigor_rating, confidential_remarks, defense_recommendation, submitted_at'
    )
    .eq('thesis_id', thesisId)
    .maybeSingle();

  if (error) {
    throw mapPostgrestError(error, 'annexures.dal.getAnnexure6EvaluationByThesisId');
  }

  return (data as Annexure6Evaluation) || null;
}
