import React from 'react';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { listDepartmentMilestones } from '@/lib/services/milestones.service';
import { createClient } from '@/lib/supabase/server';
import { DCMilestoneSchedulingWorkbench } from '@/components/milestones/DCMilestoneSchedulingWorkbench';
import type { DepartmentMilestoneSummary } from '@/types/milestones.types';

export default async function DCMilestoneSchedulingPage() {
  const session = await requireAuthenticatedUser();

  const isAuthorized = session.roles.some((r) => ['DC', 'HOD', 'ADMIN'].includes(r.role_id));
  if (!isAuthorized) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>Unauthorized Access</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Only Department Coordinators (DC) and Department Heads (HOD) can schedule milestone presentations.
        </p>
      </div>
    );
  }

  const departmentId = session.activeDepartmentId || session.roles.find((r) => r.department_id)?.department_id;
  if (!departmentId) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>No Department Affiliation</h2>
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

  return (
    <DCMilestoneSchedulingWorkbench
      departmentId={departmentId}
      departmentName="Department Candidates"
      theses={theses}
    />
  );
}
