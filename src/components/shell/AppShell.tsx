'use client';

import React from 'react';
import type { AppSession } from '@/types/database.types';
import { AppHeader } from '@/components/shell/AppHeader';
import { AppSidebar } from '@/components/shell/AppSidebar';

interface AppShellProps {
  session: AppSession;
  children: React.ReactNode;
}

export function AppShell({ session, children }: AppShellProps) {
  return (
    <div className="app-layout">
      <AppHeader session={session} />
      <div className="app-container">
        <AppSidebar session={session} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
