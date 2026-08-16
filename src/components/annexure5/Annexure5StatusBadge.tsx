'use client';

import React from 'react';
import type {
  Annexure5SubmissionStatus,
  DepartmentAnnexure5FilterStatus,
} from '@/types/annexure5.types';

interface Annexure5StatusBadgeProps {
  status?: Annexure5SubmissionStatus | DepartmentAnnexure5FilterStatus | string | null;
  type?: 'submission' | 'filter' | 'state';
}

export function Annexure5StatusBadge({
  status,
  type = 'submission',
}: Annexure5StatusBadgeProps) {
  if (!status) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.2rem 0.55rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: 'var(--muted)',
          color: 'var(--muted-foreground)',
          border: '1px solid var(--border)',
        }}
      >
        NOT SUBMITTED
      </span>
    );
  }

  // Configuration map for visual badges
  let bg = 'var(--muted)';
  let color = 'var(--muted-foreground)';
  let border = 'var(--border)';
  let label = status.replace(/_/g, ' ');

  switch (status) {
    case 'SUBMITTED':
    case 'ANNEXURE_5_SUBMITTED':
      bg = 'var(--warning-light, rgba(234, 179, 8, 0.15))';
      color = 'var(--warning-dark, #b45309)';
      border = 'rgba(234, 179, 8, 0.3)';
      label = type === 'state' ? 'SUBMITTED (AWAITING ENDORSEMENT)' : 'SUBMITTED';
      break;

    case 'REVISION_REQUIRED':
      bg = 'var(--destructive-light, rgba(239, 68, 68, 0.15))';
      color = 'var(--destructive, #dc2626)';
      border = 'rgba(239, 68, 68, 0.3)';
      label = 'REVISION REQUIRED';
      break;

    case 'SUPERVISOR_ENDORSED':
    case 'ANNEXURE_5_SUPERVISOR_ENDORSED':
    case 'ENDORSED':
      bg = 'var(--success-light, rgba(34, 197, 94, 0.15))';
      color = 'var(--success, #16a34a)';
      border = 'rgba(34, 197, 94, 0.3)';
      label = 'SUPERVISOR ENDORSED';
      break;

    case 'ANNEXURE_5_PREPARATION':
    case 'PREPARATION':
      bg = 'var(--primary-light, rgba(59, 130, 246, 0.15))';
      color = 'var(--primary, #2563eb)';
      border = 'rgba(59, 130, 246, 0.3)';
      label = 'PREPARATION IN PROGRESS';
      break;

    case 'ANNEXURE_6_PENDING':
      bg = 'var(--accent-light, rgba(168, 85, 247, 0.15))';
      color = 'var(--accent-dark, #7e22ce)';
      border = 'rgba(168, 85, 247, 0.3)';
      label = 'ANNEXURE 6 EVALUATION PENDING';
      break;

    case 'ALL':
      bg = 'var(--muted)';
      color = 'var(--foreground)';
      label = 'ALL SUBMISSIONS';
      break;

    default:
      label = status.replace(/_/g, ' ');
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        textTransform: 'uppercase',
        letterSpacing: '0.025em',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      {label}
    </span>
  );
}
