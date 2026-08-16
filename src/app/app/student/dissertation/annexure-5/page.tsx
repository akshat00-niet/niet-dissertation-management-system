import React from 'react';
import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getStudentActiveDissertation } from '@/lib/services/theses.service';
import { getAnnexure5Docket } from '@/lib/services/annexure5.service';
import { createClient } from '@/lib/supabase/server';
import { Annexure5DocketViewer } from '@/components/annexure5/Annexure5DocketViewer';
import { Annexure5SubmissionForm } from '@/components/annexure5/Annexure5SubmissionForm';
import { Annexure5StatusBadge } from '@/components/annexure5/Annexure5StatusBadge';
import type { Annexure5Docket } from '@/types/annexure5.types';

export default async function StudentAnnexure5Page() {
  const session = await requireAuthenticatedUser();
  const thesis = await getStudentActiveDissertation(session);

  if (!thesis) {
    return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
            Final Dissertation Submission (Annexure 5)
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
            No active dissertation record found for your student profile.
          </p>
        </div>
        <div
          style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: 'var(--radius, 12px)',
            border: '1px solid var(--border, #e2e8f0)',
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: 'var(--muted-foreground)',
          }}
        >
          <p style={{ margin: 0 }}>
            Please contact your Department Coordinator (DC) to initialize your dissertation enrollment.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  let docket: Annexure5Docket | null = null;
  let docketError: string | null = null;

  try {
    const res = await getAnnexure5Docket(supabase, session, { thesis_id: thesis.id });
    if (res.success && res.data) {
      docket = res.data as Annexure5Docket;
    } else if (res.success && res.thesis) {
      docket = {
        thesis: res.thesis,
        annexure_5: res.annexure_5 || null,
        endorsements: res.endorsements || [],
        permissions: res.permissions || {
          is_student: true,
          is_guide: false,
          is_coguide: false,
          can_submit: true,
          can_endorse: false,
        },
      };
    }
  } catch (err: any) {
    docketError = err.message || 'Failed to load Annexure 5 docket.';
  }

  const isPreparation =
    thesis.current_state === 'ANNEXURE_5_PREPARATION' ||
    docket?.annexure_5?.status === 'REVISION_REQUIRED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Link
              href="/app/student/defenses"
              style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}
            >
              ← Defenses &amp; Milestones
            </Link>
            <span style={{ color: 'var(--muted-foreground)' }}>/</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Annexure 5</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
            Final Dissertation Submission (Annexure 5)
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
            Submit final manuscript, approved synopsis, Turnitin/DrillBit report, and repository reference.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Annexure5StatusBadge status={thesis.current_state} type="state" />
        </div>
      </div>

      {docketError && (
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius, 8px)',
            backgroundColor: 'var(--destructive-light, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--destructive, #ef4444)',
            color: 'var(--destructive, #dc2626)',
            fontSize: '0.9rem',
          }}
        >
          {docketError}
        </div>
      )}

      {/* Revision Notice Banner */}
      {docket?.annexure_5?.status === 'REVISION_REQUIRED' && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius, 8px)',
            backgroundColor: 'var(--warning-light, rgba(234, 179, 8, 0.1))',
            border: '1px solid var(--warning, #eab308)',
            color: 'var(--warning-dark, #a16207)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
            ⚠ Corrections Requested by Supervisor
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            Your supervisor has requested revisions on your final dissertation submission. Please update your manuscript, synopsis, or similarity certificate accordingly and resubmit below.
          </div>
        </div>
      )}

      {/* Main Submission / Docket View */}
      {docket && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isPreparation ? (
            <Annexure5SubmissionForm
              thesisId={thesis.id}
              existingSubmission={docket.annexure_5}
              onSuccess={() => {}}
            />
          ) : null}

          <Annexure5DocketViewer docket={docket} />
        </div>
      )}
    </div>
  );
}
