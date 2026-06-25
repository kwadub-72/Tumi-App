ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

CREATE OR REPLACE FUNCTION public.finalize_user_onboarding(payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_handle text;
  v_name text;
  v_first_name text;
  v_last_name text;
  v_height_cm int;
  v_weight_lbs float;
  v_activity text;
  v_is_private boolean;
  v_dob date;
  v_sex text;
  v_lifting_experience text;
  v_protein int;
  v_carbs int;
  v_fats int;
  v_calories int;
  v_map_id uuid;
  v_tribe_id uuid;
  v_follow_id uuid;
BEGIN
  -- Extract variables
  v_user_id := (payload->>'user_id')::uuid;
  v_handle := payload->>'handle';
  v_name := payload->>'name';
  v_first_name := payload->>'first_name';
  v_last_name := payload->>'last_name';
  v_height_cm := (payload->>'height_cm')::int;
  v_weight_lbs := (payload->>'weight_lbs')::float;
  v_activity := payload->>'activity';
  v_is_private := (payload->>'is_private')::boolean;
  v_dob := (payload->>'dob')::date;
  v_sex := payload->>'sex';
  v_lifting_experience := payload->>'lifting_experience';
  v_protein := (payload->>'protein')::int;
  v_carbs := (payload->>'carbs')::int;
  v_fats := (payload->>'fats')::int;
  v_calories := (payload->>'calories')::int;

  -- 1. Update profiles
  UPDATE profiles
  SET 
    handle = v_handle,
    name = v_name,
    first_name = v_first_name,
    last_name = v_last_name,
    height_cm = v_height_cm,
    weight_lbs = v_weight_lbs,
    activity = v_activity,
    is_private = v_is_private,
    dob = v_dob,
    gender = v_sex,
    lifting_experience = v_lifting_experience,
    macro_targets = jsonb_build_object(
      'p', v_protein,
      'c', v_carbs,
      'f', v_fats,
      'calories', v_calories
    )
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile with id % not found', v_user_id;
  END IF;

  -- 2. Insert map_subscriptions
  IF payload->'map_subscriptions' IS NOT NULL AND jsonb_array_length(payload->'map_subscriptions') > 0 THEN
    FOR v_map_id IN SELECT jsonb_array_elements_text(payload->'map_subscriptions')::uuid
    LOOP
      INSERT INTO map_subscriptions (subscriber_id, map_id, status)
      VALUES (v_user_id, v_map_id, 'ACTIVE')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- 3. Insert tribe_members
  IF payload->'tribe_joins' IS NOT NULL AND jsonb_array_length(payload->'tribe_joins') > 0 THEN
    FOR v_tribe_id IN SELECT jsonb_array_elements_text(payload->'tribe_joins')::uuid
    LOOP
      INSERT INTO tribe_members (user_id, tribe_id, role)
      VALUES (v_user_id, v_tribe_id, 'member')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- 4. Insert follows
  IF payload->'follows' IS NOT NULL AND jsonb_array_length(payload->'follows') > 0 THEN
    FOR v_follow_id IN SELECT jsonb_array_elements_text(payload->'follows')::uuid
    LOOP
      INSERT INTO follows (follower_id, following_id)
      VALUES (v_user_id, v_follow_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END;
$function$;
