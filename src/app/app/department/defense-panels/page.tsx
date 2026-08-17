import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAppSession } from '@/lib/auth/session';
import { listDepartmentAnnexure6QueueAction } from '@/app/actions/annexure6.actions';
import { getFacultyAllocationOptions } from '@/lib/services/allocation.service';
import { DefensePanelQueueTable } from '@/components/annexure6/DefensePanelQueueTable';
import type { UserRoleAssignment } from '@/types/database.types';
import type { DepartmentAnnexure6QueueItem } from '@/types/annexure6.types';
import type { FacultyAllocationOption } from '@/types/allocation.types';

export const dynamic = 'force-dynamic';

export default async function DepartmentDefensePanelsPage() {
  const supabase = createClient();
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  const isAuthorized = session.roles.some((r: UserRoleAssignment) =>
    ['HOD', 'DHOD', 'DC', 'DCEC_CHAIR', 'ADMIN'].includes(r.role_id)
  );
  if (!isAuthorized) {
    redirect('/app');
  }

  const deptRole = session.roles.find((r: UserRoleAssignment) => r.department_id);
  const departmentId = deptRole?.department_id;

  let queueItems: DepartmentAnnexure6QueueItem[] = [];
  let facultyOptions: FacultyAllocationOption[] = [];
  let errorMessage: string | null = null;

  if (departmentId) {
    try {
      const [queueRes, facultyList] = await Promise.all([
        listDepartmentAnnexure6QueueAction({ department_id: departmentId, status: 'ALL' }),
        getFacultyAllocationOptions(supabase, session),
      ]);

      if (queueRes.success && queueRes.data) {
        queueItems = (queueRes.data.data as DepartmentAnnexure6QueueItem[]) || [];
      } else {
        errorMessage = queueRes.error || 'Failed to load department defense panel queue.';
      }

      facultyOptions = facultyList || [];
    } catch (err: any) {
      errorMessage = err.message || 'An unexpected error occurred while loading panel queue.';
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
            Department Academic Authority
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
            Oral Defense Panel Constitution
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Appoint 2-member expert examination panels (1 designated Chair) and schedule oral viva defense sessions.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Interactive Queue Table */}
      <DefensePanelQueueTable queue={queueItems} facultyOptions={facultyOptions} />
    </div>
  );
}
