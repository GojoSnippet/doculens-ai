import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server/server';
import { isAfter } from 'date-fns';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const now = new Date();

    // First check if user is logged in
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user) {
      return NextResponse.json({
        isLoggedIn: false,
        hasActiveSubscription: false,
        subscriptionType: 'none' as const
      });
    }

    // User is logged in - try to get subscription data
    let hasActiveSubscription = true; // Default to true for dev
    let subscriptionType: 'none' | 'Basic' | 'Full' = 'Full'; // Default for dev

    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('status, stripe_current_period_end, name')
        .maybeSingle();

      if (!error && subscription) {
        hasActiveSubscription = Boolean(
          (subscription.status === 'active' ||
            subscription.status === 'trialing' ||
            subscription.status === 'canceled') &&
          isAfter(new Date(subscription.stripe_current_period_end), now)
        );

        subscriptionType = 'none';
        if (hasActiveSubscription) {
          if (subscription.name === 'Basic') {
            subscriptionType = 'Basic';
          } else if (subscription.name === 'Fuld' || subscription.name === 'Full') {
            subscriptionType = 'Full';
          }
        }
      }
    } catch {
      // Subscriptions table may not exist - use defaults
    }

    return NextResponse.json({
      isLoggedIn: true,
      hasActiveSubscription,
      subscriptionType
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({
      isLoggedIn: false,
      hasActiveSubscription: false,
      subscriptionType: 'none' as const
    });
  }
}
