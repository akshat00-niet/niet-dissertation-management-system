import React from 'react';
import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getStudentActiveDissertation } from '@/lib/services/theses.service';
import { ThesisProgressStepper } from '@/components/dissertation/ThesisProgressStepper';

export default async function StudentDissertationWorkspacePage() {
  const session = await requireAuthenticatedUser();
  const thesis = await getStudentActiveDissertation(session);

  if (!thesis) {
    return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Student Dissertation Workspace
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            No active dissertation record was found for your student profile.
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Please contact your Department Coordinator (DC) to initialize your dissertation enrollment.
          </p>
        </div>
      </div>
    );
  }

  const isAnnexure1Submitted =
    thesis.current_state !== 'DRAFT_PROPOSAL' &&
    thesis.current_state !== 'ANNEXURE_1_REVISION';

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Student Dissertation Workspace
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Tracking Number: <strong style={{ color: 'var(--color-primary)' }}>{thesis.tracking_number}</strong>
          </p>
        </div>
        <Link href="/app/student/annexure-1" className="btn btn-primary">
          {isAnnexure1Submitted ? '📄 View Submitted Annexure 1' : '✏️ Edit Annexure 1 Proposal'}
        </Link>
      </div>

      {/* Progress Stepper */}
      <ThesisProgressStepper
        currentStage={thesis.current_stage}
        currentState={thesis.current_state}
      />

      {/* Active Thesis Summary Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Active Dissertation Summary
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Current Title
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
              {thesis.active_title || 'Untitled Proposal Draft'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Assigned Supervisor
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
              {thesis.guide_id ? 'Allocated by Department' : 'Pending DCEC Approval & Allocation'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Defense Cycle
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
              Cycle #{thesis.defense_cycle_index}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Annexure 1 Card */}
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
              Annexure 1: Topic Proposal
            </h4>
            <span
              className={isAnnexure1Submitted ? 'badge badge-primary' : 'badge badge-secondary'}
            >
              {isAnnexure1Submitted ? 'SUBMITTED' : 'DRAFT'}
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem', lineHeight: 1.4 }}>
            Initial research topic, abstract, and selection of four ranked faculty supervisor preferences.
          </p>
          <Link href="/app/student/annexure-1" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            {isAnnexure1Submitted ? 'View Proposal Status' : 'Continue Drafting'}
          </Link>
        </div>

        {/* Annexure 2 Card (Locked until Stage 3) */}
        <div className="card" style={{ opacity: 0.65, background: 'var(--color-bg-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
              Annexure 2: Formal Title Approval
            </h4>
            <span className="badge" style={{ background: '#E0E0E0', color: '#666' }}>LOCKED</span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '0 0 1rem', lineHeight: 1.4 }}>
            Collaborative methodology and formal title approval with your allocated supervisor. Unlocks after supervisor allocation.
          </p>
          <button className="btn btn-secondary" disabled style={{ width: '100%', cursor: 'not-allowed', justifyContent: 'center' }}>
            Locked (Stage 3)
          </button>
        </div>

        {/* Logbook Card (Locked until Stage 4) */}
        <div className="card" style={{ opacity: 0.65, background: 'var(--color-bg-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
              Annexure 4: Digital Logbook
            </h4>
            <span className="badge" style={{ background: '#E0E0E0', color: '#666' }}>LOCKED</span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '0 0 1rem', lineHeight: 1.4 }}>
            Supervisory meeting logs and research progress tracker. Unlocks following DCEC Annexure 2 approval.
          </p>
          <button className="btn btn-secondary" disabled style={{ width: '100%', cursor: 'not-allowed', justifyContent: 'center' }}>
            Locked (Stage 4)
          </button>
        </div>
      </div>
    </div>
  );
}
