-- 1. ENUMs
CREATE TYPE engine_type AS ENUM ('EXPERIENTIAL', 'ALGORITHMIC_CREATED', 'LIVE');
CREATE TYPE generation_type AS ENUM ('update', 'meal_log');
CREATE TYPE goal_type AS ENUM ('CUT', 'BULK', 'MAINTENANCE');
CREATE TYPE trigger_type AS ENUM ('WEIGHT_BASED', 'TIME_BASED');
CREATE TYPE intent_tag AS ENUM ('PLATEAU_BREAK', 'TARGET_REACHED', 'STRATEGIC_REVERSAL', 'EVENT_MILESTONE');
CREATE TYPE map_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
CREATE TYPE holding_status AS ENUM ('NONE', 'ACTIVE_HOLD', 'PLATEAU_CROSSROAD');

-- 2. TABLES
CREATE TABLE public.macro_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  engine_type engine_type NOT NULL,
  generation_type generation_type NOT NULL DEFAULT 'update',
  goal_type goal_type NOT NULL,
  total_duration_weeks INT NOT NULL,
  plateau_formula_json JSONB,
  is_live BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.macro_map_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.macro_maps(id) ON DELETE CASCADE,
  sequence_index INT NOT NULL,
  trigger_type trigger_type NOT NULL,
  intent_tag intent_tag NOT NULL,
  trigger_weight_delta_pct NUMERIC,
  trigger_time_elapsed_days INT,
  protein_ratio NUMERIC NOT NULL CHECK (protein_ratio >= 0.0 AND protein_ratio <= 1.0),
  carbs_ratio NUMERIC NOT NULL CHECK (carbs_ratio >= 0.0 AND carbs_ratio <= 1.0),
  fats_ratio NUMERIC NOT NULL CHECK (fats_ratio >= 0.0 AND fats_ratio <= 1.0),
  calorie_delta_pct NUMERIC NOT NULL,
  is_outlier_flare BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.macro_map_live_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.macro_maps(id) ON DELETE CASCADE,
  macro_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.macro_map_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  map_id UUID NOT NULL REFERENCES public.macro_maps(id) ON DELETE CASCADE,
  status map_status NOT NULL DEFAULT 'ACTIVE',
  holding_status holding_status NOT NULL DEFAULT 'NONE',
  current_weight_checkpoint_index INT DEFAULT 0,
  current_time_checkpoint_index INT DEFAULT 0,
  requires_resolution BOOLEAN DEFAULT false,
  pending_payload JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  postponed_until TIMESTAMPTZ
);

-- 3. UPDATES TO EXISTING TABLES
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_macro_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gender VARCHAR,
ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
ADD COLUMN IF NOT EXISTS dob DATE;

ALTER TABLE public.macro_history
ADD COLUMN IF NOT EXISTS intent_driver VARCHAR,
ADD COLUMN IF NOT EXISTS anomaly_note TEXT;

-- 4. BMR RPC Function (Mifflin-St Jeor equation)
-- Note: User weight is stored in lbs, converted to kg for formula.
CREATE OR REPLACE FUNCTION public.calculate_user_bmr(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_weight_lbs NUMERIC;
    v_weight_kg NUMERIC;
    v_height_cm NUMERIC;
    v_age_years INT;
    v_gender VARCHAR;
    v_bmr NUMERIC;
BEGIN
    SELECT weight, height_cm, gender, EXTRACT(YEAR FROM age(dob))
    INTO v_weight_lbs, v_height_cm, v_gender, v_age_years
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF v_weight_lbs IS NULL OR v_height_cm IS NULL OR v_age_years IS NULL OR v_gender IS NULL THEN
        RETURN NULL; 
    END IF;
    
    -- Convert lbs to kg
    v_weight_kg := v_weight_lbs * 0.453592;
    
    -- Mifflin-St Jeor equation
    v_bmr := (10 * v_weight_kg) + (6.25 * v_height_cm) - (5 * v_age_years);
    
    IF v_gender ILIKE 'male' THEN
        v_bmr := v_bmr + 5;
    ELSE
        v_bmr := v_bmr - 161;
    END IF;
    
    RETURN v_bmr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. TRIGGER FOR LIVE MAP OVERWRITE
CREATE OR REPLACE FUNCTION public.trigger_live_map_overwrite()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.macro_map_subscriptions sub
    SET requires_resolution = true,
        pending_payload = row_to_json(NEW)
    FROM public.macro_maps map
    WHERE sub.map_id = map.id
      AND map.creator_id = NEW.user_id
      AND map.engine_type = 'LIVE'
      AND map.is_published = true
      AND sub.status = 'ACTIVE';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_daily_macro_log_insert
AFTER INSERT ON public.macro_history
FOR EACH ROW
EXECUTE FUNCTION public.trigger_live_map_overwrite();


-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.macro_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_map_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_map_live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_map_subscriptions ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own maps
CREATE POLICY "Creators can manage their own maps" ON public.macro_maps FOR ALL USING (auth.uid() = creator_id);

-- Subscribers can read published maps
CREATE POLICY "Anyone can read published maps" ON public.macro_maps FOR SELECT USING (is_published = true);

-- Subscribers can manage their own subscription states
CREATE POLICY "Users can manage their own subscriptions" ON public.macro_map_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Anyone can read checkpoints for published maps, creators can manage their map's checkpoints
CREATE POLICY "Creators can manage checkpoints" ON public.macro_map_checkpoints FOR ALL USING (
  EXISTS (SELECT 1 FROM public.macro_maps map WHERE map.id = map_id AND map.creator_id = auth.uid())
);
CREATE POLICY "Subscribers can read checkpoints" ON public.macro_map_checkpoints FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.macro_maps map WHERE map.id = map_id AND map.is_published = true)
);

-- Live Events policies
CREATE POLICY "Creators can insert live events" ON public.macro_map_live_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.macro_maps map WHERE map.id = map_id AND map.creator_id = auth.uid())
);
CREATE POLICY "Anyone can read live events" ON public.macro_map_live_events FOR SELECT USING (auth.role() = 'authenticated');

-- 7. MARKETPLACE DISCOVERY RPC
-- Returns all published maps regardless of engine_type, with creator metadata and subscriber count
CREATE OR REPLACE FUNCTION public.get_published_macro_maps()
RETURNS TABLE (
    id UUID,
    creator_id UUID,
    creator_name VARCHAR,
    creator_handle VARCHAR,
    creator_avatar VARCHAR,
    name VARCHAR,
    engine_type engine_type,
    goal_type goal_type,
    total_duration_weeks INT,
    subscriber_count BIGINT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.creator_id,
        p.name AS creator_name,
        p.handle AS creator_handle,
        p.avatar_url AS creator_avatar,
        m.name,
        m.engine_type,
        m.goal_type,
        m.total_duration_weeks,
        (SELECT COUNT(*) FROM public.macro_map_subscriptions s WHERE s.map_id = m.id AND s.status = 'ACTIVE') AS subscriber_count,
        m.created_at
    FROM public.macro_maps m
    JOIN public.profiles p ON m.creator_id = p.id
    WHERE m.is_published = true
    ORDER BY subscriber_count DESC, m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. HISTORICAL BOUNDARY QUERY
-- Fetches sequential, immutable logs for a given user within a date range
CREATE OR REPLACE FUNCTION public.fetch_historical_log_range(
    target_user_id UUID, 
    start_date DATE, 
    end_date DATE
)
RETURNS TABLE (
    created_at TIMESTAMPTZ,
    protein NUMERIC,
    carbs NUMERIC,
    fats NUMERIC,
    calories NUMERIC,
    weight NUMERIC,
    intent_driver VARCHAR
) AS $$
    RETURN QUERY
    SELECT 
        mh.created_at,
        COALESCE((mh.macro_targets->>'p')::NUMERIC, 0) AS protein,
        COALESCE((mh.macro_targets->>'c')::NUMERIC, 0) AS carbs,
        COALESCE((mh.macro_targets->>'f')::NUMERIC, 0) AS fats,
        COALESCE((mh.macro_targets->>'calories')::NUMERIC, 0) AS calories,
        COALESCE(
            (SELECT w.weight FROM public.weights w WHERE w.user_id = mh.user_id AND w.date <= mh.created_at::date ORDER BY w.date DESC, w.created_at DESC LIMIT 1),
            (SELECT p.weight_lbs FROM public.profiles p WHERE p.id = mh.user_id)
        )::NUMERIC AS weight,
        mh.intent_driver
    FROM public.macro_history mh
    WHERE mh.user_id = target_user_id
      AND DATE(mh.created_at) >= start_date
      AND DATE(mh.created_at) <= end_date
    ORDER BY mh.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. UPDATE COMPILER MAP SAVE PERSISTENCE (EXPERIENTIAL MAPS)
-- Atomic batch transaction to publish an experiential map and its timeline milestones
CREATE OR REPLACE FUNCTION public.publish_experiential_map(
    p_creator_id UUID,
    p_name VARCHAR,
    p_goal_type goal_type,
    p_total_duration_weeks INT,
    p_checkpoints JSONB
)
RETURNS UUID AS $$
DECLARE
    new_map_id UUID;
BEGIN
    -- Insert parent row
    INSERT INTO public.macro_maps (
        creator_id,
        name,
        engine_type,
        goal_type,
        total_duration_weeks,
        is_published
    ) VALUES (
        p_creator_id,
        p_name,
        'EXPERIENTIAL',
        p_goal_type,
        p_total_duration_weeks,
        true
    ) RETURNING id INTO new_map_id;

    -- Bulk insert checkpoints via jsonb_to_recordset
    INSERT INTO public.macro_map_checkpoints (
        map_id,
        sequence_index,
        trigger_type,
        intent_tag,
        trigger_weight_delta_pct,
        trigger_time_elapsed_days,
        protein_ratio,
        carbs_ratio,
        fats_ratio,
        calorie_delta_pct,
        is_outlier_flare
    )
    SELECT 
        new_map_id,
        sequence_index,
        trigger_type::trigger_type,
        intent_tag::intent_tag,
        trigger_weight_delta_pct,
        trigger_time_elapsed_days,
        protein_ratio,
        carbs_ratio,
        fats_ratio,
        calorie_delta_pct,
        COALESCE(is_outlier_flare, false)
    FROM jsonb_to_recordset(p_checkpoints) AS x(
        sequence_index INT,
        trigger_type VARCHAR,
        intent_tag VARCHAR,
        trigger_weight_delta_pct NUMERIC,
        trigger_time_elapsed_days INT,
        protein_ratio NUMERIC,
        carbs_ratio NUMERIC,
        fats_ratio NUMERIC,
        calorie_delta_pct NUMERIC,
        is_outlier_flare BOOLEAN
    );

    RETURN new_map_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. WEEKLY MEAL LOG AGGREGATION RPC
-- Aggregates daily macro_history entries into calendar weeks (Sunday to Saturday) and calculates relative ratios
CREATE OR REPLACE FUNCTION public.fetch_historical_meal_averages(
    target_user_id UUID,
    start_date TEXT,
    end_date TEXT,
    generation_type TEXT
)
RETURNS TABLE (
    week_start DATE,
    avg_calories NUMERIC,
    avg_protein NUMERIC,
    avg_carbs NUMERIC,
    avg_fats NUMERIC,
    avg_weight NUMERIC,
    protein_ratio NUMERIC,
    carbs_ratio NUMERIC,
    fats_ratio NUMERIC,
    calorie_delta_pct NUMERIC
) AS $$
BEGIN
    IF generation_type = 'meal_log' THEN
        RETURN QUERY
        WITH weekly_stats AS (
            SELECT
                (date_trunc('week', mh.created_at::date + interval '1 day') - interval '1 day')::DATE AS week_start_date,
                AVG(COALESCE((mh.macro_targets->>'calories')::NUMERIC, 0)) AS w_calories,
                AVG(COALESCE((mh.macro_targets->>'p')::NUMERIC, 0)) AS w_protein,
                AVG(COALESCE((mh.macro_targets->>'c')::NUMERIC, 0)) AS w_carbs,
                AVG(COALESCE((mh.macro_targets->>'f')::NUMERIC, 0)) AS w_fats,
                AVG(COALESCE(
                    (SELECT w.weight FROM public.weights w WHERE w.user_id = mh.user_id AND w.date <= mh.created_at::date ORDER BY w.date DESC, w.created_at DESC LIMIT 1),
                    (SELECT p.weight_lbs FROM public.profiles p WHERE p.id = mh.user_id)
                )) AS w_weight
            FROM public.macro_history mh
            WHERE mh.user_id = target_user_id
              AND DATE(mh.created_at) >= start_date::date
              AND DATE(mh.created_at) <= end_date::date
            GROUP BY (date_trunc('week', mh.created_at::date + interval '1 day') - interval '1 day')::DATE
        ),
        baseline AS (
            SELECT w_calories AS base_cal
            FROM weekly_stats
            ORDER BY week_start_date ASC
            LIMIT 1
        )
        SELECT 
            ws.week_start_date,
            ROUND(ws.w_calories, 1),
            ROUND(ws.w_protein, 1),
            ROUND(ws.w_carbs, 1),
            ROUND(ws.w_fats, 1),
            ROUND(ws.w_weight, 2),
            CASE WHEN (ws.w_protein * 4 + ws.w_carbs * 4 + ws.w_fats * 9) > 0 THEN
                 ROUND((ws.w_protein * 4) / (ws.w_protein * 4 + ws.w_carbs * 4 + ws.w_fats * 9), 4)
                 ELSE 0 END AS p_ratio,
            CASE WHEN (ws.w_protein * 4 + ws.w_carbs * 4 + ws.w_fats * 9) > 0 THEN
                 ROUND((ws.w_carbs * 4) / (ws.w_protein * 4 + ws.w_carbs * 4 + ws.w_fats * 9), 4)
                 ELSE 0 END AS c_ratio,
            CASE WHEN (ws.w_protein * 4 + ws.w_carbs * 4 + ws.w_fats * 9) > 0 THEN
                 ROUND((ws.w_fats * 9) / (ws.w_protein * 4 + ws.w_carbs * 4 + ws.w_fats * 9), 4)
                 ELSE 0 END AS f_ratio,
            CASE WHEN b.base_cal > 0 THEN
                 ROUND((ws.w_calories - b.base_cal) / b.base_cal, 4)
                 ELSE 0 END AS cal_delta_pct
        FROM weekly_stats ws
        CROSS JOIN baseline b
        ORDER BY ws.week_start_date ASC;
    ELSE
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. ENABLE REALTIME REPLICATION FOR LIVE EVENTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'macro_map_live_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.macro_map_live_events;
    END IF;
END
$$;

-- 12. PUBLIC DISCOVERY VIEW
CREATE OR REPLACE VIEW public.public_discovery_maps AS
SELECT 
    m.id,
    m.creator_id,
    m.name AS map_name,
    m.goal_type AS global_track,
    m.generation_type,
    m.is_live,
    m.is_published,
    m.created_at,
    p.handle AS username,
    p.name AS display_name,
    p.avatar_url,
    p.bio AS verified_bio,
    p.status AS natural_status,
    p.activity AS activity_type
FROM public.macro_maps m
JOIN public.profiles p ON m.creator_id = p.id
WHERE m.is_published = true OR m.is_live = true;

GRANT SELECT ON public.public_discovery_maps TO authenticated;
