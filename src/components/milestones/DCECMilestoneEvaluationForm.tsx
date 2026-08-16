'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ActiveMilestoneRubric } from '@/types/rubrics.types';
import { submitMilestoneEvaluationAction } from '@/app/actions/milestones.actions';

interface DCECMilestoneEvaluationFormProps {
  thesisId: string;
  trackingNumber: string;
  studentName: string;
  studentRoll: string;
  approvedTitle: string;
  milestoneType: 'P1' | 'P2' | 'P3';
  rubric: ActiveMilestoneRubric;
  onSuccess?: () => void;
}

interface SelectedScoresMap {
  [criterionId: string]: {
    levelId: string;
    awardedMarks: number;
    remarks: string;
  };
}

export function DCECMilestoneEvaluationForm({
  thesisId,
  trackingNumber,
  studentName,
  studentRoll,
  approvedTitle,
  milestoneType,
  rubric,
  onSuccess,
}: DCECMilestoneEvaluationFormProps) {
  const router = useRouter();
  const [selectedScores, setSelectedScores] = useState<SelectedScoresMap>({});
  const [generalFeedback, setGeneralFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const isP3 = milestoneType === 'P3';

  // Calculate live total marks
  const totalAwardedMarks = Object.values(selectedScores).reduce(
    (sum, val) => sum + (val.awardedMarks || 0),
    0
  );

  const criteriaCount = rubric.criteria.length;
  const scoredCount = Object.keys(selectedScores).length;
  const allCriteriaScored = scoredCount === criteriaCount && criteriaCount > 0;

  const handleSelectTier = (
    criterionId: string,
    levelId: string,
    maxMarks: number,
    scorePercentage: number
  ) => {
    const calculatedMarks = Math.round(maxMarks * scorePercentage * 100) / 100;
    setSelectedScores((prev) => ({
      ...prev,
      [criterionId]: {
        levelId,
        awardedMarks: calculatedMarks,
        remarks: prev[criterionId]?.remarks || '',
      },
    }));
  };

  const handleRemarkChange = (criterionId: string, remarks: string) => {
    setSelectedScores((prev) => {
      if (!prev[criterionId]) return prev;
      return {
        ...prev,
        [criterionId]: {
          ...prev[criterionId],
          remarks,
        },
      };
    });
  };

  const handleFormSubmit = async () => {
    setError(null);

    if (!allCriteriaScored) {
      setError(`Please evaluate all ${criteriaCount} criteria before submitting (Currently scored: ${scoredCount}/${criteriaCount}).`);
      setShowConfirmModal(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadCriterionScores = rubric.criteria.map((c) => {
        const sel = selectedScores[c.id];
        return {
          criterion_id: c.id,
          selected_level_id: sel.levelId,
          awarded_marks: sel.awardedMarks,
          criterion_remarks: sel.remarks?.trim() || undefined,
        };
      });

      const res = await submitMilestoneEvaluationAction({
        thesis_id: thesisId,
        milestone_type: milestoneType,
        rubric_version_id: rubric.rubric_version_id,
        criterion_scores: payloadCriterionScores,
        general_feedback: generalFeedback.trim() || undefined,
      });

      if (res.success) {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/app/dcec/milestones');
        }
      } else {
        setError(res.error || res.data?.message || 'Failed to submit milestone evaluation.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during evaluation submission.');
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div>
      {/* Dissertation & Candidate Overview Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {milestoneType} Milestone Evaluation Workbench
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
                  P3 — CONTRIBUTES TO FINAL GRADE (/100)
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
                  FORMATIVE CHECKPOINT — (0% FINAL GRADE)
                </span>
              )}
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Candidate: <strong style={{ color: 'var(--text-main)' }}>{studentName}</strong> | Roll: {studentRoll} | Tracking: {trackingNumber}
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.5rem 1rem',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Live Score Total
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
              {totalAwardedMarks.toFixed(1)} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {rubric.max_score}</span>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Approved Dissertation Title
          </div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.125rem' }}>
            {approvedTitle || 'Untitled Proposal'}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'var(--danger-light)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: 'var(--danger)',
            fontSize: '0.875rem',
          }}
        >
          <strong>Validation Error:</strong> {error}
        </div>
      )}

      {/* 4-Column Dynamic Rubric Criteria Scoring */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Evaluation Criteria ({scoredCount}/{criteriaCount} Evaluated)
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Rubric: {rubric.title} (v{rubric.version_number}) — Select one achievement tier for each criterion
            </p>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius)',
              backgroundColor: allCriteriaScored ? 'var(--success-light)' : 'var(--warning-light)',
              color: allCriteriaScored ? 'var(--success)' : 'var(--warning)',
            }}
          >
            {allCriteriaScored ? '✓ All Criteria Scored' : `${criteriaCount - scoredCount} Remaining`}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {rubric.criteria.map((criterion, critIndex) => {
            const currentScore = selectedScores[criterion.id];

            return (
              <div
                key={criterion.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${currentScore ? 'var(--success)' : 'var(--border)'}`,
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                {/* Criterion Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        Criterion #{critIndex + 1}
                      </span>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {criterion.criterion_title}
                      </h4>
                    </div>
                    {criterion.description && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {criterion.description}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      backgroundColor: 'var(--bg-main)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Weight: {criterion.max_marks} marks
                  </span>
                </div>

                {/* Dynamic 4 Achievement Tiers Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  {criterion.achievement_levels.map((level) => {
                    const isSelected = currentScore?.levelId === level.id;
                    const calculatedScore = Math.round(criterion.max_marks * level.score_percentage * 100) / 100;

                    return (
                      <div
                        key={level.id}
                        onClick={() => handleSelectTier(criterion.id, level.id, criterion.max_marks, level.score_percentage)}
                        style={{
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-main)',
                          borderRadius: 'var(--radius)',
                          padding: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                              Level {level.level_index}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                              {(level.score_percentage * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-main)', marginBottom: '0.25rem' }}>
                            {level.label}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            {level.descriptor}
                          </p>
                        </div>

                        <div
                          style={{
                            marginTop: '0.5rem',
                            paddingTop: '0.5rem',
                            borderTop: `1px solid ${isSelected ? 'rgba(215, 25, 32, 0.2)' : 'var(--border)'}`,
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                            textAlign: 'right',
                          }}
                        >
                          {calculatedScore} / {criterion.max_marks}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Criterion Specific Remarks Input */}
                <div>
                  <input
                    type="text"
                    placeholder={`Optional feedback / observations for "${criterion.criterion_title}"...`}
                    value={currentScore?.remarks || ''}
                    onChange={(e) => handleRemarkChange(criterion.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.75rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.8125rem',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* General Committee Feedback Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
          DCEC Committee Overall Feedback & Directives
        </h3>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Provide constructive guidance, recommended revisions, or experimental directions for the candidate and supervisor.
        </p>
        <textarea
          rows={4}
          value={generalFeedback}
          onChange={(e) => setGeneralFeedback(e.target.value)}
          placeholder="Enter detailed presentation feedback and research execution guidance..."
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            fontSize: '0.875rem',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Submission Actions */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-main)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Total Marks: {totalAwardedMarks.toFixed(1)} / {rubric.max_score}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🔒 Scorecard becomes strictly immutable upon submission.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!allCriteriaScored) {
                setError(`Please evaluate all ${criteriaCount} criteria before submitting.`);
                return;
              }
              setShowConfirmModal(true);
            }}
            disabled={!allCriteriaScored || isSubmitting}
            className="btn btn-primary"
          >
            Submit Milestone Evaluation
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
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
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '480px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-modal)',
              border: '1px solid var(--border)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Confirm Immutable Milestone Submission
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Are you sure you want to finalize and sign off on this <strong>{milestoneType}</strong> evaluation for candidate <strong>{studentName}</strong> with a total score of <strong>{totalAwardedMarks.toFixed(1)} / {rubric.max_score}</strong>?
            </p>

            <div
              style={{
                backgroundColor: 'var(--warning-light)',
                border: '1px solid var(--warning)',
                borderRadius: 'var(--radius)',
                padding: '0.75rem',
                marginBottom: '1.25rem',
                fontSize: '0.8125rem',
                color: 'var(--warning)',
              }}
            >
              ⚠️ <strong>Institutional Policy:</strong> Milestone evaluations are append-only and cannot be altered or deleted once recorded.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="btn btn-secondary"
              >
                Review Scores
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Recording Scorecard...' : 'Confirm & Finalize Scorecard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
