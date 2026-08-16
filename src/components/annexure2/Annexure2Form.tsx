'use client';

import React, { useState } from 'react';
import type {
  Annexure2Workspace,
  TimelineMilestone,
} from '@/types/annexure2.types';
import {
  saveAnnexure2DraftAction,
  submitAnnexure2Action,
} from '@/app/actions/annexure2.actions';

interface Annexure2FormProps {
  workspace: Annexure2Workspace;
}

export function Annexure2Form({ workspace }: Annexure2FormProps) {
  const { thesis, student, guide, co_guide, annexure_1, annexure_2, endorsements, permissions } = workspace;

  const [finalTitle, setFinalTitle] = useState<string>(
    annexure_2?.final_title || annexure_1?.proposed_title || ''
  );
  const [refinedProblem, setRefinedProblem] = useState<string>(
    annexure_2?.refined_problem || annexure_1?.problem_statement || ''
  );
  const [methodology, setMethodology] = useState<string>(
    annexure_2?.methodology || ''
  );
  const [milestones, setMilestones] = useState<TimelineMilestone[]>(
    annexure_2?.timeline_milestones && annexure_2.timeline_milestones.length > 0
      ? annexure_2.timeline_milestones
      : [
          {
            milestone_name: 'Literature Review & Formulation',
            target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expected_deliverables: 'Comprehensive literature synthesis matrix and problem baseline.',
          },
          {
            milestone_name: 'System Architecture & Modeling',
            target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expected_deliverables: 'Mathematical formulation, architectural schematics, and simulation setup.',
          },
          {
            milestone_name: 'Implementation & Empirical Benchmarking',
            target_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expected_deliverables: 'Working implementation, empirical datasets, and comparative evaluation.',
          },
          {
            milestone_name: 'Draft Manuscript & Thesis Defense',
            target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expected_deliverables: 'Completed dissertation manuscript and Turnitin similarity clearance.',
          },
        ]
  );

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isReadOnly = !permissions.can_edit;
  const isSubmitted = thesis.current_state === 'ANNEXURE_2_SUBMITTED';
  const isSupervisorEndorsed = thesis.current_state === 'ANNEXURE_2_SUPERVISOR_ENDORSED';
  const isDcecApproved = thesis.current_state === 'ANNEXURE_2_DCEC_APPROVED';
  const isRevisionRequired = thesis.current_state === 'ANNEXURE_2_REVISION';

  // Find individual supervisor endorsements
  const guideEndorsement = endorsements.find((e) => e.supervisor_role === 'GUIDE');
  const coGuideEndorsement = endorsements.find((e) => e.supervisor_role === 'CO_GUIDE');

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        milestone_name: `Milestone ${milestones.length + 1}`,
        target_date: new Date(Date.now() + (milestones.length + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expected_deliverables: '',
      },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (index: number, field: keyof TimelineMilestone, value: string) => {
    const updated = [...milestones];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setMilestones(updated);
  };

  const handleSaveDraft = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!finalTitle.trim()) {
      setErrorMessage('Please enter a finalized dissertation title.');
      return;
    }

    setIsSavingDraft(true);
    try {
      const res = await saveAnnexure2DraftAction({
        thesis_id: thesis.id,
        final_title: finalTitle.trim(),
        refined_problem: refinedProblem.trim(),
        methodology: methodology.trim(),
        timeline_milestones: milestones,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to save draft.');
      } else {
        setSuccessMessage('Draft saved successfully! You can continue refining your formulation.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmitFormal = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!finalTitle.trim()) {
      setErrorMessage('Finalized dissertation title is mandatory.');
      return;
    }
    if (!refinedProblem.trim()) {
      setErrorMessage('Refined problem statement is mandatory.');
      return;
    }
    if (!methodology.trim()) {
      setErrorMessage('Research methodology description is mandatory.');
      return;
    }
    if (milestones.length === 0) {
      setErrorMessage('At least one timeline milestone must be defined.');
      return;
    }

    setIsSubmitting(true);
    setShowConfirmModal(false);
    try {
      const res = await submitAnnexure2Action({
        thesis_id: thesis.id,
        final_title: finalTitle.trim(),
        refined_problem: refinedProblem.trim(),
        methodology: methodology.trim(),
        timeline_milestones: milestones,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit Annexure 2.');
      } else {
        setSuccessMessage('Annexure 2 submitted successfully! Notifications sent to Primary Guide and Co-Guide for dual endorsement.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    switch (thesis.current_state) {
      case 'SUPERVISORS_ALLOCATED':
      case 'COLLABORATIVE_PROBLEM_FORMULATION':
        return <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">Problem Formulation</span>;
      case 'ANNEXURE_2_SUBMITTED':
        return <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold">Awaiting Supervisor Endorsements</span>;
      case 'ANNEXURE_2_SUPERVISOR_ENDORSED':
        return <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-semibold">Awaiting DCEC Title Approval</span>;
      case 'ANNEXURE_2_REVISION':
        return <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-semibold">Revision Required</span>;
      case 'ANNEXURE_2_DCEC_APPROVED':
        return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">Title Formally Approved</span>;
      default:
        return <span className="px-3 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-xs font-semibold">{thesis.current_state}</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Annexure 2: Formal Title & Topic Approval
            </span>
            {getStatusBadge()}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Collaborative Problem Formulation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Refine your dissertation problem, methodology, and timeline with your Primary Guide and Co-Guide before formal DCEC baselining.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 self-start md:self-auto">
          <span>Tracking:</span>
          <span className="font-mono text-slate-200 font-semibold">{thesis.tracking_number}</span>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-emerald-300 text-sm flex items-start gap-3">
          <span className="text-lg">✓</span>
          <div>{successMessage}</div>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-sm flex items-start gap-3">
          <span className="text-lg">⚠</span>
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Revision Remarks Banner if applicable */}
      {isRevisionRequired && (
        <div className="p-5 bg-rose-950/30 border border-rose-800/60 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
            <span>⚠</span> Revision Requested by DCEC Chair / Supervisor
          </div>
          <p className="text-sm text-slate-300">
            Please review the comments below, adjust your problem formulation, methodology, or milestones, and resubmit for supervisor endorsement.
          </p>
        </div>
      )}

      {/* Contextual Supervisor & Dual Endorsement Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary Guide Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Primary Guide</span>
            {guideEndorsement ? (
              guideEndorsement.is_endorsed ? (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-medium">✓ Endorsed</span>
              ) : (
                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-xs font-medium">Revision Requested</span>
              )
            ) : (
              <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-md text-xs font-medium">Pending Sign-off</span>
            )}
          </div>
          <div>
            <div className="text-white font-semibold">{guide?.full_name || 'Primary Guide'}</div>
            <div className="text-xs text-slate-400">{guide?.designation || 'Faculty Member'} ({guide?.employee_code || 'N/A'})</div>
          </div>
          {guideEndorsement?.remarks && (
            <div className="text-xs bg-slate-950/60 p-2 rounded border border-slate-800 text-slate-300 italic">
              &quot;{guideEndorsement.remarks}&quot;
            </div>
          )}
        </div>

        {/* Co-Guide Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Co-Guide</span>
            {coGuideEndorsement ? (
              coGuideEndorsement.is_endorsed ? (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-medium">✓ Endorsed</span>
              ) : (
                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-xs font-medium">Revision Requested</span>
              )
            ) : (
              <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-md text-xs font-medium">Pending Sign-off</span>
            )}
          </div>
          <div>
            <div className="text-white font-semibold">{co_guide?.full_name || 'Co-Guide'}</div>
            <div className="text-xs text-slate-400">{co_guide?.designation || 'Faculty Member'} ({co_guide?.employee_code || 'N/A'})</div>
          </div>
          {coGuideEndorsement?.remarks && (
            <div className="text-xs bg-slate-950/60 p-2 rounded border border-slate-800 text-slate-300 italic">
              &quot;{coGuideEndorsement.remarks}&quot;
            </div>
          )}
        </div>
      </div>

      {/* Annexure 1 Reference Accordion / Card */}
      {annexure_1 && (
        <details className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 group">
          <summary className="text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 flex items-center justify-between">
            <span>Reference: Initial Annexure 1 Proposal</span>
            <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-2 text-sm">
            <div>
              <span className="text-slate-400 text-xs block">Initial Working Title:</span>
              <span className="text-slate-200 font-medium">{annexure_1.proposed_title}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">Broad Domain:</span>
              <span className="text-slate-300">{annexure_1.broad_domain}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">Initial Problem Statement:</span>
              <p className="text-slate-300 text-xs line-clamp-3">{annexure_1.problem_statement}</p>
            </div>
          </div>
        </details>
      )}

      {/* Main Annexure 2 Form */}
      <form onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true); }} className="space-y-6">
        {/* Finalized Title */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            Finalized Dissertation Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            disabled={isReadOnly}
            value={finalTitle}
            onChange={(e) => setFinalTitle(e.target.value)}
            placeholder="e.g. Scalable Cross-Chain Atomic Commit Protocols for Decentralized Exchanges"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-400">
            This title will be permanently baselined upon DCEC Chair approval. Ensure rigorous capitalization and precision.
          </p>
        </div>

        {/* Refined Problem Statement */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            Refined Problem Statement & Scope <span className="text-rose-400">*</span>
          </label>
          <textarea
            disabled={isReadOnly}
            rows={5}
            value={refinedProblem}
            onChange={(e) => setRefinedProblem(e.target.value)}
            placeholder="Detail the technical bottlenecks, research gaps, mathematical constraints, or system challenges to be addressed..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed resize-y"
          />
        </div>

        {/* Research Methodology */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            Research Methodology & Technical Approach <span className="text-rose-400">*</span>
          </label>
          <textarea
            disabled={isReadOnly}
            rows={5}
            value={methodology}
            onChange={(e) => setMethodology(e.target.value)}
            placeholder="Outline your algorithmic approaches, mathematical modeling, simulation environments, datasets, or experimental benchmark setup..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed resize-y"
          />
        </div>

        {/* Timeline Milestones Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-semibold text-slate-200">
                Timeline & Work Packages (Milestones) <span className="text-rose-400">*</span>
              </label>
              <p className="text-xs text-slate-400">
                Planned delivery checkpoints aligned with progress presentations (P1, P2, P3).
              </p>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAddMilestone}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
              >
                + Add Milestone
              </button>
            )}
          </div>

          <div className="space-y-3">
            {milestones.map((m, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 relative group"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-xs font-semibold text-blue-400">Milestone #{idx + 1}</span>
                  {!isReadOnly && milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestone(idx)}
                      className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-slate-400">Milestone Name</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={m.milestone_name}
                      onChange={(e) => handleMilestoneChange(idx, 'milestone_name', e.target.value)}
                      placeholder="e.g. System Architecture & Simulation Setup"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Target Date</label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={m.target_date}
                      onChange={(e) => handleMilestoneChange(idx, 'target_date', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Expected Deliverables</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={m.expected_deliverables}
                    onChange={(e) => handleMilestoneChange(idx, 'expected_deliverables', e.target.value)}
                    placeholder="e.g. Architectural diagram, validated mathematical model, ROS2 node"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {!isReadOnly && (
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={isSavingDraft || isSubmitting}
              onClick={handleSaveDraft}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all border border-slate-700 disabled:opacity-50"
            >
              {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
            </button>
            <button
              type="submit"
              disabled={isSavingDraft || isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Annexure 2'}
            </button>
          </div>
        )}
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Confirm Annexure 2 Submission</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Are you ready to submit your formal title approval docket? This will notify your Primary Guide (<span className="text-white font-medium">{guide?.full_name}</span>) and Co-Guide (<span className="text-white font-medium">{co_guide?.full_name}</span>) for dual electronic endorsement.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 block">Proposed Final Title:</span>
              <span className="text-white font-medium block italic">&quot;{finalTitle}&quot;</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitFormal}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/20"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
