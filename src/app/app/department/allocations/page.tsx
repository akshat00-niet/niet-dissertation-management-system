import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import {
  getDepartmentAllocationQueue,
  getFacultyAllocationOptions,
} from '@/lib/services/allocation.service';
import { AllocationQueueTable } from '@/components/allocation/AllocationQueueTable';
import type { UserRoleAssignment } from '@/types/database.types';

export const dynamic = 'force-dynamic';

export default async function DepartmentAllocationsPage() {
  const supabase = createClient();
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  const isDhod = session.roles.some((r: UserRoleAssignment) => r.role_id === 'DHOD');
  if (!isDhod) {
    redirect('/app');
  }

  let queue: any[] = [];
  let facultyOptions: any[] = [];
  try {
    queue = await getDepartmentAllocationQueue(supabase, session);
    facultyOptions = await getFacultyAllocationOptions(supabase, session);
  } catch (err) {
    console.error('[DepartmentAllocationsPage] Error fetching queue:', err);
  }

  const pendingCount = queue.filter((q) => q.current_state === 'APPROVED_FOR_ALLOCATION').length;
  const allocatedCount = queue.filter((q) => q.current_state === 'SUPERVISORS_ALLOCATED').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Deputy Head of Department Workbench
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Supervisor Allocation & Capacity
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Assign Primary Guides and Co-Guides for DCEC-approved proposals in accordance with institutional capacity (≤ 3).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-xs text-slate-400 block">Pending Allocation</span>
            <span className="text-xl font-bold text-emerald-400">{pendingCount}</span>
          </div>
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-xs text-slate-400 block">Allocated</span>
            <span className="text-xl font-bold text-blue-400">{allocatedCount}</span>
          </div>
        </div>
      </div>

      {/* Allocation Workbench Table */}
      <AllocationQueueTable queue={queue} facultyOptions={facultyOptions} />
    </div>
  );
}
