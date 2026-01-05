import 'server-only';
import React from 'react';
import { type Metadata } from 'next';
import { AppSidebar } from './components/app-sidebar';
import { createServerSupabaseClient } from '@/lib/server/server';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { isAfter } from 'date-fns';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false
  }
};

async function getUserData() {
  try {
    const supabase = await createServerSupabaseClient();

    // Try to get user data - be resilient to missing columns
    let userData: { role?: string; full_name?: string; email?: string } | null = null;
    
    try {
      // Try with all columns first
      const { data, error } = await supabase
        .from('users')
        .select('role, full_name, email')
        .maybeSingle();
      
      if (!error) {
        userData = data;
      }
    } catch {
      // If that fails, try with just email (minimal schema)
      try {
        const { data } = await supabase
          .from('users')
          .select('email')
          .maybeSingle();
        userData = data;
      } catch {
        // Database not set up - return default data for development
      }
    }

    // Return default user for development if no database data
    if (!userData) {
      return {
        isAdmin: false,
        user: {
          name: 'Demo User',
          email: 'demo@example.com',
          avatar: '/avatars/user.jpg'
        },
        hasActiveSubscription: true // Enable features in dev
      };
    }

    const isAdmin = userData?.role === 'admin';

    // Try to get subscription data separately (may not exist in all setups)
    let hasActiveSubscription = true; // Default to true for development
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('status, stripe_current_period_end')
        .maybeSingle();

      if (!error && subscription) {
        hasActiveSubscription = Boolean(
          (subscription.status === 'active' ||
            subscription.status === 'trialing' ||
            subscription.status === 'canceled') &&
          isAfter(new Date(subscription.stripe_current_period_end), new Date())
        );
      }
    } catch {
      // Subscriptions table may not exist - that's okay
    }

    const user = {
      name: userData?.full_name || userData?.email?.split('@')[0] || 'User',
      email: userData?.email || '',
      avatar: '/avatars/user.jpg'
    };

    return {
      isAdmin,
      user,
      hasActiveSubscription
    };
  } catch (error) {
    console.error('Error checking user data:', error);
    return null;
  }
}

export default async function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  const userData = await getUserData();

  if (!userData) {
    return <>{children}</>;
  }

  const { isAdmin, user, hasActiveSubscription } = userData;

  return (
    <SidebarProvider className="flex">
      <AppSidebar
        isAdmin={isAdmin}
        user={user}
        hasActiveSubscription={hasActiveSubscription}
      />
      <SidebarInset>{children}</SidebarInset>
      <div className="fixed bottom-4 right-4 z-50 sm:hidden">
        <SidebarTrigger />
      </div>
    </SidebarProvider>
  );
}
