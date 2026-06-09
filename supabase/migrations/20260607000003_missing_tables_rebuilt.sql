-- Rebuilding missing tables

-- Ensure report_status enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE report_status AS ENUM ('pending', 'accepted', 'rejected');
  END IF;
END
$$;

-- 1. notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL CONSTRAINT notifications_recipient_id_fkey REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID CONSTRAINT notifications_sender_id_fkey REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  body VARCHAR NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. map_subscriptions table
CREATE TABLE IF NOT EXISTS public.map_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL CONSTRAINT map_subscriptions_subscriber_id_fkey REFERENCES public.profiles(id) ON DELETE CASCADE,
  map_id UUID NOT NULL CONSTRAINT map_subscriptions_map_id_fkey REFERENCES public.macro_maps(id) ON DELETE CASCADE,
  status map_status NOT NULL DEFAULT 'ACTIVE'::map_status,
  current_checkpoint_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. saved_macro_maps table
CREATE TABLE IF NOT EXISTS public.saved_macro_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL CONSTRAINT saved_macro_maps_user_id_fkey REFERENCES public.profiles(id) ON DELETE CASCADE,
  map_id UUID NOT NULL CONSTRAINT saved_macro_maps_map_id_fkey REFERENCES public.macro_maps(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. tribe_reports table
CREATE TABLE IF NOT EXISTS public.tribe_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL CONSTRAINT tribe_reports_reporter_id_fkey REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL CONSTRAINT tribe_reports_reported_id_fkey REFERENCES public.profiles(id) ON DELETE CASCADE,
  tribe_id UUID NOT NULL CONSTRAINT tribe_reports_tribe_id_fkey REFERENCES public.tribes(id) ON DELETE CASCADE,
  reason VARCHAR NOT NULL,
  requested_penalty INT NOT NULL,
  photo_url TEXT,
  status report_status DEFAULT 'pending'::report_status,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_macro_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribe_reports ENABLE ROW LEVEL SECURITY;

-- Create Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select their own notifications') THEN
    CREATE POLICY "Users can select their own notifications" ON public.notifications
      FOR SELECT USING (auth.uid() = recipient_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update is_read of their own notifications') THEN
    CREATE POLICY "Users can update is_read of their own notifications" ON public.notifications
      FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own subscriptions') THEN
    CREATE POLICY "Users can insert own subscriptions" ON public.map_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = subscriber_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own subscriptions') THEN
    CREATE POLICY "Users can select own subscriptions" ON public.map_subscriptions
      FOR SELECT USING (auth.uid() = subscriber_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own subscriptions') THEN
    CREATE POLICY "Users can update own subscriptions" ON public.map_subscriptions
      FOR UPDATE USING (auth.uid() = subscriber_id) WITH CHECK (auth.uid() = subscriber_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own saved maps') THEN
    CREATE POLICY "Users can manage their own saved maps" ON public.saved_macro_maps
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Purge Old Notifications Function
CREATE OR REPLACE FUNCTION public.purge_old_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.notifications
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Schedule cron jobs
DO $$
BEGIN
  PERFORM cron.unschedule('nightly-notification-purge');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

SELECT cron.schedule(
  'nightly-notification-purge',
  '0 0 * * *',
  'SELECT public.purge_old_notifications();'
);

DO $$
BEGIN
  PERFORM cron.unschedule('nightly-notifications-cleanup');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

SELECT cron.schedule(
  'nightly-notifications-cleanup',
  '0 0 * * *',
  'DELETE FROM public.notifications WHERE created_at < NOW() - INTERVAL ''30 days'''
);
