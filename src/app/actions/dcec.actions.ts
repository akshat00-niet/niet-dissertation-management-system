'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { verifyAndForwardDocket, recordDcecDecision, createDcecDelegation } from '@/lib/services/dcec.service';
import type {
  VerifyDocketInput,
  RecordDcecDecisionInput,
  CreateDcecDelegationInput,
  DocketVerificationResult,
  DcecDecisionResult,
} from '@/types/dcec.types';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Verify candidate eligibility and documents, then forward to DCEC Chair.
 */
export async function verifyDcecDocketAction(
  input: VerifyDocketInput
): Promise<ActionResponse<DocketVerificationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const headersList = await headers();
    const clientIp = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = headersList.get('user-agent') || 'Antigravity-Client';

    const result = await verifyAndForwardDocket(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/dc/screening');
    revalidatePath('/app/dcec/screening');

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to verify and forward DCEC docket.',
    };
  }
}

/**
 * Server Action: DCEC Chair Checker sign-off (APPROVE / REVISION_REQUIRED / REJECT).
 */
export async function recordDcecDecisionAction(
  input: RecordDcecDecisionInput
): Promise<ActionResponse<DcecDecisionResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const headersList = await headers();
    const clientIp = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = headersList.get('user-agent') || 'Antigravity-Client';

    const result = await recordDcecDecision(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/dcec/screening');
    revalidatePath('/app/dc/screening');
    revalidatePath('/app/student/dissertation');
    revalidatePath('/app/student/annexure-1');

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to record DCEC screening decision.',
    };
  }
}

/**
 * Server Action: Create DCEC Chair delegation from HOD to D.HOD.
 */
export async function createDcecDelegationAction(
  input: CreateDcecDelegationInput
): Promise<ActionResponse<{ success: boolean; delegation_id: string }>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const headersList = await headers();
    const clientIp = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = headersList.get('user-agent') || 'Antigravity-Client';

    const result = await createDcecDelegation(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/dcec/screening');

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to create DCEC delegation.',
    };
  }
}
