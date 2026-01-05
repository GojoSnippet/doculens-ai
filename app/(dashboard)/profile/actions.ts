'use server';

import { createServerSupabaseClient } from '@/lib/server/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = formData.get('email') as string;

  if (!email) {
    redirect('/profile?error=email-required');
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/redirect/auth-password-update`,
  });

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/profile?message=password-reset-sent');
}
