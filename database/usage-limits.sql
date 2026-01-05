-- =============================================================================
-- USAGE LIMITS & TRACKING SYSTEM
-- =============================================================================
-- Run this SQL in Supabase SQL Editor after setup.sql
-- This adds usage tracking without requiring Stripe subscriptions
-- =============================================================================

-- =============================================================================
-- STEP 1: ADD USAGE TRACKING TO USERS TABLE
-- =============================================================================

-- Add usage columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS messages_used integer DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS messages_reset_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS storage_used_bytes bigint DEFAULT 0;

-- =============================================================================
-- STEP 2: CREATE PLAN LIMITS CONFIGURATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan_type text PRIMARY KEY,
  max_documents integer NOT NULL,
  max_pages_per_doc integer NOT NULL,
  max_messages_per_month integer NOT NULL,
  max_storage_bytes bigint NOT NULL,
  allowed_models text[] NOT NULL,
  description text
);

-- Insert default plan configurations
INSERT INTO public.plan_limits (plan_type, max_documents, max_pages_per_doc, max_messages_per_month, max_storage_bytes, allowed_models, description)
VALUES 
  ('free', 5, 30, 50, 52428800, ARRAY['gpt-4o-mini'], 'Free tier - Limited usage'),
  ('pro', 50, 100, 500, 524288000, ARRAY['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash'], 'Pro tier - Extended usage'),
  ('enterprise', -1, -1, -1, -1, ARRAY['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet', 'claude-3-5-opus', 'gemini-2.0-flash', 'gemini-2.5-pro'], 'Enterprise - Unlimited')
ON CONFLICT (plan_type) DO UPDATE SET
  max_documents = EXCLUDED.max_documents,
  max_pages_per_doc = EXCLUDED.max_pages_per_doc,
  max_messages_per_month = EXCLUDED.max_messages_per_month,
  max_storage_bytes = EXCLUDED.max_storage_bytes,
  allowed_models = EXCLUDED.allowed_models,
  description = EXCLUDED.description;

-- =============================================================================
-- STEP 3: CREATE FUNCTION TO GET USER USAGE STATS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_usage(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_doc_count integer;
  v_message_count integer;
  v_storage_bytes bigint;
  v_plan_type text;
  v_messages_reset_at timestamp with time zone;
BEGIN
  -- Get user's plan type and message reset date
  SELECT plan_type, messages_used, messages_reset_at, storage_used_bytes
  INTO v_plan_type, v_message_count, v_messages_reset_at, v_storage_bytes
  FROM public.users
  WHERE id = p_user_id;

  -- Reset monthly message count if needed
  IF v_messages_reset_at < date_trunc('month', CURRENT_TIMESTAMP) THEN
    UPDATE public.users
    SET messages_used = 0, messages_reset_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    v_message_count := 0;
  END IF;

  -- Count documents
  SELECT COUNT(*) INTO v_doc_count
  FROM public.user_documents
  WHERE user_id = p_user_id;

  -- Get limits for user's plan
  SELECT json_build_object(
    'plan', v_plan_type,
    'usage', json_build_object(
      'documents', v_doc_count,
      'messages', v_message_count,
      'storage_bytes', COALESCE(v_storage_bytes, 0)
    ),
    'limits', json_build_object(
      'max_documents', pl.max_documents,
      'max_pages_per_doc', pl.max_pages_per_doc,
      'max_messages_per_month', pl.max_messages_per_month,
      'max_storage_bytes', pl.max_storage_bytes,
      'allowed_models', pl.allowed_models
    ),
    'resets_at', date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'
  ) INTO v_result
  FROM public.plan_limits pl
  WHERE pl.plan_type = COALESCE(v_plan_type, 'free');

  RETURN v_result;
END;
$$;

-- =============================================================================
-- STEP 4: CREATE FUNCTION TO CHECK IF ACTION IS ALLOWED
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_usage_limit(
  p_user_id uuid,
  p_action text,  -- 'document', 'message', 'storage'
  p_amount integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usage json;
  v_allowed boolean := true;
  v_reason text := '';
  v_current integer;
  v_limit integer;
BEGIN
  -- Get current usage
  v_usage := public.get_user_usage(p_user_id);
  
  CASE p_action
    WHEN 'document' THEN
      v_current := (v_usage->'usage'->>'documents')::integer;
      v_limit := (v_usage->'limits'->>'max_documents')::integer;
      IF v_limit != -1 AND v_current + p_amount > v_limit THEN
        v_allowed := false;
        v_reason := format('Document limit reached (%s/%s). Upgrade your plan for more documents.', v_current, v_limit);
      END IF;
      
    WHEN 'message' THEN
      v_current := (v_usage->'usage'->>'messages')::integer;
      v_limit := (v_usage->'limits'->>'max_messages_per_month')::integer;
      IF v_limit != -1 AND v_current + p_amount > v_limit THEN
        v_allowed := false;
        v_reason := format('Monthly message limit reached (%s/%s). Resets on %s.', 
          v_current, v_limit, (v_usage->>'resets_at')::date);
      END IF;
      
    WHEN 'storage' THEN
      v_current := (v_usage->'usage'->>'storage_bytes')::bigint;
      v_limit := (v_usage->'limits'->>'max_storage_bytes')::bigint;
      IF v_limit != -1 AND v_current + p_amount > v_limit THEN
        v_allowed := false;
        v_reason := format('Storage limit reached (%s MB / %s MB). Upgrade your plan for more storage.', 
          round(v_current / 1048576.0, 1), round(v_limit / 1048576.0, 1));
      END IF;
  END CASE;

  RETURN json_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'current', v_current,
    'limit', v_limit
  );
END;
$$;

-- =============================================================================
-- STEP 5: CREATE FUNCTION TO INCREMENT USAGE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id uuid,
  p_action text,  -- 'message', 'storage'
  p_amount integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE p_action
    WHEN 'message' THEN
      UPDATE public.users
      SET messages_used = messages_used + p_amount
      WHERE id = p_user_id;
      
    WHEN 'storage' THEN
      UPDATE public.users
      SET storage_used_bytes = storage_used_bytes + p_amount
      WHERE id = p_user_id;
  END CASE;
END;
$$;

-- =============================================================================
-- STEP 6: GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_user_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_usage_limit(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(uuid, text, integer) TO authenticated;
GRANT SELECT ON public.plan_limits TO authenticated;
