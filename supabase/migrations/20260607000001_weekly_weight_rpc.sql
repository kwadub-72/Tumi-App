CREATE OR REPLACE FUNCTION calculate_weekly_weight(
    p_user_id UUID,
    p_start_date DATE, -- Expected to be the Sunday of the local week
    p_end_date DATE    -- Expected to be the Saturday of the local week
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_avg_weight NUMERIC;
BEGIN
    -- The Math: SUM(logged_weights) / COUNT(logged_days).
    -- Missing days are skipped because we only count rows that exist and have a non-null weight.
    -- The start and end dates respect local timezone boundaries passed in by the client (Sunday to Saturday).
    SELECT 
        CASE 
            WHEN COUNT(weight) > 0 THEN SUM(weight) / COUNT(weight)
            ELSE NULL
        END INTO v_avg_weight
    FROM weights
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date
      AND weight IS NOT NULL;

    RETURN ROUND(v_avg_weight, 2);
END;
$$;
