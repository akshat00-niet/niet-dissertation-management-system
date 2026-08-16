'use client';

import React, { useState } from 'react';
import { MilestoneScorecardModal } from '@/components/milestones/MilestoneScorecardModal';

interface MilestoneEvaluationInfo {
  evaluation_id?: string;
  total_marks_awarded?: number;
  evaluated_at?: string;
  rubric_version_id?: string;
}

interface MilestoneTrackerProps {
  thesisId: string;
  currentState: string;
  currentStage: string;
  p1Evaluation?: MilestoneEvaluationInfo | null;
  p2Evaluation?: MilestoneEvaluationInfo | null;
  p3Evaluation?: MilestoneEvaluationInfo | null;
}

export function MilestoneTracker({
  thesisId,
  currentState,
  currentStage: _currentStage,
  p1Evaluation,
  p2Evaluation,
  p3Evaluation,
}: MilestoneTrackerProps) {
  const [selectedScorecard, setSelectedScorecard] = useState<'P1' | 'P2' | 'P3' | null>(null);

  // Status computation for P1
  const isP1Evaluated = !!p1Evaluation?.evaluation_id || currentState === 'P1_EVALUATION_COMPLETED';
  const isP1Scheduled = currentState === 'P1_EVALUATION_SCHEDULED';

  // Status computation for P2
  const isP2Evaluated = !!p2Evaluation?.evaluation_id || currentState === 'P2_EVALUATION_COMPLETED';
  const isP2Scheduled = currentState === 'P2_EVALUATION_SCHEDULED';

  // Status computation for P3
  const isP3Evaluated = !!p3Evaluation?.evaluation_id || currentState === 'P3_EVALUATION_COMPLETED' || currentState === 'ANNEXURE_5_PREPARATION';
  const isP3Scheduled = currentState === 'P3_EVALUATION_SCHEDULED';

  const milestones = [
    {
      type: 'P1' as const,
      title: 'Milestone 1 (P1): Research Formulation & Preliminary Results',
      isFormative: true,
      description: 'Formative checkpoint reviewing literature review, system architecture, and initial prototype.',
      isEvaluated: isP1Evaluated,
      isScheduled: isP1Scheduled,
      evaluation: p1Evaluation,
      badgeText: 'FORMATIVE (0% FINAL GRADE)',
      badgeColor: 'var(--info)',
      badgeBg: 'var(--info-light)',
    },
    {
      type: 'P2' as const,
      title: 'Milestone 2 (P2): Implementation & Mid-Term Analysis',
      isFormative: true,
      description: 'Formative checkpoint assessing experimental progress, data validation, and chapter drafts.',
      isEvaluated: isP2Evaluated,
      isScheduled: isP2Scheduled,
      evaluation: p2Evaluation,
      badgeText: 'FORMATIVE (0% FINAL GRADE)',
      badgeColor: 'var(--info)',
      badgeBg: 'var(--info-light)',
    },
    {
      type: 'P3' as const,
      title: 'Milestone 3 (P3): Pre-Submission Presentation & Final Defense Readiness',
      isFormative: false,
      description: 'Summative pre-submission milestone evaluation directly contributing to the dissertation final grade.',
      isEvaluated: isP3Evaluated,
      isScheduled: isP3Scheduled,
      evaluation: p3Evaluation,
      badgeText: 'CONTRIBUTES TO FINAL GRADE (/100)',
      badgeColor: 'var(--success)',
      badgeBg: 'var(--success-light)',
    },
  ];

  return (
    <div>
      {/* Workflow Lifecycle Explainer Banner */}
      <div
        style={{
          backgroundColor: 'var(--bg-main)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
          🔄 Institutional Milestone Progression Model
        </h4>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            fontSize: '0.75rem',
            paddingBottom: '0.25rem',
            fontWeight: 600,
          }}
        >
          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            RESEARCH EXECUTION
          </span>
          <span>➔</span>
          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: isP1Evaluated ? 'var(--success-light)' : 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: isP1Evaluated ? 'var(--success)' : 'inherit' }}>
            P1 PRESENTATION
          </span>
          <span>➔</span>
          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            RESEARCH EXECUTION
          </span>
          <span>➔</span>
          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: isP2Evaluated ? 'var(--success-light)' : 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: isP2Evaluated ? 'var(--success)' : 'inherit' }}>
            P2 PRESENTATION
          </span>
          <span>➔</span>
          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            RESEARCH EXECUTION
          </span>
          <span>➔</span>
          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: isP3Evaluated ? 'var(--success-light)' : 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: isP3Evaluated ? 'var(--success)' : 'inherit' }}>
            P3 PRE-SUBMISSION
          </span>
          <span>➔</span>
          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: currentState === 'ANNEXURE_5_PREPARATION' ? 'var(--primary-light)' : 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: currentState === 'ANNEXURE_5_PREPARATION' ? 'var(--primary)' : 'inherit' }}>
            ANNEXURE 5 PREPARATION
          </span>
        </div>
      </div>

      {/* Milestone Cards Roster */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {milestones.map((m) => (
          <div
            key={m.type}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderLeft: `4px solid ${m.isEvaluated ? 'var(--success)' : m.isScheduled ? 'var(--warning)' : 'var(--border)'}`,
            }}
          >
            <div>
              {/* Header with Badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span
                  style={{
                    backgroundColor: m.badgeBg,
                    color: m.badgeColor,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius)',
                    letterSpacing: '0.025em',
                  }}
                >
                  {m.badgeText}
                </span>

                {m.isEvaluated ? (
                  <span
                    style={{
                      backgroundColor: 'var(--success-light)',
                      color: 'var(--success)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    ✓ EVALUATED
                  </span>
                ) : m.isScheduled ? (
                  <span
                    style={{
                      backgroundColor: 'var(--warning-light)',
                      color: 'var(--warning)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    📅 SCHEDULED
                  </span>
                ) : (
                  <span
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    PENDING SCHEDULING
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h3 style={{ margin: '0 0 0.375rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {m.title}
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {m.description}
              </p>

              {/* Scorecard Summary if Evaluated */}
              {m.isEvaluated && m.evaluation && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: 'var(--radius)',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Awarded Marks
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.125rem' }}>
                      {m.evaluation.total_marks_awarded} <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ 100</span>
                    </div>
                  </div>
                  {m.evaluation.evaluated_at && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Evaluated On
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '0.125rem' }}>
                        {new Date(m.evaluation.evaluated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              {m.isEvaluated ? (
                <button
                  type="button"
                  onClick={() => setSelectedScorecard(m.type)}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                >
                  📊 View Official Scorecard
                </button>
              ) : m.isScheduled ? (
                <div style={{ width: '100%', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--warning)', fontWeight: 600, padding: '0.375rem 0' }}>
                  ⏳ Presentation in progress / awaiting DCEC scorecard
                </div>
              ) : (
                <div style={{ width: '100%', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '0.375rem 0' }}>
                  Scheduling managed by Department Coordinator
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Scorecard Modal */}
      {selectedScorecard && (
        <MilestoneScorecardModal
          thesisId={thesisId}
          milestoneType={selectedScorecard}
          isOpen={true}
          onClose={() => setSelectedScorecard(null)}
        />
      )}
    </div>
  );
}
