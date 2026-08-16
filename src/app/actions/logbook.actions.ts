'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import {
  getDigitalLogbookWorkspace,
  saveDigitalLogbookEntryDraft,
  submitDigitalLogbookEntry,
  verifyDigitalLogbookEntry,
  submitPeriodicProgressReport,
  acknowledgePeriodicProgressReport,
} from '@/lib/services/logbook.service';
import type {
  DigitalLogbookWorkspace,
  SaveDigitalLogbookDraftInput,
  SubmitDigitalLogbookEntryInput,
  VerifyDigitalLogbookEntryInput,
  SubmitPeriodicProgressReportInput,
  AcknowledgePeriodicProgressReportInput,
  LogbookOperationResult,
} from '@/types/logbook.types';

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
 * Server Action: Fetches the complete Digital Logbook workspace aggregate.
 */
export async function getDigitalLogbookWorkspaceAction(
  thesisId: string
): Promise<ActionResponse<DigitalLogbookWorkspace>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const data = await getDigitalLogbookWorkspace(supabase, session, thesisId);

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to fetch Digital Logbook workspace.',
    };
  }
}

/**
 * Server Action: Saves a draft meeting logbook entry.
 */
export async function saveDigitalLogbookEntryDraftAction(
  input: SaveDigitalLogbookDraftInput
): Promise<ActionResponse<LogbookOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const data = await saveDigitalLogbookEntryDraft(supabase, session, input);

    revalidatePath('/app/student/logbook');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to save logbook draft.',
    };
  }
}

/**
 * Server Action: Submits a meeting logbook entry for supervisor verification.
 */
export async function submitDigitalLogbookEntryAction(
  input: Omit<SubmitDigitalLogbookEntryInput, 'client_ip' | 'user_agent'>
): Promise<ActionResponse<LogbookOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await submitDigitalLogbookEntry(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/student/logbook');
    revalidatePath('/app/guide/logbook');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to submit logbook entry.',
    };
  }
}

/**
 * Server Action: Supervisor verifies or requests revision on a logbook entry.
 */
export async function verifyDigitalLogbookEntryAction(
  input: Omit<VerifyDigitalLogbookEntryInput, 'client_ip' | 'user_agent'>
): Promise<ActionResponse<LogbookOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await verifyDigitalLogbookEntry(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/student/logbook');
    revalidatePath('/app/guide/logbook');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to verify logbook entry.',
    };
  }
}

/**
 * Server Action: Candidate submits periodic weekly/monthly progress report.
 */
export async function submitPeriodicProgressReportAction(
  input: Omit<SubmitPeriodicProgressReportInput, 'client_ip' | 'user_agent'>
): Promise<ActionResponse<LogbookOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await submitPeriodicProgressReport(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/student/logbook');
    revalidatePath('/app/student/progress');
    revalidatePath('/app/guide/progress');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to submit periodic progress report.',
    };
  }
}

/**
 * Server Action: Supervisor acknowledges a periodic progress report.
 */
export async function acknowledgePeriodicProgressReportAction(
  input: Omit<AcknowledgePeriodicProgressReportInput, 'client_ip' | 'user_agent'>
): Promise<ActionResponse<LogbookOperationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const { clientIp, userAgent } = await getClientMetadata();

    const data = await acknowledgePeriodicProgressReport(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/student/logbook');
    revalidatePath('/app/student/progress');
    revalidatePath('/app/guide/progress');
    revalidatePath('/app');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to acknowledge periodic progress report.',
    };
  }
}
