import React from 'react';
import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getStudentActiveDissertation } from '@/lib/services/theses.service';
import { getMilestoneEvaluationDetails } from '@/lib/services/milestones.service';
import { getDefensePanelDetailsAction } from '@/app/actions/annexure6.actions';
import { createClient } from '@/lib/supabase/server';
import { MilestoneTracker } from '@/components/milestones/MilestoneTracker';
import { DefensePanelCard } from '@/components/annexure6/DefensePanelCard';

export default async function StudentDefensesPage() {
  const session = await requireAuthenticatedUser();
  const thesis = await getStudentActiveDissertation(session);

  if (!thesis) {
    return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Milestone Presentations & Defenses
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No active dissertation record found for your student profile.
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Please contact your Department Coordinator (DC) to initialize your dissertation enrollment.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  // Retrieve evaluations for P1, P2, P3 if completed
  let p1Eval = null;
  let p2Eval = null;
  let p3Eval = null;

  try {
    const resP1 = await getMilestoneEvaluationDetails(supabase, session, { thesis_id: thesis.id, milestone_type: 'P1' });
    if (resP1.success && resP1.data && typeof resP1.data === 'object' && 'evaluation_id' in resP1.data) {
      p1Eval = resP1.data;
    }
  } catch (_err) {}

  try {
    const resP2 = await getMilestoneEvaluationDetails(supabase, session, { thesis_id: thesis.id, milestone_type: 'P2' });
    if (resP2.success && resP2.data && typeof resP2.data === 'object' && 'evaluation_id' in resP2.data) {
      p2Eval = resP2.data;
    }
  } catch (_err) {}

  // Retrieve defense panel details if panel is constituted / scheduled
  let panelDetails: any = null;
  try {
    const resPanel = await getDefensePanelDetailsAction({ thesis_id: thesis.id });
    if (resPanel.success && resPanel.data && typeof resPanel.data === 'object') {
      const dataObj = resPanel.data as any;
      if (dataObj.is_constituted) {
        panelDetails = dataObj;
      }
    }
  } catch (_err) {}

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Milestone Presentations & Defenses
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Tracking Number: <strong style={{ color: 'var(--primary)' }}>{thesis.tracking_number}</strong> | Stage: {thesis.current_stage}
          </p>
        </div>
        <Link href="/app/student/dissertation" className="btn btn-secondary">
          ← Back to Dissertation Workspace
        </Link>
      </div>

      {/* Candidate Summary Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
          Active Dissertation Details
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Approved Title
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.25rem' }}>
              {thesis.active_title || 'Untitled Proposal Draft'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Current State
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem' }}>
              {thesis.current_state}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Supervisor Allocation
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-main)', marginTop: '0.25rem' }}>
              {thesis.guide_id ? 'Assigned' : 'Pending Allocation'}
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Defense Panel Notice */}
      {panelDetails && (
        <div style={{ marginBottom: '1.5rem' }}>
          <DefensePanelCard
            panelDetails={panelDetails}
            trackingNumber={thesis.tracking_number}
            studentName={session.appUser?.full_name}
          />
        </div>
      )}

      {/* Milestone Progress Tracker */}
      <MilestoneTracker
        thesisId={thesis.id}
        currentState={thesis.current_state}
        currentStage={thesis.current_stage}
        p1Evaluation={p1Eval}
        p2Evaluation={p2Eval}
        p3Evaluation={p3Eval}
      />
    </div>
  );
}
