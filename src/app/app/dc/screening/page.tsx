import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { getDepartmentCoordinatorQueue } from '@/lib/services/dcec.service';
import { DCScreeningQueueTable } from '@/components/dcec/DCScreeningQueueTable';
import type { UserRoleAssignment } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export default async function DCScreeningPage() {
  const supabase = createClient();
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  const isDc = session.roles.some((r: UserRoleAssignment) => r.role_id === 'DC');
  if (!isDc) {
    redirect('/app');
  }

  let queue: any[] = [];
  try {
    queue = await getDepartmentCoordinatorQueue(supabase, session);
  } catch (err) {
    console.error('[DCScreeningPage] Error fetching queue:', err);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Department Coordinator Workbench
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Annexure 1 Screening Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Verify candidate prerequisite eligibility, document completeness, and compile dockets for DCEC review.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-xs text-slate-400 block">Pending Verification</span>
            <span className="text-xl font-bold text-emerald-400">
              {queue.filter((q) => q.current_state !== 'DCEC_SCREENING_QUEUE').length}
            </span>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <DCScreeningQueueTable queue={queue} />
    </div>
  );
}
