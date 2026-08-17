'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DepartmentAnnexure6QueueItem } from '@/types/annexure6.types';
import type { FacultyAllocationOption } from '@/types/allocation.types';
import { Annexure6StatusBadge } from '@/components/annexure6/Annexure6StatusBadge';
import { DefensePanelConstitutionModal } from '@/components/annexure6/DefensePanelConstitutionModal';

interface DefensePanelQueueTableProps {
  queue: DepartmentAnnexure6QueueItem[];
  facultyOptions: FacultyAllocationOption[];
}

export function DefensePanelQueueTable({
  queue,
  facultyOptions,
}: DefensePanelQueueTableProps) {
  const router = useRouter();
  const [selectedForPanel, setSelectedForPanel] = useState<DepartmentAnnexure6QueueItem | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_PANEL' | 'SCHEDULED'>('PENDING_PANEL');

  const filteredItems = queue.filter((item) => {
    if (filter === 'PENDING_PANEL') return item.current_state === 'DEFENSE_PANEL_CONSTITUTED';
    if (filter === 'SCHEDULED') return item.current_state === 'VIVA_DEFENSE_SCHEDULED';
    return true;
  });

  const pendingPanelCount = queue.filter((q) => q.current_state === 'DEFENSE_PANEL_CONSTITUTED').length;
  const scheduledCount = queue.filter((q) => q.current_state === 'VIVA_DEFENSE_SCHEDULED').length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('PENDING_PANEL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'PENDING_PANEL'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
            }`}
          >
            Pending Panel Appointment ({pendingPanelCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('SCHEDULED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'SCHEDULED'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
            }`}
          >
            Defense Scheduled ({scheduledCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'ALL'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
            }`}
          >
            All Candidates ({queue.length})
          </button>
        </div>
      </div>

      {/* Roster Table */}
      {filteredItems.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">No Theses in Current Queue</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            There are currently no candidates awaiting panel constitution matching this filter.
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
                  <th className="px-6 py-4">Defense Recommendation</th>
                  <th className="px-6 py-4">Lifecycle State</th>
                  <th className="px-6 py-4">Viva Schedule</th>
                  <th className="px-6 py-4 text-right">Panel Constitution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredItems.map((item) => {
                  const isReadyForPanel = item.current_state === 'DEFENSE_PANEL_CONSTITUTED';

                  return (
                    <tr key={item.thesis_id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4">
                        <span className="font-bold text-white block">{item.student_name}</span>
                        <span className="text-xs text-slate-400 font-mono">
                          {item.roll_number} | {item.tracking_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300 font-medium block">
                          {item.guide_name || 'Assigned Guide'}
                        </span>
                        {item.co_guide_name && (
                          <span className="text-xs text-slate-500 block">Co-Guide: {item.co_guide_name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Annexure6StatusBadge status={item.defense_recommendation} type="recommendation" />
                      </td>
                      <td className="px-6 py-4">
                        <Annexure6StatusBadge status={item.current_state} type="state" />
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {item.has_defense_panel && item.viva_scheduled_at ? (
                          <span className="text-emerald-400 font-medium font-mono">
                            {new Date(item.viva_scheduled_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono">Not Scheduled</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isReadyForPanel ? (
                          <button
                            type="button"
                            onClick={() => setSelectedForPanel(item)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition"
                          >
                            Appoint 2-Member Panel
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">
                            {item.current_state === 'VIVA_DEFENSE_SCHEDULED' ? 'Panel Appointed' : 'Evaluation Pending'}
                          </span>
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

      {/* Constitution Modal */}
      {selectedForPanel && (
        <DefensePanelConstitutionModal
          thesisId={selectedForPanel.thesis_id}
          trackingNumber={selectedForPanel.tracking_number}
          studentName={selectedForPanel.student_name}
          guideId={selectedForPanel.guide_id}
          coGuideId={selectedForPanel.co_guide_id}
          guideName={selectedForPanel.guide_name}
          coGuideName={selectedForPanel.co_guide_name}
          facultyOptions={facultyOptions}
          onClose={() => setSelectedForPanel(null)}
          onSuccess={() => {
            setSelectedForPanel(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
