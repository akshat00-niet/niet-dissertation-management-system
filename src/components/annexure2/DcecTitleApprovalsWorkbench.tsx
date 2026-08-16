'use client';

import React, { useState } from 'react';
import type { Annexure2Workspace } from '@/types/annexure2.types';
import { DcecTitleApprovalModal } from './DcecTitleApprovalModal';

interface DcecTitleApprovalsWorkbenchProps {
  workspaces: Annexure2Workspace[];
}

export function DcecTitleApprovalsWorkbench({ workspaces }: DcecTitleApprovalsWorkbenchProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Annexure2Workspace | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');

  const filteredWorkspaces = workspaces.filter((ws) => {
    if (activeFilter === 'PENDING') {
      return ws.thesis.current_state === 'ANNEXURE_2_SUPERVISOR_ENDORSED';
    }
    if (activeFilter === 'APPROVED') {
      return ws.thesis.current_state === 'ANNEXURE_2_DCEC_APPROVED';
    }
    return true;
  });

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
          All Dockets ({workspaces.length})
        </button>
        <button
          onClick={() => setActiveFilter('PENDING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'PENDING'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Pending Decision ({workspaces.filter((w) => w.thesis.current_state === 'ANNEXURE_2_SUPERVISOR_ENDORSED').length})
        </button>
        <button
          onClick={() => setActiveFilter('APPROVED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Formally Baselined ({workspaces.filter((w) => w.thesis.current_state === 'ANNEXURE_2_DCEC_APPROVED').length})
        </button>
      </div>

      {/* Table / Empty State */}
      {filteredWorkspaces.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <div className="text-3xl text-slate-600">⚖️</div>
          <h3 className="text-base font-semibold text-slate-300">No title approval dockets found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are no Annexure 2 title approval dockets matching the selected filter currently awaiting DCEC Chair decision.
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
                  <th className="p-4">Supervisors (Guide & Co-Guide)</th>
                  <th className="p-4">Dual Endorsement</th>
                  <th className="p-4">Current Status</th>
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
                        {ws.annexure_2?.final_title || 'Untitled'}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Domain: {ws.annexure_1?.broad_domain || 'General'}
                      </div>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <div className="text-slate-300">G: {ws.guide?.full_name}</div>
                      <div className="text-slate-400 text-[11px]">Co-G: {ws.co_guide?.full_name}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-medium">
                        ✓ 2/2 Verified
                      </span>
                    </td>
                    <td className="p-4">
                      {ws.thesis.current_state === 'ANNEXURE_2_DCEC_APPROVED' ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-medium">
                          Baselined
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-xs font-medium">
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {ws.permissions.can_approve ? (
                        <button
                          onClick={() => setSelectedWorkspace(ws)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm transition-all"
                        >
                          Review & Decide
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

      {/* DCEC Title Approval Modal */}
      {selectedWorkspace && (
        <DcecTitleApprovalModal
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
