import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { listTheses } from '@/lib/dal/theses.dal';
import { Annexure6StatusBadge } from '@/components/annexure6/Annexure6StatusBadge';
import type { UserRoleAssignment } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export default async function GuideAnnexure6QueuePage() {
  const supabase = createClient();
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  const isGuideOrFaculty = session.roles.some((r: UserRoleAssignment) =>
    ['GUIDE', 'CO_GUIDE', 'FACULTY', 'HOD'].includes(r.role_id)
  );
  if (!isGuideOrFaculty) {
    redirect('/app');
  }

  let supervisedTheses: any[] = [];
  try {
    supervisedTheses = await listTheses(supabase, { guideId: session.appUser.id });
  } catch (err) {
    console.error('[GuideAnnexure6QueuePage] Error fetching supervised theses:', err);
  }

  // Filter for theses that have reached Final Submission / Confidential Evaluation stages
  const eligibleTheses = supervisedTheses.filter((t) =>
    [
      'ANNEXURE_6_PENDING',
      'DEFENSE_PANEL_CONSTITUTED',
      'VIVA_DEFENSE_SCHEDULED',
      'ANNEXURE_5_SUPERVISOR_ENDORSED',
    ].includes(t.current_state)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Supervisor Evaluation Portal
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
              Confidential (OD-014)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Annexure 6 Supervisor Evaluation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Submit confidential qualitative appraisal and scoring for dissertation candidates who have received final submission endorsement.
          </p>
        </div>
      </div>

      {/* Roster Table */}
      {eligibleTheses.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">No Theses Awaiting Annexure 6 Evaluation</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Theses will appear here once candidate manuscripts and similarity reports have received final supervisor endorsement (Annexure 5).
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Candidate & Tracking</th>
                  <th className="px-6 py-4">Lifecycle State</th>
                  <th className="px-6 py-4">Role Context</th>
                  <th className="px-6 py-4 text-right">Evaluation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {eligibleTheses.map((thesis) => {
                  const isPrimaryGuide = thesis.guide_id === session.appUser?.id;
                  const isPendingEvaluation = thesis.current_state === 'ANNEXURE_6_PENDING';

                  return (
                    <tr key={thesis.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4">
                        <span className="font-bold text-white block">
                          {thesis.student?.full_name || 'Candidate'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {thesis.tracking_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Annexure6StatusBadge status={thesis.current_state} type="state" />
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {isPrimaryGuide ? (
                          <span className="text-purple-400 font-semibold">Primary Guide (Authorized)</span>
                        ) : (
                          <span className="text-slate-400">Co-Guide (Read-Only)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isPrimaryGuide && isPendingEvaluation ? (
                          <Link
                            href={`/app/guide/annexure-6/${thesis.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition"
                          >
                            Evaluate Candidate
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        ) : (
                          <Link
                            href={`/app/guide/annexure-6/${thesis.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                          >
                            View Docket
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
