import React from 'react';
import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Annexure5StatusBadge } from '@/components/annexure5/Annexure5StatusBadge';

export default async function GuideAnnexure5ReviewQueuePage() {
  const session = await requireAuthenticatedUser();

  const isSupervisor = session.roles.some((r) =>
    ['GUIDE', 'CO_GUIDE', 'FACULTY', 'HOD', 'ADMIN'].includes(r.role_id)
  );

  if (!isSupervisor) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: 'var(--radius, 12px)',
          border: '1px solid var(--border, #e2e8f0)',
          textAlign: 'center',
          padding: '3rem 1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--destructive)' }}>
          Unauthorized Access
        </h2>
        <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
          Only assigned Supervisors and Faculty can access the Annexure 5 review workbench.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  // Fetch supervised theses that are in final submission stage
  const { data: theses } = await supabase
    .from('theses')
    .select(`
      id,
      tracking_number,
      current_state,
      current_stage,
      student_id,
      guide_id,
      co_guide_id,
      users!theses_student_id_fkey (id, full_name, email),
      student_profiles!student_profiles_user_id_fkey (roll_number),
      thesis_titles (final_approved_title),
      annexure_5_submissions (
        id,
        plagiarism_percentage,
        ai_similarity_percentage,
        status,
        submitted_at
      ),
      supervisor_endorsements (
        id,
        faculty_id,
        supervisor_role,
        is_endorsed,
        endorsed_at
      )
    `)
    .or(`guide_id.eq.${session.appUser.id},co_guide_id.eq.${session.appUser.id}`)
    .order('tracking_number', { ascending: true });

  const finalTheses = (theses || []).filter((t: any) =>
    [
      'ANNEXURE_5_PREPARATION',
      'ANNEXURE_5_SUBMITTED',
      'ANNEXURE_5_SUPERVISOR_ENDORSED',
      'ANNEXURE_6_PENDING',
    ].includes(t.current_state) || t.annexure_5_submissions?.length > 0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
          Annexure 5 Supervisory Review &amp; Endorsement Queue
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          Review final manuscripts, verify Turnitin/DrillBit similarity compliance, and sign off for oral defense.
        </p>
      </div>

      {/* Roster Table Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: 'var(--radius, 12px)',
          border: '1px solid var(--border, #e2e8f0)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
            Supervised Candidates ({finalTheses.length})
          </h3>
        </div>

        {finalTheses.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            No supervised candidates currently pending Annexure 5 review.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-muted, #f8fafc)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Tracking #</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Candidate</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Turnitin / AI %</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {finalTheses.map((t: any) => {
                  const sub = t.annexure_5_submissions?.[0] || null;
                  const isGuide = t.guide_id === session.appUser.id;
                  const roleLabel = isGuide ? 'Primary Guide' : 'Co-Guide';

                  const myEndorsement = (t.supervisor_endorsements || []).find(
                    (e: any) => e.faculty_id === session.appUser.id
                  );

                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {t.tracking_number}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{t.users?.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                          Roll: {t.student_profiles?.roll_number || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: isGuide ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                            color: isGuide ? 'var(--primary, #2563eb)' : 'var(--accent-dark, #7e22ce)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {roleLabel}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {sub ? (
                          <div>
                            <div>
                              Plagiarism: <strong>{sub.plagiarism_percentage}%</strong>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                              AI: {sub.ai_similarity_percentage}%
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)' }}>Awaiting Submission</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <Annexure5StatusBadge
                          status={sub?.status || t.current_state}
                          type={sub?.status ? 'submission' : 'state'}
                        />
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <Link
                          href={`/app/guide/annexure-5/${t.id}`}
                          style={{
                            display: 'inline-block',
                            padding: '0.45rem 0.9rem',
                            borderRadius: '6px',
                            backgroundColor:
                              sub?.status === 'SUBMITTED' && !myEndorsement
                                ? 'var(--primary, #2563eb)'
                                : 'var(--bg-muted, #f8fafc)',
                            color:
                              sub?.status === 'SUBMITTED' && !myEndorsement
                                ? '#ffffff'
                                : 'inherit',
                            border: '1px solid var(--border)',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                          }}
                        >
                          {sub?.status === 'SUBMITTED' && !myEndorsement
                            ? 'Review & Endorse →'
                            : 'View Docket'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
