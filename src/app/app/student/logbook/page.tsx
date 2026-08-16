import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { getDigitalLogbookWorkspace } from '@/lib/services/logbook.service';
import { StudentLogbookClient } from './StudentLogbookClient';
import type { UserRoleAssignment } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export default async function StudentLogbookPage() {
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
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in p-6">
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
          <div className="text-3xl text-slate-600">📁</div>
          <h2 className="text-lg font-bold text-white">No Dissertation Record Found</h2>
          <p className="text-sm text-slate-400">
            You must initialize your dissertation proposal via Annexure 1 before accessing the Digital Logbook.
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

  // Stage guard: Candidate must have approved Annexure 2 title to log meetings
  if (thesis.current_stage !== 'RESEARCH_AND_PROGRESS_STAGE') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in p-6">
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
          <div className="text-3xl text-amber-500">⏳</div>
          <h2 className="text-lg font-bold text-white">Digital Logbook Locked</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            The Digital Logbook (Annexure 4) is unlocked during{' '}
            <span className="text-white font-mono">RESEARCH_AND_PROGRESS_STAGE</span> once your dissertation title has been formally approved by DCEC in Annexure 2.
          </p>
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl inline-block text-xs text-slate-400 font-mono">
            Current Stage: <span className="text-amber-300 font-bold">{thesis.current_stage}</span> ({thesis.current_state})
          </div>
          <div className="pt-2">
            <Link
              href="/app/student/annexure-2"
              className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20"
            >
              Go to Annexure 2 (Title Approval)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch full workspace aggregate
  const workspace = await getDigitalLogbookWorkspace(supabase, session, thesis.id);

  return <StudentLogbookClient workspace={workspace} />;
}
