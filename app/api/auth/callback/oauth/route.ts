import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server/server';
import { getBaseUrl } from '@/utils/getBaseUrl';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const baseUrl = getBaseUrl();

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent(errorDescription || 'Authentication failed')}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent('No authorization code received')}`
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(
        `${baseUrl}?error=${encodeURIComponent('Failed to complete authentication')}`
      );
    }

    if (data.session) {
      // Successful authentication - redirect to chat
      return NextResponse.redirect(`${baseUrl}chat`);
    }

    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent('Authentication failed')}`
    );
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      `${baseUrl}?error=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}
