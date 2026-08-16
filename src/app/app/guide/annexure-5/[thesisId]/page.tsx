import React from 'react';
import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getAnnexure5Docket } from '@/lib/services/annexure5.service';
import { createClient } from '@/lib/supabase/server';
import { Annexure5DocketViewer } from '@/components/annexure5/Annexure5DocketViewer';
import type { Annexure5Docket } from '@/types/annexure5.types';

interface GuideAnnexure5DetailPageProps {
  params: Promise<{ thesisId: string }>;
}

export default async function GuideAnnexure5DetailPage({
  params,
}: GuideAnnexure5DetailPageProps) {
  const { thesisId } = await params;
  const session = await requireAuthenticatedUser();
  const supabase = await createClient();

  let docket: Annexure5Docket | null = null;
  let docketError: string | null = null;

  try {
    const res = await getAnnexure5Docket(supabase, session, { thesis_id: thesisId });
    if (res.success && res.data) {
      docket = res.data as Annexure5Docket;
    } else if (res.success && res.thesis) {
      docket = {
        thesis: res.thesis,
        annexure_5: res.annexure_5 || null,
        endorsements: res.endorsements || [],
        permissions: res.permissions || {
          is_student: false,
          is_guide: false,
          is_coguide: false,
          can_submit: false,
          can_endorse: false,
        },
      };
    }
  } catch (err: any) {
    docketError = err.message || 'Failed to fetch Annexure 5 docket.';
  }

  if (docketError || !docket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <Link
            href="/app/guide/annexure-5"
            style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}
          >
            ← Back to Review Queue
          </Link>
          <h1 style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', fontWeight: 700 }}>
            Annexure 5 Docket Evaluation
          </h1>
        </div>
        <div
          style={{
            padding: '2rem',
            borderRadius: 'var(--radius, 12px)',
            backgroundColor: 'var(--destructive-light, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--destructive, #ef4444)',
            color: 'var(--destructive, #dc2626)',
          }}
        >
          {docketError || 'Unable to load dissertation docket.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Breadcrumb Navigation */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Link
            href="/app/guide/annexure-5"
            style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}
          >
            ← Review Queue
          </Link>
          <span style={{ color: 'var(--muted-foreground)' }}>/</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            {docket.thesis.tracking_number}
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
          Dissertation Evaluation &amp; Endorsement Docket
        </h1>
      </div>

      <Annexure5DocketViewer docket={docket} />
    </div>
  );
}
