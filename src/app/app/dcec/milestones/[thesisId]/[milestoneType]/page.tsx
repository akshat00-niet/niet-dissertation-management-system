import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getActiveMilestoneRubric } from '@/lib/services/rubrics.service';
import { createClient } from '@/lib/supabase/server';
import { DCECMilestoneEvaluationForm } from '@/components/milestones/DCECMilestoneEvaluationForm';
import type { ActiveMilestoneRubric } from '@/types/rubrics.types';

interface DCECEvaluationPageProps {
  params: Promise<{
    thesisId: string;
    milestoneType: string;
  }>;
}

export default async function DCECMilestoneEvaluationPage({ params }: DCECEvaluationPageProps) {
  const resolvedParams = await params;
  const { thesisId, milestoneType } = resolvedParams;

  if (!['P1', 'P2', 'P3'].includes(milestoneType.toUpperCase())) {
    notFound();
  }

  const normalizedMilestone = milestoneType.toUpperCase() as 'P1' | 'P2' | 'P3';
  const session = await requireAuthenticatedUser();

  const isAuthorized = session.roles.some((r) =>
    ['DCEC_MEMBER', 'DCEC_CHAIR', 'HOD', 'ADMIN'].includes(r.role_id)
  );

  if (!isAuthorized) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>Unauthorized Access</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Only DCEC Committee Members, DCEC Chair, and HOD can submit milestone evaluations.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  // Fetch thesis details
  const { data: thesis, error: thesisErr } = await supabase
    .from('theses')
    .select(`
      id,
      tracking_number,
      current_state,
      current_stage,
      department_id,
      student_id,
      users!theses_student_id_fkey (full_name),
      student_profiles!student_profiles_user_id_fkey (roll_number),
      thesis_titles (proposed_title, is_approved)
    `)
    .eq('id', thesisId)
    .single();

  if (thesisErr || !thesis) {
    notFound();
  }

  // Fetch active published rubric for this milestone
  const rubricRes = await getActiveMilestoneRubric(supabase, session, {
    department_id: thesis.department_id,
    milestone_type: normalizedMilestone,
  });

  if (!rubricRes.success || !rubricRes.data) {
    return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/app/dcec/milestones" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
            ← Back to Evaluation Queue
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Missing Active Rubric
          </h1>
        </div>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 600, margin: 0 }}>
            No active published rubric version was found for {normalizedMilestone} presentations in this department.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Please contact the Department Coordinator or Administrator to configure and publish an official rubric.
          </p>
        </div>
      </div>
    );
  }

  const studentName = (thesis.users as any)?.full_name || 'Student Candidate';
  const studentRoll = (thesis.student_profiles as any)?.roll_number || 'N/A';
  const approvedTitle =
    (thesis.thesis_titles as any[])?.find((t) => t.is_approved)?.proposed_title ||
    (thesis.thesis_titles as any[])?.[0]?.proposed_title ||
    'Untitled Proposal';

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/app/dcec/milestones" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
          ← Back to Evaluation Queue
        </Link>
      </div>

      <DCECMilestoneEvaluationForm
        thesisId={thesis.id}
        trackingNumber={thesis.tracking_number}
        studentName={studentName}
        studentRoll={studentRoll}
        approvedTitle={approvedTitle}
        milestoneType={normalizedMilestone}
        rubric={rubricRes.data as ActiveMilestoneRubric}
      />
    </div>
  );
}
