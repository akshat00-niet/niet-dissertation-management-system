import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { getDcecCommitteeQueue } from '@/lib/services/dcec.service';
import { DCECDocketReviewCard } from '@/components/dcec/DCECDocketReviewCard';
import type { UserRoleAssignment } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export default async function DCECScreeningPage() {
  const supabase = createClient();
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  const isAuthorized = session.roles.some((r: UserRoleAssignment) =>
    ['HOD', 'DHOD', 'DC', 'DCEC_MEMBER'].includes(r.role_id)
  );
  if (!isAuthorized) {
    redirect('/app');
  }

  const isChair = session.roles.some((r: UserRoleAssignment) =>
    ['HOD', 'DHOD'].includes(r.role_id)
  );

  let queue: any[] = [];
  try {
    queue = await getDcecCommitteeQueue(supabase, session);
  } catch (err) {
    console.error('[DCECScreeningPage] Error fetching queue:', err);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            DCEC Committee Review
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Proposal Screening Review & Decisions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review verified Annexure 1 proposals, assess supervisory preferences, and record binding committee decisions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-xs text-slate-400 block">Pending Decision</span>
            <span className="text-xl font-bold text-blue-400">
              {queue.filter((q) => !q.decision_id).length}
            </span>
          </div>
        </div>
      </div>

      {/* Dockets Review Grid */}
      <DCECDocketReviewCard queue={queue} isChair={isChair} />
    </div>
  );
}
