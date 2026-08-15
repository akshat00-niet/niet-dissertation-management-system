import { requireAuthenticatedUser } from '@/lib/auth/guards';

export default async function ApplicationShellPage() {
  const session = await requireAuthenticatedUser();
  const { authUser, appUser, roles, activeRole, activeDepartmentId, studentProfile, facultyProfile } = session;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Institutional Top Navbar */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border)',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontWeight: '700', fontSize: '1.125rem', color: 'var(--primary)' }}>
            NIET Dissertation Management System
          </div>
          <span className="badge badge-primary">Phase 5C Application Shell</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>{appUser.full_name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appUser.email}</div>
          </div>
          <form action="/auth/logout" method="POST">
            <button type="submit" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem' }}>
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Verification Status Banner */}
        <div className="card" style={{ borderLeft: '4px solid var(--success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Authenticated Application Foundation
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Session established via Supabase Server Client & PostgreSQL RLS Gateway.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-success">Auth: Active</span>
            <span className="badge badge-primary">RLS: Enforced</span>
            <span className="badge badge-primary">Identity: Resolved</span>
          </div>
        </div>

        {/* Identity & Session Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* User Account Details */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              User Identity (public.users)
            </h3>
            <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Full Name</dt>
                <dd style={{ fontWeight: '500' }}>{appUser.full_name}</dd>
              </div>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Email</dt>
                <dd style={{ fontWeight: '500' }}>{appUser.email}</dd>
              </div>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>User UUID (auth.uid() = public.users.id)</dt>
                <dd style={{ fontFamily: 'monospace', fontSize: '0.8125rem', backgroundColor: 'var(--bg-main)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                  {appUser.id}
                </dd>
              </div>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Role Category</dt>
                <dd><span className="badge badge-primary">{appUser.role_category}</span></dd>
              </div>
              <div>
                <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Account Status</dt>
                <dd><span className="badge badge-success">{appUser.is_active ? 'ACTIVE' : 'INACTIVE'}</span></dd>
              </div>
            </dl>
          </div>

          {/* Active Roles & Context */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              RBAC Role Assignments ({roles.length})
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Active Session Role:
              </div>
              <span className="badge badge-primary" style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}>
                {activeRole ?? 'NONE'}
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              All Granted Roles:
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {roles.map((r) => (
                <li
                  key={r.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <span style={{ fontWeight: '600' }}>{r.role_id}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {r.department_id ? `Dept: ${r.department_id.slice(0, 8)}...` : 'Global'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Academic Profile Details */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Academic Profile Context
            </h3>
            {studentProfile && (
              <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div>
                  <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Student Roll Number</dt>
                  <dd style={{ fontWeight: '600' }}>{studentProfile.roll_number}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Current Semester</dt>
                  <dd>Semester {studentProfile.current_semester}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Academic Standing</dt>
                  <dd><span className="badge badge-success">{studentProfile.academic_standing}</span></dd>
                </div>
              </dl>
            )}

            {facultyProfile && (
              <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div>
                  <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Employee Code</dt>
                  <dd style={{ fontWeight: '600' }}>{facultyProfile.employee_code}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Designation</dt>
                  <dd>{facultyProfile.designation}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Primary Supervision Load</dt>
                  <dd>{facultyProfile.current_primary_load} / {facultyProfile.max_primary_supervision_load}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>DCEC Screening Eligible</dt>
                  <dd><span className={`badge ${facultyProfile.is_dcec_eligible ? 'badge-success' : 'badge-primary'}`}>{facultyProfile.is_dcec_eligible ? 'YES' : 'NO'}</span></dd>
                </div>
              </dl>
            )}

            {!studentProfile && !facultyProfile && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Administrative or system account with no candidate or supervisor profile.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '1rem 2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: '#ffffff' }}>
        Noida Institute of Engineering and Technology &bull; M.Tech Dissertation Management System &bull; Phase 5C
      </footer>
    </div>
  );
}
