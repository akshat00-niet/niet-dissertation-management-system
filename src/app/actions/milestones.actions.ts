'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import {
  scheduleMilestonePresentation,
  submitMilestoneEvaluation,
  getMilestoneEvaluationDetails,
  listDepartmentMilestones,
} from '@/lib/services/milestones.service';
import type {
  ScheduleMilestonePresentationInput,
  SubmitMilestoneEvaluationInput,
  GetMilestoneEvaluationDetailsInput,
  ListDepartmentMilestonesInput,
  MilestoneOperationResult,
} from '@/types/milestones.types';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Helper to extract client request metadata on the server.
 */
async function getClientMetadata() {
  const headersList = await headers();
  const clientIp = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const userAgent = headersList.get('user-agent') || 'Antigravity-Client';
  return { clientIp, userAgent };
}

/**
 * Server Action: Department Coordinator schedules a milestone presentation.
 */
export async function scheduleMilestonePresentationAction(
  input: ScheduleMilestonePresentationInput
): Promise<ActionResponse<MilestoneOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await scheduleMilestonePresentation(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/dc/milestones');
    revalidatePath('/app/dcec/milestones');
    revalidatePath('/app/department/milestones');
    revalidatePath('/app/student');
    revalidatePath('/app/guide');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to schedule milestone presentation.',
    };
  }
}

/**
 * Server Action: DCEC Evaluator submits milestone scoring with dynamic rubric breakdown.
 */
export async function submitMilestoneEvaluationAction(
  input: SubmitMilestoneEvaluationInput
): Promise<ActionResponse<MilestoneOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await submitMilestoneEvaluation(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/dcec/milestones');
    revalidatePath('/app/dc/milestones');
    revalidatePath('/app/department/milestones');
    revalidatePath('/app/student');
    revalidatePath('/app/guide');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to submit milestone evaluation.',
    };
  }
}

/**
 * Server Action: Fetches granular evaluation details and scorecard.
 */
export async function getMilestoneEvaluationDetailsAction(
  input: GetMilestoneEvaluationDetailsInput
): Promise<ActionResponse<MilestoneOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const data = await getMilestoneEvaluationDetails(supabase, session, input);

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to fetch milestone evaluation details.',
    };
  }
}

/**
 * Server Action: Queries department cohort milestone presentation list.
 */
export async function listDepartmentMilestonesAction(
  input: ListDepartmentMilestonesInput
): Promise<ActionResponse<MilestoneOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const data = await listDepartmentMilestones(supabase, session, input);

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to list department milestones.',
    };
  }
}
