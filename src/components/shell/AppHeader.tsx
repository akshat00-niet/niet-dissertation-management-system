'use client';

import React from 'react';
import Link from 'next/link';
import type { AppSession } from '@/types/database.types';
import { UserMenu } from '@/components/shell/UserMenu';

interface AppHeaderProps {
  session: AppSession;
}

export function AppHeader({ session }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link
          href="/app"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.05em',
            }}
          >
            N
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-main)', lineHeight: '1.2' }}>
              NIET Dissertation Management System
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              Noida Institute of Engineering &amp; Technology
            </div>
          </div>
        </Link>
      </div>

      <UserMenu session={session} />
    </header>
  );
}
