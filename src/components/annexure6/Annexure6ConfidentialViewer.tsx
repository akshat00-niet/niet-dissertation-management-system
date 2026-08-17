'use client';

import React from 'react';
import type { Annexure6Docket } from '@/types/annexure6.types';
import { Annexure6StatusBadge } from '@/components/annexure6/Annexure6StatusBadge';

interface Annexure6ConfidentialViewerProps {
  docket: Annexure6Docket;
}

export function Annexure6ConfidentialViewer({ docket }: Annexure6ConfidentialViewerProps) {
  const { student, guide, evaluation, tracking_number, current_state } = docket;

  if (!evaluation) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-slate-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h4 className="text-base font-bold text-white">Annexure 6 Evaluation Pending</h4>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          The Primary Guide has not yet submitted the confidential evaluation and defense recommendation for this dissertation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Strict Confidentiality Banner */}
      <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13-5.5a8.5 8.5 0 11-17 0 8.5 8.5 0 0117 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
              Confidential Evaluation Dossier — Institutional Access Only
            </h4>
            <p className="text-xs text-purple-200/70 mt-0.5">
              Strictly restricted to Primary Guide, HOD, and Appointed Defense Panel Members. Never disclose marks to candidate.
            </p>
          </div>
        </div>
        <Annexure6StatusBadge status={current_state} type="state" />
      </div>

      {/* Candidate & Evaluator Header Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <span className="text-xs text-slate-500 block uppercase font-medium">Candidate</span>
          <span className="text-base font-bold text-white mt-1 block">{student.name}</span>
          <span className="text-xs text-slate-400">Roll: {student.roll_number}</span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block uppercase font-medium">Primary Guide</span>
          <span className="text-base font-bold text-slate-200 mt-1 block">{guide?.name || 'Assigned Guide'}</span>
          <span className="text-xs text-slate-400 font-mono">{tracking_number}</span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block uppercase font-medium">Supervisor Score</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-purple-400 font-mono">
              {evaluation.supervisor_score.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-500">/ 100</span>
          </div>
        </div>
        <div>
          <span className="text-xs text-slate-500 block uppercase font-medium">Defense Recommendation</span>
          <div className="mt-1.5">
            <Annexure6StatusBadge status={evaluation.defense_recommendation} type="recommendation" />
          </div>
        </div>
      </div>

      {/* Dimensional Breakdown Grid */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
          Supervisory Dimensional Ratings
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 block font-medium">A. Regularity & Work Ethic</span>
            <Annexure6StatusBadge status={evaluation.regularity_rating} type="rating" />
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 block font-medium">B. Technical Proficiency</span>
            <Annexure6StatusBadge status={evaluation.technical_proficiency} type="rating" />
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 block font-medium">C. Research Rigor & Methodology</span>
            <Annexure6StatusBadge status={evaluation.rigor_rating} type="rating" />
          </div>
        </div>
      </div>

      {/* Qualitative Remarks Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
          Confidential Supervisory Remarks
        </h4>
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
          {evaluation.confidential_remarks}
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
          <span>Submitted electronically via Primary Guide authentication</span>
          <span>{new Date(evaluation.submitted_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
