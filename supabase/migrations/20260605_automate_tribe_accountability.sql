-- 1. Create or replace the hourly timezone-aware accountability check function
CREATE OR REPLACE FUNCTION public.check_tribe_accountability_hourly()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_profile RECORD;
  r_tribe RECORD;
  local_hour INT;
  today_date DATE;
  yesterday_date DATE;
  p_logged BOOLEAN;
  missing_names TEXT;
BEGIN
  -- Iterate through all users who are active members of at least one tribe
  FOR r_profile IN 
    SELECT DISTINCT p.id, p.name, p.handle, p.timezone
    FROM public.profiles p
    JOIN public.tribe_members tm ON tm.user_id = p.id
    WHERE tm.role IN ('chief', 'member')
      AND COALESCE(tm.is_spectator, false) = false
  LOOP
    -- Safely resolve local hour, today's date, and yesterday's date for this user
    BEGIN
      local_hour := EXTRACT(HOUR FROM now() AT TIME ZONE COALESCE(r_profile.timezone, 'UTC'))::INT;
      today_date := (now() AT TIME ZONE COALESCE(r_profile.timezone, 'UTC'))::DATE;
      yesterday_date := (now() AT TIME ZONE COALESCE(r_profile.timezone, 'UTC') - INTERVAL '1 day')::DATE;
    EXCEPTION WHEN OTHERS THEN
      -- Fallback to UTC on timezone parsing failure
      local_hour := EXTRACT(HOUR FROM now() AT TIME ZONE 'UTC')::INT;
      today_date := (now() AT TIME ZONE 'UTC')::DATE;
      yesterday_date := (now() AT TIME ZONE 'UTC' - INTERVAL '1 day')::DATE;
    END;

    -- =========================================================================
    -- ROUTINE 1: The 5:00 PM Check (local_hour = 17)
    -- =========================================================================
    IF local_hour = 17 THEN
      FOR r_tribe IN
        SELECT t.id, t.name
        FROM public.tribes t
        JOIN public.tribe_members tm ON tm.tribe_id = t.id
        WHERE tm.user_id = r_profile.id
          AND tm.role IN ('chief', 'member')
          AND COALESCE(tm.is_spectator, false) = false
      LOOP
        -- Check if current user has logged today
        SELECT EXISTS (
          SELECT 1 
          FROM public.macro_history mh
          WHERE mh.user_id = r_profile.id
            AND (mh.created_at AT TIME ZONE COALESCE(r_profile.timezone, 'UTC'))::DATE = today_date
        ) INTO p_logged;

        -- Find other active members in the same tribe who haven't logged today
        SELECT string_agg(coalesce(pm.name, pm.handle, 'Unknown'), ', ')
        FROM public.tribe_members tm2
        JOIN public.profiles pm ON pm.id = tm2.user_id
        WHERE tm2.tribe_id = r_tribe.id
          AND tm2.user_id != r_profile.id
          AND tm2.role IN ('chief', 'member')
          AND COALESCE(tm2.is_spectator, false) = false
          AND NOT EXISTS (
            SELECT 1 
            FROM public.macro_history mh2
            WHERE mh2.user_id = pm.id
              AND (mh2.created_at AT TIME ZONE COALESCE(pm.timezone, 'UTC'))::DATE = today_date
          )
        INTO missing_names;

        IF NOT p_logged THEN
          -- Scenario A: Recipient hasn't logged today
          INSERT INTO public.notifications (
            id,
            recipient_id,
            sender_id,
            type,
            title,
            body,
            data,
            is_read,
            created_at
          ) VALUES (
            gen_random_uuid(),
            r_profile.id,
            NULL,
            'tribe_accountability',
            'Time to Log!',
            'Don''t break the streak. You have until midnight to log your macros for ' || r_tribe.name || '!',
            jsonb_build_object('tribeId', r_tribe.id),
            FALSE,
            now()
          );
        ELSIF missing_names IS NOT NULL THEN
          -- Scenario B: Recipient has logged, but others in the tribe haven't
          INSERT INTO public.notifications (
            id,
            recipient_id,
            sender_id,
            type,
            title,
            body,
            data,
            is_read,
            created_at
          ) VALUES (
            gen_random_uuid(),
            r_profile.id,
            NULL,
            'tribe_accountability',
            'Tribe Accountability Check',
            'You are logged, but ' || missing_names || ' still need to log for ' || r_tribe.name || '. Send them a reminder!',
            jsonb_build_object('tribeId', r_tribe.id),
            FALSE,
            now()
          );
        END IF;
      END LOOP;
    END IF;

    -- =========================================================================
    -- ROUTINE 2: The 8:00 AM Callout (local_hour = 8)
    -- =========================================================================
    IF local_hour = 8 THEN
      FOR r_tribe IN
        SELECT t.id, t.name
        FROM public.tribes t
        JOIN public.tribe_members tm ON tm.tribe_id = t.id
        WHERE tm.user_id = r_profile.id
          AND tm.role IN ('chief', 'member')
          AND COALESCE(tm.is_spectator, false) = false
      LOOP
        -- Find anyone in the tribe (including current user) who failed to log yesterday
        SELECT string_agg(coalesce(pm.name, pm.handle, 'Unknown'), ', ')
        FROM public.tribe_members tm2
        JOIN public.profiles pm ON pm.id = tm2.user_id
        WHERE tm2.tribe_id = r_tribe.id
          AND tm2.role IN ('chief', 'member')
          AND COALESCE(tm2.is_spectator, false) = false
          AND NOT EXISTS (
            SELECT 1 
            FROM public.macro_history mh2
            WHERE mh2.user_id = pm.id
              AND (mh2.created_at AT TIME ZONE COALESCE(pm.timezone, 'UTC'))::DATE = yesterday_date
          )
        INTO missing_names;

        -- Send report to recipient if there are members who missed the logging deadline
        IF missing_names IS NOT NULL THEN
          INSERT INTO public.notifications (
            id,
            recipient_id,
            sender_id,
            type,
            title,
            body,
            data,
            is_read,
            created_at
          ) VALUES (
            gen_random_uuid(),
            r_profile.id,
            NULL,
            'tribe_accountability',
            'Missed Log Report',
            missing_names || ' failed to log their macros yesterday for ' || r_tribe.name || '.',
            jsonb_build_object('tribeId', r_tribe.id),
            FALSE,
            now()
          );
        END IF;
      END LOOP;
    END IF;

  END LOOP;
END;
$$;

-- 2. Unschedule existing accountability job if any to avoid duplicates
DO $$
BEGIN
  PERFORM cron.unschedule('check-tribe-accountability-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- 3. Schedule the new hourly accountability job via pg_cron
SELECT cron.schedule(
  'check-tribe-accountability-hourly',
  '0 * * * *',
  'SELECT public.check_tribe_accountability_hourly()'
);
