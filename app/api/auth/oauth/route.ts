'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server/server';
import { getBaseUrl } from '@/utils/getBaseUrl';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') as 'google' | 'github';

  if (!provider || !['google', 'github'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const baseUrl = getBaseUrl();

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
    return NextResponse.redirect(data.url);
  }

  return NextResponse.redirect(`${baseUrl}?error=${encodeURIComponent('Failed to get OAuth URL')}`);
}
