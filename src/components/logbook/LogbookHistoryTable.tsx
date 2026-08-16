'use client';

import React, { useState } from 'react';
import type { DigitalLogbookEntry } from '@/types/logbook.types';

interface LogbookHistoryTableProps {
  entries: DigitalLogbookEntry[];
  canEdit: boolean;
  onEditEntry: (entry: DigitalLogbookEntry) => void;
}

export function LogbookHistoryTable({
  entries,
  canEdit,
  onEditEntry,
}: LogbookHistoryTableProps) {
  const [selectedEntry, setSelectedEntry] = useState<DigitalLogbookEntry | null>(null);

  if (!entries || entries.length === 0) {
    return (
      <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-3">
        <div className="text-3xl text-slate-600">📝</div>
        <h3 className="text-sm font-semibold text-slate-300">No Logbook Entries Recorded</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          You haven&apos;t logged any supervisory meetings yet. Click &quot;Log Meeting Entry&quot; to record interaction details.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Verified (Immutable)
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-950/80 border border-blue-700/60 text-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            Submitted (Pending Verification)
          </span>
        );
      case 'REVISION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/80 border border-amber-700/60 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Revision Required
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Immutability Banner */}
      <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>🔒</span>
          <span>Verified entries are permanently immutable institutional records.</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Total Entries: {entries.length} | Verified: {entries.filter(e => e.status === 'VERIFIED').length}
        </span>
      </div>

      {/* Entries List / Cards */}
      <div className="space-y-3">
        {entries.map((entry) => {
          const isEditable = canEdit && (entry.status === 'DRAFT' || entry.status === 'REVISION_REQUIRED');
          const latestVerification = entry.verifications && entry.verifications.length > 0 ? entry.verifications[0] : null;

          return (
            <div
              key={entry.id}
              className={`p-5 rounded-2xl border transition-all ${
                entry.status === 'VERIFIED'
                  ? 'bg-slate-900/90 border-emerald-900/40 hover:border-emerald-800/60'
                  : entry.status === 'REVISION_REQUIRED'
                  ? 'bg-amber-950/20 border-amber-900/50 hover:border-amber-700/60'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {entry.meeting_mode === 'ONLINE' ? '🌐' : '🏢'}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{new Date(entry.meeting_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}</span>
                      <span className="text-xs font-normal text-slate-400">
                        at {new Date(entry.meeting_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {entry.meeting_mode === 'ONLINE' ? (
                        <span className="text-blue-400 underline truncate max-w-md inline-block">
                          {entry.meeting_link}
                        </span>
                      ) : (
                        <span className="text-slate-300">
                          {entry.meeting_location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(entry.status)}

                  {isEditable && (
                    <button
                      onClick={() => onEditEntry(entry)}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-medium rounded-lg transition-colors"
                    >
                      {entry.status === 'REVISION_REQUIRED' ? 'Edit & Resubmit' : 'Edit Draft'}
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    {selectedEntry?.id === entry.id ? 'Hide Details' : 'View Details'}
                  </button>
                </div>
              </div>

              {/* Agenda & Quick Summary */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Agenda:</span>
                  <p className="text-slate-300 line-clamp-2 mt-0.5">{entry.discussion_agenda}</p>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Progress Discussed:</span>
                  <p className="text-slate-300 line-clamp-2 mt-0.5">{entry.progress_discussed}</p>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Next Milestone Target:</span>
                  <p className="text-blue-300 font-semibold mt-0.5">
                    {new Date(entry.next_target_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Supervisor Feedback Callout if returned */}
              {entry.status === 'REVISION_REQUIRED' && latestVerification && (
                <div className="mt-3 p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs space-y-1">
                  <div className="text-amber-300 font-semibold flex items-center gap-1.5">
                    <span>⚠️</span> Revision Feedback from {latestVerification.verifier_name}:
                  </div>
                  <p className="text-slate-300 italic">&ldquo;{latestVerification.feedback_remarks}&rdquo;</p>
                </div>
              )}

              {/* Expanded Details Drawer */}
              {selectedEntry?.id === entry.id && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 animate-fade-in text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 space-y-1">
                      <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                        Full Discussion Agenda
                      </span>
                      <p className="text-slate-200 whitespace-pre-wrap">{entry.discussion_agenda}</p>
                    </div>

                    <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 space-y-1">
                      <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                        Detailed Progress Summary
                      </span>
                      <p className="text-slate-200 whitespace-pre-wrap">{entry.progress_discussed}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 space-y-1">
                    <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                      Action Items & Assigned Deliverables
                    </span>
                    <p className="text-slate-200 whitespace-pre-wrap">{entry.action_items}</p>
                  </div>

                  {/* Verification History Log */}
                  {entry.verifications && entry.verifications.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                        Verification Audit History
                      </span>
                      <div className="space-y-1.5">
                        {entry.verifications.map((v) => (
                          <div
                            key={v.id}
                            className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className={v.outcome === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400'}>
                                {v.outcome === 'VERIFIED' ? '✓' : '🔄'}
                              </span>
                              <span className="font-medium text-white">{v.verifier_name}</span>
                              <span className="text-slate-500">
                                marked as <span className="font-mono text-slate-300">{v.outcome}</span>
                              </span>
                            </div>
                            <span className="text-slate-500 text-[11px]">
                              {new Date(v.verified_at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
