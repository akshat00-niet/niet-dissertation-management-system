'use client';

import React, { useEffect, useState } from 'react';
import type { MilestoneEvaluationDetails } from '@/types/milestones.types';
import { getMilestoneEvaluationDetailsAction } from '@/app/actions/milestones.actions';

interface MilestoneScorecardModalProps {
  thesisId: string;
  milestoneType: 'P1' | 'P2' | 'P3';
  isOpen: boolean;
  onClose: () => void;
}

export function MilestoneScorecardModal({
  thesisId,
  milestoneType,
  isOpen,
  onClose,
}: MilestoneScorecardModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<MilestoneEvaluationDetails | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getMilestoneEvaluationDetailsAction({
      thesis_id: thesisId,
      milestone_type: milestoneType,
    })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data?.data && typeof res.data.data === 'object' && 'evaluation_id' in res.data.data) {
          setDetails(res.data.data as MilestoneEvaluationDetails);
        } else {
          setError(res.error || res.data?.message || 'Unable to retrieve evaluation scorecard.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'An unexpected error occurred while loading scorecard.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, thesisId, milestoneType]);

  if (!isOpen) return null;

  const isP3 = milestoneType === 'P3';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scorecard-title"
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 id="scorecard-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                {milestoneType} Milestone Scorecard
              </h2>
              {isP3 ? (
                <span
                  style={{
                    backgroundColor: 'var(--success-light)',
                    color: 'var(--success)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--success)',
                  }}
                >
                  P3 — CONTRIBUTES TO FINAL GRADE
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: 'var(--info-light)',
                    color: 'var(--info)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  FORMATIVE — DOES NOT CONTRIBUTE TO FINAL GRADE
                </span>
              )}
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Official immutable committee evaluation record
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scorecard modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              lineHeight: 1,
              padding: '0.25rem',
            }}
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Loading official rubric scorecard...
              </p>
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: 'var(--danger-light)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                color: 'var(--danger)',
                fontSize: '0.875rem',
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && details && (
            <div>
              {/* Metadata Banner */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  backgroundColor: 'var(--bg-main)',
                  padding: '1rem',
                  borderRadius: 'var(--radius)',
                  marginBottom: '1.25rem',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Evaluation Score
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
                    {details.total_marks_awarded} <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {details.max_score}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Pinned Rubric
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                    {details.rubric_title} (v{details.rubric_version_number})
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Evaluated Date
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                    {new Date(details.evaluated_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Record Integrity
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--success)', marginTop: '0.25rem' }}>
                    🔒 IMMUTABLE / APPEND-ONLY
                  </div>
                </div>
              </div>

              {/* Granular Criteria Breakdown */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  Criterion-Level Evaluation Breakdown
                </h3>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>#</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>Criterion</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>Selected Tier</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>Descriptor & Feedback</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-main)', textAlign: 'right' }}>Awarded Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.criterion_scores.map((score, index) => (
                        <tr key={score.id || index} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', width: '30px' }}>{index + 1}</td>
                          <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top', width: '25%' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{score.criterion_title}</div>
                            {score.criterion_description && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                                {score.criterion_description}
                              </div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              Max: {score.max_marks} marks
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top', width: '20%' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.5rem',
                                borderRadius: 'var(--radius)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor: 'var(--bg-main)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              Level {score.selected_level_index}: {score.selected_level_label}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              Tier: {(score.selected_level_percentage * 100).toFixed(0)}%
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                              {score.selected_level_descriptor}
                            </div>
                            {score.criterion_remarks && (
                              <div
                                style={{
                                  marginTop: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontStyle: 'italic',
                                  color: 'var(--primary)',
                                  backgroundColor: 'var(--primary-light)',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: 'var(--radius)',
                                }}
                              >
                                Remarks: {score.criterion_remarks}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'top', fontWeight: 700, color: 'var(--text-main)' }}>
                            {score.awarded_marks} / {score.max_marks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: 'var(--bg-main)', fontWeight: 700 }}>
                        <td colSpan={4} style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          Total Score:
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--primary)', fontSize: '1rem' }}>
                          {details.total_marks_awarded} / {details.max_score}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Committee General Feedback */}
              {details.general_feedback && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '1rem',
                  }}
                >
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    DCEC Committee General Remarks
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                    {details.general_feedback}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--bg-main)',
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
}
