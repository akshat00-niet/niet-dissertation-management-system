import Link from 'next/link';

interface LoginPageProps {
  searchParams?: {
    error?: string;
    redirectTo?: string;
  };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const error = searchParams?.error;
  const redirectTo = searchParams?.redirectTo ?? '/app';

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span className="badge badge-primary" style={{ marginBottom: '0.75rem' }}>
            Academic Portal
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>
            NIET Dissertation Management System
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Noida Institute of Engineering and Technology
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger)',
              border: '1px solid #fecaca',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
            }}
          >
            Authentication failed: {error}. Please try again or contact the department coordinator.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', padding: '1rem', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: 'var(--primary)' }}>
            <strong>Institutional Authentication Notice:</strong>
            <p style={{ marginTop: '0.25rem' }}>
              Sign-in is managed via Microsoft Entra ID (Single Sign-On). Use your registered institutional credentials (@niet.co.in).
            </p>
          </div>

          <a
            href={`/auth/login?provider=azure&redirectTo=${encodeURIComponent(redirectTo)}`}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', textAlign: 'center' }}
          >
            Sign In with Microsoft Entra ID (SSO)
          </a>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Protected by PostgreSQL Row Level Security & RBAC. Unauthorized access is strictly logged and monitored.
          </div>
        </div>
      </div>
    </main>
  );
}
