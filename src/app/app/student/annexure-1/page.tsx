import React from 'react';
import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getStudentAnnexure1Workspace } from '@/lib/services/annexures.service';
import { Annexure1Form } from '@/components/dissertation/Annexure1Form';
import { SubmittedAnnexure1Card } from '@/components/dissertation/SubmittedAnnexure1Card';

export default async function StudentAnnexure1Page() {
  const session = await requireAuthenticatedUser();
  const workspace = await getStudentAnnexure1Workspace(session);

  return (
    <div>
      {/* Top Breadcrumb Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
            <Link href="/app/student/dissertation" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
              ← Back to Dissertation Workspace
            </Link>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Annexure 1: Thesis Topic & Guide Preferences
          </h1>
        </div>
        <div>
          <span
            className={workspace.isSubmitted ? 'badge badge-primary' : 'badge badge-secondary'}
            style={{ fontWeight: 600 }}
          >
            {workspace.thesis.current_state}
          </span>
        </div>
      </div>

      {/* Render Submitted Read-Only Card OR Active Form */}
      {workspace.isSubmitted && workspace.proposal ? (
        <SubmittedAnnexure1Card
          thesis={workspace.thesis}
          proposal={workspace.proposal}
          preferences={workspace.preferences}
        />
      ) : (
        <Annexure1Form
          thesis={workspace.thesis}
          initialProposal={workspace.proposal}
          initialPreferences={workspace.preferences}
          availableFaculty={workspace.availableFaculty}
          availableDomains={workspace.availableDomains}
        />
      )}
    </div>
  );
}
