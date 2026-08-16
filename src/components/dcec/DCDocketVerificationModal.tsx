'use client';

import React, { useState } from 'react';
import { verifyDcecDocketAction } from '@/app/actions/dcec.actions';
import type { DCScreeningQueueItem } from '@/types/dcec.types';

interface DCDocketVerificationModalProps {
  item: DCScreeningQueueItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DCDocketVerificationModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: DCDocketVerificationModalProps) {
  const [isEligible, setIsEligible] = useState<boolean>(item.is_eligible ?? true);
  const [documentsComplete, setDocumentsComplete] = useState<boolean>(item.documents_complete ?? true);
  const [notes, setNotes] = useState<string>(item.dc_verification_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await verifyDcecDocketAction({
      thesis_id: item.thesis_id,
      is_eligible: isEligible,
      documents_complete: documentsComplete,
      dc_verification_notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to verify docket.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 animate-scale-up">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Maker Checklist
            </span>
            <h2 className="text-xl font-bold text-white mt-1">
              Verify Docket: {item.tracking_number}
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
            <span className="text-slate-200">{item.proposed_title || 'Untitled Proposal'}</span>
          </div>
          <div>
            <span className="text-slate-400">Domain: </span>
            <span className="text-emerald-300">{item.broad_domain || 'General'}</span>
          </div>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer bg-slate-800/40 p-3 rounded-lg border border-slate-700 hover:border-emerald-500/50 transition-colors">
              <input
                type="checkbox"
                checked={isEligible}
                onChange={(e) => setIsEligible(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-slate-900 border-slate-700 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-200">
                  Candidate Eligibility Verified
                </span>
                <p className="text-xs text-slate-400">
                  Confirmed active enrollment, credit prerequisites, and dissertation registration.
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer bg-slate-800/40 p-3 rounded-lg border border-slate-700 hover:border-emerald-500/50 transition-colors">
              <input
                type="checkbox"
                checked={documentsComplete}
                onChange={(e) => setDocumentsComplete(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-slate-900 border-slate-700 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-200">
                  Documentation & Preferences Complete
                </span>
                <p className="text-xs text-slate-400">
                  Annexure 1 problem statement, outcomes, and 4 supervisor preferences valid.
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              DC Verification Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any preliminary observations or prerequisite notes for the DCEC Chair..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-900/30 transition-all flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Forwarding...</span>
                </>
              ) : (
                <span>Forward to DCEC Chair</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
