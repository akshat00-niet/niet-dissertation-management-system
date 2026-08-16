'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  DepartmentFacultyOption,
  GuidePreferenceInput,
  Annexure1FormData,
  ThesisWithActiveTitle,
  Annexure1Submission,
  GuidePreferenceViewModel,
} from '@/types/database.types';
import { GuidePreferencePicker } from './GuidePreferencePicker';
import {
  saveAnnexure1DraftAction,
  submitAnnexure1Action,
  checkTitleAvailabilityAction,
} from '@/app/actions/annexure1.actions';

interface Annexure1FormProps {
  thesis: ThesisWithActiveTitle;
  initialProposal: Annexure1Submission | null;
  initialPreferences: GuidePreferenceViewModel[];
  availableFaculty: DepartmentFacultyOption[];
  availableDomains: { id: string; code: string; name: string }[];
}

export function Annexure1Form({
  thesis,
  initialProposal,
  initialPreferences,
  availableFaculty,
  availableDomains,
}: Annexure1FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form State
  const [proposedTitle, setProposedTitle] = useState(
    initialProposal?.proposed_title || thesis.active_title || ''
  );
  const [broadDomain, setBroadDomain] = useState(
    initialProposal?.broad_domain || (availableDomains[0]?.name || '')
  );
  const [problemStatement, setProblemStatement] = useState(
    initialProposal?.problem_statement || ''
  );
  const [expectedOutcomes, setExpectedOutcomes] = useState(
    initialProposal?.expected_outcomes || ''
  );

  // Preference State (1..4)
  const [preferences, setPreferences] = useState<GuidePreferenceInput[]>(() => {
    if (initialPreferences && initialPreferences.length > 0) {
      return [1, 2, 3, 4].map((rank) => {
        const found = initialPreferences.find((p) => p.preference_rank === rank);
        return {
          faculty_id: found?.faculty_id || '',
          preference_rank: rank,
          domain_justification: found?.domain_justification || '',
        };
      });
    }
    return [1, 2, 3, 4].map((rank) => ({
      faculty_id: '',
      preference_rank: rank,
      domain_justification: '',
    }));
  });

  // Feedback states
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTitleChecking, setIsTitleChecking] = useState(false);
  const [isTitleAvailable, setIsTitleAvailable] = useState<boolean | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Debounced Title Uniqueness Check
  useEffect(() => {
    if (!proposedTitle || proposedTitle.trim().length < 5) {
      setIsTitleAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsTitleChecking(true);
      const res = await checkTitleAvailabilityAction(proposedTitle, thesis.id);
      setIsTitleChecking(false);
      if (res.success && res.data) {
        setIsTitleAvailable(res.data.isAvailable);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [proposedTitle, thesis.id]);

  const compileFormData = (): Annexure1FormData => ({
    proposed_title: proposedTitle.trim(),
    broad_domain: broadDomain.trim(),
    problem_statement: problemStatement.trim(),
    expected_outcomes: expectedOutcomes.trim(),
    preferences: preferences.map((p) => ({
      faculty_id: p.faculty_id,
      preference_rank: p.preference_rank,
      domain_justification: p.domain_justification || '',
    })),
  });

  const handleSaveDraft = async () => {
    setStatusMessage(null);
    startTransition(async () => {
      const data = compileFormData();
      const res = await saveAnnexure1DraftAction(data);
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Proposal draft saved successfully.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to save draft.' });
      }
    });
  };

  const validateForSubmission = (): string | null => {
    if (!proposedTitle.trim() || proposedTitle.trim().length < 5) {
      return 'Please provide a valid proposed thesis title (at least 5 characters).';
    }
    if (isTitleAvailable === false) {
      return 'The proposed title collides with an already registered dissertation. Please choose a unique title.';
    }
    if (!broadDomain.trim()) {
      return 'Please specify a broad research domain.';
    }
    if (!problemStatement.trim() || problemStatement.trim().length < 20) {
      return 'Problem statement / abstract must be at least 20 characters.';
    }
    if (!expectedOutcomes.trim() || expectedOutcomes.trim().length < 10) {
      return 'Expected outcomes must be at least 10 characters.';
    }

    const selectedIds = preferences.map((p) => p.faculty_id).filter(Boolean);
    if (selectedIds.length !== 4) {
      return 'Please select all four (4) distinct faculty supervisor preferences.';
    }
    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size !== 4) {
      return 'Duplicate faculty selected in preferences. All four supervisor choices must be distinct.';
    }

    return null;
  };

  const handleOpenSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    const validationErr = validateForSubmission();
    if (validationErr) {
      setStatusMessage({ type: 'error', text: validationErr });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    startTransition(async () => {
      const data = compileFormData();
      const res = await submitAnnexure1Action(data);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Annexure 1 Proposal successfully submitted! Redirecting...',
        });
        setTimeout(() => {
          router.refresh();
        }, 800);
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Submission failed.' });
      }
    });
  };

  return (
    <form onSubmit={handleOpenSubmitModal} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {statusMessage && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: '6px',
            background: statusMessage.type === 'success' ? '#E6F4EA' : '#FCE8E6',
            color: statusMessage.type === 'success' ? '#137333' : '#C5221F',
            border: `1px solid ${statusMessage.type === 'success' ? '#CEEAD6' : '#FAD2CF'}`,
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Main Proposal Card */}
      <div className="card">
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.0625rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Research Topic & Problem Proposal
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Proposed Title */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label htmlFor="proposed-title" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Proposed Thesis Title <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              {isTitleChecking && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Checking availability...</span>
              )}
              {!isTitleChecking && isTitleAvailable === true && (
                <span style={{ fontSize: '0.75rem', color: '#137333', fontWeight: 600 }}>✓ Title is unique</span>
              )}
              {!isTitleChecking && isTitleAvailable === false && (
                <span style={{ fontSize: '0.75rem', color: '#C5221F', fontWeight: 600 }}>✗ Duplicate title exists</span>
              )}
            </div>
            <input
              id="proposed-title"
              type="text"
              className="input"
              style={{ width: '100%', fontSize: '0.9375rem', padding: '0.6rem 0.75rem' }}
              placeholder="e.g. Scalable Federated Learning Architectures for Edge Healthcare Devices"
              value={proposedTitle}
              onChange={(e) => setProposedTitle(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          {/* Broad Domain */}
          <div>
            <label htmlFor="broad-domain" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
              Broad Research Domain <span style={{ color: 'var(--color-primary)' }}>*</span>
            </label>
            {availableDomains.length > 0 ? (
              <select
                id="broad-domain"
                className="input"
                style={{ width: '100%', fontSize: '0.875rem', padding: '0.55rem 0.75rem' }}
                value={broadDomain}
                onChange={(e) => setBroadDomain(e.target.value)}
                required
                disabled={isPending}
              >
                <option value="">-- Select Research Domain --</option>
                {availableDomains.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="broad-domain"
                type="text"
                className="input"
                style={{ width: '100%', fontSize: '0.875rem', padding: '0.55rem 0.75rem' }}
                placeholder="e.g. Artificial Intelligence / Cloud Computing"
                value={broadDomain}
                onChange={(e) => setBroadDomain(e.target.value)}
                required
                disabled={isPending}
              />
            )}
          </div>

          {/* Problem Statement */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label htmlFor="problem-statement" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Problem Statement / Brief Abstract <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {problemStatement.length} characters (min 20)
              </span>
            </div>
            <textarea
              id="problem-statement"
              className="input"
              rows={4}
              style={{ width: '100%', fontSize: '0.875rem', padding: '0.6rem 0.75rem', lineHeight: 1.5 }}
              placeholder="Clearly state the research gap, core technical problem, and intended methodology..."
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          {/* Expected Outcomes */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label htmlFor="expected-outcomes" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Expected Outcomes & Deliverables <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {expectedOutcomes.length} characters (min 10)
              </span>
            </div>
            <textarea
              id="expected-outcomes"
              className="input"
              rows={3}
              style={{ width: '100%', fontSize: '0.875rem', padding: '0.6rem 0.75rem', lineHeight: 1.5 }}
              placeholder="e.g. Prototype software framework, dataset, IEEE/Scopus publication draft, comparative benchmarks..."
              value={expectedOutcomes}
              onChange={(e) => setExpectedOutcomes(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      {/* Guide Preferences Card */}
      <div className="card">
        <GuidePreferencePicker
          facultyList={availableFaculty}
          preferences={preferences}
          onChange={setPreferences}
          disabled={isPending}
        />
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FFFFFF',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleSaveDraft}
          disabled={isPending}
        >
          {isPending ? 'Saving...' : '💾 Save Draft'}
        </button>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending || isTitleAvailable === false}
          >
            {isPending ? 'Processing...' : '🚀 Submit Annexure 1 Proposal'}
          </button>
        </div>
      </div>

      {/* Final Submission Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(32, 33, 36, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Confirm Final Annexure 1 Submission
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to formally submit your Annexure 1 proposal?
              <br /><br />
              <strong>Note:</strong> Upon submission, your proposal will be locked and routed directly into the Department Coordinator (DC) verification queue. You will not be able to edit this proposal unless a formal revision is ordered by the DCEC.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSubmit}
                disabled={isPending}
              >
                {isPending ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
