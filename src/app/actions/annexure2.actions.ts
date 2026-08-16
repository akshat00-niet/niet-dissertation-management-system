'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import {
  getAnnexure2Workspace,
  saveAnnexure2Draft,
  submitAnnexure2,
  endorseAnnexure2,
  decideAnnexure2Title,
} from '@/lib/services/annexure2.service';
import type {
  Annexure2Workspace,
  SaveAnnexure2DraftInput,
  SubmitAnnexure2Input,
  EndorseAnnexure2Input,
  DecideAnnexure2TitleInput,
  Annexure2OperationResult,
} from '@/types/annexure2.types';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Helper to extract client request metadata.
 */
async function getClientMetadata() {
  const headersList = await headers();
  const clientIp = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const userAgent = headersList.get('user-agent') || 'Antigravity-Client';
  return { clientIp, userAgent };
}

/**
 * Server Action: Fetches the complete Annexure 2 workspace aggregate.
 */
export async function getAnnexure2WorkspaceAction(
  thesisId: string
): Promise<ActionResponse<Annexure2Workspace>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const data = await getAnnexure2Workspace(supabase, session, thesisId);

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to retrieve Annexure 2 workspace.',
    };
  }
}

/**
 * Server Action: Saves collaborative problem formulation draft.
 */
export async function saveAnnexure2DraftAction(
  input: SaveAnnexure2DraftInput
): Promise<ActionResponse<Annexure2OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const result = await saveAnnexure2Draft(supabase, session, input);

    revalidatePath('/app/student/annexure-2');
    revalidatePath('/app/student/dissertation');
    revalidatePath('/app');

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to save Annexure 2 draft.',
    };
  }
}

/**
 * Server Action: Formally submits Annexure 2 for Dual Supervisor Endorsement.
 */
export async function submitAnnexure2Action(
  input: SubmitAnnexure2Input
): Promise<ActionResponse<Annexure2OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const result = await submitAnnexure2(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/student/annexure-2');
    revalidatePath('/app/student/dissertation');
    revalidatePath('/app/guide/endorsements');
    revalidatePath('/app');

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to submit Annexure 2.',
    };
  }
}

/**
 * Server Action: Records supervisor electronic endorsement or revision request.
 */
export async function endorseAnnexure2Action(
  input: EndorseAnnexure2Input
): Promise<ActionResponse<Annexure2OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const result = await endorseAnnexure2(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/guide/endorsements');
    revalidatePath('/app/student/annexure-2');
    revalidatePath('/app/student/dissertation');
    revalidatePath('/app/dcec/title-approvals');
    revalidatePath('/app');

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to record supervisor endorsement.',
    };
  }
}

/**
 * Server Action: DCEC Chair formal dissertation title decision.
 */
export async function decideAnnexure2TitleAction(
  input: DecideAnnexure2TitleInput
): Promise<ActionResponse<Annexure2OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const result = await decideAnnexure2Title(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/dcec/title-approvals');
    revalidatePath('/app/dcec');
    revalidatePath('/app/student/annexure-2');
    revalidatePath('/app/student/dissertation');
    revalidatePath('/app/guide/endorsements');
    revalidatePath('/app');

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to record DCEC title decision.',
    };
  }
}
