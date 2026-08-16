import type { SupabaseClient } from '@supabase/supabase-js';
import type { Annexure6Evaluation } from '@/types/database.types';
import { mapPostgrestError } from '@/lib/dal/errors';

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
