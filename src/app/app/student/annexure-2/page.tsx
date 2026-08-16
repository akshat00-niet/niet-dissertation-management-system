import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { getAnnexure2Workspace } from '@/lib/services/annexure2.service';
import { Annexure2Form } from '@/components/annexure2/Annexure2Form';
import type { UserRoleAssignment } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export default async function StudentAnnexure2Page() {
  const supabase = createClient();
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  const isStudent = session.roles.some((r: UserRoleAssignment) => r.role_id === 'STUDENT');
  if (!isStudent) {
    redirect('/app');
  }

  // Find candidate's active thesis
  const { data: thesis, error } = await supabase
    .from('theses')
    .select('id, tracking_number, current_state, current_stage, guide_id, co_guide_id')
    .eq('student_id', session.appUser.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !thesis) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
          <div className="text-3xl text-slate-600">📁</div>
          <h2 className="text-lg font-bold text-white">No Dissertation Record Found</h2>
          <p className="text-sm text-slate-400">
            You must initialize your dissertation proposal via Annexure 1 before accessing the Annexure 2 workspace.
          </p>
          <Link
            href="/app/student/annexure-1"
            className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Go to Annexure 1
          </Link>
        </div>
      </div>
    );
  }

  // Check if supervisor allocation is completed
  const unallocatedStates = [
    'DRAFT_PROPOSAL',
    'ANNEXURE_1_SUBMITTED',
    'DC_SCREENING_QUEUE',
    'DC_DEFICIENCIES_RETURNED',
    'DC_VERIFIED',
    'DCEC_SCREENING_QUEUE',
    'APPROVED_FOR_ALLOCATION',
  ];

  if (unallocatedStates.includes(thesis.current_state) || !thesis.guide_id || !thesis.co_guide_id) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <Link href="/app/student/dissertation" className="text-xs text-blue-400 hover:underline">
              ← Back to Dissertation Workspace
            </Link>
            <h1 className="text-2xl font-extrabold text-white mt-1">
              Annexure 2: Problem Formulation
            </h1>
          </div>
          <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">
            {thesis.current_state}
          </span>
        </div>

        <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-4">
          <div className="text-3xl text-amber-500">⏳</div>
          <h2 className="text-lg font-bold text-white">Supervisor Allocation in Progress</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Your proposal is currently advancing through screening and supervisor allocation. Annexure 2 problem formulation will unlock once your Primary Guide and Co-Guide are assigned by the D.HOD.
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 max-w-xs mx-auto">
            Tracking Number: <span className="font-mono text-white font-semibold">{thesis.tracking_number}</span>
          </div>
        </div>
      </div>
    );
  }

  let workspace;
  try {
    workspace = await getAnnexure2Workspace(supabase, session, thesis.id);
  } catch (err: any) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-sm">
          Failed to load Annexure 2 workspace: {err.message || 'An error occurred.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/student/dissertation" className="text-xs text-blue-400 hover:underline">
          ← Back to Dissertation Workspace
        </Link>
      </div>
      <Annexure2Form workspace={workspace} />
    </div>
  );
}
