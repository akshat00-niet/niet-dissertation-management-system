'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItemConfig } from '@/lib/navigation/routes.config';

interface NavItemProps {
  item: NavItemConfig;
}

export function NavItem({ item }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href));

  return (
    <Link
      href={item.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0.75rem',
        fontSize: '0.8125rem',
        fontWeight: isActive ? 600 : 400,
        color: isActive ? 'var(--primary)' : 'var(--text-main)',
        backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
        borderRadius: 'var(--radius)',
        textDecoration: 'none',
        transition: 'all 0.15s ease',
        borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
      {item.badge && (
        <span
          className="badge"
          style={{
            fontSize: '0.625rem',
            padding: '0.1rem 0.35rem',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
