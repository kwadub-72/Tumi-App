ALTER TABLE public.macro_map_subscriptions
ADD CONSTRAINT unique_user_map_subscription UNIQUE (user_id, map_id);
