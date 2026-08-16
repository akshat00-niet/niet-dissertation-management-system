'use client';

import React, { useState } from 'react';
import type { Annexure2Workspace } from '@/types/annexure2.types';
import { decideAnnexure2TitleAction } from '@/app/actions/annexure2.actions';

interface DcecTitleApprovalModalProps {
  workspace: Annexure2Workspace;
  onClose: () => void;
  onSuccess: () => void;
}

export function DcecTitleApprovalModal({
  workspace,
  onClose,
  onSuccess,
}: DcecTitleApprovalModalProps) {
  const { thesis, student, guide, co_guide, annexure_1, annexure_2, endorsements } = workspace;

  const [decision, setDecision] = useState<'APPROVED' | 'REVISION_REQUIRED'>('APPROVED');
  const [remarks, setRemarks] = useState<string>('Title formulation verified and formally approved by DCEC.');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const guideEndorsement = endorsements.find((e) => e.supervisor_role === 'GUIDE');
  const coGuideEndorsement = endorsements.find((e) => e.supervisor_role === 'CO_GUIDE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!remarks.trim()) {
      setErrorMessage('Formal remarks are mandatory for DCEC Chair title decisions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await decideAnnexure2TitleAction({
        thesis_id: thesis.id,
        outcome: decision,
        formal_remarks: remarks.trim(),
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to record DCEC title decision.');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              DCEC Chair Formal Title Approval
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Title Approval Decision: {thesis.tracking_number}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-sm flex items-start gap-3">
            <span className="text-lg">⚠</span>
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Dual Endorsement Sign-off Summary */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3 text-xs">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
            Dual Supervisor Endorsement Verification (2/2)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Primary Guide:</span>
                <span className="text-emerald-400 font-semibold">✓ Endorsed</span>
              </div>
              <div className="text-white font-medium">{guide?.full_name}</div>
              {guideEndorsement?.remarks && (
                <div className="text-[11px] text-slate-400 italic pt-1">&quot;{guideEndorsement.remarks}&quot;</div>
              )}
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Co-Guide:</span>
                <span className="text-emerald-400 font-semibold">✓ Endorsed</span>
              </div>
              <div className="text-white font-medium">{co_guide?.full_name}</div>
              {coGuideEndorsement?.remarks && (
                <div className="text-[11px] text-slate-400 italic pt-1">&quot;{coGuideEndorsement.remarks}&quot;</div>
              )}
            </div>
          </div>
        </div>

        {/* Proposed Final Title Card */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
            Proposed Final Dissertation Title (to be baselined)
          </span>
          <div className="text-white font-bold text-base leading-snug">
            &quot;{annexure_2?.final_title || 'N/A'}&quot;
          </div>
          {annexure_1 && (
            <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/80">
              <span className="text-slate-500">Original Annexure 1 Title: </span>
              <span>{annexure_1.proposed_title}</span>
            </div>
          )}
        </div>

        {/* Refined Problem & Methodology */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <span className="font-semibold text-slate-300 block">Refined Problem Statement</span>
            <p className="text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-1 whitespace-pre-wrap">
              {annexure_2?.refined_problem || 'No statement provided.'}
            </p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <span className="font-semibold text-slate-300 block">Research Methodology</span>
            <p className="text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-1 whitespace-pre-wrap">
              {annexure_2?.methodology || 'No methodology provided.'}
            </p>
          </div>
        </div>

        {/* DCEC Decision Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              DCEC Chair Binding Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDecision('APPROVED');
                  if (!remarks || remarks.includes('Revision')) {
                    setRemarks('Title formulation verified and formally approved by DCEC.');
                  }
                }}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all text-center ${
                  decision === 'APPROVED'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-900/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                ✓ Approve Title (Formal Baseline)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDecision('REVISION_REQUIRED');
                  if (remarks.includes('approved')) {
                    setRemarks('Revision required: Refine problem scope and title specificity.');
                  }
                }}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all text-center ${
                  decision === 'REVISION_REQUIRED'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-900/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                ✕ Request Title Revision
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Formal DCEC Chair Remarks <span className="text-rose-400">* (Mandatory)</span>
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter formal DCEC decision notes and justification..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-white text-xs font-semibold rounded-lg transition-all shadow-lg ${
                decision === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'
              } disabled:opacity-50`}
            >
              {isSubmitting
                ? 'Recording Decision...'
                : decision === 'APPROVED'
                ? 'Confirm & Approve Title'
                : 'Send Revision Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
