'use client';

import React from 'react';
import type { DefensePanelDetails } from '@/types/annexure6.types';

interface DefensePanelCardProps {
  panelDetails: DefensePanelDetails;
  trackingNumber?: string;
  studentName?: string;
}

export function DefensePanelCard({
  panelDetails,
  trackingNumber,
  studentName,
}: DefensePanelCardProps) {
  const {
    is_constituted,
    scheduled_at,
    venue_or_link,
    defense_cycle_index,
    outcome,
    members = [],
    constituted_at,
  } = panelDetails;

  if (!is_constituted) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-slate-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h4 className="text-base font-bold text-white">Defense Panel Not Yet Constituted</h4>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          The Department Academic Authority will appoint the 2-member examination panel and schedule the oral viva defense once supervisory evaluation is complete.
        </p>
      </div>
    );
  }

  const chairMember = members.find((m) => m.is_panel_chair);
  const examinerMember = members.find((m) => !m.is_panel_chair);

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Defense Cycle {defense_cycle_index || 1}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {outcome || 'SCHEDULED'}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1.5">Oral Viva Defense Session</h3>
          {trackingNumber && (
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Thesis: {trackingNumber} {studentName ? `| Candidate: ${studentName}` : ''}
            </p>
          )}
        </div>

        {scheduled_at && (
          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block font-medium">Scheduled Date & Time</span>
            <span className="text-sm font-bold text-purple-300">
              {new Date(scheduled_at).toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="text-xs text-slate-300 block font-mono">
              {new Date(scheduled_at).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>

      {/* Venue / Link */}
      {venue_or_link && (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-800 text-purple-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-slate-500 block uppercase font-medium">Venue / Connection Details</span>
            {venue_or_link.startsWith('http') ? (
              <a
                href={venue_or_link}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-purple-400 hover:text-purple-300 underline truncate block"
              >
                {venue_or_link}
              </a>
            ) : (
              <span className="text-sm font-semibold text-slate-200 block truncate">{venue_or_link}</span>
            )}
          </div>
        </div>
      )}

      {/* Appointed Panel Members Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Appointed Oral Defense Examination Panel (2 Members)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chair */}
          {chairMember && (
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 relative space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500 text-white tracking-wider">
                  Panel Chair
                </span>
                <span className="text-[11px] text-purple-300 font-mono">{chairMember.evaluator_role}</span>
              </div>
              <div>
                <h5 className="text-sm font-bold text-white">{chairMember.faculty_name}</h5>
                <p className="text-xs text-slate-400">{chairMember.designation}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{chairMember.faculty_email}</p>
              </div>
            </div>
          )}

          {/* Member 2 */}
          {examinerMember && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700 tracking-wider">
                  Panel Examiner
                </span>
                <span className="text-[11px] text-slate-400 font-mono">{examinerMember.evaluator_role}</span>
              </div>
              <div>
                <h5 className="text-sm font-bold text-white">{examinerMember.faculty_name}</h5>
                <p className="text-xs text-slate-400">{examinerMember.designation}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{examinerMember.faculty_email}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {constituted_at && (
        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800 flex justify-between">
          <span>Panel appointed by Department Academic Head</span>
          <span>{new Date(constituted_at).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
