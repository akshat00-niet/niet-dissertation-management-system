import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentAppSession } from '@/lib/auth/session';
import { listDepartmentAnnexure6QueueAction } from '@/app/actions/annexure6.actions';
import { Annexure6StatusBadge } from '@/components/annexure6/Annexure6StatusBadge';
import type { UserRoleAssignment } from '@/types/database.types';
import type { DepartmentAnnexure6QueueItem } from '@/types/annexure6.types';

export const dynamic = 'force-dynamic';

interface DepartmentAnnexure6PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DepartmentAnnexure6Page({ searchParams }: DepartmentAnnexure6PageProps) {
  const { status: filterStatus = 'ALL' } = await searchParams;
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  const isDeptAuthority = session.roles.some((r: UserRoleAssignment) =>
    ['HOD', 'DHOD', 'DC', 'DCEC_CHAIR', 'DCEC_MEMBER', 'ADMIN'].includes(r.role_id)
  );
  if (!isDeptAuthority) {
    redirect('/app');
  }

  // Resolve user department ID
  const deptRole = session.roles.find((r: UserRoleAssignment) => r.department_id);
  const departmentId = deptRole?.department_id;

  let queueItems: DepartmentAnnexure6QueueItem[] = [];
  let errorMessage: string | null = null;

  if (departmentId) {
    try {
      const res = await listDepartmentAnnexure6QueueAction({
        department_id: departmentId,
        status: filterStatus,
      });

      if (res.success && res.data) {
        queueItems = (res.data.data as DepartmentAnnexure6QueueItem[]) || [];
      } else {
        errorMessage = res.error || 'Failed to load department Annexure 6 queue.';
      }
    } catch (err: any) {
      errorMessage = err.message || 'An unexpected error occurred while loading department queue.';
    }
  }

  const totalCount = queueItems.length;
  const pendingEvalCount = queueItems.filter((q) => q.current_state === 'ANNEXURE_6_PENDING').length;
  const pendingPanelCount = queueItems.filter((q) => q.current_state === 'DEFENSE_PANEL_CONSTITUTED').length;
  const scheduledCount = queueItems.filter((q) => q.current_state === 'VIVA_DEFENSE_SCHEDULED').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
            Department Academic Authority
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Annexure 6 & Defense Panel Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor supervisory evaluations, appoint oral defense examination panels, and track viva scheduling across department cohorts.
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-[11px] text-slate-400 block">Pending Eval</span>
            <span className="text-lg font-bold text-amber-400">{pendingEvalCount}</span>
          </div>
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-[11px] text-slate-400 block">Pending Panel</span>
            <span className="text-lg font-bold text-purple-400">{pendingPanelCount}</span>
          </div>
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-[11px] text-slate-400 block">Scheduled</span>
            <span className="text-lg font-bold text-emerald-400">{scheduledCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        {[
          { key: 'ALL', label: 'All Candidates' },
          { key: 'PENDING_EVALUATION', label: 'Pending Evaluation' },
          { key: 'PENDING_PANEL', label: 'Pending Panel' },
          { key: 'SCHEDULED', label: 'Viva Scheduled' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/app/department/annexure-6?status=${tab.key}`}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filterStatus === tab.key
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Queue Table */}
      {queueItems.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">No Theses Matching Selected Filter</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            There are no candidates currently in the {filterStatus.replace(/_/g, ' ')} queue for your department.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Candidate & Roll</th>
                  <th className="px-6 py-4">Primary Guide</th>
                  <th className="px-6 py-4">Annexure 6 State</th>
                  <th className="px-6 py-4">Defense Recommendation</th>
                  <th className="px-6 py-4">Viva Defense Status</th>
                  <th className="px-6 py-4 text-right">Coordination Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {queueItems.map((item) => (
                  <tr key={item.thesis_id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <span className="font-bold text-white block">{item.student_name}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        {item.roll_number} | {item.tracking_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300 font-medium block">{item.guide_name || 'Assigned Guide'}</span>
                      {item.co_guide_name && (
                        <span className="text-xs text-slate-500 block">Co-Guide: {item.co_guide_name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Annexure6StatusBadge status={item.current_state} type="state" />
                    </td>
                    <td className="px-6 py-4">
                      {item.has_annexure_6 ? (
                        <Annexure6StatusBadge status={item.defense_recommendation} type="recommendation" />
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Awaiting Guide Submission</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {item.has_defense_panel ? (
                        <div>
                          <span className="text-emerald-400 font-semibold block">Panel Appointed</span>
                          {item.viva_scheduled_at && (
                            <span className="text-slate-400">
                              {new Date(item.viva_scheduled_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-purple-400 font-medium">Panel Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.current_state === 'DEFENSE_PANEL_CONSTITUTED' ? (
                        <Link
                          href="/app/department/defense-panels"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition"
                        >
                          Appoint Panel
                        </Link>
                      ) : (
                        <Link
                          href={`/app/department/defense-panels`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                        >
                          View Details
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
