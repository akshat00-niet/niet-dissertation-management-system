'use client';

import React, { useState } from 'react';
import type { Annexure5Docket } from '@/types/annexure5.types';
import { Annexure5StatusBadge } from '@/components/annexure5/Annexure5StatusBadge';
import { SupervisorEndorsementModal } from '@/components/annexure5/SupervisorEndorsementModal';

interface Annexure5DocketViewerProps {
  docket: Annexure5Docket;
  onRefresh?: () => void;
}

export function Annexure5DocketViewer({
  docket,
  onRefresh,
}: Annexure5DocketViewerProps) {
  const [isEndorsementModalOpen, setIsEndorsementModalOpen] = useState(false);

  const { thesis, annexure_5, endorsements, permissions } = docket;

  const hasSubmission = !!annexure_5;
  const guideEndorsement = endorsements?.find((e) => e.supervisor_role === 'GUIDE');
  const coGuideEndorsement = endorsements?.find((e) => e.supervisor_role === 'CO_GUIDE');

  const supervisorRole = permissions.is_guide ? 'GUIDE' : permissions.is_coguide ? 'CO_GUIDE' : 'GUIDE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header Overview Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: 'var(--radius, 12px)',
          border: '1px solid var(--border, #e2e8f0)',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
              {thesis.tracking_number}
            </span>
            <Annexure5StatusBadge status={thesis.current_state} type="state" />
          </div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 700 }}>
            {thesis.approved_title || 'Final Dissertation Submission (Annexure 5)'}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            <div>
              Candidate: <strong>{thesis.student.name}</strong> ({thesis.student.roll_number})
            </div>
            <div>
              Guide: <strong>{thesis.guide ? thesis.guide.name : 'Unassigned'}</strong>
            </div>
            {thesis.co_guide && (
              <div>
                Co-Guide: <strong>{thesis.co_guide.name}</strong>
              </div>
            )}
          </div>
        </div>

        {permissions.can_endorse && hasSubmission && annexure_5.status === 'SUBMITTED' && (
          <button
            type="button"
            onClick={() => setIsEndorsementModalOpen(true)}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius, 8px)',
              backgroundColor: 'var(--primary, #2563eb)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            ✓ Evaluate & Endorse
          </button>
        )}
      </div>

      {/* 2. Submission Details Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: 'var(--radius, 12px)',
          border: '1px solid var(--border, #e2e8f0)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
            Final Dissertation Package & Similarity Dossier
          </h3>
          {hasSubmission && <Annexure5StatusBadge status={annexure_5.status} type="submission" />}
        </div>

        {hasSubmission ? (
          <div>
            {/* Metric Grids */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              {/* Plagiarism Box */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius, 8px)',
                  backgroundColor: annexure_5.plagiarism_percentage < 10.0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${annexure_5.plagiarism_percentage < 10.0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>
                  Plagiarism Similarity (Turnitin/DrillBit)
                </div>
                <div
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: annexure_5.plagiarism_percentage < 10.0 ? 'var(--success, #16a34a)' : 'var(--destructive, #dc2626)',
                  }}
                >
                  {annexure_5.plagiarism_percentage}%
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--muted-foreground)' }}>
                  Threshold: &lt; 10.0% ({annexure_5.plagiarism_percentage < 10.0 ? 'Compliant ✓' : 'Non-Compliant ⚠'})
                </div>
              </div>

              {/* AI Similarity Box */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius, 8px)',
                  backgroundColor: annexure_5.ai_similarity_percentage === 0.0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${annexure_5.ai_similarity_percentage === 0.0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>
                  AI Generated Content Similarity
                </div>
                <div
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: annexure_5.ai_similarity_percentage === 0.0 ? 'var(--success, #16a34a)' : 'var(--destructive, #dc2626)',
                  }}
                >
                  {annexure_5.ai_similarity_percentage}%
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--muted-foreground)' }}>
                  Threshold: Strictly 0.0% ({annexure_5.ai_similarity_percentage === 0.0 ? 'Zero AI Generated Content ✓' : 'Non-Compliant ⚠'})
                </div>
              </div>

              {/* Repository Box */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius, 8px)',
                  backgroundColor: 'var(--bg-muted, #f8fafc)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>
                  Source Code Repository
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, wordBreak: 'break-all' }}>
                  {annexure_5.repository_url ? (
                    <a
                      href={annexure_5.repository_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary, #2563eb)', textDecoration: 'none' }}
                    >
                      {annexure_5.repository_url} ↗
                    </a>
                  ) : (
                    <span style={{ color: 'var(--muted-foreground)' }}>Not Provided</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--muted-foreground)' }}>
                  Submitted: {new Date(annexure_5.submitted_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Document Evidence Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>
                Submitted Documents & Certifications
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius, 8px)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-muted, #f8fafc)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>📄</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Dissertation Manuscript</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      {annexure_5.manuscript_document?.original_filename || 'PDF Manuscript attached'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius, 8px)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-muted, #f8fafc)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>📑</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Approved Synopsis</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      {annexure_5.synopsis_document?.original_filename || 'PDF Synopsis attached'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius, 8px)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-muted, #f8fafc)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Turnitin Similarity Certificate</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      {annexure_5.similarity_certificate_document?.original_filename || 'PDF Certificate attached'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--muted-foreground)',
              backgroundColor: 'var(--bg-muted, #f8fafc)',
              borderRadius: 'var(--radius, 8px)',
              border: '1px dashed var(--border)',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              Final dissertation submission package has not been submitted yet.
            </p>
          </div>
        )}
      </div>

      {/* 3. Dual Supervisor Endorsement Progress Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: 'var(--radius, 12px)',
          border: '1px solid var(--border, #e2e8f0)',
          padding: '1.5rem',
        }}
      >
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>
          Supervisory Endorsement Status (Dual Review Governance)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {/* Primary Guide Endorsement */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius, 8px)',
              border: `1px solid ${guideEndorsement ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)'}`,
              backgroundColor: guideEndorsement ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-muted, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Primary Guide Endorsement</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  backgroundColor: guideEndorsement ? 'var(--success-light, rgba(34, 197, 94, 0.15))' : 'var(--muted)',
                  color: guideEndorsement ? 'var(--success, #16a34a)' : 'var(--muted-foreground)',
                }}
              >
                {guideEndorsement ? 'ENDORSED ✓' : 'PENDING'}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>
              Supervisor: <strong>{thesis.guide?.name || 'Unassigned'}</strong>
            </div>
            {guideEndorsement ? (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                <div>Endorsed at: {new Date(guideEndorsement.endorsed_at).toLocaleString()}</div>
                {guideEndorsement.remarks && (
                  <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                    Remarks: &ldquo;{guideEndorsement.remarks}&rdquo;
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                Awaiting Guide evaluation of manuscript and Turnitin report.
              </div>
            )}
          </div>

          {/* Co-Guide Endorsement */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius, 8px)',
              border: `1px solid ${
                !thesis.co_guide
                  ? 'var(--border)'
                  : coGuideEndorsement
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'var(--border)'
              }`,
              backgroundColor: !thesis.co_guide
                ? 'var(--bg-muted, #f8fafc)'
                : coGuideEndorsement
                ? 'rgba(34, 197, 94, 0.05)'
                : 'var(--bg-muted, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Co-Guide Endorsement</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  backgroundColor: !thesis.co_guide
                    ? 'var(--muted)'
                    : coGuideEndorsement
                    ? 'var(--success-light, rgba(34, 197, 94, 0.15))'
                    : 'var(--muted)',
                  color: !thesis.co_guide
                    ? 'var(--muted-foreground)'
                    : coGuideEndorsement
                    ? 'var(--success, #16a34a)'
                    : 'var(--muted-foreground)',
                }}
              >
                {!thesis.co_guide ? 'NOT ALLOCATED' : coGuideEndorsement ? 'ENDORSED ✓' : 'PENDING'}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>
              Co-Supervisor: <strong>{thesis.co_guide?.name || 'None Assigned'}</strong>
            </div>
            {thesis.co_guide && coGuideEndorsement ? (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                <div>Endorsed at: {new Date(coGuideEndorsement.endorsed_at).toLocaleString()}</div>
                {coGuideEndorsement.remarks && (
                  <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                    Remarks: &ldquo;{coGuideEndorsement.remarks}&rdquo;
                  </div>
                )}
              </div>
            ) : thesis.co_guide ? (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                Awaiting Co-Guide evaluation of manuscript and Turnitin report.
              </div>
            ) : (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                Single-supervisor allocation; Primary Guide endorsement satisfies requirements.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Endorsement Modal */}
      {isEndorsementModalOpen && (
        <SupervisorEndorsementModal
          isOpen={isEndorsementModalOpen}
          onClose={() => setIsEndorsementModalOpen(false)}
          thesisId={thesis.id}
          trackingNumber={thesis.tracking_number}
          studentName={thesis.student.name}
          supervisorRole={supervisorRole}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
