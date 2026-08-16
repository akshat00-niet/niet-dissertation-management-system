import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { getAnnexure2Workspace } from '@/lib/services/annexure2.service';
import { DcecTitleApprovalsWorkbench } from '@/components/annexure2/DcecTitleApprovalsWorkbench';
import type { UserRoleAssignment } from '@/types/database.types';
import type { Annexure2Workspace } from '@/types/annexure2.types';

export const dynamic = 'force-dynamic';

export default async function DcecTitleApprovalsPage() {
  const supabase = createClient();
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  const isAuthorized = session.roles.some((r: UserRoleAssignment) =>
    ['HOD', 'DHOD', 'DCEC_MEMBER', 'DCEC_CHAIR'].includes(r.role_id)
  );
  if (!isAuthorized) {
    redirect('/app');
  }

  // Get department of the official
  const deptRole = session.roles.find((r: UserRoleAssignment) =>
    ['HOD', 'DHOD', 'DCEC_MEMBER', 'DCEC_CHAIR'].includes(r.role_id) && r.department_id
  );

  let theses: any[] = [];
  if (deptRole?.department_id) {
    const { data, error } = await supabase
      .from('theses')
      .select('id, tracking_number, current_state')
      .eq('department_id', deptRole.department_id)
      .in('current_state', ['ANNEXURE_2_SUPERVISOR_ENDORSED', 'ANNEXURE_2_DCEC_APPROVED'])
      .order('updated_at', { ascending: false });

    if (!error && data) {
      theses = data;
    }
  }

  const workspaces: Annexure2Workspace[] = [];
  for (const t of theses) {
    try {
      const ws = await getAnnexure2Workspace(supabase, session, t.id);
      workspaces.push(ws);
    } catch (err) {
      console.error(`[DcecTitleApprovalsPage] Failed to fetch workspace for thesis ${t.id}:`, err);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            DCEC Academic Authority Workbench
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Formal Title & Topic Approvals
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review dual-endorsed Annexure 2 title approval dockets and formally baseline research topics into the dissertation registry.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-xs text-slate-400 block">Pending Decision</span>
            <span className="text-xl font-bold text-indigo-400">
              {workspaces.filter((w) => w.thesis.current_state === 'ANNEXURE_2_SUPERVISOR_ENDORSED').length}
            </span>
          </div>
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-xs text-slate-400 block">Baselined</span>
            <span className="text-xl font-bold text-emerald-400">
              {workspaces.filter((w) => w.thesis.current_state === 'ANNEXURE_2_DCEC_APPROVED').length}
            </span>
          </div>
        </div>
      </div>

      {/* Workbench Component */}
      <DcecTitleApprovalsWorkbench workspaces={workspaces} />
    </div>
  );
}
