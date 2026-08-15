import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Handles user sign-out by clearing Supabase session tokens and redirecting to /login.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(`${origin}/login`, {
    status: 303,
  });
}
