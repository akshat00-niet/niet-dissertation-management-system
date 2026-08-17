'use client';

import React from 'react';
import type {
  RegularityRating,
  TechnicalProficiency,
  RigorRating,
  DefenseRecommendation,
  DepartmentAnnexure6FilterStatus,
} from '@/types/annexure6.types';

interface Annexure6StatusBadgeProps {
  status?:
    | RegularityRating
    | TechnicalProficiency
    | RigorRating
    | DefenseRecommendation
    | DepartmentAnnexure6FilterStatus
    | string
    | null;
  type?: 'state' | 'rating' | 'recommendation' | 'queue';
}

export function Annexure6StatusBadge({
  status,
  type = 'state',
}: Annexure6StatusBadgeProps) {
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
          backgroundColor: 'var(--muted, #1e293b)',
          color: 'var(--muted-foreground, #94a3b8)',
          border: '1px solid var(--border, #334155)',
        }}
      >
        NOT EVALUATED
      </span>
    );
  }

  let bg = 'rgba(148, 163, 184, 0.1)';
  let color = '#94a3b8';
  let border = 'rgba(148, 163, 184, 0.3)';
  let label = status.replace(/_/g, ' ');

  switch (status) {
    // Lifecycle States
    case 'ANNEXURE_6_PENDING':
    case 'PENDING_EVALUATION':
      bg = 'rgba(234, 179, 8, 0.15)';
      color = '#eab308';
      border = 'rgba(234, 179, 8, 0.35)';
      label = type === 'state' ? 'ANNEXURE 6 EVALUATION PENDING' : 'PENDING EVALUATION';
      break;

    case 'DEFENSE_PANEL_CONSTITUTED':
    case 'PENDING_PANEL':
      bg = 'rgba(168, 85, 247, 0.15)';
      color = '#a855f7';
      border = 'rgba(168, 85, 247, 0.35)';
      label = type === 'state' ? 'DEFENSE PANEL CONSTITUTED' : 'PENDING PANEL';
      break;

    case 'VIVA_DEFENSE_SCHEDULED':
    case 'SCHEDULED':
      bg = 'rgba(34, 197, 94, 0.15)';
      color = '#22c55e';
      border = 'rgba(34, 197, 94, 0.35)';
      label = type === 'state' ? 'ORAL VIVA DEFENSE SCHEDULED' : 'DEFENSE SCHEDULED';
      break;

    // Defense Recommendations
    case 'RECOMMENDED':
      bg = 'rgba(34, 197, 94, 0.15)';
      color = '#22c55e';
      border = 'rgba(34, 197, 94, 0.35)';
      label = 'RECOMMENDED FOR DEFENSE';
      break;

    case 'REVISIONS_REQUIRED':
      bg = 'rgba(249, 115, 22, 0.15)';
      color = '#f97316';
      border = 'rgba(249, 115, 22, 0.35)';
      label = 'REVISIONS REQUIRED';
      break;

    case 'NOT_RECOMMENDED':
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#ef4444';
      border = 'rgba(239, 68, 68, 0.35)';
      label = 'NOT RECOMMENDED';
      break;

    // Dimensional Ratings
    case 'EXEMPLARY':
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#10b981';
      border = 'rgba(16, 185, 129, 0.35)';
      label = 'EXEMPLARY';
      break;

    case 'PROFICIENT':
      bg = 'rgba(59, 130, 246, 0.15)';
      color = '#3b82f6';
      border = 'rgba(59, 130, 246, 0.35)';
      label = 'PROFICIENT';
      break;

    case 'DEVELOPING':
      bg = 'rgba(234, 179, 8, 0.15)';
      color = '#eab308';
      border = 'rgba(234, 179, 8, 0.35)';
      label = 'DEVELOPING';
      break;

    case 'UNSATISFACTORY':
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#ef4444';
      border = 'rgba(239, 68, 68, 0.35)';
      label = 'UNSATISFACTORY';
      break;

    case 'ALL':
      bg = 'rgba(148, 163, 184, 0.1)';
      color = '#f8fafc';
      label = 'ALL CANDIDATES';
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
        letterSpacing: '0.025em',
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          width: '0.4rem',
          height: '0.4rem',
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      {label}
    </span>
  );
}
