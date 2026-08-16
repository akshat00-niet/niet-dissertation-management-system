'use client';

import React, { useState } from 'react';
import { recordDcecDecisionAction } from '@/app/actions/dcec.actions';
import type { DCECScreeningQueueItem, DcecOutcome } from '@/types/dcec.types';

interface DCECChairDecisionModalProps {
  item: DCECScreeningQueueItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DCECChairDecisionModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: DCECChairDecisionModalProps) {
  const [outcome, setOutcome] = useState<DcecOutcome>('APPROVED');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await recordDcecDecisionAction({
      docket_id: item.docket_id,
      outcome,
      formal_remarks: remarks.trim(),
    });

    setIsSubmitting(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to record decision.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 animate-scale-up">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Checker Sign-Off
            </span>
            <h2 className="text-xl font-bold text-white mt-1">
              DCEC Decision: {item.tracking_number}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Candidate & Proposal Summary */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-2 text-sm">
          <div>
            <span className="text-slate-400">Candidate: </span>
            <span className="text-white font-medium">{item.student_name}</span>
            <span className="text-slate-400 text-xs ml-2">({item.student_roll_number})</span>
          </div>
          <div>
            <span className="text-slate-400">Proposed Title: </span>
            <span className="text-slate-200">{item.proposed_title}</span>
          </div>
          <div>
            <span className="text-slate-400">DC Verification: </span>
            <span className="text-emerald-400 font-medium">Eligible & Complete</span>
            {item.dc_verification_notes && (
              <p className="text-xs text-slate-400 mt-1 italic">Note: &ldquo;{item.dc_verification_notes}&rdquo;</p>
            )}
          </div>
        </div>

        {/* Decision Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Binding Decision Outcome
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOutcome('APPROVED')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                  outcome === 'APPROVED'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/50'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                ✓ Approve
              </button>

              <button
                type="button"
                onClick={() => setOutcome('REVISION_REQUIRED')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                  outcome === 'REVISION_REQUIRED'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/50'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                ⟲ Request Revision
              </button>

              <button
                type="button"
                onClick={() => setOutcome('REJECTED')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                  outcome === 'REJECTED'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/50'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                ✕ Reject
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Formal Remarks / Directives <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={4}
              required
              placeholder={
                outcome === 'APPROVED'
                  ? 'e.g. Proposal demonstrates significant academic merit and methodological rigor. Approved for supervisor allocation.'
                  : outcome === 'REVISION_REQUIRED'
                  ? 'e.g. Please refine the problem statement scope and clarify the benchmark methodology.'
                  : 'e.g. Proposal lacks fundamental dissertation scope.'
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !remarks.trim()}
              className={`px-5 py-2 text-white text-sm font-medium rounded-lg shadow-lg disabled:opacity-50 transition-all flex items-center space-x-2 ${
                outcome === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                  : outcome === 'REVISION_REQUIRED'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <span>Confirm {outcome.replace('_', ' ')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
