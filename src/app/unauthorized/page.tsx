import Link from 'next/link';

interface UnauthorizedPageProps {
  searchParams?: {
    requiredRole?: string;
    allowedRoles?: string;
    reason?: string;
  };
}

export default function UnauthorizedPage({ searchParams }: UnauthorizedPageProps) {
  const requiredRole = searchParams?.requiredRole;
  const allowedRoles = searchParams?.allowedRoles;
  const reason = searchParams?.reason;

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', fontSize: '1.5rem', fontWeight: 'bold' }}>
          ✕
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          Access Denied
        </h1>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          You do not have the required permissions or role assignment to access this academic resource.
        </p>

        <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.8125rem' }}>
          {requiredRole && (
            <div>
              <strong>Required Role:</strong> <span className="badge badge-primary">{requiredRole}</span>
            </div>
          )}
          {allowedRoles && (
            <div>
              <strong>Permitted Roles:</strong> {allowedRoles.split(',').map((r) => (
                <span key={r} className="badge badge-primary" style={{ marginRight: '0.25rem' }}>{r}</span>
              ))}
            </div>
          )}
          {reason === 'cross_department_denied' && (
            <div style={{ color: 'var(--danger)' }}>
              <strong>Tenancy Violation:</strong> You are not authorized to view or manage resources across other academic departments.
            </div>
          )}
          {!requiredRole && !allowedRoles && !reason && (
            <div>
              <strong>Policy:</strong> Access is restricted according to institutional RBAC and Departmental RLS boundaries.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Link href="/app" className="btn btn-primary">
            Return to Application
          </Link>
          <form action="/auth/logout" method="POST">
            <button type="submit" className="btn btn-secondary">
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
