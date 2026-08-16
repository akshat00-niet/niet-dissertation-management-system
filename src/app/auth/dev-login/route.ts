import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPersonaByKey } from '@/lib/auth/personas';

/**
 * Validates whether a redirect path is a safe internal application route.
 * Strictly prevents open redirects (e.g., //evil.com, https://..., javascript:...).
 */
function getSafeRedirectUrl(redirectTo: string | null | undefined): string {
  if (!redirectTo) {
    return '/app';
  }

  const trimmed = redirectTo.trim();

  // Reject URLs with protocols, leading double slashes, or non-internal paths
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('javascript:') ||
    trimmed.includes('\\') ||
    !trimmed.startsWith('/app')
  ) {
    return '/app';
  }

  return trimmed;
}

/**
 * Development-Only Authentication Route Handler.
 *
 * Authenticates predefined local development personas using real Supabase GoTrue
 * and sets secure HTTP-only session cookies.
 *
 * CRITICAL SECURITY INVARIANTS:
 * - Disabled completely in production builds and runtimes.
 * - Accepts only fixed, allowlisted persona keys (never arbitrary emails or UUIDs).
 * - Reads DEV_AUTH_PASSWORD strictly from server-side environment.
 * - Protects against open-redirect vulnerabilities.
 */
export async function POST(request: Request) {
  // 1. Strict Production Guard
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }

  const origin = new URL(request.url).origin;
  let personaKey: string | null = null;
  let rawRedirectTo: string | null = null;
  const contentType = request.headers.get('content-type') || '';
  const isJsonRequest = contentType.includes('application/json');

  // 2. Parse incoming payload safely
  try {
    if (isJsonRequest) {
      const body = await request.json();
      personaKey = body.personaKey;
      rawRedirectTo = body.redirectTo;
    } else {
      const formData = await request.formData();
      personaKey = formData.get('personaKey')?.toString() || null;
      rawRedirectTo = formData.get('redirectTo')?.toString() || null;
    }
  } catch {
    if (isJsonRequest) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }
    return NextResponse.redirect(`${origin}/login?error=invalid_payload`, { status: 303 });
  }

  if (!personaKey) {
    if (isJsonRequest) {
      return NextResponse.json({ error: 'Persona key is required' }, { status: 400 });
    }
    return NextResponse.redirect(`${origin}/login?error=missing_persona_key`, { status: 303 });
  }

  // 3. Resolve persona against fixed allowlist
  const persona = getPersonaByKey(personaKey);
  if (!persona) {
    if (isJsonRequest) {
      return NextResponse.json({ error: 'Unknown development persona' }, { status: 400 });
    }
    return NextResponse.redirect(`${origin}/login?error=unknown_persona`, { status: 303 });
  }

  // 4. Resolve development auth password
  const devPassword = process.env.DEV_AUTH_PASSWORD;
  if (!devPassword) {
    console.error('DEV_AUTH_PASSWORD environment variable is not configured.');
    if (isJsonRequest) {
      return NextResponse.json(
        { error: 'Development authentication password is not configured on server' },
        { status: 500 }
      );
    }
    return NextResponse.redirect(`${origin}/login?error=dev_auth_misconfigured`, { status: 303 });
  }

  // 5. Authenticate via real Supabase Server Client
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: persona.email,
      password: devPassword,
    });

    if (error || !data.session) {
      console.error(`Dev auth failed for persona ${personaKey}:`, error?.message);
      if (isJsonRequest) {
        return NextResponse.json(
          { error: 'Authentication failed for the selected persona. Ensure local auth has been seeded.' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(`${origin}/login?error=dev_auth_failed`, { status: 303 });
    }

    const safeRedirectPath = getSafeRedirectUrl(rawRedirectTo);

    if (isJsonRequest) {
      return NextResponse.json({ success: true, redirectTo: safeRedirectPath });
    }

    return NextResponse.redirect(`${origin}${safeRedirectPath}`, { status: 303 });
  } catch (err) {
    console.error('Unexpected error during development persona authentication:', err);
    if (isJsonRequest) {
      return NextResponse.json({ error: 'Internal authentication error' }, { status: 500 });
    }
    return NextResponse.redirect(`${origin}/login?error=internal_auth_error`, { status: 303 });
  }
}
