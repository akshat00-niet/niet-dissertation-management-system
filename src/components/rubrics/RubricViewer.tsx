'use client';

import React, { useState } from 'react';
import type { ActiveMilestoneRubric } from '@/types/rubrics.types';
import { publishRubricVersionAction } from '@/app/actions/rubrics.actions';

interface RubricViewerProps {
  rubric: ActiveMilestoneRubric;
  isPublished?: boolean;
  canPublish?: boolean;
  onPublishSuccess?: () => void;
}

export function RubricViewer({
  rubric,
  isPublished = true,
  canPublish = false,
  onPublishSuccess,
}: RubricViewerProps) {
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [justification, setJustification] = useState<string>('Official cohort rubric publication');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await publishRubricVersionAction({
        rubric_version_id: rubric.rubric_version_id,
        justification: justification.trim() || undefined,
      });

      if (res.success) {
        setShowPublishModal(false);
        if (onPublishSuccess) onPublishSuccess();
      } else {
        setError(res.error || res.data?.message || 'Failed to publish rubric version.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during publication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Rubric Header Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {rubric.title}
              </h2>
              {isPublished ? (
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
                  🔒 PUBLISHED / IMMUTABLE (v{rubric.version_number})
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: 'var(--warning-light)',
                    color: 'var(--warning)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  📝 DRAFT / UNPUBLISHED (v{rubric.version_number})
                </span>
              )}
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Milestone: <strong style={{ color: 'var(--text-main)' }}>{rubric.milestone_type}</strong> | Total Marks: {rubric.max_score} | Effective: {rubric.effective_from || 'Current'}
            </p>
          </div>

          {canPublish && !isPublished && (
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              className="btn btn-primary"
            >
              🚀 Publish Rubric Version
            </button>
          )}
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
          {error}
        </div>
      )}

      {/* 4-Column Matrix Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '0.875rem 1rem', width: '24%', textAlign: 'left', fontWeight: 700, color: 'var(--text-main)' }}>
                  Criterion & Weight
                </th>
                <th style={{ padding: '0.875rem 1rem', width: '19%', textAlign: 'left', fontWeight: 700, color: 'var(--text-main)' }}>
                  Level 1 (Unsatisfactory)
                </th>
                <th style={{ padding: '0.875rem 1rem', width: '19%', textAlign: 'left', fontWeight: 700, color: 'var(--text-main)' }}>
                  Level 2 (Developing)
                </th>
                <th style={{ padding: '0.875rem 1rem', width: '19%', textAlign: 'left', fontWeight: 700, color: 'var(--text-main)' }}>
                  Level 3 (Proficient)
                </th>
                <th style={{ padding: '0.875rem 1rem', width: '19%', textAlign: 'left', fontWeight: 700, color: 'var(--text-main)' }}>
                  Level 4 (Exemplary)
                </th>
              </tr>
            </thead>
            <tbody>
              {rubric.criteria.map((criterion, idx) => (
                <tr key={criterion.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  {/* Criterion Header Column */}
                  <td style={{ padding: '1rem', verticalAlign: 'top', backgroundColor: 'var(--bg-main)', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                      {criterion.criterion_title}
                    </div>
                    {criterion.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                        {criterion.description}
                      </div>
                    )}
                    <div style={{ marginTop: '0.5rem', display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius)' }}>
                      Max: {criterion.max_marks} marks
                    </div>
                  </td>

                  {/* 4 Dynamic Achievement Levels */}
                  {criterion.achievement_levels.map((level) => {
                    const benchScore = Math.round(criterion.max_marks * level.score_percentage * 100) / 100;
                    return (
                      <td key={level.id || level.level_index} style={{ padding: '1rem', verticalAlign: 'top', borderRight: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.75rem' }}>
                            {level.label}
                          </span>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {(level.score_percentage * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                          {level.descriptor}
                        </p>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          Score: {benchScore} / {criterion.max_marks}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
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
              Publish Official Rubric Version
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Publishing this rubric version will make it the active standard for <strong>{rubric.milestone_type}</strong> presentations and mark it permanently immutable.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Publication Justification / Notes
              </label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                disabled={isSubmitting}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Publishing...' : 'Confirm & Publish Version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
