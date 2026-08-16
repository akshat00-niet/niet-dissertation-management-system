'use client';

import React, { useState } from 'react';
import type { DigitalLogbookWorkspace, DigitalLogbookEntry, PeriodicProgressReport } from '@/types/logbook.types';
import { LogbookVerificationModal } from './LogbookVerificationModal';
import { PeriodicProgressTable } from './PeriodicProgressTable';

export interface SupervisorThesisLogbookItem {
  thesis_id: string;
  tracking_number: string;
  student_name: string;
  student_email: string;
  approved_title: string | null;
  current_stage: string;
  workspace: DigitalLogbookWorkspace;
}

interface SupervisorLogbookWorkbenchProps {
  thesesItems: SupervisorThesisLogbookItem[];
}

export function SupervisorLogbookWorkbench({ thesesItems }: SupervisorLogbookWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<'LOGBOOK' | 'PROGRESS'>('LOGBOOK');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'REVISION' | 'VERIFIED'>('PENDING');
  const [selectedThesisId, setSelectedThesisId] = useState<string>('ALL');

  // Verification modal state
  const [verifyingEntry, setVerifyingEntry] = useState<{
    entry: DigitalLogbookEntry;
    candidateName: string;
    trackingNumber: string;
    approvedTitle: string | null;
  } | null>(null);

  // Flatten all logbook entries with thesis metadata
  const allEntries = thesesItems.flatMap((item) =>
    item.workspace.logbook_entries.map((entry) => ({
      ...entry,
      candidateName: item.student_name,
      trackingNumber: item.tracking_number,
      approvedTitle: item.approved_title,
    }))
  );

  // Flatten all progress reports with thesis metadata
  const allReports = thesesItems.flatMap((item) =>
    item.workspace.periodic_reports.map((report) => ({
      ...report,
      candidateName: item.student_name,
      trackingNumber: item.tracking_number,
    }))
  );

  // Filter entries
  const filteredEntries = allEntries.filter((entry) => {
    if (selectedThesisId !== 'ALL' && entry.thesis_id !== selectedThesisId) return false;
    if (statusFilter === 'PENDING') return entry.status === 'SUBMITTED';
    if (statusFilter === 'REVISION') return entry.status === 'REVISION_REQUIRED';
    if (statusFilter === 'VERIFIED') return entry.status === 'VERIFIED';
    return true;
  });

  // Filter reports
  const filteredReports = allReports.filter((report) => {
    if (selectedThesisId !== 'ALL' && report.thesis_id !== selectedThesisId) return false;
    return true;
  });

  const pendingEntriesCount = allEntries.filter((e) => e.status === 'SUBMITTED').length;
  const pendingReportsCount = allReports.filter((r) => !r.is_acknowledged).length;

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Assigned Advisees
          </div>
          <div className="text-2xl font-bold text-white mt-1">{thesesItems.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active research candidates</div>
        </div>

        <div className="p-4 bg-slate-900 border border-blue-900/40 rounded-2xl">
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            Pending Verifications
          </div>
          <div className="text-2xl font-bold text-blue-300 mt-1">{pendingEntriesCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Meeting logs awaiting sign-off</div>
        </div>

        <div className="p-4 bg-slate-900 border border-emerald-900/40 rounded-2xl">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Verified Meetings
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">
            {allEntries.filter((e) => e.status === 'VERIFIED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Immutable verified interactions</div>
        </div>

        <div className="p-4 bg-slate-900 border border-purple-900/40 rounded-2xl">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
            Progress Reports
          </div>
          <div className="text-2xl font-bold text-purple-300 mt-1">{allReports.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">{pendingReportsCount} pending acknowledgment</div>
        </div>
      </div>

      {/* Main Workbench Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        {/* Navigation Tabs & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('LOGBOOK')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'LOGBOOK'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              📖 Meeting Logbook ({allEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('PROGRESS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'PROGRESS'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              📊 Periodic Reports ({allReports.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Candidate Filter */}
            <select
              value={selectedThesisId}
              onChange={(e) => setSelectedThesisId(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Assigned Candidates</option>
              {thesesItems.map((item) => (
                <option key={item.thesis_id} value={item.thesis_id}>
                  {item.student_name} ({item.tracking_number})
                </option>
              ))}
            </select>

            {/* Status Filter for Logbook */}
            {activeTab === 'LOGBOOK' && (
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'PENDING' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending ({pendingEntriesCount})
                </button>
                <button
                  onClick={() => setStatusFilter('REVISION')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'REVISION' ? 'bg-amber-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Revision ({allEntries.filter((e) => e.status === 'REVISION_REQUIRED').length})
                </button>
                <button
                  onClick={() => setStatusFilter('VERIFIED')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'VERIFIED' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Verified ({allEntries.filter((e) => e.status === 'VERIFIED').length})
                </button>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'ALL' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({allEntries.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: Logbook Queue */}
        {activeTab === 'LOGBOOK' && (
          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                No logbook entries found for the selected filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-white">{entry.candidateName}</span>
                        <span className="text-xs font-mono text-slate-400">#{entry.trackingNumber}</span>
                        <span className="text-xs">
                          {entry.meeting_mode === 'ONLINE' ? '🌐 Virtual' : '🏢 In-Person'}
                        </span>
                      </div>

                      {entry.approvedTitle && (
                        <p className="text-xs text-slate-400 line-clamp-1 italic">{entry.approvedTitle}</p>
                      )}

                      <div className="text-xs text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-500 font-medium">Agenda: </span>
                          <span className="line-clamp-1">{entry.discussion_agenda}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Meeting Date: </span>
                          <span>{new Date(entry.meeting_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {entry.status === 'SUBMITTED' ? (
                        <button
                          onClick={() =>
                            setVerifyingEntry({
                              entry,
                              candidateName: entry.candidateName,
                              trackingNumber: entry.trackingNumber,
                              approvedTitle: entry.approvedTitle,
                            })
                          }
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                        >
                          Review & Verify
                        </button>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            entry.status === 'VERIFIED'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {entry.status === 'VERIFIED' ? '✓ Verified' : '🔄 Revision Required'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Periodic Progress Reports */}
        {activeTab === 'PROGRESS' && (
          <div className="space-y-4">
            <PeriodicProgressTable
              reports={filteredReports}
              canAcknowledge={true}
              onSuccess={handleRefresh}
            />
          </div>
        )}
      </div>

      {/* Verification Modal */}
      {verifyingEntry && (
        <LogbookVerificationModal
          entry={verifyingEntry.entry}
          candidateName={verifyingEntry.candidateName}
          trackingNumber={verifyingEntry.trackingNumber}
          approvedTitle={verifyingEntry.approvedTitle}
          isOpen={true}
          onClose={() => setVerifyingEntry(null)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
