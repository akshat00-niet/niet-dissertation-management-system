'use client';

import React, { useState } from 'react';
import { DCECChairDecisionModal } from './DCECChairDecisionModal';
import type { DCECScreeningQueueItem } from '@/types/dcec.types';

interface DCECDocketReviewCardProps {
  queue: DCECScreeningQueueItem[];
  isChair: boolean;
}

export function DCECDocketReviewCard({ queue, isChair }: DCECDocketReviewCardProps) {
  const [selectedDocket, setSelectedDocket] = useState<DCECScreeningQueueItem | null>(null);

  if (queue.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
          ✓
        </div>
        <h3 className="text-lg font-medium text-white">No Dockets Awaiting Review</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          There are currently no verified dockets pending DCEC Chair screening decision in your department.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {queue.map((item) => {
          const isDecided = Boolean(item.decision_id);

          return (
            <div
              key={item.docket_id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 hover:border-slate-700/80 transition-colors"
            >
              {/* Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-bold text-blue-400">
                      {item.tracking_number}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {item.broad_domain || 'General'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {item.proposed_title || 'Untitled Proposal'}
                  </h3>
                </div>

                <div>
                  {isDecided ? (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                        item.outcome === 'APPROVED'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : item.outcome === 'REVISION_REQUIRED'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                          : 'bg-rose-950/80 text-rose-300 border-rose-800'
                      }`}
                    >
                      Outcome: {item.outcome?.replace('_', ' ')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800">
                      Awaiting Chair Decision
                    </span>
                  )}
                </div>
              </div>

              {/* Grid: Candidate Info & DC Maker Verification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40 space-y-2 text-sm">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Candidate Profile
                  </div>
                  <div className="font-medium text-white">{item.student_name}</div>
                  <div className="text-xs text-slate-400 font-mono">Roll: {item.student_roll_number}</div>
                </div>

                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40 space-y-2 text-sm">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    DC Maker Verification
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-400 font-medium">
                    <span>✓ Eligibility & Documentation Certified</span>
                  </div>
                  <div className="text-xs text-slate-400">Verified by: {item.dc_name}</div>
                  {item.dc_verification_notes && (
                    <div className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800">
                      &ldquo;{item.dc_verification_notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Problem Statement & Expected Outcomes */}
              <div className="space-y-4 text-sm bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Problem Statement
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    {item.problem_statement || 'No problem statement provided.'}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Expected Research Outcomes
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    {item.expected_outcomes || 'No expected outcomes provided.'}
                  </p>
                </div>
              </div>

              {/* Action Button for Chair */}
              {!isDecided && isChair && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedDocket(item)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-950/50 transition-all flex items-center space-x-2"
                  >
                    <span>Record Binding Decision</span>
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDocket && (
        <DCECChairDecisionModal
          item={selectedDocket}
          isOpen={true}
          onClose={() => setSelectedDocket(null)}
          onSuccess={() => setSelectedDocket(null)}
        />
      )}
    </div>
  );
}
