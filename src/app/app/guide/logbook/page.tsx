import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { getDigitalLogbookWorkspace } from '@/lib/services/logbook.service';
import {
  SupervisorLogbookWorkbench,
  SupervisorThesisLogbookItem,
} from '@/components/logbook/SupervisorLogbookWorkbench';
import type { UserRoleAssignment } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export default async function GuideLogbookPage() {
  const supabase = createClient();
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  const isFaculty = session.roles.some((r: UserRoleAssignment) =>
    ['FACULTY', 'GUIDE', 'CO_GUIDE', 'HOD', 'DHOD', 'DC', 'DCEC_MEMBER'].includes(r.role_id)
  );
  if (!isFaculty) {
    redirect('/app');
  }

  // Query theses supervised by authenticated faculty
  const { data: theses, error } = await supabase
    .from('theses')
    .select(`
      id,
      tracking_number,
      current_state,
      current_stage,
      student_id,
      users:student_id (
        id,
        full_name,
        institutional_email
      )
    `)
    .or(`guide_id.eq.${session.appUser.id},co_guide_id.eq.${session.appUser.id}`)
    .eq('current_stage', 'RESEARCH_AND_PROGRESS_STAGE')
    .order('updated_at', { ascending: false });

  const thesesItems: SupervisorThesisLogbookItem[] = [];

  if (theses && theses.length > 0) {
    for (const t of theses) {
      try {
        const ws = await getDigitalLogbookWorkspace(supabase, session, t.id);
        const studentUser = t.users as any;
        thesesItems.push({
          thesis_id: t.id,
          tracking_number: t.tracking_number,
          student_name: studentUser?.full_name || 'Candidate Student',
          student_email: studentUser?.institutional_email || '',
          approved_title: ws.approved_title,
          current_stage: t.current_stage,
          workspace: ws,
        });
      } catch (err) {
        console.error(`[GuideLogbookPage] Failed to fetch workspace for thesis ${t.id}:`, err);
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            Supervisory Governance Portal
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Digital Logbook & Progress Verifications
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            Review candidate interaction minutes, sign off on verified meetings (Annexure 4), and acknowledge weekly/monthly research progress updates.
          </p>
        </div>
      </div>

      {/* Workbench Component */}
      <SupervisorLogbookWorkbench thesesItems={thesesItems} />
    </div>
  );
}
