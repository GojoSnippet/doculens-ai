import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getBaseUrl } from '@/utils/getBaseUrl';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') as 'google' | 'github';

  if (!provider || !['google', 'github'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const baseUrl = getBaseUrl();

  // Create a response that we'll set cookies on
  // We'll update the redirect URL after getting the OAuth URL
  let response = NextResponse.next();

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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${baseUrl}api/auth/callback/oauth`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${baseUrl}?error=${encodeURIComponent('Failed to initiate login')}`);
  }

  if (data.url) {
    // Create redirect response and copy cookies from the temp response
    const redirectResponse = NextResponse.redirect(data.url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return NextResponse.redirect(`${baseUrl}?error=${encodeURIComponent('Failed to get OAuth URL')}`);
}
