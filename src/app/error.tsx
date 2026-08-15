'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error securely
    console.error('Application Runtime Error:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--danger)', marginBottom: '0.75rem' }}>
          Application Error
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          An unexpected error occurred while processing your request.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={() => reset()} className="btn btn-primary">
            Try Again
          </button>
          <a href="/login" className="btn btn-secondary">
            Return to Login
          </a>
        </div>
      </div>
    </div>
  );
}
