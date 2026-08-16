'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import {
  createRubricVersionDraft,
  publishRubricVersion,
  getActiveMilestoneRubric,
} from '@/lib/services/rubrics.service';
import type {
  CreateRubricVersionDraftInput,
  PublishRubricVersionInput,
  GetActiveMilestoneRubricInput,
  RubricOperationResult,
} from '@/types/rubrics.types';

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
 * Server Action: Creates a new draft rubric version with 4-column criteria.
 */
export async function createRubricVersionDraftAction(
  input: CreateRubricVersionDraftInput
): Promise<ActionResponse<RubricOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await createRubricVersionDraft(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/admin/rubrics');
    revalidatePath('/app/rubrics');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to create rubric version draft.',
    };
  }
}

/**
 * Server Action: Publishes an immutable rubric version for cohort evaluations.
 */
export async function publishRubricVersionAction(
  input: PublishRubricVersionInput
): Promise<ActionResponse<RubricOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await publishRubricVersion(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/admin/rubrics');
    revalidatePath('/app/rubrics');
    revalidatePath('/app/department/milestones');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to publish rubric version.',
    };
  }
}

/**
 * Server Action: Retrieves active published rubric for a department and milestone type.
 */
export async function getActiveMilestoneRubricAction(
  input: GetActiveMilestoneRubricInput
): Promise<ActionResponse<RubricOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const data = await getActiveMilestoneRubric(supabase, session, input);

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to fetch active milestone rubric.',
    };
  }
}
