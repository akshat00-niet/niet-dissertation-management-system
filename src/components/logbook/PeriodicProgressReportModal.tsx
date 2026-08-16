'use client';

import React, { useState } from 'react';
import type { ProgressReportType, SubmitPeriodicProgressReportInput } from '@/types/logbook.types';
import { submitPeriodicProgressReportAction } from '@/app/actions/logbook.actions';

interface PeriodicProgressReportModalProps {
  thesisId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PeriodicProgressReportModal({
  thesisId,
  isOpen,
  onClose,
  onSuccess,
}: PeriodicProgressReportModalProps) {
  const [reportType, setReportType] = useState<ProgressReportType>('WEEKLY');
  const [periodStart, setPeriodStart] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split('T')[0]);
  const [summaryWorkDone, setSummaryWorkDone] = useState('');
  const [milestonesAchieved, setMilestonesAchieved] = useState('');
  const [issuesFaced, setIssuesFaced] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!periodStart || !periodEnd) {
      setErrorMessage('Period start and end dates are mandatory.');
      return;
    }

    if (new Date(periodStart) >= new Date(periodEnd)) {
      setErrorMessage('Reporting period start date must precede end date.');
      return;
    }

    if (!summaryWorkDone.trim()) {
      setErrorMessage('Summary of work done during this period is mandatory.');
      return;
    }

    if (!milestonesAchieved.trim()) {
      setErrorMessage('Milestones achieved during this period are mandatory.');
      return;
    }

    setIsSubmitting(true);

    try {
      const input: SubmitPeriodicProgressReportInput = {
        thesis_id: thesisId,
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        summary_work_done: summaryWorkDone.trim(),
        milestones_achieved: milestonesAchieved.trim(),
        issues_faced: issuesFaced.trim() || null,
      };

      const res = await submitPeriodicProgressReportAction(input);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit periodic progress report.');
      } else {
        setSuccessMessage('Periodic progress report submitted successfully.');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during submission.');
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
              <span>📊</span> Submit Periodic Progress Report
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Submit weekly or monthly research progress summary for supervisory review.
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

          {/* Report Type Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Report Cadence <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setReportType('WEEKLY');
                  setPeriodStart(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                }}
                className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  reportType === 'WEEKLY'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                📅 Weekly Update
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportType('MONTHLY');
                  setPeriodStart(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                }}
                className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  reportType === 'MONTHLY'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                🗓️ Monthly Synthesis
              </button>
            </div>
          </div>

          {/* Period Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Reporting Period Start <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Reporting Period End <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Summary of Work Done */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Summary of Work Completed <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Detail specific research modules, experiments, literature analysis, or drafting accomplished..."
              value={summaryWorkDone}
              onChange={(e) => setSummaryWorkDone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Milestones Achieved */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Key Milestones Achieved <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Concrete deliverables and timeline milestones completed..."
              value={milestonesAchieved}
              onChange={(e) => setMilestonesAchieved(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Issues / Challenges Faced */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Technical Bottlenecks / Challenges Faced (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Any blockers, dataset issues, or guidance requested from supervisors..."
              value={issuesFaced}
              onChange={(e) => setIssuesFaced(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
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
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting Report...' : 'Submit Progress Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
