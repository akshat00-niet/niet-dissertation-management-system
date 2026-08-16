import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Thesis,
  ThesisTitle,
  ThesisWithActiveTitle,
  ThesisFilterParams,
} from '@/types/database.types';
import { mapPostgrestError } from '@/lib/dal/errors';

/**
 * Fetches a single thesis record by its primary key UUID.
 * Row-level visibility is strictly enforced by PostgreSQL RLS.
 * Returns null if the record does not exist or is invisible to the caller.
 */
export async function getThesisById(
  client: SupabaseClient,
  thesisId: string
): Promise<Thesis | null> {
  const { data, error } = await client
    .from('theses')
    .select(
      'id, tracking_number, student_id, department_id, session_id, current_state, current_stage, guide_id, co_guide_id, defense_cycle_index, created_at, updated_at'
    )
    .eq('id', thesisId)
    .maybeSingle();

  if (error) {
    throw mapPostgrestError(error, 'theses.dal.getThesisById');
  }

  return (data as Thesis) || null;
}

/**
 * Fetches the active registered title for a thesis from public.thesis_titles.
 * Returns null if no title record exists or if invisible under RLS.
 */
export async function getThesisActiveTitle(
  client: SupabaseClient,
  thesisId: string
): Promise<ThesisTitle | null> {
  const { data, error } = await client
    .from('thesis_titles')
    .select('id, thesis_id, proposed_title, final_approved_title, normalized_title, is_approved, approved_at')
    .eq('thesis_id', thesisId)
    .maybeSingle();

  if (error) {
    throw mapPostgrestError(error, 'theses.dal.getThesisActiveTitle');
  }

  return (data as ThesisTitle) || null;
}

/**
 * Fetches a single thesis along with its active title string.
 */
export async function getThesisWithActiveTitle(
  client: SupabaseClient,
  thesisId: string
): Promise<ThesisWithActiveTitle | null> {
  const thesis = await getThesisById(client, thesisId);
  if (!thesis) {
    return null;
  }

  const titleRecord = await getThesisActiveTitle(client, thesisId);

  return {
    ...thesis,
    active_title: titleRecord?.final_approved_title || titleRecord?.proposed_title || null,
  };
}

/**
 * Lists all theses accessible to the authenticated caller under active RLS.
 * Applies optional parameter filters if provided.
 */
export async function listTheses(
  client: SupabaseClient,
  filters?: ThesisFilterParams
): Promise<ThesisWithActiveTitle[]> {
  let query = client
    .from('theses')
    .select(
      'id, tracking_number, student_id, department_id, session_id, current_state, current_stage, guide_id, co_guide_id, defense_cycle_index, created_at, updated_at'
    )
    .order('created_at', { ascending: false });

  if (filters?.studentId) {
    query = query.eq('student_id', filters.studentId);
  }
  if (filters?.guideId) {
    query = query.eq('guide_id', filters.guideId);
  }
  if (filters?.departmentId) {
    query = query.eq('department_id', filters.departmentId);
  }
  if (filters?.sessionId) {
    query = query.eq('session_id', filters.sessionId);
  }
  if (filters?.currentStage) {
    query = query.eq('current_stage', filters.currentStage);
  }
  if (filters?.currentState) {
    query = query.eq('current_state', filters.currentState);
  }

  const { data, error } = await query;

  if (error) {
    throw mapPostgrestError(error, 'theses.dal.listTheses');
  }

  if (!data || data.length === 0) {
    return [];
  }

  const theses = data as Thesis[];

  // Fetch active titles for retrieved accessible theses
  const thesisIds = theses.map((t) => t.id);
  const { data: titlesData, error: titlesError } = await client
    .from('thesis_titles')
    .select('thesis_id, proposed_title, final_approved_title')
    .in('thesis_id', thesisIds);

  if (titlesError) {
    throw mapPostgrestError(titlesError, 'theses.dal.listTheses.titles');
  }

  const titleMap = new Map<string, string>();
  if (titlesData) {
    for (const item of titlesData) {
      const title = item.final_approved_title || item.proposed_title;
      if (title) {
        titleMap.set(item.thesis_id, title);
      }
    }
  }

  return theses.map((t) => ({
    ...t,
    active_title: titleMap.get(t.id) || null,
  }));
}

/**
 * Fetches the active dissertation record for a student.
 * Active dissertations are those whose current_state is not 'ARCHIVED' or 'PROPOSAL_REJECTED_TERMINAL'.
 */
export async function getStudentActiveThesis(
  client: SupabaseClient,
  studentId: string
): Promise<ThesisWithActiveTitle | null> {
  const { data, error } = await client
    .from('theses')
    .select(
      'id, tracking_number, student_id, department_id, session_id, current_state, current_stage, guide_id, co_guide_id, defense_cycle_index, created_at, updated_at'
    )
    .eq('student_id', studentId)
    .not('current_state', 'in', '("ARCHIVED","PROPOSAL_REJECTED_TERMINAL")')
    .maybeSingle();

  if (error) {
    throw mapPostgrestError(error, 'theses.dal.getStudentActiveThesis');
  }

  if (!data) {
    return null;
  }

  const titleRecord = await getThesisActiveTitle(client, data.id);

  return {
    ...(data as Thesis),
    active_title: titleRecord?.final_approved_title || titleRecord?.proposed_title || null,
  };
}

/**
 * Checks if a proposed title normalized string is already registered by another thesis.
 * Returns true if duplicate exists, false otherwise.
 */
export async function checkTitleCollision(
  client: SupabaseClient,
  proposedTitle: string,
  excludeThesisId?: string
): Promise<boolean> {
  if (!proposedTitle || trimTitle(proposedTitle) === '') {
    return false;
  }

  const { data, error } = await client.rpc('check_title_collision', {
    p_title: proposedTitle,
    p_exclude_thesis_id: excludeThesisId || null,
  });

  if (error) {
    throw mapPostgrestError(error, 'theses.dal.checkTitleCollision');
  }

  return !!data;
}

function trimTitle(str: string): string {
  return str ? str.trim() : '';
}
