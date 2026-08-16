'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import {
  saveAnnexure1Draft,
  submitAnnexure1,
} from '@/lib/services/annexures.service';
import { checkTitleCollision } from '@/lib/dal/theses.dal';
import { createClient } from '@/lib/supabase/server';
import type { Annexure1FormData, SubmitAnnexure1Result } from '@/types/database.types';

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server action to save Annexure 1 proposal draft.
 */
export async function saveAnnexure1DraftAction(
  formData: Annexure1FormData
): Promise<ActionResult<{ annexure_1_id: string; status: string }>> {
  try {
    const session = await requireAuthenticatedUser();
    const result = await saveAnnexure1Draft(session, formData);
    revalidatePath('/app/student/annexure-1');
    revalidatePath('/app/student/dissertation');
    return { success: true, data: result };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to save Annexure 1 draft.',
    };
  }
}

/**
 * Server action to submit Annexure 1 proposal for DC screening.
 */
export async function submitAnnexure1Action(
  formData: Annexure1FormData
): Promise<ActionResult<SubmitAnnexure1Result>> {
  try {
    const session = await requireAuthenticatedUser();
    const reqHeaders = headers();
    const clientIp = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '127.0.0.1';
    const userAgent = reqHeaders.get('user-agent') || 'Antigravity-Client';

    const result = await submitAnnexure1(session, formData, clientIp, userAgent);
    revalidatePath('/app/student/annexure-1');
    revalidatePath('/app/student/dissertation');
    revalidatePath('/app');
    return { success: true, data: result };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to submit Annexure 1 proposal.',
    };
  }
}

/**
 * Server action to check title uniqueness across active cohort.
 */
export async function checkTitleAvailabilityAction(
  proposedTitle: string,
  excludeThesisId?: string
): Promise<ActionResult<{ isAvailable: boolean }>> {
  try {
    const supabase = createClient();
    const isDuplicate = await checkTitleCollision(supabase, proposedTitle, excludeThesisId);
    return { success: true, data: { isAvailable: !isDuplicate } };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to verify title availability.',
    };
  }
}
