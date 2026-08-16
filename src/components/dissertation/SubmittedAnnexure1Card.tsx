import React from 'react';
import type {
  Annexure1Submission,
  GuidePreferenceViewModel,
  ThesisWithActiveTitle,
} from '@/types/database.types';

interface SubmittedAnnexure1CardProps {
  thesis: ThesisWithActiveTitle;
  proposal: Annexure1Submission;
  preferences: GuidePreferenceViewModel[];
}

export function SubmittedAnnexure1Card({
  thesis,
  proposal,
  preferences,
}: SubmittedAnnexure1CardProps) {
  const formattedDate = proposal.submitted_at
    ? new Date(proposal.submitted_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Status Notice */}
      <div
        style={{
          borderLeft: '4px solid #1A73E8',
          background: '#E8F0FE',
          padding: '1rem 1.25rem',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h4 style={{ margin: 0, color: '#174EA6', fontSize: '0.9375rem', fontWeight: 600 }}>
            Annexure 1 Proposal Formally Submitted
          </h4>
          <p style={{ margin: '0.25rem 0 0', color: '#185ABC', fontSize: '0.8125rem' }}>
            Submitted on <strong>{formattedDate}</strong>. This proposal is currently locked and queued for Department Coordinator (DC) verification and DCEC screening.
          </p>
        </div>
        <span
          style={{
            background: '#185ABC',
            color: '#FFFFFF',
            padding: '0.35rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          {thesis.current_state}
        </span>
      </div>

      {/* Proposal Details */}
      <div className="card">
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Proposed Topic Details
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Proposed Thesis Title
            </div>
            <div style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
              {proposal.proposed_title}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Broad Research Domain
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
                {proposal.broad_domain}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Dissertation Tracking Number
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                {thesis.tracking_number}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Problem Statement / Brief Abstract
            </div>
            <div
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-primary)',
                marginTop: '0.25rem',
                whiteSpace: 'pre-wrap',
                background: 'var(--color-bg-subtle)',
                padding: '0.75rem',
                borderRadius: '6px',
                lineHeight: 1.5,
              }}
            >
              {proposal.problem_statement}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Expected Outcomes & Deliverables
            </div>
            <div
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-primary)',
                marginTop: '0.25rem',
                whiteSpace: 'pre-wrap',
                background: 'var(--color-bg-subtle)',
                padding: '0.75rem',
                borderRadius: '6px',
                lineHeight: 1.5,
              }}
            >
              {proposal.expected_outcomes}
            </div>
          </div>
        </div>
      </div>

      {/* Submitted Ranked Preferences */}
      <div className="card">
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Ranked Faculty Supervisor Preferences
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {preferences.map((pref) => (
            <div
              key={pref.id || pref.preference_rank}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '0.875rem',
                background: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-primary)' }}>
                  Rank #{pref.preference_rank}
                </span>
                <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                  {pref.department_code || 'CSE'}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                {pref.faculty_name || 'Faculty Member'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                {pref.faculty_designation || 'Faculty'}
              </div>
              {pref.domain_justification && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  &ldquo;{pref.domain_justification}&rdquo;
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
