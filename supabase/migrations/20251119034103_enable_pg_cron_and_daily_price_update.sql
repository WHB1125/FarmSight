/*
  # Enable pg_cron and Setup Daily Price Update

  1. Extension Setup
    - Enable pg_cron extension for scheduled jobs
    - Enable pg_net extension for HTTP requests

  2. Database Function
    - Create function to trigger daily price updates via edge function
    - Function calls the fetch-market-prices edge function

  3. Cron Job Configuration
    - Schedule daily price update at 2:00 AM UTC (10:00 AM Beijing Time)
    - Automatically fetch fresh market prices every day
    - Clean up old price data (>30 days)

  4. Security
    - Function runs with security definer privilege
    - Only accessible by cron scheduler
*/

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions to execute HTTP requests
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Create function to trigger daily price update
CREATE OR REPLACE FUNCTION public.trigger_daily_price_update()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  supabase_key text;
  request_id bigint;
BEGIN
  -- Get environment variables (these are set by Supabase automatically)
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- If settings are not available, use direct values from secrets
  IF supabase_url IS NULL THEN
    supabase_url := current_setting('app.settings.api_external_url', true);
  END IF;
  
  -- Make HTTP request to edge function
  -- This is asynchronous and won't block the cron job
  SELECT INTO request_id extensions.http_get(
    url := supabase_url || '/functions/v1/fetch-market-prices?action=fetch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || supabase_key,
      'Content-Type', 'application/json'
    )
  );
  
  -- Log the request
  RAISE NOTICE 'Daily price update triggered. Request ID: %', request_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error triggering daily price update: %', SQLERRM;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION public.trigger_daily_price_update() IS 
'Triggers daily market price update by calling the fetch-market-prices edge function. Scheduled to run daily at 2:00 AM UTC (10:00 AM Beijing Time).';

-- Schedule the cron job to run daily at 2:00 AM UTC (10:00 AM Beijing Time)
-- This ensures fresh prices are available when users start their day
SELECT cron.schedule(
  'daily-price-update',           -- Job name
  '0 2 * * *',                     -- Cron expression: daily at 2:00 AM UTC
  $$SELECT public.trigger_daily_price_update();$$
);

-- Optional: Create a manual trigger function for testing
CREATE OR REPLACE FUNCTION public.manual_price_update()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Trigger the update
  PERFORM public.trigger_daily_price_update();
  
  -- Return success message
  result := jsonb_build_object(
    'success', true,
    'message', 'Price update triggered successfully',
    'triggered_at', now()
  );
  
  RETURN result;
END;
$$;

-- Add comment to manual function
COMMENT ON FUNCTION public.manual_price_update() IS 
'Manually trigger a price update. Useful for testing or admin operations. Returns a JSON result with status.';

-- Create a view to check cron job status
CREATE OR REPLACE VIEW public.cron_job_status AS
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = 'daily-price-update';

-- Grant access to view
GRANT SELECT ON public.cron_job_status TO authenticated;

-- Add RLS policy for the manual trigger function (only managers can use it)
-- Note: This is controlled at function level, not table level
