'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import {
  submitAnnexure6Evaluation,
  getAnnexure6Docket,
  constituteDefensePanel,
  getDefensePanelDetails,
  listDepartmentAnnexure6Queue,
} from '@/lib/services/annexure6.service';
import type {
  SubmitAnnexure6EvaluationInput,
  GetAnnexure6DocketInput,
  ConstituteDefensePanelInput,
  GetDefensePanelDetailsInput,
  ListDepartmentAnnexure6QueueInput,
  Annexure6OperationResult,
} from '@/types/annexure6.types';

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
 * Server Action: Primary Guide submits confidential Annexure 6 evaluation.
 * STRICTLY RESTRICTED: Primary Guide only.
 */
export async function submitAnnexure6EvaluationAction(
  input: SubmitAnnexure6EvaluationInput
): Promise<ActionResponse<Annexure6OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await submitAnnexure6Evaluation(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/guide/theses');
    revalidatePath('/app/guide/annexure-6');
    revalidatePath('/app/department/defense-panels');
    revalidatePath('/app/department/milestones');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to submit Annexure 6 evaluation.',
    };
  }
}

/**
 * Server Action: Fetches confidential Annexure 6 evaluation dossier.
 * STRICTLY RESTRICTED: Guide, HOD, DC, DCEC Chair, and Appointed Panel Members only.
 */
export async function getAnnexure6DocketAction(
  input: GetAnnexure6DocketInput
): Promise<ActionResponse<Annexure6OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const data = await getAnnexure6Docket(supabase, session, input);

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to fetch Annexure 6 docket.',
    };
  }
}

/**
 * Server Action: HOD/DC appoints 2-member defense panel and schedules oral defense.
 * STRICTLY RESTRICTED: HOD, DC, DCEC Chair only.
 */
export async function constituteDefensePanelAction(
  input: ConstituteDefensePanelInput
): Promise<ActionResponse<Annexure6OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await constituteDefensePanel(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/department/defense-panels');
    revalidatePath('/app/department/milestones');
    revalidatePath('/app/panel/assignments');
    revalidatePath('/app/student/defenses');
    revalidatePath('/app/guide/theses');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to constitute defense panel.',
    };
  }
}

/**
 * Server Action: Fetches defense panel composition and viva schedule.
 */
export async function getDefensePanelDetailsAction(
  input: GetDefensePanelDetailsInput
): Promise<ActionResponse<Annexure6OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const data = await getDefensePanelDetails(supabase, session, input);

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to fetch defense panel details.',
    };
  }
}

/**
 * Server Action: Lists departmental Annexure 6 evaluation and defense panel queue.
 * STRICTLY RESTRICTED: HOD, DC, DCEC Chair only.
 */
export async function listDepartmentAnnexure6QueueAction(
  input: ListDepartmentAnnexure6QueueInput
): Promise<ActionResponse<Annexure6OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const data = await listDepartmentAnnexure6Queue(supabase, session, input);

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to list department Annexure 6 queue.',
    };
  }
}
