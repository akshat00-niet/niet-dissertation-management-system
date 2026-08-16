import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type {
  AppSession,
  ThesisWithActiveTitle,
  ThesisFilterParams,
  Annexure6Evaluation,
} from '@/types/database.types';
import {
  getThesisWithActiveTitle,
  listTheses,
  getStudentActiveThesis,
} from '@/lib/dal/theses.dal';
import { getAnnexure6EvaluationByThesisId } from '@/lib/dal/annexures.dal';
import { NotFoundError, UnauthorizedError, ValidationError } from '@/lib/dal/errors';

/**
 * Service to retrieve a single thesis accessible to the caller's session.
 * Database RLS enforces exact row visibility.
 */
export async function getAccessibleThesis(
  session: AppSession,
  thesisId: string,
  client?: SupabaseClient
): Promise<ThesisWithActiveTitle> {
  if (!thesisId || typeof thesisId !== 'string') {
    throw new ValidationError('A valid thesis UUID is required.');
  }

  const supabase = client || createClient();
  const thesis = await getThesisWithActiveTitle(supabase, thesisId);

  if (!thesis) {
    throw new NotFoundError('Thesis', thesisId);
  }

  return thesis;
}

/**
 * Service to list all theses accessible to the caller's session.
 * Database RLS enforces multi-tenancy and role visibility.
 */
export async function listAccessibleTheses(
  session: AppSession,
  filters?: ThesisFilterParams,
  client?: SupabaseClient
): Promise<ThesisWithActiveTitle[]> {
  const supabase = client || createClient();
  return await listTheses(supabase, filters);
}

/**
 * Service to resolve the active dissertation for the authenticated student candidate.
 */
export async function getStudentActiveDissertation(
  session: AppSession,
  client?: SupabaseClient
): Promise<ThesisWithActiveTitle | null> {
  const supabase = client || createClient();

  if (session.appUser.role_category !== 'STUDENT') {
    throw new UnauthorizedError('Student active dissertation lookup is restricted to students.');
  }

  return await getStudentActiveThesis(supabase, session.appUser.id);
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
