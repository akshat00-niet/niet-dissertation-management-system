'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSafePersonaList, type PersonaGroup, type SafePersonaDisplay } from '@/lib/auth/personas';

interface DevPersonaSelectorProps {
  redirectTo?: string;
}

const GROUPS: PersonaGroup[] = [
  'Students',
  'Faculty / Supervisors',
  'Department Authorities',
  'Defense / Evaluation',
  'Administration',
];

export function DevPersonaSelector({ redirectTo = '/app' }: DevPersonaSelectorProps) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<string>('STUDENT_CSE');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const personas = getSafePersonaList();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKey || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personaKey: selectedKey,
          redirectTo,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setErrorMsg(result.error || 'Authentication failed. Please verify local Supabase is running.');
        setLoading(false);
        return;
      }

      // Success: Navigate to target internal application path
      router.push(result.redirectTo || '/app');
      router.refresh();
    } catch {
      setErrorMsg('Network error connecting to local authentication server.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        marginTop: '1.5rem',
        padding: '1.25rem',
        backgroundColor: '#f8fafc',
        border: '2px dashed #cbd5e1',
        borderRadius: 'var(--radius)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.6875rem',
              fontWeight: 700,
              backgroundColor: '#e0e7ff',
              color: '#3730a3',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Development Only
          </span>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
            Instant Persona Authentication
          </h3>
        </div>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
        Select a pre-provisioned local development persona to sign in via real GoTrue Auth & PostgreSQL RLS.
      </p>

      {errorMsg && (
        <div
          style={{
            padding: '0.625rem 0.75rem',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius)',
            fontSize: '0.75rem',
            marginBottom: '0.875rem',
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <label
            htmlFor="persona-select"
            style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}
          >
            Choose Persona:
          </label>
          <select
            id="persona-select"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8125rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              backgroundColor: '#ffffff',
              color: 'var(--text-main)',
              outline: 'none',
            }}
          >
            {GROUPS.map((group) => {
              const groupPersonas = personas.filter((p) => p.group === group);
              if (groupPersonas.length === 0) return null;
              return (
                <optgroup key={group} label={group}>
                  {groupPersonas.map((p: SafePersonaDisplay) => (
                    <option key={p.key} value={p.key}>
                      {p.fullName} ({p.primaryRole} &bull; {p.departmentCode})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* Selected Persona Summary Card */}
        {(() => {
          const selected = personas.find((p) => p.key === selectedKey);
          if (!selected) return null;
          return (
            <div
              style={{
                padding: '0.625rem 0.75rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selected.fullName}</span>
                <span className="badge badge-primary" style={{ fontSize: '0.625rem' }}>
                  {selected.primaryRole} &bull; {selected.departmentCode}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>{selected.description}</div>
            </div>
          );
        })()}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '0.5rem 1rem',
            fontSize: '0.8125rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Authenticating Persona...' : `Sign In as ${personas.find((p) => p.key === selectedKey)?.fullName.split(' ')[0] || 'Persona'}`}
        </button>
      </form>
    </div>
  );
}
