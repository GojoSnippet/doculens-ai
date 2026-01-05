import { cache } from 'react';
import { createServerSupabaseClient } from '@/lib/server/server';

export const fetchUserFilesData = cache(async () => {
  const supabase = await createServerSupabaseClient();

  const { data: userData, error } = await supabase
    .from('users')
    .select(
      `
      id,
      user_documents (
        id,
        title,
        created_at,
        total_pages,
        file_path
      )
    `
    )
    .order('created_at', {
      referencedTable: 'user_documents',
      ascending: false
    })
    .maybeSingle();

  if (error) {
    console.error('Error fetching user documents:', error);
    return null;
  }

  if (!userData) {
    console.log('No user data found');
    return null;
  }

  console.log('Found documents:', userData.user_documents?.length || 0);

  return {
    userId: userData.id,
    userDocuments: userData.user_documents || []
  };
});
