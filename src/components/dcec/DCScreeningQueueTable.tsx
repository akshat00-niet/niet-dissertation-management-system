'use client';

import React, { useState } from 'react';
import { DCDocketVerificationModal } from './DCDocketVerificationModal';
import type { DCScreeningQueueItem } from '@/types/dcec.types';

interface DCScreeningQueueTableProps {
  queue: DCScreeningQueueItem[];
}

export function DCScreeningQueueTable({ queue }: DCScreeningQueueTableProps) {
  const [selectedItem, setSelectedItem] = useState<DCScreeningQueueItem | null>(null);

  if (queue.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
          ✓
        </div>
        <h3 className="text-lg font-medium text-white">No Pending Proposals</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          All submitted Annexure 1 proposals in your department have been verified and forwarded to the DCEC Chair.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
            <tr>
              <th className="px-6 py-4">Tracking Number</th>
              <th className="px-6 py-4">Candidate</th>
              <th className="px-6 py-4">Proposed Title & Domain</th>
              <th className="px-6 py-4">Submitted</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {queue.map((item) => {
              const isVerified = item.current_state === 'DCEC_SCREENING_QUEUE';
              return (
                <tr key={item.thesis_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-emerald-400">
                    {item.tracking_number}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{item.student_name}</div>
                    <div className="text-xs text-slate-400">{item.student_roll_number}</div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="font-medium text-slate-200 truncate">
                      {item.proposed_title || 'Untitled'}
                    </div>
                    <div className="text-xs text-emerald-300/80">{item.broad_domain || 'General'}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {isVerified ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                        Forwarded to DCEC
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                        Pending DC Verification
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!isVerified ? (
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="px-3.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-medium text-xs rounded-lg shadow-sm transition-all"
                      >
                        Verify Docket
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Under Review</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <DCDocketVerificationModal
          item={selectedItem}
          isOpen={true}
          onClose={() => setSelectedItem(null)}
          onSuccess={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}
