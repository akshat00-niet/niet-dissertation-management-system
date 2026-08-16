'use client';

import React, { useState } from 'react';
import { scheduleMilestonePresentationAction } from '@/app/actions/milestones.actions';

interface DCSchedulingModalProps {
  thesisId: string;
  trackingNumber: string;
  studentName: string;
  defaultMilestoneType?: 'P1' | 'P2' | 'P3';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DCSchedulingModal({
  thesisId,
  trackingNumber,
  studentName,
  defaultMilestoneType = 'P1',
  isOpen,
  onClose,
  onSuccess,
}: DCSchedulingModalProps) {
  const [milestoneType, setMilestoneType] = useState<'P1' | 'P2' | 'P3'>(defaultMilestoneType);
  const [presentationDate, setPresentationDate] = useState<string>('');
  const [venueOrUrl, setVenueOrUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!presentationDate) {
      setError('Please select a valid presentation date and time.');
      return;
    }

    if (!venueOrUrl.trim()) {
      setError('Please enter a physical venue or virtual meeting URL.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await scheduleMilestonePresentationAction({
        thesis_id: thesisId,
        milestone_type: milestoneType,
        presentation_date: new Date(presentationDate).toISOString(),
        venue_or_url: venueOrUrl.trim(),
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || res.data?.message || 'Failed to schedule milestone presentation.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(32, 33, 36, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '540px',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-main)',
          }}
        >
          <div>
            <h2 id="schedule-modal-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Schedule Milestone Presentation
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Candidate: <strong style={{ color: 'var(--text-main)' }}>{studentName}</strong> ({trackingNumber})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              color: 'var(--text-muted)',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div
                style={{
                  backgroundColor: 'var(--danger-light)',
                  border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius)',
                  padding: '0.75rem 1rem',
                  color: 'var(--danger)',
                  fontSize: '0.8125rem',
                }}
              >
                {error}
              </div>
            )}

            {/* Milestone Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Milestone Presentation Type *
              </label>
              <select
                value={milestoneType}
                onChange={(e) => setMilestoneType(e.target.value as 'P1' | 'P2' | 'P3')}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                }}
              >
                <option value="P1">Milestone 1 (P1) — Formative Review</option>
                <option value="P2">Milestone 2 (P2) — Formative Mid-Term</option>
                <option value="P3">Milestone 3 (P3) — Pre-Submission (Contributes to Final Grade)</option>
              </select>
              {milestoneType === 'P3' ? (
                <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                  ⚠️ Note: P3 completion will advance the thesis to Annexure 5 Preparation and contribute to final grade.
                </div>
              ) : (
                <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  P1 and P2 completion will return the thesis to Research Execution.
                </div>
              )}
            </div>

            {/* Presentation Date and Time */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Presentation Date & Time *
              </label>
              <input
                type="datetime-local"
                value={presentationDate}
                onChange={(e) => setPresentationDate(e.target.value)}
                disabled={submitting}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* Venue or Meeting URL */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Venue / Online Meeting URL *
              </label>
              <input
                type="text"
                value={venueOrUrl}
                onChange={(e) => setVenueOrUrl(e.target.value)}
                placeholder="e.g. Conference Room 302, Block A OR https://meet.google.com/xyz-abcd-uvw"
                disabled={submitting}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* Optional Scheduling Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Instructions / Committee Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specific directions for presentation slides, prototype demonstrations, or committee panel..."
                rows={3}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              backgroundColor: 'var(--bg-main)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? 'Scheduling...' : 'Confirm & Schedule Presentation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
