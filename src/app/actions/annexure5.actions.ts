'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import {
  submitAnnexure5Package,
  endorseAnnexure5Submission,
  requestAnnexure5Revision,
  getAnnexure5Docket,
  listDepartmentAnnexure5Submissions,
} from '@/lib/services/annexure5.service';
import type {
  SubmitAnnexure5PackageInput,
  EndorseAnnexure5SubmissionInput,
  RequestAnnexure5RevisionInput,
  GetAnnexure5DocketInput,
  ListDepartmentAnnexure5SubmissionsInput,
  Annexure5OperationResult,
} from '@/types/annexure5.types';

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
 * Server Action: Student candidate submits Annexure 5 final dissertation package.
 */
export async function submitAnnexure5PackageAction(
  input: SubmitAnnexure5PackageInput
): Promise<ActionResponse<Annexure5OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await submitAnnexure5Package(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/student/defenses');
    revalidatePath('/app/guide/theses');
    revalidatePath('/app/department/milestones');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to submit Annexure 5 package.',
    };
  }
}

/**
 * Server Action: Guide / Co-Guide endorses Annexure 5 final dissertation submission.
 */
export async function endorseAnnexure5SubmissionAction(
  input: EndorseAnnexure5SubmissionInput
): Promise<ActionResponse<Annexure5OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await endorseAnnexure5Submission(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/guide/theses');
    revalidatePath('/app/guide/endorsements');
    revalidatePath('/app/student/defenses');
    revalidatePath('/app/department/milestones');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to endorse Annexure 5 submission.',
    };
  }
}

/**
 * Server Action: Guide / Co-Guide requests corrections on Annexure 5 submission.
 */
export async function requestAnnexure5RevisionAction(
  input: RequestAnnexure5RevisionInput
): Promise<ActionResponse<Annexure5OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await requestAnnexure5Revision(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/guide/theses');
    revalidatePath('/app/student/defenses');
    revalidatePath('/app/student/dissertation');
    revalidatePath('/app/department/milestones');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to request Annexure 5 revision.',
    };
  }
}

/**
 * Server Action: Fetches complete Annexure 5 docket for viewing.
 */
export async function getAnnexure5DocketAction(
  input: GetAnnexure5DocketInput
): Promise<ActionResponse<Annexure5OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const data = await getAnnexure5Docket(supabase, session, input);

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to fetch Annexure 5 docket.',
    };
  }
}

/**
 * Server Action: Lists department cohort Annexure 5 submissions.
 */
export async function listDepartmentAnnexure5SubmissionsAction(
  input: ListDepartmentAnnexure5SubmissionsInput
): Promise<ActionResponse<Annexure5OperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const data = await listDepartmentAnnexure5Submissions(supabase, session, input);

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to list department Annexure 5 submissions.',
    };
  }
}
