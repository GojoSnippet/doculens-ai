import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

  // Create response first so we can set cookies on it
  const response = NextResponse.redirect(`${origin}/chat`);

  try {
    // Create Supabase client that sets cookies on the response
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Exchange the code for a session - this sets the session cookies on response
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError.message);
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent(exchangeError.message || 'Failed to complete authentication')}`
      );
    }

    // Return response with cookies set
    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}
