'use client';

import React, { useState } from 'react';
import type { Annexure2Workspace } from '@/types/annexure2.types';
import { endorseAnnexure2Action } from '@/app/actions/annexure2.actions';

interface SupervisorEndorsementModalProps {
  workspace: Annexure2Workspace;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupervisorEndorsementModal({
  workspace,
  onClose,
  onSuccess,
}: SupervisorEndorsementModalProps) {
  const { thesis, student, guide, co_guide, annexure_1, annexure_2, endorsements, permissions } = workspace;

  const [decision, setDecision] = useState<'ENDORSE' | 'REVISE'>('ENDORSE');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const guideEndorsement = endorsements.find((e) => e.supervisor_role === 'GUIDE');
  const coGuideEndorsement = endorsements.find((e) => e.supervisor_role === 'CO_GUIDE');

  const supervisorRoleLabel = permissions.is_guide
    ? 'Primary Guide'
    : permissions.is_coguide
    ? 'Co-Guide'
    : 'Supervisor';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const isEndorsed = decision === 'ENDORSE';

    if (!isEndorsed && !remarks.trim()) {
      setErrorMessage('Formal feedback remarks are mandatory when requesting revisions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await endorseAnnexure2Action({
        thesis_id: thesis.id,
        is_endorsed: isEndorsed,
        remarks: remarks.trim() ? remarks.trim() : null,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to record supervisor endorsement.');
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
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              {supervisorRoleLabel} Endorsement Workbench
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Review Annexure 2: {thesis.tracking_number}
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

        {/* Candidate & Supervisor Pairing */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
            <div>
              <span className="text-slate-400 text-xs">Candidate: </span>
              <span className="text-white font-medium">{student?.full_name}</span>
              <span className="text-slate-400 text-xs ml-2">({student?.roll_number})</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Department: </span>
              <span className="text-slate-200 font-medium">{thesis.department_name}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
            <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-slate-400">Primary Guide: {guide?.full_name}</span>
              {guideEndorsement?.is_endorsed ? (
                <span className="text-emerald-400 font-semibold">✓ Endorsed</span>
              ) : (
                <span className="text-slate-500">Pending</span>
              )}
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-slate-400">Co-Guide: {co_guide?.full_name}</span>
              {coGuideEndorsement?.is_endorsed ? (
                <span className="text-emerald-400 font-semibold">✓ Endorsed</span>
              ) : (
                <span className="text-slate-500">Pending</span>
              )}
            </div>
          </div>
        </div>

        {/* Annexure 1 vs Annexure 2 Comparative Overview */}
        <div className="space-y-4">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
              Finalized Proposed Title
            </span>
            <div className="text-white font-bold text-base leading-snug">
              &quot;{annexure_2?.final_title || 'N/A'}&quot;
            </div>
            {annexure_1 && (
              <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                <span className="text-slate-500">Original Annexure 1: </span>
                <span>{annexure_1.proposed_title}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-300 block">Refined Problem Statement</span>
              <p className="text-slate-300 leading-relaxed max-h-40 overflow-y-auto pr-1 whitespace-pre-wrap">
                {annexure_2?.refined_problem || 'No description provided.'}
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-300 block">Research Methodology</span>
              <p className="text-slate-300 leading-relaxed max-h-40 overflow-y-auto pr-1 whitespace-pre-wrap">
                {annexure_2?.methodology || 'No description provided.'}
              </p>
            </div>
          </div>

          {/* Milestones Preview */}
          {annexure_2?.timeline_milestones && annexure_2.timeline_milestones.length > 0 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">Timeline & Work Packages</span>
              <div className="space-y-1 text-xs">
                {annexure_2.timeline_milestones.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/60 rounded border border-slate-800/60">
                    <span className="text-white font-medium">#{idx + 1} {m.milestone_name}</span>
                    <span className="text-slate-400 font-mono">{m.target_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Endorsement Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Supervisor Sign-Off Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision('ENDORSE')}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all text-center ${
                  decision === 'ENDORSE'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-900/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                ✓ Endorse Title Docket
              </button>
              <button
                type="button"
                onClick={() => setDecision('REVISE')}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all text-center ${
                  decision === 'REVISE'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-900/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                ✕ Request Revisions
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Supervisor Remarks {decision === 'REVISE' ? <span className="text-rose-400">* (Mandatory)</span> : <span className="text-slate-500">(Optional)</span>}
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                decision === 'REVISE'
                  ? 'Detail the required refinements for the candidate before resubmitting...'
                  : 'Add any formal supervisor comments or sign-off notes...'
              }
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
                decision === 'ENDORSE'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'
              } disabled:opacity-50`}
            >
              {isSubmitting
                ? 'Recording Endorsement...'
                : decision === 'ENDORSE'
                ? 'Confirm & Endorse'
                : 'Send Revision Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
