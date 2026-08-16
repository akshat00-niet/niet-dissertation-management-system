'use client';

import React, { useState } from 'react';
import type { AllocationQueueItem, FacultyAllocationOption } from '@/types/allocation.types';
import { SupervisorAllocationModal } from './SupervisorAllocationModal';
import { SupervisorReallocationModal } from './SupervisorReallocationModal';

interface AllocationQueueTableProps {
  queue: AllocationQueueItem[];
  facultyOptions: FacultyAllocationOption[];
}

export function AllocationQueueTable({ queue, facultyOptions }: AllocationQueueTableProps) {
  const [selectedForAlloc, setSelectedForAlloc] = useState<AllocationQueueItem | null>(null);
  const [selectedForRealloc, setSelectedForRealloc] = useState<AllocationQueueItem | null>(null);
  const [filterState, setFilterState] = useState<'ALL' | 'PENDING' | 'ALLOCATED'>('PENDING');

  const filteredQueue = queue.filter((item) => {
    if (filterState === 'PENDING') return item.current_state === 'APPROVED_FOR_ALLOCATION';
    if (filterState === 'ALLOCATED') return item.current_state === 'SUPERVISORS_ALLOCATED';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterState('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterState === 'PENDING'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending Allocation ({queue.filter((q) => q.current_state === 'APPROVED_FOR_ALLOCATION').length})
          </button>
          <button
            onClick={() => setFilterState('ALLOCATED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterState === 'ALLOCATED'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Allocated ({queue.filter((q) => q.current_state === 'SUPERVISORS_ALLOCATED').length})
          </button>
          <button
            onClick={() => setFilterState('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterState === 'ALL'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Cohort ({queue.length})
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-medium">{filteredQueue.length}</span> dissertations
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Tracking & Candidate</th>
                <th className="px-6 py-4">Proposed Title & Domain</th>
                <th className="px-6 py-4">Student 4 Preferences</th>
                <th className="px-6 py-4">Assigned Supervisors</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredQueue.length > 0 ? (
                filteredQueue.map((item) => {
                  const isAllocated = item.current_state === 'SUPERVISORS_ALLOCATED';
                  return (
                    <tr key={item.thesis_id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Tracking & Candidate */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{item.tracking_number}</div>
                        <div className="text-xs text-slate-400">{item.student_name}</div>
                        <div className="text-[11px] text-slate-500">Roll: {item.student_roll_number}</div>
                      </td>

                      {/* Title & Domain */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-medium text-slate-200 truncate" title={item.proposed_title || ''}>
                          {item.proposed_title || 'Untitled Proposal'}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {item.broad_domain || 'General Domain'}
                        </div>
                      </td>

                      {/* 4 Ranked Preferences */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {item.student_preferences && item.student_preferences.length > 0 ? (
                            item.student_preferences.slice(0, 2).map((pref) => (
                              <div key={pref.faculty_id} className="flex items-center space-x-1.5 text-xs">
                                <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[10px] font-bold">
                                  #{pref.preference_rank}
                                </span>
                                <span className="text-slate-300 truncate max-w-[130px]" title={pref.faculty_name}>
                                  {pref.faculty_name}
                                </span>
                                <span
                                  className={`text-[10px] ${
                                    pref.active_guide_load >= 3 ? 'text-rose-400' : 'text-emerald-400'
                                  }`}
                                >
                                  ({pref.active_guide_load}/3)
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500 italic">No preferences</span>
                          )}
                          {item.student_preferences && item.student_preferences.length > 2 && (
                            <div className="text-[10px] text-slate-500 pl-6">
                              +{item.student_preferences.length - 2} more preferences
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned Supervisors */}
                      <td className="px-6 py-4">
                        {isAllocated ? (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-slate-500 text-[10px]">Guide:</span>
                              <span className="text-emerald-400 font-medium">{item.guide_name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-slate-500 text-[10px]">Co-Guide:</span>
                              <span className="text-blue-400 font-medium">{item.co_guide_name || 'N/A'}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-400/80 italic">Awaiting D.HOD Assignment</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {isAllocated ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Supervisors Allocated
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Ready for Allocation
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        {isAllocated ? (
                          <button
                            onClick={() => setSelectedForRealloc(item)}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Reallocate...
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedForAlloc(item)}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-950"
                          >
                            Allocate Supervisors
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No dissertations currently match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocation Modal */}
      {selectedForAlloc && (
        <SupervisorAllocationModal
          item={selectedForAlloc}
          facultyOptions={facultyOptions}
          onClose={() => setSelectedForAlloc(null)}
          onSuccess={() => {
            setSelectedForAlloc(null);
            window.location.reload();
          }}
        />
      )}

      {/* Reallocation Modal */}
      {selectedForRealloc && (
        <SupervisorReallocationModal
          item={selectedForRealloc}
          facultyOptions={facultyOptions}
          onClose={() => setSelectedForRealloc(null)}
          onSuccess={() => {
            setSelectedForRealloc(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
