import React from 'react';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { DCMilestoneSchedulingWorkbench } from '@/components/milestones/DCMilestoneSchedulingWorkbench';
import type { DepartmentMilestoneSummary } from '@/types/milestones.types';

export default async function GuideThesesRosterPage() {
  const session = await requireAuthenticatedUser();

  const isSupervisor = session.roles.some((r) =>
    ['GUIDE', 'CO_GUIDE', 'FACULTY', 'HOD', 'ADMIN'].includes(r.role_id)
  );

  if (!isSupervisor) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>Unauthorized Access</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Only assigned Supervisors and Faculty can access the supervised dissertation roster.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  // Fetch supervised theses for this faculty member
  const { data: thesisRows } = await supabase
    .from('theses')
    .select(`
      id,
      tracking_number,
      current_state,
      current_stage,
      student_id,
      guide_id,
      co_guide_id,
      users!theses_student_id_fkey (full_name),
      student_profiles!student_profiles_user_id_fkey (roll_number),
      milestone_evaluations (id, milestone_type, total_marks_awarded, evaluated_at, rubric_version_id)
    `)
    .or(`guide_id.eq.${session.appUser.id},co_guide_id.eq.${session.appUser.id}`)
    .order('tracking_number', { ascending: true });

  const theses: DepartmentMilestoneSummary[] = (thesisRows || []).map((t: any) => {
    const evals = t.milestone_evaluations || [];
    const p1 = evals.find((e: any) => e.milestone_type === 'P1');
    const p2 = evals.find((e: any) => e.milestone_type === 'P2');
    const p3 = evals.find((e: any) => e.milestone_type === 'P3');

    return {
      thesis_id: t.id,
      tracking_number: t.tracking_number,
      current_state: t.current_state,
      current_stage: t.current_stage,
      student_id: t.student_id,
      student_name: t.users?.full_name || 'Student Candidate',
      student_roll: t.student_profiles?.roll_number || 'N/A',
      guide_id: t.guide_id,
      guide_name: session.appUser.full_name,
      co_guide_id: t.co_guide_id,
      co_guide_name: null,
      p1_evaluation: p1 ? { evaluation_id: p1.id, total_marks_awarded: p1.total_marks_awarded, evaluated_at: p1.evaluated_at, rubric_version_id: p1.rubric_version_id } : null,
      p2_evaluation: p2 ? { evaluation_id: p2.id, total_marks_awarded: p2.total_marks_awarded, evaluated_at: p2.evaluated_at, rubric_version_id: p2.rubric_version_id } : null,
      p3_evaluation: p3 ? { evaluation_id: p3.id, total_marks_awarded: p3.total_marks_awarded, evaluated_at: p3.evaluated_at, rubric_version_id: p3.rubric_version_id } : null,
    };
  });

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Supervised Theses & Milestone Tracking
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Roster of candidate dissertations under your supervision with active progress milestone statuses
        </p>
      </div>

      <DCMilestoneSchedulingWorkbench
        departmentId={session.activeDepartmentId || ''}
        departmentName="Supervised Candidates"
        theses={theses}
      />
    </div>
  );
}
