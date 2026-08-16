import React from 'react';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { listDepartmentMilestones } from '@/lib/services/milestones.service';
import { createClient } from '@/lib/supabase/server';
import { DCMilestoneSchedulingWorkbench } from '@/components/milestones/DCMilestoneSchedulingWorkbench';
import type { DepartmentMilestoneSummary } from '@/types/milestones.types';

export default async function DepartmentMilestoneOverviewPage() {
  const session = await requireAuthenticatedUser();

  const isAuthorized = session.roles.some((r) =>
    ['HOD', 'DHOD', 'DC', 'DCEC_MEMBER', 'DCEC_CHAIR', 'ADMIN'].includes(r.role_id)
  );

  if (!isAuthorized) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>Unauthorized Access</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Only Department Authorities and Committee Members can view the departmental milestone dashboard.
        </p>
      </div>
    );
  }

  const departmentId = session.activeDepartmentId || session.roles.find((r) => r.department_id)?.department_id;
  if (!departmentId) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>No Department Selected</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Please select an active department role from your profile switch.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  let theses: DepartmentMilestoneSummary[] = [];

  try {
    const res = await listDepartmentMilestones(supabase, session, {
      department_id: departmentId,
    });
    if (res.success && Array.isArray(res.data)) {
      theses = res.data as DepartmentMilestoneSummary[];
    }
  } catch (err: any) {
    console.error('Failed to list department milestones:', err);
  }

  // Calculate cohort summary stats
  const totalCount = theses.length;
  const scheduledCount = theses.filter((t) =>
    ['P1_EVALUATION_SCHEDULED', 'P2_EVALUATION_SCHEDULED', 'P3_EVALUATION_SCHEDULED'].includes(t.current_state)
  ).length;
  const p1CompletedCount = theses.filter((t) => !!t.p1_evaluation).length;
  const p2CompletedCount = theses.filter((t) => !!t.p2_evaluation).length;
  const p3CompletedCount = theses.filter((t) => !!t.p3_evaluation).length;

  return (
    <div>
      {/* Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Cohort Candidates
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
            {totalCount}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Presentations Scheduled
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.25rem' }}>
            {scheduledCount}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            P1 Formative Cleared
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--info)', marginTop: '0.25rem' }}>
            {p1CompletedCount}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            P2 Formative Cleared
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--info)', marginTop: '0.25rem' }}>
            {p2CompletedCount}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            P3 Pre-Submission Cleared
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>
            {p3CompletedCount}
          </div>
        </div>
      </div>

      {/* Roster & Scheduling Workbench */}
      <DCMilestoneSchedulingWorkbench
        departmentId={departmentId}
        departmentName="Department Cohort Milestone Dashboard"
        theses={theses}
      />
    </div>
  );
}
