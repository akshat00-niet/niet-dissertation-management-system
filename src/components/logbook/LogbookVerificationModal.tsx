'use client';

import React, { useState } from 'react';
import type { DigitalLogbookEntry, LogbookVerificationOutcome } from '@/types/logbook.types';
import { verifyDigitalLogbookEntryAction } from '@/app/actions/logbook.actions';

interface LogbookVerificationModalProps {
  entry: DigitalLogbookEntry | null;
  candidateName: string;
  trackingNumber: string;
  approvedTitle: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogbookVerificationModal({
  entry,
  candidateName,
  trackingNumber,
  approvedTitle,
  isOpen,
  onClose,
  onSuccess,
}: LogbookVerificationModalProps) {
  const [outcome, setOutcome] = useState<LogbookVerificationOutcome>('VERIFIED');
  const [feedbackRemarks, setFeedbackRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !entry) return null;

  const handleDecision = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (outcome === 'REVISION_REQUESTED' && !feedbackRemarks.trim()) {
      setErrorMessage('Formal feedback remarks are mandatory when requesting revision.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await verifyDigitalLogbookEntryAction({
        entry_id: entry.id,
        outcome,
        feedback_remarks: feedbackRemarks.trim() || null,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit verification.');
      } else {
        setSuccessMessage(
          outcome === 'VERIFIED'
            ? 'Logbook entry successfully verified & signed off.'
            : 'Revision request sent to candidate.'
        );
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>✍️</span> Verify Logbook Interaction Entry
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Candidate: {candidateName} | Tracking #{trackingNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {errorMessage && (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-3">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-3">
              <span>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Dissertation Title Card */}
          {approvedTitle && (
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Approved Dissertation Title
              </span>
              <p className="text-xs text-white font-medium">{approvedTitle}</p>
            </div>
          )}

          {/* Meeting Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Meeting Mode & Location
              </span>
              <div className="text-xs text-slate-200 flex items-center gap-2 mt-1">
                <span>{entry.meeting_mode === 'ONLINE' ? '🌐 Virtual (Online)' : '🏢 In-Person (Offline)'}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono break-all">
                {entry.meeting_mode === 'ONLINE' ? entry.meeting_link : entry.meeting_location}
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Meeting Timestamp & Next Target
              </span>
              <p className="text-xs text-slate-200 mt-1">
                Conducted: {new Date(entry.meeting_date).toLocaleString()}
              </p>
              <p className="text-xs text-blue-400 font-semibold mt-1">
                Next Milestone: {new Date(entry.next_target_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Agenda & Progress Summary */}
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Discussion Agenda
              </span>
              <p className="text-xs text-slate-200 whitespace-pre-wrap">{entry.discussion_agenda}</p>
            </div>

            <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Summary of Research Progress Discussed
              </span>
              <p className="text-xs text-slate-200 whitespace-pre-wrap">{entry.progress_discussed}</p>
            </div>

            <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Action Items / Target Deliverables Assigned
              </span>
              <p className="text-xs text-slate-200 whitespace-pre-wrap">{entry.action_items}</p>
            </div>
          </div>

          {/* Supervisory Verification Action Form */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4 pt-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Supervisory Verification Sign-Off
            </span>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOutcome('VERIFIED')}
                className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                  outcome === 'VERIFIED'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Verify Entry</span>
                </div>
                <span className="text-[11px] font-normal text-slate-400 block mt-1">
                  Accept meeting minutes and mark as immutable verified record.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOutcome('REVISION_REQUESTED')}
                className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                  outcome === 'REVISION_REQUESTED'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>🔄</span>
                  <span>Request Revision</span>
                </div>
                <span className="text-[11px] font-normal text-slate-400 block mt-1">
                  Return entry with mandatory feedback for candidate updates.
                </span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Supervisory Feedback Remarks {outcome === 'REVISION_REQUESTED' && <span className="text-red-400">*</span>}
              </label>
              <textarea
                rows={3}
                placeholder={
                  outcome === 'REVISION_REQUESTED'
                    ? 'Provide specific instructions on what needs correction before sign-off...'
                    : 'Optional supervisory notes or commendations...'
                }
                value={feedbackRemarks}
                onChange={(e) => setFeedbackRemarks(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDecision}
            disabled={isSubmitting}
            className={`px-6 py-2 text-xs font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 ${
              outcome === 'VERIFIED'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
            }`}
          >
            {isSubmitting
              ? 'Recording Sign-Off...'
              : outcome === 'VERIFIED'
              ? 'Sign-Off & Verify Meeting'
              : 'Submit Revision Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
