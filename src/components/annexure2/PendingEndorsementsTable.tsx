'use client';

import React, { useState } from 'react';
import type { Annexure2Workspace } from '@/types/annexure2.types';
import { SupervisorEndorsementModal } from './SupervisorEndorsementModal';

interface PendingEndorsementsTableProps {
  workspaces: Annexure2Workspace[];
}

export function PendingEndorsementsTable({ workspaces }: PendingEndorsementsTableProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Annexure2Workspace | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTION_REQUIRED' | 'ENDORSED' | 'APPROVED'>('ALL');

  const filteredWorkspaces = workspaces.filter((ws) => {
    if (activeFilter === 'ACTION_REQUIRED') {
      return ws.permissions.can_endorse;
    }
    if (activeFilter === 'ENDORSED') {
      return ws.thesis.current_state === 'ANNEXURE_2_SUPERVISOR_ENDORSED';
    }
    if (activeFilter === 'APPROVED') {
      return ws.thesis.current_state === 'ANNEXURE_2_DCEC_APPROVED';
    }
    return true;
  });

  const getRoleBadge = (ws: Annexure2Workspace) => {
    if (ws.permissions.is_guide) {
      return <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-xs font-semibold">Primary Guide</span>;
    }
    if (ws.permissions.is_coguide) {
      return <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md text-xs font-semibold">Co-Guide</span>;
    }
    return <span className="px-2.5 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-md text-xs font-semibold">Supervisor</span>;
  };

  const getDualEndorsementPills = (ws: Annexure2Workspace) => {
    const guideEnd = ws.endorsements.find((e) => e.supervisor_role === 'GUIDE');
    const coGuideEnd = ws.endorsements.find((e) => e.supervisor_role === 'CO_GUIDE');

    return (
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[10px] uppercase w-12">Guide:</span>
          {guideEnd?.is_endorsed ? (
            <span className="text-emerald-400 font-medium">✓ Endorsed</span>
          ) : (
            <span className="text-slate-500">Pending</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[10px] uppercase w-12">Co-Guide:</span>
          {coGuideEnd?.is_endorsed ? (
            <span className="text-emerald-400 font-medium">✓ Endorsed</span>
          ) : (
            <span className="text-slate-500">Pending</span>
          )}
        </div>
      </div>
    );
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'ANNEXURE_2_SUBMITTED':
        return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-xs font-medium">Under Endorsement</span>;
      case 'ANNEXURE_2_SUPERVISOR_ENDORSED':
        return <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-xs font-medium">Under DCEC Review</span>;
      case 'ANNEXURE_2_DCEC_APPROVED':
        return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-medium">Title Approved</span>;
      case 'ANNEXURE_2_REVISION':
        return <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-xs font-medium">Revision</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-md text-xs font-medium">{state}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          All Assigned ({workspaces.length})
        </button>
        <button
          onClick={() => setActiveFilter('ACTION_REQUIRED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'ACTION_REQUIRED'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Action Required ({workspaces.filter((w) => w.permissions.can_endorse).length})
        </button>
        <button
          onClick={() => setActiveFilter('ENDORSED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'ENDORSED'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          DCEC Review ({workspaces.filter((w) => w.thesis.current_state === 'ANNEXURE_2_SUPERVISOR_ENDORSED').length})
        </button>
        <button
          onClick={() => setActiveFilter('APPROVED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Approved ({workspaces.filter((w) => w.thesis.current_state === 'ANNEXURE_2_DCEC_APPROVED').length})
        </button>
      </div>

      {/* Table / Empty State */}
      {filteredWorkspaces.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <div className="text-3xl text-slate-600">📋</div>
          <h3 className="text-base font-semibold text-slate-300">No Annexure 2 submissions found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are no dissertations matching the selected filter currently awaiting your supervisor review or endorsement.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Tracking & Candidate</th>
                  <th className="p-4">Final Proposed Title</th>
                  <th className="p-4">My Role</th>
                  <th className="p-4">Lifecycle State</th>
                  <th className="p-4">Dual Endorsement Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredWorkspaces.map((ws) => (
                  <tr key={ws.thesis.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 space-y-1">
                      <div className="font-mono text-white font-semibold">{ws.thesis.tracking_number}</div>
                      <div className="text-slate-300 font-medium">{ws.student?.full_name}</div>
                      <div className="text-slate-500 text-[11px]">{ws.student?.roll_number}</div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="text-white font-medium line-clamp-2">
                        {ws.annexure_2?.final_title || ws.annexure_1?.proposed_title || 'Untitled'}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Domain: {ws.annexure_1?.broad_domain || 'General'}
                      </div>
                    </td>
                    <td className="p-4">
                      {getRoleBadge(ws)}
                    </td>
                    <td className="p-4">
                      {getStateBadge(ws.thesis.current_state)}
                    </td>
                    <td className="p-4">
                      {getDualEndorsementPills(ws)}
                    </td>
                    <td className="p-4 text-right">
                      {ws.permissions.can_endorse ? (
                        <button
                          onClick={() => setSelectedWorkspace(ws)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm transition-all"
                        >
                          Review & Endorse
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedWorkspace(ws)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors border border-slate-700"
                        >
                          View Docket
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supervisor Endorsement Modal */}
      {selectedWorkspace && (
        <SupervisorEndorsementModal
          workspace={selectedWorkspace}
          onClose={() => setSelectedWorkspace(null)}
          onSuccess={() => {
            setSelectedWorkspace(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
