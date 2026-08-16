import React from 'react';

interface ProgressStage {
  id: string;
  name: string;
  shortLabel: string;
}

const LIFECYCLE_STAGES: ProgressStage[] = [
  { id: 'PROPOSAL_STAGE', name: 'Proposal (Annexure 1)', shortLabel: '1. Proposal' },
  { id: 'ALLOCATION_STAGE', name: 'Supervisor Allocation', shortLabel: '2. Allocation' },
  { id: 'TOPIC_APPROVAL_STAGE', name: 'Title Approval (Annexure 2)', shortLabel: '3. Title' },
  { id: 'RESEARCH_AND_PROGRESS_STAGE', name: 'Research & Logbook', shortLabel: '4. Research' },
  { id: 'MILESTONE_EVALUATION_STAGE', name: 'Milestones (P1-P3)', shortLabel: '5. Milestones' },
  { id: 'FINAL_SUBMISSION_STAGE', name: 'Dissertation (Annexure 5)', shortLabel: '6. Submission' },
  { id: 'CONFIDENTIAL_EVALUATION_STAGE', name: 'Confidential Eval (Annexure 6)', shortLabel: '7. Eval' },
  { id: 'VIVA_DEFENSE_STAGE', name: 'Oral Viva Defense', shortLabel: '8. Viva' },
  { id: 'ARCHIVAL_STAGE', name: 'Archival & Result', shortLabel: '9. Archive' },
];

interface ThesisProgressStepperProps {
  currentStage: string;
  currentState: string;
}

export function ThesisProgressStepper({ currentStage, currentState }: ThesisProgressStepperProps) {
  const currentIndex = LIFECYCLE_STAGES.findIndex((s) => s.id === currentStage);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="card" style={{ marginBottom: '1.5rem', background: '#FFFFFF' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Dissertation Lifecycle Progression
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Stage {activeIndex + 1} of 9: <strong style={{ color: 'var(--color-primary)' }}>{LIFECYCLE_STAGES[activeIndex].name}</strong>
          </p>
        </div>
        <div>
          <span className="badge badge-primary" style={{ textTransform: 'none', fontWeight: 600 }}>
            State: {currentState}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {LIFECYCLE_STAGES.map((stage, idx) => {
          const isPassed = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          let bg = 'var(--color-border)';
          let color = 'var(--color-text-muted)';
          let borderColor = 'var(--color-border)';

          if (isCurrent) {
            bg = 'var(--color-primary)';
            color = '#FFFFFF';
            borderColor = 'var(--color-primary)';
          } else if (isPassed) {
            bg = '#E6F4EA';
            color = '#137333';
            borderColor = '#CEEAD6';
          }

          return (
            <div
              key={stage.id}
              style={{
                flex: '1 1 0',
                minWidth: '105px',
                padding: '0.5rem 0.625rem',
                borderRadius: '6px',
                background: bg,
                color: color,
                border: `1px solid ${borderColor}`,
                fontSize: '0.75rem',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontWeight: isCurrent ? 700 : 500 }}>
                {isPassed ? '✓ ' : ''}{stage.shortLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
