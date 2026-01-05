import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Get the origin for redirects
  const origin = requestUrl.origin;

  // Handle OAuth errors from provider
  if (error) {
    console.error('OAuth provider error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(errorDescription || 'Authentication failed')}`
    );
  }

  if (!code) {
    console.error('No code received in OAuth callback');
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent('No authorization code received')}`
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Exchange the code for a session - this also sets the session cookies
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError.message);
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent(exchangeError.message || 'Failed to complete authentication')}`
      );
    }

    // Successful authentication - redirect to chat
    return NextResponse.redirect(`${origin}/chat`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}
