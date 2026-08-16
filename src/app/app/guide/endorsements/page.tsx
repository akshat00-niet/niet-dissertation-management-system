import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { getAnnexure2Workspace } from '@/lib/services/annexure2.service';
import { PendingEndorsementsTable } from '@/components/annexure2/PendingEndorsementsTable';
import type { UserRoleAssignment } from '@/types/database.types';
import type { Annexure2Workspace } from '@/types/annexure2.types';

export const dynamic = 'force-dynamic';

export default async function GuideEndorsementsPage() {
  const supabase = createClient();
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  const isFaculty = session.roles.some((r: UserRoleAssignment) =>
    ['FACULTY', 'GUIDE', 'CO_GUIDE', 'HOD', 'DHOD'].includes(r.role_id)
  );
  if (!isFaculty) {
    redirect('/app');
  }

  // Query supervised theses where caller is Guide or Co-Guide
  const { data: theses, error } = await supabase
    .from('theses')
    .select('id, tracking_number, current_state')
    .or(`guide_id.eq.${session.appUser.id},co_guide_id.eq.${session.appUser.id}`)
    .not('current_state', 'in', '("ARCHIVED","PROPOSAL_REJECTED_TERMINAL")')
    .order('updated_at', { ascending: false });

  const workspaces: Annexure2Workspace[] = [];
  if (theses && theses.length > 0) {
    for (const t of theses) {
      try {
        const ws = await getAnnexure2Workspace(supabase, session, t.id);
        workspaces.push(ws);
      } catch (err) {
        console.error(`[GuideEndorsementsPage] Failed to fetch workspace for thesis ${t.id}:`, err);
      }
    }
  }

  const pendingCount = workspaces.filter((w) => w.permissions.can_endorse).length;
  const underReviewCount = workspaces.filter((w) => w.thesis.current_state === 'ANNEXURE_2_SUPERVISOR_ENDORSED').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            Supervisor Endorsement Portal
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Annexure 2 Title Endorsements
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review and electronically sign off on finalized dissertation titles, problem scopes, and work package timelines for your assigned candidates.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-xs text-slate-400 block">Pending Sign-off</span>
            <span className="text-xl font-bold text-amber-400">{pendingCount}</span>
          </div>
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-xs text-slate-400 block">DCEC Queue</span>
            <span className="text-xl font-bold text-indigo-400">{underReviewCount}</span>
          </div>
        </div>
      </div>

      {/* Endorsements Table */}
      <PendingEndorsementsTable workspaces={workspaces} />
    </div>
  );
}
