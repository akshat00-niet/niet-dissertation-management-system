'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { allocateSupervisors, reallocateSupervisors } from '@/lib/services/allocation.service';
import type {
  AllocateSupervisorsInput,
  ReallocateSupervisorsInput,
  AllocationResult,
  ReallocationResult,
} from '@/types/allocation.types';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Allocate Primary Guide and Co-Guide by D.HOD.
 */
export async function allocateSupervisorsAction(
  input: AllocateSupervisorsInput
): Promise<ActionResponse<AllocationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const headersList = await headers();
    const clientIp = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = headersList.get('user-agent') || 'Antigravity-Client';

    const result = await allocateSupervisors(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/department/allocations');
    revalidatePath('/app/student/dissertation');

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to allocate supervisors.',
    };
  }
}

/**
 * Server Action: Exceptional supervisor reallocation by D.HOD.
 */
export async function reallocateSupervisorsAction(
  input: ReallocateSupervisorsInput
): Promise<ActionResponse<ReallocationResult>> {
  try {
    const supabase = await createClient();
    const session = await getCurrentAppSession();
    if (!session) {
      return { success: false, error: 'Authentication required.' };
    }

    const headersList = await headers();
    const clientIp = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = headersList.get('user-agent') || 'Antigravity-Client';

    const result = await reallocateSupervisors(supabase, session, {
      ...input,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    revalidatePath('/app/department/allocations');
    revalidatePath('/app/student/dissertation');

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to reallocate supervisors.',
    };
  }
}
