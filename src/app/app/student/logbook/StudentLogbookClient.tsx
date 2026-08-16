'use client';

import React, { useState } from 'react';
import type { DigitalLogbookWorkspace, DigitalLogbookEntry } from '@/types/logbook.types';
import { LogbookEntryForm } from '@/components/logbook/LogbookEntryForm';
import { LogbookHistoryTable } from '@/components/logbook/LogbookHistoryTable';
import { PeriodicProgressReportModal } from '@/components/logbook/PeriodicProgressReportModal';
import { PeriodicProgressTable } from '@/components/logbook/PeriodicProgressTable';

interface StudentLogbookClientProps {
  workspace: DigitalLogbookWorkspace;
}

export function StudentLogbookClient({ workspace }: StudentLogbookClientProps) {
  const { thesis, student, guide, co_guide, approved_title, logbook_entries, periodic_reports, permissions } =
    workspace;

  const [activeTab, setActiveTab] = useState<'LOGBOOK' | 'PROGRESS'>('LOGBOOK');
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<DigitalLogbookEntry | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleOpenNewEntry = () => {
    setEntryToEdit(null);
    setIsEntryFormOpen(true);
  };

  const handleEditEntry = (entry: DigitalLogbookEntry) => {
    setEntryToEdit(entry);
    setIsEntryFormOpen(true);
  };

  const verifiedCount = logbook_entries.filter((e) => e.status === 'VERIFIED').length;
  const pendingCount = logbook_entries.filter((e) => e.status === 'SUBMITTED').length;
  const revisionCount = logbook_entries.filter((e) => e.status === 'REVISION_REQUIRED').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in p-6">
      {/* Dissertation Header Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono">
                {thesis.tracking_number}
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                RESEARCH_AND_PROGRESS_STAGE
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-white mt-2">
              Digital Logbook & Research Progress (Annexure 4)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Candidate: <span className="text-white font-medium">{student?.full_name}</span> ({student?.roll_number})
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'LOGBOOK' && permissions.can_create_entry && (
              <button
                onClick={handleOpenNewEntry}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
              >
                <span>➕</span>
                <span>Log Meeting Entry</span>
              </button>
            )}

            {activeTab === 'PROGRESS' && permissions.can_submit_progress_report && (
              <button
                onClick={() => setIsProgressModalOpen(true)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2"
              >
                <span>📊</span>
                <span>Submit Progress Update</span>
              </button>
            )}
          </div>
        </div>

        {/* Approved Dissertation Title */}
        {approved_title && (
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Approved Dissertation Title
            </span>
            <p className="text-sm font-semibold text-white">{approved_title}</p>
          </div>
        )}

        {/* Supervisors Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                Primary Guide
              </span>
              <span className="font-semibold text-white">{guide?.full_name || 'Unassigned'}</span>
              <span className="text-slate-400 block text-[11px]">{guide?.email}</span>
            </div>
            <span className="text-xl">👨‍🏫</span>
          </div>

          <div className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                Co-Guide
              </span>
              <span className="font-semibold text-white">{co_guide?.full_name || 'Not Applicable'}</span>
              <span className="text-slate-400 block text-[11px]">{co_guide?.email || 'N/A'}</span>
            </div>
            <span className="text-xl">👩‍🏫</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('LOGBOOK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'LOGBOOK'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            📖 Meeting Logbook ({logbook_entries.length})
          </button>
          <button
            onClick={() => setActiveTab('PROGRESS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'PROGRESS'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            📊 Weekly & Monthly Reports ({periodic_reports.length})
          </button>
        </div>

        {activeTab === 'LOGBOOK' && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-400 font-medium">{verifiedCount} Verified</span>
            <span className="text-slate-600">•</span>
            <span className="text-blue-400 font-medium">{pendingCount} Pending</span>
            {revisionCount > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400 font-medium">{revisionCount} Action Required</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tab Content 1: Logbook History */}
      {activeTab === 'LOGBOOK' && (
        <div className="space-y-4">
          <LogbookHistoryTable
            entries={logbook_entries}
            canEdit={permissions.can_create_entry}
            onEditEntry={handleEditEntry}
          />
        </div>
      )}

      {/* Tab Content 2: Periodic Reports */}
      {activeTab === 'PROGRESS' && (
        <div className="space-y-4">
          <PeriodicProgressTable
            reports={periodic_reports}
            canAcknowledge={false}
            onSuccess={handleRefresh}
          />
        </div>
      )}

      {/* Modals */}
      <LogbookEntryForm
        thesisId={thesis.id}
        entryToEdit={entryToEdit}
        isOpen={isEntryFormOpen}
        onClose={() => setIsEntryFormOpen(false)}
        onSuccess={handleRefresh}
      />

      <PeriodicProgressReportModal
        thesisId={thesis.id}
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
