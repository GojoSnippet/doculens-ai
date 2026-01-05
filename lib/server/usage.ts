import 'server-only';
import { createServerSupabaseClient } from './server';
import { getSession } from './supabase';

export interface UsageStats {
  plan: 'free' | 'pro' | 'enterprise';
  usage: {
    documents: number;
    messages: number;
    storage_bytes: number;
  };
  limits: {
    max_documents: number;
    max_pages_per_doc: number;
    max_messages_per_month: number;
    max_storage_bytes: number;
    allowed_models: string[];
  };
  resets_at: string;
}

export interface LimitCheck {
  allowed: boolean;
  reason: string;
  current: number;
  limit: number;
}

/**
 * Get user's current usage stats and plan limits
 */
export async function getUserUsage(): Promise<UsageStats | null> {
  const user = await getSession();
  if (!user?.sub) return null;

  const supabase = await createServerSupabaseClient();
  
  // @ts-expect-error - Custom RPC function not in generated types
  const { data, error } = await supabase.rpc('get_user_usage', {
    p_user_id: user.sub
  });

  if (error) {
    console.error('Error fetching usage:', error);
    // Return default free tier if function doesn't exist yet
    return {
      plan: 'free',
      usage: { documents: 0, messages: 0, storage_bytes: 0 },
      limits: {
        max_documents: 5,
        max_pages_per_doc: 30,
        max_messages_per_month: 50,
        max_storage_bytes: 52428800,
        allowed_models: ['gpt-4o-mini']
      },
      resets_at: new Date().toISOString()
    };
  }

  return data as unknown as UsageStats;
}

/**
 * Check if user can perform an action (document upload, send message, etc.)
 */
export async function checkUsageLimit(
  action: 'document' | 'message' | 'storage',
  amount: number = 1
): Promise<LimitCheck> {
  const user = await getSession();
  if (!user?.sub) {
    return { allowed: false, reason: 'Not authenticated', current: 0, limit: 0 };
  }

  const supabase = await createServerSupabaseClient();
  
  // @ts-expect-error - Custom RPC function not in generated types
  const { data, error } = await supabase.rpc('check_usage_limit', {
    p_user_id: user.sub,
    p_action: action,
    p_amount: amount
  });

  if (error) {
    console.error('Error checking limit:', error);
    // Allow action if function doesn't exist (graceful degradation)
    return { allowed: true, reason: '', current: 0, limit: -1 };
  }

  return data as unknown as LimitCheck;
}

/**
 * Increment user's usage after an action
 */
export async function incrementUsage(
  action: 'message' | 'storage',
  amount: number = 1
): Promise<void> {
  const user = await getSession();
  if (!user?.sub) return;

  const supabase = await createServerSupabaseClient();
  
  // @ts-expect-error - Custom RPC function not in generated types
  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: user.sub,
    p_action: action,
    p_amount: amount
  });

  if (error) {
    console.error('Error incrementing usage:', error);
  }
}

/**
 * Check if a model is allowed for user's plan
 */
export async function isModelAllowed(modelId: string): Promise<boolean> {
  const usage = await getUserUsage();
  if (!usage) return false;
  
  // -1 means unlimited (enterprise)
  if (usage.limits.max_messages_per_month === -1) return true;
  
  return usage.limits.allowed_models.includes(modelId);
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return 'Unlimited';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get percentage of usage
 */
export function getUsagePercentage(current: number, limit: number): number {
  if (limit <= 0) return 0; // Unlimited
  return Math.min(Math.round((current / limit) * 100), 100);
}
