'use client';

import React from 'react';
import type { AppSession } from '@/types/database.types';
import { getAuthorizedNavigation } from '@/lib/navigation/routes.config';
import { NavItem } from '@/components/shell/NavItem';

interface AppSidebarProps {
  session: AppSession;
}

export function AppSidebar({ session }: AppSidebarProps) {
  const sections = getAuthorizedNavigation(session.roles);

  return (
    <aside className="app-sidebar">
      {/* Context Badge Box */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: '#fafaf9',
        }}
      >
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Active Tenancy Scope
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
            {session.activeRole ?? 'AUTHENTICATED'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>
            {session.activeDepartmentId ? `Dept: ${session.activeDepartmentId.slice(0, 8)}...` : 'Global Academic Scope'}
          </span>
        </div>
      </div>

      {/* Navigation Links Grouped by Section */}
      <nav
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          overflowY: 'auto',
        }}
      >
        {sections.map((section) => (
          <div key={section.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0 0.75rem 0.25rem 0.75rem',
              }}
            >
              {section.title}
            </div>
            {section.items.map((item) => (
              <NavItem key={item.id} item={item} />
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom Footer Note */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--border)',
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
          backgroundColor: '#fafaf9',
        }}
      >
        RLS &amp; RBAC Enforced
      </div>
    </aside>
  );
}
