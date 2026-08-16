'use client';

import React from 'react';
import type { AppSession } from '@/types/database.types';

interface UserMenuProps {
  session: AppSession;
}

export function UserMenu({ session }: UserMenuProps) {
  const { appUser, activeRole, studentProfile, facultyProfile } = session;

  const subtitle = studentProfile
    ? `Roll: ${studentProfile.roll_number}`
    : facultyProfile
      ? `${facultyProfile.designation} (${facultyProfile.employee_code})`
      : appUser.email;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
          {appUser.full_name}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
          {subtitle}
        </div>
      </div>

      {activeRole && (
        <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
          {activeRole}
        </span>
      )}

      <form action="/auth/logout" method="POST">
        <button
          type="submit"
          className="btn btn-secondary"
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}
