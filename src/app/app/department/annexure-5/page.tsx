import React from 'react';
import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { listDepartmentAnnexure5Submissions } from '@/lib/services/annexure5.service';
import { Annexure5StatusBadge } from '@/components/annexure5/Annexure5StatusBadge';
import type { DepartmentAnnexure5Summary } from '@/types/annexure5.types';

interface DepartmentAnnexure5PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DepartmentAnnexure5Page({
  searchParams,
}: DepartmentAnnexure5PageProps) {
  const { status = 'ALL' } = await searchParams;
  const session = await requireAuthenticatedUser();

  const isAuthorized = session.roles.some((r) =>
    ['HOD', 'DHOD', 'DC', 'DCEC_MEMBER', 'ADMIN', 'FACULTY'].includes(r.role_id)
  );

  const deptRole = session.roles.find((r) => r.department_id);
  const departmentId = deptRole?.department_id;

  if (!isAuthorized || !departmentId) {
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
          Departmental cohort oversight requires verified administrative or faculty role assignment within the department.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  let submissions: DepartmentAnnexure5Summary[] = [];
  let errorMessage: string | null = null;

  try {
    const res = await listDepartmentAnnexure5Submissions(supabase, session, {
      department_id: departmentId,
      status: status || 'ALL',
    });

    if (res.success && res.data) {
      submissions = Array.isArray(res.data) ? res.data : [];
    }
  } catch (err: any) {
    errorMessage = err.message || 'Failed to list department final submissions.';
  }

  const filterTabs = [
    { id: 'ALL', label: 'All Submissions' },
    { id: 'SUBMITTED', label: 'Submitted (Awaiting Endorsement)' },
    { id: 'PREPARATION', label: 'Preparation / Revisions' },
    { id: 'ENDORSED', label: 'Fully Endorsed' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
          Department Final Dissertation Submissions (Annexure 5)
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          Cohort oversight of final dissertation packages, Turnitin similarity compliance, and supervisory sign-offs.
        </p>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.75rem',
        }}
      >
        {filterTabs.map((tab) => {
          const isActive = status === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/app/department/annexure-5?status=${tab.id}`}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius, 8px)',
                backgroundColor: isActive ? 'var(--primary, #2563eb)' : 'var(--bg-card)',
                color: isActive ? '#ffffff' : 'inherit',
                border: `1px solid ${isActive ? 'var(--primary, #2563eb)' : 'var(--border)'}`,
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {errorMessage && (
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
          {errorMessage}
        </div>
      )}

      {/* Table Card */}
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
            Cohort Dissertation Submissions ({submissions.length})
          </h3>
        </div>

        {submissions.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            No dissertations found matching the selected filter in this department.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-muted, #f8fafc)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Tracking #</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Candidate</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Guide(s)</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Similarity (Turnitin / AI)</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr
                    key={sub.thesis_id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {sub.tracking_number}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{sub.student_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        Roll: {sub.roll_number}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div>{sub.guide_name || 'Unassigned'}</div>
                      {sub.co_guide_name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                          Co-Guide: {sub.co_guide_name}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {sub.plagiarism_percentage !== null ? (
                        <div>
                          <div>
                            Plagiarism: <strong>{sub.plagiarism_percentage}%</strong>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                            AI: {sub.ai_similarity_percentage}%
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted-foreground)' }}>Pending Submission</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Annexure5StatusBadge
                        status={sub.submission_status || sub.current_state}
                        type={sub.submission_status ? 'submission' : 'state'}
                      />
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <Link
                        href={`/app/guide/annexure-5/${sub.thesis_id}`}
                        style={{
                          display: 'inline-block',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-muted, #f8fafc)',
                          border: '1px solid var(--border)',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          color: 'inherit',
                          textDecoration: 'none',
                        }}
                      >
                        View Docket →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
