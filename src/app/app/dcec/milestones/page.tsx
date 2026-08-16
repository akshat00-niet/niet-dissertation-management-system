import React from 'react';
import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { listDepartmentMilestones } from '@/lib/services/milestones.service';
import { createClient } from '@/lib/supabase/server';
import type { DepartmentMilestoneSummary } from '@/types/milestones.types';

export default async function DCECMilestoneReviewQueuePage() {
  const session = await requireAuthenticatedUser();

  const isAuthorized = session.roles.some((r) =>
    ['DCEC_MEMBER', 'DCEC_CHAIR', 'HOD', 'ADMIN'].includes(r.role_id)
  );

  if (!isAuthorized) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>Unauthorized Access</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Only DCEC Committee Members, DCEC Chair, and HOD can access the milestone evaluation workbench.
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
  let scheduledTheses: DepartmentMilestoneSummary[] = [];

  try {
    const res = await listDepartmentMilestones(supabase, session, {
      department_id: departmentId,
    });
    if (res.success && Array.isArray(res.data)) {
      scheduledTheses = (res.data as DepartmentMilestoneSummary[]).filter((t) =>
        ['P1_EVALUATION_SCHEDULED', 'P2_EVALUATION_SCHEDULED', 'P3_EVALUATION_SCHEDULED'].includes(t.current_state)
      );
    }
  } catch (err: any) {
    console.error('Failed to list scheduled milestones for DCEC:', err);
  }

  return (
    <div>
      {/* Page Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
          DCEC Milestone Presentation Evaluation Queue
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Review scheduled student milestone presentations and record 4-column rubric evaluations
        </p>
      </div>

      {/* Scheduled Presentations Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>Candidate</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>Tracking #</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>Active Milestone</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>Grading Weight</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {scheduledTheses.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No presentations currently scheduled for evaluation.
                  </td>
                </tr>
              ) : (
                scheduledTheses.map((t) => {
                  let activeMilestoneType: 'P1' | 'P2' | 'P3' = 'P1';
                  if (t.current_state === 'P2_EVALUATION_SCHEDULED') activeMilestoneType = 'P2';
                  if (t.current_state === 'P3_EVALUATION_SCHEDULED') activeMilestoneType = 'P3';

                  const isP3 = activeMilestoneType === 'P3';

                  return (
                    <tr key={t.thesis_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll: {t.student_roll}</div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', fontWeight: 600, color: 'var(--primary)' }}>
                        {t.tracking_number}
                      </td>

                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius)',
                            backgroundColor: 'var(--warning-light)',
                            color: 'var(--warning)',
                          }}
                        >
                          📅 {activeMilestoneType} SCHEDULED
                        </span>
                      </td>

                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle' }}>
                        {isP3 ? (
                          <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.75rem' }}>
                            ⭐ P3 — Contributes to Final Grade
                          </span>
                        ) : (
                          <span style={{ color: 'var(--info)', fontWeight: 500, fontSize: '0.75rem' }}>
                            Formative (0% Final Grade)
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        <Link
                          href={`/app/dcec/milestones/${t.thesis_id}/${activeMilestoneType}`}
                          className="btn btn-primary"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                        >
                          Evaluate Presentation →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
