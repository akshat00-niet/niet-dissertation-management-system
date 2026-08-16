'use client';

import React, { useState } from 'react';
import type { PeriodicProgressReport } from '@/types/logbook.types';
import { acknowledgePeriodicProgressReportAction } from '@/app/actions/logbook.actions';

interface PeriodicProgressTableProps {
  reports: PeriodicProgressReport[];
  canAcknowledge?: boolean;
  onSuccess?: () => void;
}

export function PeriodicProgressTable({
  reports,
  canAcknowledge = false,
  onSuccess,
}: PeriodicProgressTableProps) {
  const [selectedReport, setSelectedReport] = useState<PeriodicProgressReport | null>(null);
  const [acknowledgingReportId, setAcknowledgingReportId] = useState<string | null>(null);
  const [supervisorRemarks, setSupervisorRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!reports || reports.length === 0) {
    return (
      <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-3">
        <div className="text-3xl text-slate-600">📈</div>
        <h3 className="text-sm font-semibold text-slate-300">No Periodic Progress Reports</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No weekly or monthly progress updates have been submitted yet.
        </p>
      </div>
    );
  }

  const handleAcknowledge = async (reportId: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await acknowledgePeriodicProgressReportAction({
        report_id: reportId,
        remarks: supervisorRemarks.trim() || null,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to acknowledge progress report.');
      } else {
        setSuccessMessage('Progress report acknowledged successfully.');
        setTimeout(() => {
          setAcknowledgingReportId(null);
          setSupervisorRemarks('');
          if (onSuccess) onSuccess();
        }, 1000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
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

      {/* Reports List */}
      <div className="space-y-3">
        {reports.map((report) => {
          return (
            <div
              key={report.id}
              className={`p-5 rounded-2xl border transition-all ${
                report.is_acknowledged
                  ? 'bg-slate-900/90 border-emerald-900/40'
                  : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {report.report_type === 'WEEKLY' ? '📅' : '🗓️'}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{report.report_type} Progress Report</span>
                      <span className="text-xs font-normal text-slate-400">
                        ({new Date(report.period_start).toLocaleDateString()} — {new Date(report.period_end).toLocaleDateString()})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Submitted on {new Date(report.submitted_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {report.is_acknowledged ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Acknowledged
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-950/80 border border-blue-700/60 text-blue-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                      Submitted
                    </span>
                  )}

                  {canAcknowledge && !report.is_acknowledged && (
                    <button
                      onClick={() => setAcknowledgingReportId(report.id)}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium rounded-lg transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    {selectedReport?.id === report.id ? 'Hide' : 'View Full Report'}
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Work Done:</span>
                  <p className="text-slate-300 line-clamp-2 mt-0.5">{report.summary_work_done}</p>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Milestones Achieved:</span>
                  <p className="text-slate-300 line-clamp-2 mt-0.5">{report.milestones_achieved}</p>
                </div>
              </div>

              {/* Acknowledgment Remarks */}
              {report.is_acknowledged && (
                <div className="mt-3 p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-xs space-y-1">
                  <div className="text-emerald-400 font-semibold flex items-center justify-between">
                    <span>✓ Acknowledged by {report.acknowledged_by_name || 'Supervisor'}</span>
                    {report.acknowledged_at && (
                      <span className="text-[11px] font-normal text-slate-500">
                        {new Date(report.acknowledged_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {report.supervisor_remarks && (
                    <p className="text-slate-300 italic">&ldquo;{report.supervisor_remarks}&rdquo;</p>
                  )}
                </div>
              )}

              {/* Expanded Report View */}
              {selectedReport?.id === report.id && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 animate-fade-in text-xs">
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 space-y-1">
                    <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                      Complete Summary of Work Done
                    </span>
                    <p className="text-slate-200 whitespace-pre-wrap">{report.summary_work_done}</p>
                  </div>

                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 space-y-1">
                    <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                      Milestones & Deliverables Accomplished
                    </span>
                    <p className="text-slate-200 whitespace-pre-wrap">{report.milestones_achieved}</p>
                  </div>

                  {report.issues_faced && (
                    <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 space-y-1">
                      <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                        Technical Blockers / Challenges Faced
                      </span>
                      <p className="text-slate-200 whitespace-pre-wrap">{report.issues_faced}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Acknowledgment Modal */}
      {acknowledgingReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>✍️</span> Acknowledge Periodic Progress Report
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Confirm review of candidate&apos;s progress report. An audit event and notification will be emitted to acknowledge this submission.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Supervisor Remarks / Commendations (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Optional feedback or notes for the candidate..."
                value={supervisorRemarks}
                onChange={(e) => setSupervisorRemarks(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAcknowledgingReportId(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAcknowledge(acknowledgingReportId)}
                disabled={isSubmitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
              >
                {isSubmitting ? 'Recording...' : 'Confirm Acknowledgment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
