import { requireAuthenticatedUser } from '@/lib/auth/guards';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await requireAuthenticatedUser();
  const { appUser, roles, activeRole, studentProfile, facultyProfile } = session;

  const isStudent = roles.some((r) => r.role_id === 'STUDENT');
  const isGuide = roles.some((r) => r.role_id === 'GUIDE' || r.role_id === 'CO_GUIDE');
  const isDeptAuthority = roles.some((r) => ['DC', 'DHOD', 'HOD', 'DCEC_MEMBER', 'DCEC_CHAIR'].includes(r.role_id));
  const isAdmin = roles.some((r) => r.role_id === 'ADMIN');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          borderLeft: '4px solid var(--primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Academic Session Workspace
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
            Welcome, {appUser.full_name}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            NIET M.Tech Dissertation Management System &bull; Active Context: <strong>{activeRole ?? 'Authenticated User'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-success">Session Active</span>
          <span className="badge badge-primary">{appUser.role_category}</span>
          {studentProfile && (
            <span className="badge badge-secondary">Semester {studentProfile.current_semester}</span>
          )}
          {facultyProfile && (
            <span className="badge badge-secondary">Load: {facultyProfile.active_guide_load}/3</span>
          )}
        </div>
      </div>

      {/* Role-Specific Workspace Summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Identity & Tenancy Context */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Academic Profile Context
          </h2>

          {studentProfile && (
            <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Roll Number / Enrollment</dt>
                <dd style={{ fontWeight: 600 }}>{studentProfile.roll_number} ({studentProfile.enrollment_number})</dd>
              </div>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Batch &amp; Semester</dt>
                <dd>{studentProfile.batch_name} &bull; Semester {studentProfile.current_semester}</dd>
              </div>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Eligibility Status</dt>
                <dd>
                  <span className={`badge ${studentProfile.is_eligible ? 'badge-success' : 'badge-primary'}`}>
                    {studentProfile.is_eligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                  </span>
                </dd>
              </div>
            </dl>
          )}

          {facultyProfile && (
            <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Designation &amp; Employee Code</dt>
                <dd style={{ fontWeight: 600 }}>{facultyProfile.designation} ({facultyProfile.employee_code})</dd>
              </div>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Active Supervision Loads (Cap: 3)</dt>
                <dd>Guide: <strong>{facultyProfile.active_guide_load}/3</strong> &bull; Co-Guide: <strong>{facultyProfile.active_coguide_load}/3</strong></dd>
              </div>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Supervision Availability</dt>
                <dd>
                  <span className={`badge ${facultyProfile.is_available ? 'badge-success' : 'badge-primary'}`}>
                    {facultyProfile.is_available ? 'AVAILABLE' : 'UNAVAILABLE'}
                  </span>
                </dd>
              </div>
            </dl>
          )}

          {!studentProfile && !facultyProfile && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Administrative account with platform-level configuration access.
            </p>
          )}
        </div>

        {/* Granted Roles */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Granted RBAC Roles ({roles.length})
          </h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {roles.map((r) => (
              <li
                key={r.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.8125rem',
                }}
              >
                <span style={{ fontWeight: 600 }}>{r.role_id}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {r.department_id ? `Dept: ${r.department_id.slice(0, 8)}...` : 'Global Scope'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          Workspace Modules &amp; Actions
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {isStudent && (
            <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Dissertation Tracking</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem 0' }}>
                Manage title proposals, logbook entries, and submission dockets.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8125rem' }}>
                <Link href="/app/student/dissertation">&rarr; My Dissertation Overview</Link>
                <Link href="/app/student/annexure-1">&rarr; Submit Annexure 1 Proposal</Link>
                <Link href="/app/student/logbook">&rarr; Digital Logbook (Annexure 4)</Link>
              </div>
            </div>
          )}

          {isGuide && (
            <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Supervision Roster</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem 0' }}>
                Review candidate submissions, verify logbooks, and submit evaluations.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8125rem' }}>
                <Link href="/app/guide/theses">&rarr; Supervised Candidates</Link>
                <Link href="/app/guide/logbook">&rarr; Pending Logbook Verifications</Link>
                <Link href="/app/guide/annexure-6">&rarr; Annexure 6 Evaluations</Link>
              </div>
            </div>
          )}

          {isDeptAuthority && (
            <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Department Governance</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem 0' }}>
                DCEC screening queue, supervisor allocations, and cohort progress.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8125rem' }}>
                <Link href="/app/department/screening">&rarr; DCEC Screening Queue</Link>
                <Link href="/app/department/allocations">&rarr; Allocation Workbench</Link>
                <Link href="/app/department/compliance">&rarr; Department Overview</Link>
              </div>
            </div>
          )}

          {isAdmin && (
            <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Platform Administration</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem 0' }}>
                Manage user roster, departments, dynamic rubric templates, and audit logs.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8125rem' }}>
                <Link href="/app/admin/users">&rarr; User Directory &amp; Roles</Link>
                <Link href="/app/admin/rubrics">&rarr; Rubric Template Builder</Link>
                <Link href="/app/admin/audit">&rarr; System Audit Log</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
