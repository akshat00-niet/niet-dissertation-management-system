import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { DefensePanelCard } from '@/components/annexure6/DefensePanelCard';
import type { UserRoleAssignment } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export default async function PanelAssignmentsPage() {
  const supabase = createClient();
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  const isPanelOrFaculty = session.roles.some((r: UserRoleAssignment) =>
    ['PANEL_MEMBER', 'FACULTY', 'HOD', 'DC'].includes(r.role_id)
  );
  if (!isPanelOrFaculty) {
    redirect('/app');
  }

  // Fetch panel member assignments for current faculty member
  let assignments: any[] = [];
  try {
    const { data, error } = await supabase
      .from('panel_member_assignments')
      .select(`
        id,
        is_panel_chair,
        evaluator_role,
        panel:defense_panels (
          id,
          viva:viva_defenses (
            id,
            defense_cycle_index,
            composite_score,
            outcome,
            panel_summary,
            scheduled_at,
            thesis:theses (
              id,
              tracking_number,
              current_state,
              current_stage,
              student:users!theses_student_id_fkey (
                full_name,
                institutional_email
              )
            )
          )
        )
      `)
      .eq('faculty_id', session.appUser.id);

    if (!error && data) {
      assignments = data;
    }
  } catch (err) {
    console.error('[PanelAssignmentsPage] Error fetching assignments:', err);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
            Oral Defense Examination Panel
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Assigned Viva Defenses
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review appointed candidate oral defense sessions, examine dissertation dossiers, and prepare for viva examinations.
          </p>
        </div>
      </div>

      {/* Assignment List */}
      {assignments.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">No Viva Defenses Currently Assigned</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            You have not been appointed to any active oral defense panels at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {assignments.map((asgn) => {
            const viva = asgn.panel?.viva;
            const thesis = viva?.thesis;
            const student = thesis?.student;

            return (
              <div
                key={asgn.id}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-purple-500/40 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                        {asgn.is_panel_chair ? 'Panel Chair' : 'Panel Examiner'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {asgn.evaluator_role}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {student?.full_name || 'Candidate'}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Thesis: {thesis?.tracking_number}
                    </p>
                  </div>

                  {viva?.scheduled_at && (
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-500 block font-medium">Viva Scheduled</span>
                      <span className="text-sm font-bold text-purple-300">
                        {new Date(viva.scheduled_at).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="text-xs text-slate-400 block font-mono">
                        {new Date(viva.scheduled_at).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {viva?.panel_summary && (
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-center gap-2">
                    <span className="text-slate-500 uppercase font-semibold">Venue:</span>
                    <span className="text-white font-medium">{viva.panel_summary}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
