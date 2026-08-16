'use client';

import React, { useState } from 'react';
import {
  endorseAnnexure5SubmissionAction,
  requestAnnexure5RevisionAction,
} from '@/app/actions/annexure5.actions';

interface SupervisorEndorsementModalProps {
  isOpen: boolean;
  onClose: () => void;
  thesisId: string;
  trackingNumber: string;
  studentName: string;
  supervisorRole: 'GUIDE' | 'CO_GUIDE';
  onSuccess: () => void;
}

export function SupervisorEndorsementModal({
  isOpen,
  onClose,
  thesisId,
  trackingNumber,
  studentName,
  supervisorRole,
  onSuccess,
}: SupervisorEndorsementModalProps) {
  const [mode, setMode] = useState<'ENDORSE' | 'REVISE'>('ENDORSE');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === 'REVISE' && !remarks.trim()) {
      setErrorMessage('Detailed feedback remarks are mandatory when requesting revision.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'ENDORSE') {
        const res = await endorseAnnexure5SubmissionAction({
          thesis_id: thesisId,
          is_endorsed: true,
          remarks: remarks.trim() || null,
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to submit endorsement.');
          return;
        }
      } else {
        const res = await requestAnnexure5RevisionAction({
          thesis_id: thesisId,
          revision_notes: remarks.trim(),
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to request revision.');
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--foreground, #1e293b)',
          borderRadius: 'var(--radius, 12px)',
          border: '1px solid var(--border, #e2e8f0)',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
              Supervisor Endorsement Decision
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
              Candidate: <strong>{studentName}</strong> ({trackingNumber})
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--muted-foreground)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {errorMessage && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius, 8px)',
                backgroundColor: 'var(--destructive-light, rgba(239, 68, 68, 0.1))',
                border: '1px solid var(--destructive, #ef4444)',
                color: 'var(--destructive, #dc2626)',
                fontSize: '0.85rem',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Decision Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Action as {supervisorRole === 'GUIDE' ? 'Primary Guide' : 'Co-Guide'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setMode('ENDORSE')}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius, 8px)',
                  border: `2px solid ${mode === 'ENDORSE' ? 'var(--success, #16a34a)' : 'var(--border)'}`,
                  backgroundColor: mode === 'ENDORSE' ? 'var(--success-light, rgba(34, 197, 94, 0.1))' : 'var(--bg-card)',
                  color: mode === 'ENDORSE' ? 'var(--success, #16a34a)' : 'inherit',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ✓ Endorse Submission
              </button>
              <button
                type="button"
                onClick={() => setMode('REVISE')}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius, 8px)',
                  border: `2px solid ${mode === 'REVISE' ? 'var(--destructive, #dc2626)' : 'var(--border)'}`,
                  backgroundColor: mode === 'REVISE' ? 'var(--destructive-light, rgba(239, 68, 68, 0.1))' : 'var(--bg-card)',
                  color: mode === 'REVISE' ? 'var(--destructive, #dc2626)' : 'inherit',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ⚠ Request Corrections
              </button>
            </div>
          </div>

          {/* Remarks Input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {mode === 'REVISE' ? 'Correction Requirements (Mandatory)' : 'Supervisor Endorsement Remarks (Optional)'}
            </label>
            <textarea
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                mode === 'REVISE'
                  ? 'Specify missing sections, formatting errors, or similarity report issues required for resubmission...'
                  : 'Manuscript quality, similarity metrics, and deliverables verified for oral defense readiness.'
              }
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius, 8px)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-muted, #f8fafc)',
                color: 'inherit',
                fontSize: '0.9rem',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Notice Box */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius, 8px)',
              backgroundColor: mode === 'ENDORSE' ? 'var(--info-light, rgba(59, 130, 246, 0.1))' : 'var(--warning-light, rgba(234, 179, 8, 0.1))',
              border: `1px solid ${mode === 'ENDORSE' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
              fontSize: '0.8rem',
              color: 'var(--muted-foreground)',
              marginBottom: '1.5rem',
            }}
          >
            {mode === 'ENDORSE'
              ? 'Institutional Notice: Endorsing certifies that the dissertation manuscript and Turnitin similarity certificate comply with institutional standards. If a Co-Guide is assigned, both endorsements are required to advance to Annexure 6.'
              : 'Reversion Notice: Requesting revisions will revert the thesis state to ANNEXURE_5_PREPARATION and notify the candidate to submit a revised dissertation docket.'}
          </div>

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: 'var(--radius, 8px)',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: 'var(--radius, 8px)',
                border: 'none',
                backgroundColor: mode === 'ENDORSE' ? 'var(--success, #16a34a)' : 'var(--destructive, #dc2626)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Submitting...' : mode === 'ENDORSE' ? 'Confirm Endorsement' : 'Submit Revision Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
