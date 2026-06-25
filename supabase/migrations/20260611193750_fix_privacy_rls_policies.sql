-- Create followers table if not exists
CREATE TABLE IF NOT EXISTS public.followers (
    follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    leader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('pending', 'approved')),
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (follower_id, leader_id)
);

-- Enable RLS on followers table
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own follow relationships" ON public.followers;
DROP POLICY IF EXISTS "Users can manage their own follow relationships" ON public.followers;

-- Create policies for followers table
CREATE POLICY "Users can view their own follow relationships"
ON public.followers FOR SELECT
TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = leader_id);

CREATE POLICY "Users can manage their own follow relationships"
ON public.followers FOR ALL
TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = leader_id);

-- Insert existing follows into followers table (as approved)
INSERT INTO public.followers (follower_id, leader_id, status, created_at)
SELECT follower_id, following_id, 'approved', created_at
FROM public.follows
ON CONFLICT (follower_id, leader_id) DO UPDATE
SET status = 'approved';

-- Insert existing follow_requests into followers table (as pending)
INSERT INTO public.followers (follower_id, leader_id, status, created_at)
SELECT follower_id, following_id, 'pending', created_at
FROM public.follow_requests
ON CONFLICT (follower_id, leader_id) DO NOTHING;

-- Trigger function to sync public.follows inserts/deletes to public.followers
CREATE OR REPLACE FUNCTION public.sync_follows_to_followers()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.followers (follower_id, leader_id, status, created_at)
        VALUES (NEW.follower_id, NEW.following_id, 'approved', NEW.created_at)
        ON CONFLICT (follower_id, leader_id) DO UPDATE
        SET status = 'approved';
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.followers
        WHERE follower_id = OLD.follower_id AND leader_id = OLD.following_id AND status = 'approved';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to sync public.follow_requests inserts/deletes to public.followers
CREATE OR REPLACE FUNCTION public.sync_follow_requests_to_followers()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.followers (follower_id, leader_id, status, created_at)
        VALUES (NEW.follower_id, NEW.following_id, 'pending', NEW.created_at)
        ON CONFLICT (follower_id, leader_id) DO UPDATE
        SET status = 'pending';
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.followers
        WHERE follower_id = OLD.follower_id AND leader_id = OLD.following_id AND status = 'pending';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind triggers to public.follows and public.follow_requests
DROP TRIGGER IF EXISTS trigger_sync_follows_to_followers ON public.follows;
CREATE TRIGGER trigger_sync_follows_to_followers
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.sync_follows_to_followers();

DROP TRIGGER IF EXISTS trigger_sync_follow_requests_to_followers ON public.follow_requests;
CREATE TRIGGER trigger_sync_follow_requests_to_followers
AFTER INSERT OR DELETE ON public.follow_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_follow_requests_to_followers();

-- 1. Secure the profiles Table
-- DROP the overly permissive policy: "Users can view relevant profiles"
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;

-- DROP other select policies to ensure the new policy is the unified one
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_private_followers" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_private_tribe_members" ON public.profiles;

-- Create the new unified SELECT policy for profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT
USING (
    (auth.uid() = id)
    OR (is_private = false)
    OR (is_private = true AND EXISTS (
        SELECT 1 FROM public.followers
        WHERE follower_id = auth.uid()
          AND leader_id = public.profiles.id
          AND status = 'approved'
    ))
);

-- 2. Rewrite the posts Table Policy
-- DROP the existing "Privacy Engine for Posts" policy
DROP POLICY IF EXISTS "Privacy Engine for Posts" ON public.posts;

-- Create a new, granular SELECT policy that evaluates the author's metrics flags
CREATE POLICY "Privacy Engine for Posts" ON public.posts
FOR SELECT
USING (
    -- The user is the author
    (auth.uid() = author_id)
    OR
    -- OR the author is a followed private user (Followers bypass metric restrictions)
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = posts.author_id
          AND p.is_private = true
          AND EXISTS (
              SELECT 1 FROM public.followers f
              WHERE f.follower_id = auth.uid()
                AND f.leader_id = posts.author_id
                AND f.status = 'approved'
          )
    ))
    OR
    -- OR the author is PUBLIC (is_private = false) AND the post type aligns with its specific visibility flag
    (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = posts.author_id
          AND p.is_private = false
          AND (
              (posts.post_type = 'meal' AND p.show_meals_to_public = true)
              OR (posts.post_type = 'workout' AND p.show_workouts_to_public = true)
              OR (posts.post_type IN ('macro_update', 'snapshot', 'map_publish', 'map_subscribe') AND p.show_macros_to_public = true)
          )
    ))
);
