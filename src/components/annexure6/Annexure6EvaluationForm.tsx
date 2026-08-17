'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitAnnexure6EvaluationAction } from '@/app/actions/annexure6.actions';
import type {
  RegularityRating,
  TechnicalProficiency,
  RigorRating,
  DefenseRecommendation,
} from '@/types/annexure6.types';

interface Annexure6EvaluationFormProps {
  thesisId: string;
  trackingNumber: string;
  studentName: string;
  rollNumber: string;
  thesisTitle?: string | null;
  onSuccess?: () => void;
}

const RATING_OPTIONS: { value: RegularityRating; label: string; description: string }[] = [
  {
    value: 'EXEMPLARY',
    label: 'Exemplary',
    description: 'Consistently exceeds institutional standards with exceptional rigor.',
  },
  {
    value: 'PROFICIENT',
    label: 'Proficient',
    description: 'Meets high academic standards with thorough and consistent performance.',
  },
  {
    value: 'DEVELOPING',
    label: 'Developing',
    description: 'Meets minimum requirements but requires guided supervisory intervention.',
  },
  {
    value: 'UNSATISFACTORY',
    label: 'Unsatisfactory',
    description: 'Substandard progress; fails to meet baseline research requirements.',
  },
];

const RECOMMENDATION_OPTIONS: {
  value: DefenseRecommendation;
  label: string;
  description: string;
  badgeColor: string;
}[] = [
  {
    value: 'RECOMMENDED',
    label: 'Recommended for Oral Defense',
    description: 'Manuscript and research rigor qualify candidate for immediate final viva defense scheduling.',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  },
  {
    value: 'REVISIONS_REQUIRED',
    label: 'Minor Revisions Required Prior to Defense',
    description: 'Candidate must incorporate minor corrections before final defense panel constitution.',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  },
  {
    value: 'NOT_RECOMMENDED',
    label: 'Not Recommended / Major Deficiency',
    description: 'Substantial technical deficiencies; candidate not qualified for defense at this time.',
    badgeColor: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
  },
];

export function Annexure6EvaluationForm({
  thesisId,
  trackingNumber,
  studentName,
  rollNumber,
  thesisTitle,
  onSuccess,
}: Annexure6EvaluationFormProps) {
  const router = useRouter();

  const [score, setScore] = useState<string>('');
  const [regularityRating, setRegularityRating] = useState<RegularityRating>('PROFICIENT');
  const [technicalProficiency, setTechnicalProficiency] = useState<TechnicalProficiency>('PROFICIENT');
  const [rigorRating, setRigorRating] = useState<RigorRating>('PROFICIENT');
  const [confidentialRemarks, setConfidentialRemarks] = useState<string>('');
  const [defenseRecommendation, setDefenseRecommendation] = useState<DefenseRecommendation>('RECOMMENDED');

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const numScore = parseFloat(score);
  const isScoreValid = !isNaN(numScore) && numScore >= 0.0 && numScore <= 100.0;
  const isRemarksValid = confidentialRemarks.trim().length > 0 && confidentialRemarks.trim().length <= 4000;

  const isFormValid = isScoreValid && isRemarksValid;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isScoreValid) {
      setErrorMessage('Please enter a valid supervisor score between 0.0 and 100.0.');
      return;
    }

    if (!isRemarksValid) {
      setErrorMessage('Confidential supervisory remarks are mandatory (maximum 4000 characters).');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await submitAnnexure6EvaluationAction({
        thesis_id: thesisId,
        supervisor_score: numScore,
        regularity_rating: regularityRating,
        technical_proficiency: technicalProficiency,
        rigor_rating: rigorRating,
        confidential_remarks: confidentialRemarks.trim(),
        defense_recommendation: defenseRecommendation,
      });

      if (!response.success) {
        setErrorMessage(response.error || 'Failed to submit Annexure 6 evaluation.');
        setShowConfirmModal(false);
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setShowConfirmModal(false);
      setIsSubmitting(false);

      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during submission.');
      setShowConfirmModal(false);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white">Annexure 6 Evaluation Submitted Successfully</h3>
        <p className="text-sm text-slate-300 max-w-lg mx-auto">
          Your confidential supervisor evaluation of <span className="font-semibold text-white">{numScore.toFixed(1)} / 100</span> has been immutably recorded. The thesis is now advanced to <span className="font-semibold text-purple-400">DEFENSE_PANEL_CONSTITUTED</span> for HOD/DC panel appointment.
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/app/guide/annexure-6')}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition"
          >
            Return to Annexure 6 Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleOpenConfirm} className="space-y-8">
      {/* Confidentiality Warning Header */}
      <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13-5.5a8.5 8.5 0 11-17 0 8.5 8.5 0 0117 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wide">
            Confidential Supervisor Evaluation (Write-Once)
          </h4>
          <p className="text-xs text-slate-300 mt-1">
            This evaluation is strictly confidential and is never disclosed to the student candidate. Once submitted, marks, dimensional ratings, and remarks are permanently locked.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Candidate Summary */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate & Dissertation Context</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-500 block text-xs">Student Candidate</span>
            <span className="font-semibold text-white">{studentName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">Roll Number</span>
            <span className="font-semibold text-slate-300">{rollNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">Tracking Number</span>
            <span className="font-mono font-semibold text-purple-300">{trackingNumber}</span>
          </div>
        </div>
        {thesisTitle && (
          <div className="pt-2 border-t border-slate-800">
            <span className="text-slate-500 block text-xs">Approved Dissertation Title</span>
            <span className="text-sm text-slate-200 font-medium">{thesisTitle}</span>
          </div>
        )}
      </div>

      {/* 1. Supervisor Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="supervisor_score" className="text-sm font-bold text-white flex items-center gap-2">
            Supervisor Evaluation Score (Out of 100) <span className="text-rose-400">*</span>
          </label>
          <span className="text-xs text-slate-400">Scale: 0.0 – 100.0</span>
        </div>
        <div className="relative">
          <input
            id="supervisor_score"
            type="number"
            step="0.1"
            min="0"
            max="100"
            required
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="e.g. 88.5"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition"
          />
          <div className="absolute right-4 top-3.5 text-xs font-semibold text-slate-500">MARKS</div>
        </div>
      </div>

      {/* 2. Dimensional Ratings Grid */}
      <div className="space-y-6 pt-4 border-t border-slate-800">
        <h4 className="text-sm font-bold text-white">Supervisory Dimensional Ratings</h4>

        {/* Regularity Rating */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            A. Regularity & Work Ethic <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {RATING_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                  regularityRating === opt.value
                    ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{opt.label}</span>
                  <input
                    type="radio"
                    name="regularity_rating"
                    value={opt.value}
                    checked={regularityRating === opt.value}
                    onChange={() => setRegularityRating(opt.value)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{opt.description}</p>
              </label>
            ))}
          </div>
        </div>

        {/* Technical Proficiency */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            B. Technical Proficiency & Execution <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {RATING_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                  technicalProficiency === opt.value
                    ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{opt.label}</span>
                  <input
                    type="radio"
                    name="technical_proficiency"
                    value={opt.value}
                    checked={technicalProficiency === opt.value}
                    onChange={() => setTechnicalProficiency(opt.value)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{opt.description}</p>
              </label>
            ))}
          </div>
        </div>

        {/* Rigor Rating */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            C. Research Rigor & Methodology <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {RATING_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                  rigorRating === opt.value
                    ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{opt.label}</span>
                  <input
                    type="radio"
                    name="rigor_rating"
                    value={opt.value}
                    checked={rigorRating === opt.value}
                    onChange={() => setRigorRating(opt.value)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{opt.description}</p>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Defense Recommendation */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <label className="text-sm font-bold text-white block">
          Defense Recommendation <span className="text-rose-400">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {RECOMMENDATION_OPTIONS.map((rec) => (
            <label
              key={rec.value}
              className={`p-4 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                defenseRecommendation === rec.value
                  ? 'bg-slate-800 border-purple-500 ring-1 ring-purple-500'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-white leading-tight">{rec.label}</span>
                <input
                  type="radio"
                  name="defense_recommendation"
                  value={rec.value}
                  checked={defenseRecommendation === rec.value}
                  onChange={() => setDefenseRecommendation(rec.value)}
                  className="text-purple-600 focus:ring-purple-500 mt-0.5"
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{rec.description}</p>
            </label>
          ))}
        </div>
      </div>

      {/* 4. Confidential Remarks */}
      <div className="space-y-2 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <label htmlFor="confidential_remarks" className="text-sm font-bold text-white flex items-center gap-2">
            Confidential Supervisory Remarks <span className="text-rose-400">*</span>
          </label>
          <span className={`text-xs ${confidentialRemarks.length > 4000 ? 'text-rose-400' : 'text-slate-400'}`}>
            {confidentialRemarks.length} / 4000 characters
          </span>
        </div>
        <textarea
          id="confidential_remarks"
          required
          rows={5}
          maxLength={4000}
          value={confidentialRemarks}
          onChange={(e) => setConfidentialRemarks(e.target.value)}
          placeholder="Provide detailed, candid qualitative appraisal of the candidate's research capability, authenticity, and defense readiness..."
          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition resize-y"
        />
      </div>

      {/* Action Footer */}
      <div className="pt-6 border-t border-slate-800 flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-purple-900/30 transition flex items-center gap-2"
        >
          {isSubmitting ? 'Submitting Evaluation...' : 'Review & Submit Annexure 6'}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-lg w-full bg-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-purple-400">
              <div className="p-2 rounded-xl bg-purple-500/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Confirm Confidential Submission</h3>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you wish to submit this Annexure 6 evaluation for <span className="font-semibold text-white">{studentName}</span>?
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Supervisor Score:</span>
                <span className="font-bold text-white">{numScore.toFixed(1)} / 100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Defense Recommendation:</span>
                <span className="font-bold text-purple-300">{defenseRecommendation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Regularity:</span>
                <span className="font-semibold text-slate-200">{regularityRating}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Technical Proficiency:</span>
                <span className="font-semibold text-slate-200">{technicalProficiency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rigor Rating:</span>
                <span className="font-semibold text-slate-200">{rigorRating}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-300 text-xs">
              <strong>Notice:</strong> This action is write-once and permanently immutable. Once submitted, the marks and recommendations cannot be retracted or altered.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition flex items-center gap-2"
              >
                {isSubmitting ? 'Recording Evaluation...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
