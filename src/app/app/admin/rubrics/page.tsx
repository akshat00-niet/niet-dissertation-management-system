import React from 'react';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getActiveMilestoneRubric } from '@/lib/services/rubrics.service';
import { createClient } from '@/lib/supabase/server';
import { AdminRubricsWorkbench } from '@/components/rubrics/AdminRubricsWorkbench';
import type { ActiveMilestoneRubric } from '@/types/rubrics.types';

export default async function AdminRubricsConsolePage() {
  const session = await requireAuthenticatedUser();

  const isAdmin = session.roles.some((r) => r.role_id === 'ADMIN');
  const isHOD = session.roles.some((r) => r.role_id === 'HOD');

  if (!isAdmin && !isHOD) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>Unauthorized Access</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Only System Administrators and Department Heads can access the Rubric Builder and Console.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  // Fetch departments
  const { data: deptRows } = await supabase
    .from('departments')
    .select('id, name, code')
    .order('name', { ascending: true });

  const departments = deptRows || [];

  // Fetch active published rubrics for standard milestones
  const activeRubrics: ActiveMilestoneRubric[] = [];
  const milestonesToQuery = ['P1', 'P2', 'P3', 'FINAL_VIVA'];

  for (const dept of departments) {
    for (const m of milestonesToQuery) {
      try {
        const res = await getActiveMilestoneRubric(supabase, session, {
          department_id: dept.id,
          milestone_type: m,
        });
        if (res.success && res.data) {
          activeRubrics.push(res.data as ActiveMilestoneRubric);
        }
      } catch (_err) {
        // Silently skip if no active rubric
      }
    }
  }

  return (
    <AdminRubricsWorkbench
      departments={departments}
      activeRubrics={activeRubrics}
      canPublish={isAdmin || isHOD}
    />
  );
}
