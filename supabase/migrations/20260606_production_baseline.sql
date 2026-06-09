
-- ==========================================
-- Migration: 20260404201246_initial_schema
-- ==========================================
-- ═══════════════════════════════════════════════════════════
-- TUMI APP — INITIAL SCHEMA
-- ═══════════════════════════════════════════════════════════

-- ── Profiles ────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle        text UNIQUE NOT NULL,
  name          text NOT NULL,
  avatar_url    text,
  bio           text,
  status        text DEFAULT 'none' CHECK (status IN ('none','natural-pending','natural','enhanced')),
  activity      text,
  activity_icon text,
  height        text,
  weight_lbs    int,
  body_fat_pct  text,
  macro_targets jsonb DEFAULT '{"p":200,"c":300,"f":60,"calories":2520}'::jsonb,
  training_target text,
  last_macro_update date DEFAULT CURRENT_DATE,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ── Tribes ──────────────────────────────────────────────────
CREATE TABLE public.tribes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  avatar_url   text,
  theme_color  text DEFAULT '#A4B69D',
  tribe_type   text CHECK (tribe_type IN ('accountability','head-to-head','tribe-vs-tribe')),
  privacy      text DEFAULT 'public' CHECK (privacy IN ('public','private')),
  description  text,
  tags         text[],
  chief_id     uuid REFERENCES public.profiles(id),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.tribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tribes are public" ON public.tribes FOR SELECT USING (true);
CREATE POLICY "Chief can update tribe" ON public.tribes FOR UPDATE USING (auth.uid() = chief_id);
CREATE POLICY "Authenticated users can create tribes" ON public.tribes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── Tribe Members ────────────────────────────────────────────
CREATE TABLE public.tribe_members (
  tribe_id   uuid REFERENCES public.tribes(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       text DEFAULT 'member' CHECK (role IN ('chief','member','pending')),
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY (tribe_id, user_id)
);

ALTER TABLE public.tribe_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tribe members are public" ON public.tribe_members FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join tribes" ON public.tribe_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave tribes" ON public.tribe_members FOR DELETE USING (auth.uid() = user_id);

-- ── Follows ─────────────────────────────────────────────────
CREATE TABLE public.follows (
  follower_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are public" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- ── Posts ────────────────────────────────────────────────────
CREATE TABLE public.posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_type   text NOT NULL CHECK (post_type IN ('meal','workout','macro_update','snapshot')),
  payload     jsonb NOT NULL,
  caption     text,
  media_url   text,
  media_type  text CHECK (media_type IN ('image','video')),
  tribe_id    uuid REFERENCES public.tribes(id),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are public" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authors can insert posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can delete posts" ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- ── Post Likes ───────────────────────────────────────────────
CREATE TABLE public.post_likes (
  post_id    uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Post likes are public" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- ── Post Bookmarks ───────────────────────────────────────────
CREATE TABLE public.post_bookmarks (
  post_id    uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own bookmarks" ON public.post_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can bookmark" ON public.post_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove bookmark" ON public.post_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- ── Post Copies ──────────────────────────────────────────────
CREATE TABLE public.post_copies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  copy_type   text DEFAULT 'standard' CHECK (copy_type IN ('standard','tribe')),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.post_copies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Copies are public" ON public.post_copies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can copy" ON public.post_copies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Comments ─────────────────────────────────────────────────
CREATE TABLE public.comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are public" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can delete comments" ON public.comments FOR DELETE USING (auth.uid() = author_id);

-- ── Comment Likes ────────────────────────────────────────────
CREATE TABLE public.comment_likes (
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comment likes are public" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════

-- Posts enriched with counts (no current-user context, counts only)
CREATE OR REPLACE VIEW public.posts_with_counts AS
SELECT
  p.*,
  pr.handle          AS author_handle,
  pr.name            AS author_name,
  pr.avatar_url      AS author_avatar,
  pr.status          AS author_status,
  pr.activity        AS author_activity,
  pr.activity_icon   AS author_activity_icon,
  pr.macro_targets   AS author_macro_targets,
  COALESCE(l.like_count, 0)       AS like_count,
  COALESCE(c.comment_count, 0)    AS comment_count,
  COALESCE(cp.copy_count, 0)      AS copy_count,
  COALESCE(bk.bookmark_count, 0)  AS bookmark_count
FROM public.posts p
JOIN public.profiles pr ON pr.id = p.author_id
LEFT JOIN (
  SELECT post_id, COUNT(*) AS like_count FROM public.post_likes GROUP BY post_id
) l  ON l.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) AS comment_count FROM public.comments GROUP BY post_id
) c  ON c.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) AS copy_count FROM public.post_copies GROUP BY post_id
) cp ON cp.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) AS bookmark_count FROM public.post_bookmarks GROUP BY post_id
) bk ON bk.post_id = p.id;

-- Indexes for performance
CREATE INDEX idx_posts_author     ON public.posts(author_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_tribe      ON public.posts(tribe_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_comments_post    ON public.comments(post_id);
CREATE INDEX idx_post_likes_post  ON public.post_likes(post_id);
CREATE INDEX idx_tribe_members_tribe ON public.tribe_members(tribe_id);

-- ==========================================
-- Migration: 20260420201008_add_privacy_to_profiles
-- ==========================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.follow_requests (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sent/received requests"
ON public.follow_requests FOR SELECT
TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can send follow requests"
ON public.follow_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own sent/received requests"
ON public.follow_requests FOR DELETE
TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- ==========================================
-- Migration: 20260421200735_add_privacy_engine
-- ==========================================
-- Add visibility columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_meals_to_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_workouts_to_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_macros_to_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_measurements_to_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_likes_to_public BOOLEAN DEFAULT false;

-- Add allowance columns to tribes
ALTER TABLE public.tribes 
ADD COLUMN IF NOT EXISTS allow_meals BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_workouts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_macros BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_likes BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_measurements BOOLEAN DEFAULT true;

-- Update posts RLS
DROP POLICY IF EXISTS "Posts are public" ON public.posts;
DROP POLICY IF EXISTS "Privacy Engine for Posts" ON public.posts;

CREATE POLICY "Privacy Engine for Posts" ON public.posts
AS PERMISSIVE FOR SELECT
TO public
USING (
   auth.uid() = author_id
   OR
   EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = posts.author_id
      AND (
         p.is_private = false
         OR
         (
            p.is_private = true
            AND
            (
               (
                  EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = posts.author_id)
                  AND 
                  (
                     (posts.post_type = 'meal' AND p.show_meals_to_public = true) OR
                     (posts.post_type = 'workout' AND p.show_workouts_to_public = true) OR
                     (posts.post_type IN ('macro_update', 'snapshot') AND p.show_macros_to_public = true)
                  )
               )
               OR
               EXISTS (
                  SELECT 1 
                  FROM public.tribe_members tm1
                  JOIN public.tribe_members tm2 ON tm1.tribe_id = tm2.tribe_id
                  JOIN public.tribes t ON tm1.tribe_id = t.id
                  WHERE tm1.user_id = auth.uid() AND tm2.user_id = posts.author_id
                  AND
                  (
                     (posts.post_type = 'meal' AND t.allow_meals = true) OR
                     (posts.post_type = 'workout' AND t.allow_workouts = true) OR
                     (posts.post_type IN ('macro_update', 'snapshot') AND t.allow_macros = true)
                  )
               )
            )
         )
      )
   )
);

-- Update post_likes RLS
DROP POLICY IF EXISTS "Post likes are public" ON public.post_likes;
DROP POLICY IF EXISTS "Privacy Engine for Post Likes" ON public.post_likes;

CREATE POLICY "Privacy Engine for Post Likes" ON public.post_likes
AS PERMISSIVE FOR SELECT
TO public
USING (
   auth.uid() = user_id
   OR
   EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = post_likes.user_id
      AND (
         p.is_private = false
         OR
         (
            p.is_private = true
            AND
            (
               (
                  EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = post_likes.user_id)
                  AND p.show_likes_to_public = true
               )
               OR
               EXISTS (
                  SELECT 1 
                  FROM public.tribe_members tm1
                  JOIN public.tribe_members tm2 ON tm1.tribe_id = tm2.tribe_id
                  JOIN public.tribes t ON tm1.tribe_id = t.id
                  WHERE tm1.user_id = auth.uid() AND tm2.user_id = post_likes.user_id
                  AND t.allow_likes = true
               )
            )
         )
      )
   )
);

-- ==========================================
-- Migration: 20260422002206_add_email_redirect_allowlist
-- ==========================================
-- Note: Supabase's redirect URL allowlist is managed via the Auth config API,
-- not via SQL. This migration is a no-op placeholder.
-- The redirect URLs must be added via the Dashboard UI or Management API.
SELECT 1;

-- ==========================================
-- Migration: 20260422012307_add_social_links_to_profiles
-- ==========================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS instagram_link TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS tiktok_link TEXT DEFAULT NULL;

-- ==========================================
-- Migration: 20260422200039_add_messages_table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES public.profiles(id) NOT NULL,
    receiver_id uuid REFERENCES public.profiles(id) NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ==========================================
-- Migration: 20260422205405_update_user_password
-- ==========================================
-- [CLEANED SEED DATA] UPDATE auth.users 
-- [CLEANED SEED DATA] SET encrypted_password = crypt('GoTribe7255!', gen_salt('bf'))
-- [CLEANED SEED DATA] WHERE id = '00000000-0000-0000-0000-000000000001';

-- ==========================================
-- Migration: 20260422205558_reset_user_password_v2
-- ==========================================
-- [CLEANED SEED DATA] UPDATE auth.users 
-- [CLEANED SEED DATA] SET encrypted_password = crypt('GoTribe7255!', gen_salt('bf'))
-- [CLEANED SEED DATA] WHERE email = 'kwadub72@gmail.com';

-- ==========================================
-- Migration: 20260422205818_fix_null_aud
-- ==========================================
-- [CLEANED SEED DATA] UPDATE auth.users SET aud = 'authenticated' WHERE aud IS NULL;

-- ==========================================
-- Migration: 20260422210137_fix_auth_schema_corruption
-- ==========================================
-- 1. Ensure 'aud' is set correctly for all users
-- [CLEANED SEED DATA] UPDATE auth.users SET aud = 'authenticated' WHERE aud IS NULL OR aud = '';

-- 2. Repair any orphaned identities or missing links
-- [CLEANED SEED DATA] INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
-- [CLEANED SEED DATA] SELECT id, id, format('{"sub":"%s","email":"%s"}', id, email)::jsonb, 'email', now(), now(), now() 
-- [CLEANED SEED DATA] FROM auth.users 
-- [CLEANED SEED DATA] WHERE id NOT IN (SELECT user_id FROM auth.identities)
-- [CLEANED SEED DATA] ON CONFLICT DO NOTHING;

-- 3. Reset the password one last time to ensure synchronization
-- [CLEANED SEED DATA] UPDATE auth.users 
-- [CLEANED SEED DATA] SET encrypted_password = crypt('GoTribe7255!', gen_salt('bf')),
-- [CLEANED SEED DATA]     updated_at = now()
-- [CLEANED SEED DATA] WHERE email = 'kwadub72@gmail.com';

-- ==========================================
-- Migration: 20260422210428_auth_repair_v4_identities_fix
-- ==========================================
-- 1. Ensure the auth user has all critical handshaking fields populated
-- [CLEANED SEED DATA] UPDATE auth.users 
-- [CLEANED SEED DATA] SET 
-- [CLEANED SEED DATA]   aud = 'authenticated',
-- [CLEANED SEED DATA]   role = 'authenticated',
-- [CLEANED SEED DATA]   is_sso_user = false,
-- [CLEANED SEED DATA]   is_anonymous = false,
-- [CLEANED SEED DATA]   email_confirmed_at = COALESCE(email_confirmed_at, now()),
-- [CLEANED SEED DATA]   last_sign_in_at = COALESCE(last_sign_in_at, now()),
-- [CLEANED SEED DATA]   raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
-- [CLEANED SEED DATA]   raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb),
-- [CLEANED SEED DATA]   instance_id = '00000000-0000-0000-0000-000000000000'
-- [CLEANED SEED DATA] WHERE email = 'kwadub72@gmail.com';

-- 2. Repair identities table (adding the required 'provider_id' which is usually the user ID or sub)
-- [CLEANED SEED DATA] DELETE FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000001';
-- [CLEANED SEED DATA] INSERT INTO auth.identities (
-- [CLEANED SEED DATA]     id, 
-- [CLEANED SEED DATA]     user_id, 
-- [CLEANED SEED DATA]     provider_id,
-- [CLEANED SEED DATA]     identity_data, 
-- [CLEANED SEED DATA]     provider, 
-- [CLEANED SEED DATA]     last_sign_in_at, 
-- [CLEANED SEED DATA]     created_at, 
-- [CLEANED SEED DATA]     updated_at
-- [CLEANED SEED DATA] ) VALUES (
-- [CLEANED SEED DATA]     '00000000-0000-0000-0000-000000000001', 
-- [CLEANED SEED DATA]     '00000000-0000-0000-0000-000000000001', 
-- [CLEANED SEED DATA]     '00000000-0000-0000-0000-000000000001',
-- [CLEANED SEED DATA]     '{"sub":"00000000-0000-0000-0000-000000000001","email":"kwadub72@gmail.com"}'::jsonb, 
-- [CLEANED SEED DATA]     'email', 
-- [CLEANED SEED DATA]     now(), 
-- [CLEANED SEED DATA]     now(), 
-- [CLEANED SEED DATA]     now()
-- [CLEANED SEED DATA] );

-- 3. Re-hash password
-- [CLEANED SEED DATA] UPDATE auth.users 
-- [CLEANED SEED DATA] SET encrypted_password = crypt('GoTribe7255!', gen_salt('bf'))
-- [CLEANED SEED DATA] WHERE email = 'kwadub72@gmail.com';

-- ==========================================
-- Migration: 20260422210706_fix_security_definer_view
-- ==========================================
-- Drop and recreate the view WITHOUT security definer so PostgREST can introspect it
DROP VIEW IF EXISTS public.posts_with_counts;

CREATE VIEW public.posts_with_counts 
WITH (security_invoker = true)
AS
SELECT 
    p.id,
    p.author_id,
    p.post_type,
    p.payload,
    p.caption,
    p.media_url,
    p.media_type,
    p.tribe_id,
    p.created_at,
    pr.handle            AS author_handle,
    pr.name              AS author_name,
    pr.avatar_url        AS author_avatar,
    pr.status            AS author_status,
    pr.activity          AS author_activity,
    pr.activity_icon     AS author_activity_icon,
    pr.macro_targets     AS author_macro_targets,
    COALESCE(l.like_count,     0) AS like_count,
    COALESCE(c.comment_count,  0) AS comment_count,
    COALESCE(cp.copy_count,    0) AS copy_count,
    COALESCE(bk.bookmark_count,0) AS bookmark_count
FROM posts p
JOIN profiles pr ON pr.id = p.author_id
LEFT JOIN (
    SELECT post_id, count(*) AS like_count FROM post_likes GROUP BY post_id
) l ON l.post_id = p.id
LEFT JOIN (
    SELECT post_id, count(*) AS comment_count FROM comments GROUP BY post_id
) c ON c.post_id = p.id
LEFT JOIN (
    SELECT post_id, count(*) AS copy_count FROM post_copies GROUP BY post_id
) cp ON cp.post_id = p.id
LEFT JOIN (
    SELECT post_id, count(*) AS bookmark_count FROM post_bookmarks GROUP BY post_id
) bk ON bk.post_id = p.id;

-- ==========================================
-- Migration: 20260422211033_restore_auth_instance_record
-- ==========================================
-- The seed script ran TRUNCATE auth.users CASCADE which wiped auth.instances too.
-- This is the root cause: GoTrue needs one row in auth.instances with the nil UUID.
-- [CLEANED SEED DATA] INSERT INTO auth.instances (id, uuid, raw_base_config, created_at, updated_at)
-- [CLEANED SEED DATA] VALUES (
-- [CLEANED SEED DATA]     '00000000-0000-0000-0000-000000000000',
-- [CLEANED SEED DATA]     '00000000-0000-0000-0000-000000000000',
-- [CLEANED SEED DATA]     '{}',
-- [CLEANED SEED DATA]     now(),
-- [CLEANED SEED DATA]     now()
-- [CLEANED SEED DATA] )
-- [CLEANED SEED DATA] ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Migration: 20260422212601_fix_null_string_columns_in_auth_users
-- ==========================================
-- GoTrue's Go scanner cannot convert NULL to string for these fields.
-- They must be empty strings, not NULL.
-- [CLEANED SEED DATA] UPDATE auth.users SET
-- [CLEANED SEED DATA]     confirmation_token    = COALESCE(confirmation_token, ''),
-- [CLEANED SEED DATA]     recovery_token        = COALESCE(recovery_token, ''),
-- [CLEANED SEED DATA]     email_change_token_new = COALESCE(email_change_token_new, ''),
-- [CLEANED SEED DATA]     email_change          = COALESCE(email_change, '')
-- [CLEANED SEED DATA] WHERE 
-- [CLEANED SEED DATA]     confirmation_token IS NULL
-- [CLEANED SEED DATA]     OR recovery_token IS NULL
-- [CLEANED SEED DATA]     OR email_change_token_new IS NULL
-- [CLEANED SEED DATA]     OR email_change IS NULL;

-- ==========================================
-- Migration: 20260422224719_create_weights_table
-- ==========================================
CREATE TABLE public.weights (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  weight numeric NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.weights ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own weights"
  ON public.weights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weights"
  ON public.weights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weights"
  ON public.weights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weights"
  ON public.weights FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- Migration: 20260425001127_account_creation_backend_logic
-- ==========================================
DROP FUNCTION IF EXISTS public.check_account_availability CASCADE;
CREATE OR REPLACE FUNCTION public.check_account_availability(new_email text, new_username text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_exists boolean;
  username_exists boolean;
BEGIN
  -- We must check auth.users directly. Since this is SECURITY DEFINER, it runs as postgres.
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = new_email) INTO email_exists;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE handle = new_username) INTO username_exists;

  IF email_exists THEN
    RETURN json_build_object('available', false, 'reason', 'Email address taken, use another.');
  END IF;

  IF username_exists THEN
    RETURN json_build_object('available', false, 'reason', 'Username taken, use another.');
  END IF;

  RETURN json_build_object('available', true);
END;
$$;

DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    handle,
    name,
    bio,
    is_private,
    avatar_url,
    height,
    weight_lbs,
    body_fat_pct
  ) VALUES (
    new.id,
    new.raw_user_meta_data->>'handle',
    new.raw_user_meta_data->>'name',
    COALESCE(new.raw_user_meta_data->>'bio', ''),
    COALESCE((new.raw_user_meta_data->>'is_private')::boolean, false),
    new.raw_user_meta_data->>'avatar_url',
    NULL,
    NULL,
    NULL
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop permissive read policy
DROP POLICY IF EXISTS "Profiles are public" ON public.profiles;

-- Read policy supporting is_private and follower/tribe logic
CREATE POLICY "Users can view relevant profiles"
  ON public.profiles FOR SELECT
  USING (
    is_private = false OR 
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.follows 
      WHERE follower_id = auth.uid() AND following_id = public.profiles.id
    ) OR
    EXISTS (
      SELECT 1 FROM public.tribe_members tm1
      JOIN public.tribe_members tm2 ON tm1.tribe_id = tm2.tribe_id
      WHERE tm1.user_id = auth.uid() AND tm2.user_id = public.profiles.id
    )
  );

-- Delete policy
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ==========================================
-- Migration: 20260427201421_explore_infrastructure
-- ==========================================
-- 1. Add new columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS engagement_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS similarity_score numeric DEFAULT 0;

-- 2. Add pg_trgm extension and indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS profiles_name_trgm_idx ON public.profiles USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_handle_trgm_idx ON public.profiles USING GIN (handle gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tribes_name_trgm_idx ON public.tribes USING GIN (name gin_trgm_ops);

-- 3. Insert into auth.users (this triggers public.profiles insertion)
-- [CLEANED SEED DATA] INSERT INTO auth.users (
-- [CLEANED SEED DATA]     id, email, raw_app_meta_data, raw_user_meta_data, is_super_admin, encrypted_password, created_at, updated_at, confirmation_token, email_confirmed_at
-- [CLEANED SEED DATA] ) VALUES
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000012', 'luke.skywalker@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@lskywalker", "name": "Luke Skywalker", "bio": "Force user in training."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000013', 'leia.organa@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@lorgana", "name": "Leia Organa", "bio": "Rebel leader."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000014', 'han.solo@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@hsolo", "name": "Han Solo", "bio": "Smuggler."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000015', 'chewbacca@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@chewie", "name": "Chewbacca", "bio": "Wookiee strength."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000016', 'obiwan.kenobi@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@okenobi", "name": "Obi-Wan Kenobi", "bio": "Jedi Master."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000017', 'darth.vader@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@dvader", "name": "Darth Vader", "bio": "Sith Lord."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000018', 'yoda@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@yoda", "name": "Yoda", "bio": "Do or do not."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000019', 'lando.calrissian@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@lcalrissian", "name": "Lando Calrissian", "bio": "Baron Administrator."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000020', 'boba.fett@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@bfett", "name": "Boba Fett", "bio": "Bounty hunter."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000021', 'padme.amidala@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@pamidala", "name": "Padme Amidala", "bio": "Senator."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000022', 'mace.windu@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@mwindu", "name": "Mace Windu", "bio": "Jedi Council."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000023', 'qui.gon@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@qgon", "name": "Qui-Gon Jinn", "bio": "Maverick."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now()),
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000024', 'ahoka.tano@tumiapp.dev', '{"provider": "email", "providers": ["email"]}', '{"handle": "@atano", "name": "Ahsoka Tano", "bio": "Former Jedi."}', false, crypt('password123', gen_salt('bf')), now(), now(), '', now())
-- [CLEANED SEED DATA] ON CONFLICT (id) DO NOTHING;

-- 4. Update the profiles created by the trigger to have full details
-- [CLEANED SEED DATA] UPDATE public.profiles SET 
-- [CLEANED SEED DATA]     status = t.status, activity = t.activity, activity_icon = t.activity_icon, height = t.height, weight_lbs = t.weight_lbs, body_fat_pct = t.body_fat_pct, macro_targets = t.macro_targets::jsonb, training_target = t.training_target
-- [CLEANED SEED DATA] FROM (VALUES
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000012', 'natural', 'Powerlifting', '🏋️', '5''9"', 160, '12%', '{"c": 350, "f": 70, "p": 160, "calories": 2670}', 'gain_muscle'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000013', 'natural', 'CrossFit', '🔥', '5''1"', 110, '18%', '{"c": 200, "f": 50, "p": 110, "calories": 1690}', 'maintain'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000014', 'natural', 'Running', '🏃', '6''1"', 180, '15%', '{"c": 300, "f": 80, "p": 180, "calories": 2640}', 'lose_fat'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000015', 'enhanced', 'Strongman', '💪', '7''6"', 250, '10%', '{"c": 500, "f": 100, "p": 250, "calories": 3900}', 'gain_muscle'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000016', 'natural', 'Yoga', '🧘', '5''10"', 170, '14%', '{"c": 250, "f": 60, "p": 150, "calories": 2140}', 'maintain'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000017', 'enhanced', 'Bodybuilding', '🔩', '6''8"', 275, '8%', '{"c": 400, "f": 80, "p": 300, "calories": 3520}', 'gain_muscle'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000018', 'natural', 'Calisthenics', '🤸', '2''2"', 37, '10%', '{"c": 100, "f": 30, "p": 40, "calories": 830}', 'maintain'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000019', 'natural', 'Cycling', '🚴', '5''10"', 175, '16%', '{"c": 280, "f": 70, "p": 160, "calories": 2390}', 'maintain'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000020', 'natural', 'Martial Arts', '🥋', '6''0"', 172, '11%', '{"c": 250, "f": 65, "p": 180, "calories": 2305}', 'gain_muscle'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000021', 'natural', 'Pilates', '✨', '5''5"', 120, '20%', '{"c": 200, "f": 55, "p": 100, "calories": 1695}', 'lose_fat'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000022', 'natural', 'Boxing', '🥊', '6''3"', 185, '12%', '{"c": 300, "f": 70, "p": 190, "calories": 2590}', 'maintain'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000023', 'natural', 'Hiking', '🥾', '6''4"', 195, '15%', '{"c": 320, "f": 80, "p": 180, "calories": 2720}', 'maintain'),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000024', 'natural', 'Gymnastics', '🤸‍♀️', '5''7"', 130, '14%', '{"c": 220, "f": 60, "p": 140, "calories": 1980}', 'gain_muscle')
-- [CLEANED SEED DATA] ) AS t(id, status, activity, activity_icon, height, weight_lbs, body_fat_pct, macro_targets, training_target)
-- [CLEANED SEED DATA] WHERE public.profiles.id = t.id::uuid;

-- 5. Create search_explore RPC
DROP FUNCTION IF EXISTS search_explore CASCADE;
CREATE OR REPLACE FUNCTION search_explore(
    search_query text,
    search_type text DEFAULT 'users',
    result_limit integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    IF search_type = 'users' THEN
        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT 
                p.id,
                p.handle,
                p.name,
                p.avatar_url,
                p.bio,
                p.engagement_score,
                p.similarity_score
            FROM public.profiles p
            WHERE 
                search_query IS NULL 
                OR search_query = ''
                OR p.name ILIKE '%' || search_query || '%'
                OR p.handle ILIKE '%' || search_query || '%'
            ORDER BY 
                p.similarity_score DESC NULLS LAST,
                p.engagement_score DESC NULLS LAST,
                p.name ASC
            LIMIT result_limit
        ) t;
    ELSIF search_type = 'tribes' THEN
        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT 
                tr.id,
                tr.name,
                tr.avatar_url,
                tr.theme_color,
                tr.description,
                tr.tribe_type,
                (SELECT count(*) FROM public.tribe_members WHERE tribe_id = tr.id) as member_count
            FROM public.tribes tr
            WHERE 
                search_query IS NULL 
                OR search_query = ''
                OR tr.name ILIKE '%' || search_query || '%'
            ORDER BY 
                member_count DESC,
                tr.name ASC
            LIMIT result_limit
        ) t;
    END IF;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ==========================================
-- Migration: 20260427201958_explore_ranking_functions
-- ==========================================
-- Helper function to parse height text to inches safely
DROP FUNCTION IF EXISTS parse_height_to_inches CASCADE;
CREATE OR REPLACE FUNCTION parse_height_to_inches(h_text text)
RETURNS integer AS $$
DECLARE
    feet text;
    inches text;
BEGIN
    IF h_text IS NULL OR h_text = '' THEN RETURN 0; END IF;
    feet := split_part(h_text, '''', 1);
    inches := split_part(h_text, '''', 2);
    RETURN (COALESCE(NULLIF(feet, '')::integer, 0) * 12) + COALESCE(NULLIF(inches, '')::integer, 0);
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to parse body fat percentage text safely
DROP FUNCTION IF EXISTS parse_bf_to_numeric CASCADE;
CREATE OR REPLACE FUNCTION parse_bf_to_numeric(bf_text text)
RETURNS numeric AS $$
BEGIN
    IF bf_text IS NULL OR bf_text = '' THEN RETURN 0; END IF;
    RETURN replace(bf_text, '%', '')::numeric;
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Similarity scoring function
DROP FUNCTION IF EXISTS get_most_similar CASCADE;
CREATE OR REPLACE FUNCTION get_most_similar(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    handle text,
    name text,
    avatar_url text,
    status text,
    activity text,
    activity_icon text,
    height text,
    weight_lbs integer,
    body_fat_pct text,
    similarity_score numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_my_activity text;
    v_my_height_in int;
    v_my_weight_lbs int;
    v_my_bf_pct numeric;
BEGIN
    -- Get current user's profile data
    SELECT 
        activity, 
        parse_height_to_inches(height),
        weight_lbs,
        parse_bf_to_numeric(body_fat_pct)
    INTO v_my_activity, v_my_height_in, v_my_weight_lbs, v_my_bf_pct
    FROM profiles WHERE id = p_user_id;

    RETURN QUERY
    WITH scored_users AS (
        SELECT 
            p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height, p.weight_lbs, p.body_fat_pct,
            -- Scoring Logic
            (
                CASE WHEN p.activity = v_my_activity THEN 35 ELSE 0 END -- Activity (35 pts)
                + CASE WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25 ELSE 0 END -- Height (25 pts)
                + (
                    CASE 
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.01 THEN 25
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.025 THEN 15
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.04 THEN 5
                        ELSE 0 
                    END
                ) -- Weight (25 pts)
                + (
                    CASE 
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1.5 THEN 15
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 10
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 4 THEN 5
                        ELSE 0 
                    END
                ) -- Bodyfat (15 pts)
            )::numeric as score
        FROM profiles p
        WHERE p.id <> p_user_id
          AND p.id NOT IN (SELECT following_id FROM public.follows WHERE follower_id = p_user_id)
    )
    SELECT * FROM scored_users
    WHERE score >= 35
    ORDER BY score DESC;
END;
$$;

-- Popularity ranking function
DROP FUNCTION IF EXISTS get_most_popular CASCADE;
CREATE OR REPLACE FUNCTION get_most_popular(p_limit integer DEFAULT 5)
RETURNS TABLE (
    id uuid,
    handle text,
    name text,
    avatar_url text,
    status text,
    activity text,
    activity_icon text,
    height text,
    weight_lbs integer,
    body_fat_pct text,
    engagement_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height, p.weight_lbs, p.body_fat_pct,
        (
            (SELECT count(*) FROM public.post_copies pc JOIN public.posts po ON pc.post_id = po.id WHERE po.author_id = p.id) * 3 -- Copy W1=3
            + (SELECT count(*) FROM public.post_likes pl JOIN public.posts po ON pl.post_id = po.id WHERE po.author_id = p.id) * 2 -- Like W2=2
            + (SELECT count(*) FROM public.comments c JOIN public.posts po ON c.post_id = po.id WHERE po.author_id = p.id) * 1 -- Comment W3=1
        )::numeric as score
    FROM public.profiles p
    ORDER BY score DESC, p.created_at ASC
    LIMIT p_limit;
END;
$$;

-- ==========================================
-- Migration: 20260427202103_fix_explore_ranking_functions_ambiguity
-- ==========================================
-- Similarity scoring function fixed
DROP FUNCTION IF EXISTS get_most_similar CASCADE;
CREATE OR REPLACE FUNCTION get_most_similar(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    handle text,
    name text,
    avatar_url text,
    status text,
    activity text,
    activity_icon text,
    height text,
    weight_lbs integer,
    body_fat_pct text,
    similarity_score numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_my_activity text;
    v_my_height_in int;
    v_my_weight_lbs int;
    v_my_bf_pct numeric;
BEGIN
    -- Get current user's profile data
    SELECT 
        p.activity, 
        parse_height_to_inches(p.height),
        p.weight_lbs,
        parse_bf_to_numeric(p.body_fat_pct)
    INTO v_my_activity, v_my_height_in, v_my_weight_lbs, v_my_bf_pct
    FROM public.profiles p WHERE p.id = p_user_id;

    RETURN QUERY
    WITH scored_users AS (
        SELECT 
            p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height, p.weight_lbs, p.body_fat_pct,
            -- Scoring Logic
            (
                CASE WHEN p.activity = v_my_activity THEN 35 ELSE 0 END -- Activity (35 pts)
                + CASE WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25 ELSE 0 END -- Height (25 pts)
                + (
                    CASE 
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.01 THEN 25
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.025 THEN 15
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.04 THEN 5
                        ELSE 0 
                    END
                ) -- Weight (25 pts)
                + (
                    CASE 
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1.5 THEN 15
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 10
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 4 THEN 5
                        ELSE 0 
                    END
                ) -- Bodyfat (15 pts)
            )::numeric as score
        FROM public.profiles p
        WHERE p.id <> p_user_id
          AND p.id NOT IN (SELECT f.following_id FROM public.follows f WHERE f.follower_id = p_user_id)
    )
    SELECT * FROM scored_users
    WHERE score >= 35
    ORDER BY score DESC;
END;
$$;

-- Popularity ranking function fixed
DROP FUNCTION IF EXISTS get_most_popular CASCADE;
CREATE OR REPLACE FUNCTION get_most_popular(p_limit integer DEFAULT 5)
RETURNS TABLE (
    id uuid,
    handle text,
    name text,
    avatar_url text,
    status text,
    activity text,
    activity_icon text,
    height text,
    weight_lbs integer,
    body_fat_pct text,
    engagement_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height, p.weight_lbs, p.body_fat_pct,
        (
            (SELECT count(*) FROM public.post_copies pc JOIN public.posts po ON pc.post_id = po.id WHERE po.author_id = p.id) * 3 -- Copy W1=3
            + (SELECT count(*) FROM public.post_likes pl JOIN public.posts po ON pl.post_id = po.id WHERE po.author_id = p.id) * 2 -- Like W2=2
            + (SELECT count(*) FROM public.comments c JOIN public.posts po ON c.post_id = po.id WHERE po.author_id = p.id) * 1 -- Comment W3=1
        )::numeric as score
    FROM public.profiles p
    ORDER BY score DESC, p.created_at ASC
    LIMIT p_limit;
END;
$$;

-- ==========================================
-- Migration: 20260428011817_update_profiles_select_rls
-- ==========================================
DROP POLICY IF EXISTS "Users can view relevant profiles" ON profiles;

CREATE POLICY "Users can view relevant profiles"
ON profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- ==========================================
-- Migration: 20260428011824_add_profiles_search_indexes
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS profiles_handle_trgm_idx ON profiles USING gin (handle gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_name_trgm_idx ON profiles USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_handle_idx ON profiles (handle);

-- ==========================================
-- Migration: 20260428012003_update_similarity_threshold
-- ==========================================
DROP FUNCTION IF EXISTS get_most_similar CASCADE;
CREATE OR REPLACE FUNCTION get_most_similar(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    handle text,
    name text,
    avatar_url text,
    status text,
    activity text,
    activity_icon text,
    height text,
    weight_lbs integer,
    body_fat_pct text,
    similarity_score numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_my_activity text;
    v_my_height_in int;
    v_my_weight_lbs int;
    v_my_bf_pct numeric;
BEGIN
    -- Get current user's profile data
    SELECT 
        p.activity, 
        parse_height_to_inches(p.height),
        p.weight_lbs,
        parse_bf_to_numeric(p.body_fat_pct)
    INTO v_my_activity, v_my_height_in, v_my_weight_lbs, v_my_bf_pct
    FROM public.profiles p WHERE p.id = p_user_id;

    RETURN QUERY
    WITH scored_users AS (
        SELECT 
            p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height, p.weight_lbs, p.body_fat_pct,
            -- Scoring Logic
            (
                CASE WHEN p.activity = v_my_activity THEN 35 ELSE 0 END -- Activity (35 pts)
                + CASE WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25 ELSE 0 END -- Height (25 pts)
                + (
                    CASE 
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.01 THEN 25
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.025 THEN 15
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.04 THEN 5
                        ELSE 0 
                    END
                ) -- Weight (25 pts)
                + (
                    CASE 
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1.5 THEN 15
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 10
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 4 THEN 5
                        ELSE 0 
                    END
                ) -- Bodyfat (15 pts)
            )::numeric as score
        FROM public.profiles p
        WHERE p.id <> p_user_id
          AND p.id NOT IN (SELECT f.following_id FROM public.follows f WHERE f.follower_id = p_user_id)
    )
    SELECT * FROM scored_users
    WHERE score >= 25
    ORDER BY score DESC;
END;
$$;

-- ==========================================
-- Migration: 20260428012058_add_stats_columns_to_profiles
-- ==========================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meal_count int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS workout_count int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS update_count int DEFAULT 0;

-- ==========================================
-- Migration: 20260428012132_update_rpcs_for_stats_fixed
-- ==========================================
DROP FUNCTION IF EXISTS get_most_similar(uuid);
DROP FUNCTION IF EXISTS get_most_popular(integer);

-- Similarity scoring function fixed
DROP FUNCTION IF EXISTS get_most_similar CASCADE;
CREATE OR REPLACE FUNCTION get_most_similar(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    handle text,
    name text,
    avatar_url text,
    status text,
    activity text,
    activity_icon text,
    height text,
    weight_lbs integer,
    body_fat_pct text,
    similarity_score numeric,
    meal_count integer,
    workout_count integer,
    update_count integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_my_activity text;
    v_my_height_in int;
    v_my_weight_lbs int;
    v_my_bf_pct numeric;
BEGIN
    SELECT 
        p.activity, 
        parse_height_to_inches(p.height),
        p.weight_lbs,
        parse_bf_to_numeric(p.body_fat_pct)
    INTO v_my_activity, v_my_height_in, v_my_weight_lbs, v_my_bf_pct
    FROM public.profiles p WHERE p.id = p_user_id;

    RETURN QUERY
    WITH scored_users AS (
        SELECT 
            p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height, p.weight_lbs, p.body_fat_pct,
            (
                CASE WHEN p.activity = v_my_activity THEN 35 ELSE 0 END
                + CASE WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25 ELSE 0 END
                + (
                    CASE 
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.01 THEN 25
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.025 THEN 15
                        WHEN v_my_weight_lbs > 0 AND ABS(p.weight_lbs - v_my_weight_lbs)::numeric / v_my_weight_lbs <= 0.04 THEN 5
                        ELSE 0 
                    END
                )
                + (
                    CASE 
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1.5 THEN 15
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 10
                        WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 4 THEN 5
                        ELSE 0 
                    END
                )
            )::numeric as score,
            p.meal_count,
            p.workout_count,
            p.update_count
        FROM public.profiles p
        WHERE p.id <> p_user_id
          AND p.id NOT IN (SELECT f.following_id FROM public.follows f WHERE f.follower_id = p_user_id)
    )
    SELECT * FROM scored_users
    WHERE score >= 25
    ORDER BY score DESC;
END;
$$;

-- Popularity ranking function fixed
DROP FUNCTION IF EXISTS get_most_popular CASCADE;
CREATE OR REPLACE FUNCTION get_most_popular(p_limit integer DEFAULT 5)
RETURNS TABLE (
    id uuid,
    handle text,
    name text,
    avatar_url text,
    status text,
    activity text,
    activity_icon text,
    height text,
    weight_lbs integer,
    body_fat_pct text,
    engagement_score numeric,
    meal_count integer,
    workout_count integer,
    update_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height, p.weight_lbs, p.body_fat_pct,
        (
            (SELECT count(*) FROM public.post_copies pc JOIN public.posts po ON pc.post_id = po.id WHERE po.author_id = p.id) * 3
            + (SELECT count(*) FROM public.post_likes pl JOIN public.posts po ON pl.post_id = po.id WHERE po.author_id = p.id) * 2
            + (SELECT count(*) FROM public.comments c JOIN public.posts po ON c.post_id = po.id WHERE po.author_id = p.id) * 1
        )::numeric as score,
        p.meal_count,
        p.workout_count,
        p.update_count
    FROM public.profiles p
    ORDER BY score DESC, p.created_at ASC
    LIMIT p_limit;
END;
$$;

DROP FUNCTION IF EXISTS public.search_explore CASCADE;
CREATE OR REPLACE FUNCTION public.search_explore(search_query text, search_type text DEFAULT 'users'::text, result_limit integer DEFAULT 20)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result json;
BEGIN
    IF search_type = 'users' THEN
        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT 
                p.id,
                p.handle,
                p.name,
                p.avatar_url,
                p.bio,
                p.engagement_score,
                p.similarity_score,
                p.meal_count,
                p.workout_count,
                p.update_count,
                p.status,
                p.activity,
                p.activity_icon,
                p.height,
                p.weight_lbs,
                p.body_fat_pct
            FROM public.profiles p
            WHERE 
                search_query IS NULL 
                OR search_query = ''
                OR p.name ILIKE '%' || search_query || '%'
                OR p.handle ILIKE '%' || search_query || '%'
            ORDER BY 
                p.similarity_score DESC NULLS LAST,
                p.engagement_score DESC NULLS LAST,
                p.name ASC
            LIMIT result_limit
        ) t;
    ELSIF search_type = 'tribes' THEN
        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT 
                tr.id,
                tr.name,
                tr.avatar_url,
                tr.theme_color,
                tr.description,
                tr.tribe_type,
                (SELECT count(*) FROM public.tribe_members WHERE tribe_id = tr.id) as member_count
            FROM public.tribes tr
            WHERE 
                search_query IS NULL 
                OR search_query = ''
                OR tr.name ILIKE '%' || search_query || '%'
            ORDER BY 
                member_count DESC,
                tr.name ASC
            LIMIT result_limit
        ) t;
    END IF;

    RETURN COALESCE(result, '[]'::json);
END;
$function$;

-- ==========================================
-- Migration: 20260429015839_similarity_engine_v3
-- ==========================================
DROP FUNCTION IF EXISTS get_most_similar(uuid);

DROP FUNCTION IF EXISTS get_most_similar CASCADE;
CREATE OR REPLACE FUNCTION get_most_similar(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    handle text,
    name text,
    avatar_url text,
    status text,
    activity text,
    activity_icon text,
    height text,
    weight_lbs integer,
    body_fat_pct text,
    similarity_score numeric,
    meal_count integer,
    workout_count integer,
    update_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_my_activity   text;
    v_my_height_in  numeric;
    v_my_weight_lbs numeric;
    v_my_bf_pct     numeric;
BEGIN
    SELECT
        p.activity,
        parse_height_to_inches(p.height),
        p.weight_lbs::numeric,
        parse_bf_to_numeric(p.body_fat_pct)
    INTO v_my_activity, v_my_height_in, v_my_weight_lbs, v_my_bf_pct
    FROM public.profiles p
    WHERE p.id = p_user_id;

    RETURN QUERY
    WITH scored_users AS (
        SELECT
            p.id,
            p.handle,
            p.name,
            p.avatar_url,
            p.status,
            p.activity,
            p.activity_icon,
            p.height,
            p.weight_lbs,
            p.body_fat_pct,
            p.meal_count,
            p.workout_count,
            p.update_count,
            -- ── Activity: 30 pts ──────────────────────────────────────────
            (CASE WHEN p.activity = v_my_activity THEN 30 ELSE 0 END

            -- ── Bodyweight: 25 pts ────────────────────────────────────────
            + CASE
                WHEN v_my_weight_lbs > 0 AND
                     ABS(p.weight_lbs::numeric - v_my_weight_lbs) / v_my_weight_lbs <= 0.025
                    THEN 25
                WHEN v_my_weight_lbs > 0 AND
                     ABS(p.weight_lbs::numeric - v_my_weight_lbs) / v_my_weight_lbs <= 0.05
                    THEN 12.5
                WHEN v_my_weight_lbs > 0 AND
                     ABS(p.weight_lbs::numeric - v_my_weight_lbs) / v_my_weight_lbs <= 0.075
                    THEN 6.25
                ELSE 0
            END

            -- ── Height: 25 pts ────────────────────────────────────────────
            + CASE
                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1   THEN 25
                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 3   THEN 12.5
                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 4   THEN 6.25
                ELSE 0
            END

            -- ── Bodyfat: 20 pts ───────────────────────────────────────────
            + CASE
                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1   THEN 20
                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 2   THEN 10
                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3   THEN 5
                ELSE 0
            END)::numeric AS score
        FROM public.profiles p
        WHERE p.id <> p_user_id
          AND p.id NOT IN (
              SELECT f.following_id FROM public.follows f WHERE f.follower_id = p_user_id
          )
    )
    SELECT
        su.id, su.handle, su.name, su.avatar_url, su.status,
        su.activity, su.activity_icon, su.height, su.weight_lbs, su.body_fat_pct,
        su.score    AS similarity_score,
        su.meal_count, su.workout_count, su.update_count
    FROM scored_users su
    WHERE su.score > 0
    ORDER BY su.score DESC;
END;
$$;

-- ==========================================
-- Migration: 20260429023327_similarity_engine_v3_1_live_weight
-- ==========================================
-- Helper: resolve a user's live estimated weight from the weights table.
-- Logic mirrors SupabaseWeightService.getEstimatedWeight:
--   1. Average of entries in the current ISO week (Sun–Sat in local = Mon–Sun UTC approx)
--   2. Fall back to the most recent week that has any entries
--   3. Fall back to profiles.weight_lbs if no logged entries exist
DROP FUNCTION IF EXISTS resolve_live_weight CASCADE;
CREATE OR REPLACE FUNCTION resolve_live_weight(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    WITH
    -- All entries for the user, newest-first
    all_entries AS (
        SELECT weight, date
        FROM weights
        WHERE user_id = p_user_id
        ORDER BY date DESC
    ),
    -- Current week: Sunday of the current week through today
    week_bounds AS (
        SELECT
            date_trunc('week', CURRENT_DATE::timestamp) - INTERVAL '1 day' AS week_start,  -- Sunday
            CURRENT_DATE::date AS week_end
    ),
    current_week AS (
        SELECT AVG(ae.weight) AS avg_weight
        FROM all_entries ae, week_bounds wb
        WHERE ae.date >= wb.week_start::date
          AND ae.date <= wb.week_end
    ),
    -- Most recent prior week with data (any Sunday-to-Saturday window)
    most_recent_week AS (
        SELECT
            AVG(ae.weight) AS avg_weight
        FROM all_entries ae
        WHERE ae.date < (SELECT week_start::date FROM week_bounds)
        GROUP BY date_trunc('week', ae.date::timestamp - INTERVAL '1 day')  -- group by Sunday-anchored week
        ORDER BY date_trunc('week', ae.date::timestamp - INTERVAL '1 day') DESC
        LIMIT 1
    )
    SELECT COALESCE(
        -- 1. Current week average
        NULLIF((SELECT avg_weight FROM current_week), NULL),
        -- 2. Most recent prior week average
        NULLIF((SELECT avg_weight FROM most_recent_week), NULL),
        -- 3. Static profile fallback
        (SELECT weight_lbs::numeric FROM profiles WHERE id = p_user_id)
    );
$$;

-- Rebuild get_most_similar using live weight resolution + hard 5-user cap
DROP FUNCTION IF EXISTS get_most_similar(uuid);

DROP FUNCTION IF EXISTS get_most_similar CASCADE;
CREATE OR REPLACE FUNCTION get_most_similar(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    handle text,
    name text,
    avatar_url text,
    status text,
    activity text,
    activity_icon text,
    height text,
    weight_lbs integer,
    body_fat_pct text,
    similarity_score numeric,
    meal_count integer,
    workout_count integer,
    update_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_my_activity   text;
    v_my_height_in  numeric;
    v_my_weight_lbs numeric;   -- resolved from weights table
    v_my_bf_pct     numeric;
BEGIN
    -- Pull activity, height, bf% from profiles (bio fields)
    SELECT
        p.activity,
        parse_height_to_inches(p.height),
        parse_bf_to_numeric(p.body_fat_pct)
    INTO v_my_activity, v_my_height_in, v_my_bf_pct
    FROM public.profiles p
    WHERE p.id = p_user_id;

    -- Pull live weight from weights table (weekly avg → fallback to profile)
    v_my_weight_lbs := resolve_live_weight(p_user_id);

    RETURN QUERY
    WITH scored_users AS (
        SELECT
            p.id,
            p.handle,
            p.name,
            p.avatar_url,
            p.status,
            p.activity,
            p.activity_icon,
            p.height,
            p.weight_lbs,
            p.body_fat_pct,
            p.meal_count,
            p.workout_count,
            p.update_count,
            -- Resolve each candidate's live weight too
            resolve_live_weight(p.id) AS candidate_weight,
            (
                -- Activity: 30 pts
                CASE WHEN p.activity = v_my_activity THEN 30 ELSE 0 END

                -- Bodyweight: 25 pts (% diff vs live weight)
                + CASE
                    WHEN v_my_weight_lbs IS NOT NULL AND v_my_weight_lbs > 0 AND
                         ABS(resolve_live_weight(p.id) - v_my_weight_lbs) / v_my_weight_lbs <= 0.025
                        THEN 25
                    WHEN v_my_weight_lbs IS NOT NULL AND v_my_weight_lbs > 0 AND
                         ABS(resolve_live_weight(p.id) - v_my_weight_lbs) / v_my_weight_lbs <= 0.05
                        THEN 12.5
                    WHEN v_my_weight_lbs IS NOT NULL AND v_my_weight_lbs > 0 AND
                         ABS(resolve_live_weight(p.id) - v_my_weight_lbs) / v_my_weight_lbs <= 0.075
                        THEN 6.25
                    ELSE 0
                END

                -- Height: 25 pts (absolute inch diff)
                + CASE
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1   THEN 25
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 3   THEN 12.5
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 4   THEN 6.25
                    ELSE 0
                END

                -- Bodyfat: 20 pts (absolute pp diff)
                + CASE
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1   THEN 20
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 2   THEN 10
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3   THEN 5
                    ELSE 0
                END
            )::numeric AS score
        FROM public.profiles p
        WHERE p.id <> p_user_id
          AND p.id NOT IN (
              SELECT f.following_id FROM public.follows f WHERE f.follower_id = p_user_id
          )
    )
    SELECT
        su.id, su.handle, su.name, su.avatar_url, su.status,
        su.activity, su.activity_icon, su.height, su.weight_lbs, su.body_fat_pct,
        su.score    AS similarity_score,
        su.meal_count, su.workout_count, su.update_count
    FROM scored_users su
    WHERE su.score > 0
    ORDER BY su.score DESC
    LIMIT 5;   -- hard cap: show at most 5 users
END;
$$;

-- ==========================================
-- Migration: 20260429032855_rpcs_use_live_weight
-- ==========================================
-- ── search_explore ─────────────────────────────────────────────────────────
-- Return live_weight_lbs (from weights table weekly avg) instead of static weight_lbs
DROP FUNCTION IF EXISTS public.search_explore CASCADE;
CREATE OR REPLACE FUNCTION public.search_explore(
    search_query  text,
    search_type   text    DEFAULT 'users',
    result_limit  integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    result json;
BEGIN
    IF search_type = 'users' THEN
        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                p.id,
                p.handle,
                p.name,
                p.avatar_url,
                p.bio,
                p.engagement_score,
                p.similarity_score,
                p.meal_count,
                p.workout_count,
                p.update_count,
                p.status,
                p.activity,
                p.activity_icon,
                p.height,
                -- live weight: weekly-avg from weights table; fallback to profile column
                COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_weight_lbs,
                p.weight_lbs,   -- kept for reference / fallback
                p.body_fat_pct
            FROM public.profiles p
            WHERE
                search_query IS NULL
                OR search_query = ''
                OR p.name   ILIKE '%' || search_query || '%'
                OR p.handle ILIKE '%' || search_query || '%'
            ORDER BY
                p.similarity_score DESC NULLS LAST,
                p.engagement_score DESC NULLS LAST,
                p.name ASC
            LIMIT result_limit
        ) t;

    ELSIF search_type = 'tribes' THEN
        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                tr.id,
                tr.name,
                tr.avatar_url,
                tr.theme_color,
                tr.description,
                tr.tribe_type,
                (SELECT count(*) FROM public.tribe_members WHERE tribe_id = tr.id) AS member_count
            FROM public.tribes tr
            WHERE
                search_query IS NULL
                OR search_query = ''
                OR tr.name ILIKE '%' || search_query || '%'
            ORDER BY member_count DESC, tr.name ASC
            LIMIT result_limit
        ) t;
    END IF;

    RETURN COALESCE(result, '[]'::json);
END;
$function$;


-- ── get_most_popular ───────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_most_popular(integer);

DROP FUNCTION IF EXISTS get_most_popular CASCADE;
CREATE OR REPLACE FUNCTION get_most_popular(p_limit integer DEFAULT 5)
RETURNS TABLE (
    id              uuid,
    handle          text,
    name            text,
    avatar_url      text,
    status          text,
    activity        text,
    activity_icon   text,
    height          text,
    live_weight_lbs numeric,   -- live weekly-avg weight
    weight_lbs      integer,   -- static profile weight (kept for reference)
    body_fat_pct    text,
    engagement_score numeric,
    meal_count      integer,
    workout_count   integer,
    update_count    integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height,
        COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_weight_lbs,
        p.weight_lbs,
        p.body_fat_pct,
        (
            (SELECT count(*) FROM public.post_copies pc JOIN public.posts po ON pc.post_id = po.id WHERE po.author_id = p.id) * 3
            + (SELECT count(*) FROM public.post_likes  pl JOIN public.posts po ON pl.post_id = po.id WHERE po.author_id = p.id) * 2
            + (SELECT count(*) FROM public.comments    c  JOIN public.posts po ON c.post_id  = po.id WHERE po.author_id = p.id) * 1
        )::numeric AS score,
        p.meal_count,
        p.workout_count,
        p.update_count
    FROM public.profiles p
    ORDER BY score DESC, p.created_at ASC
    LIMIT p_limit;
END;
$$;


-- ── get_most_similar ───────────────────────────────────────────────────────
-- Already uses resolve_live_weight for scoring; also return it as live_weight_lbs
DROP FUNCTION IF EXISTS get_most_similar(uuid);

DROP FUNCTION IF EXISTS get_most_similar CASCADE;
CREATE OR REPLACE FUNCTION get_most_similar(p_user_id uuid)
RETURNS TABLE (
    id              uuid,
    handle          text,
    name            text,
    avatar_url      text,
    status          text,
    activity        text,
    activity_icon   text,
    height          text,
    live_weight_lbs numeric,   -- live weekly-avg weight
    weight_lbs      integer,   -- static profile weight (kept for reference)
    body_fat_pct    text,
    similarity_score numeric,
    meal_count      integer,
    workout_count   integer,
    update_count    integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_my_activity   text;
    v_my_height_in  numeric;
    v_my_weight_lbs numeric;
    v_my_bf_pct     numeric;
BEGIN
    SELECT
        p.activity,
        parse_height_to_inches(p.height),
        parse_bf_to_numeric(p.body_fat_pct)
    INTO v_my_activity, v_my_height_in, v_my_bf_pct
    FROM public.profiles p
    WHERE p.id = p_user_id;

    v_my_weight_lbs := resolve_live_weight(p_user_id);

    RETURN QUERY
    WITH scored_users AS (
        SELECT
            p.id,
            p.handle,
            p.name,
            p.avatar_url,
            p.status,
            p.activity,
            p.activity_icon,
            p.height,
            COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_w,
            p.weight_lbs,
            p.body_fat_pct,
            p.meal_count,
            p.workout_count,
            p.update_count,
            (
                CASE WHEN p.activity = v_my_activity THEN 30 ELSE 0 END

                + CASE
                    WHEN v_my_weight_lbs > 0 AND
                         ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                             / v_my_weight_lbs <= 0.025 THEN 25
                    WHEN v_my_weight_lbs > 0 AND
                         ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                             / v_my_weight_lbs <= 0.05  THEN 12.5
                    WHEN v_my_weight_lbs > 0 AND
                         ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                             / v_my_weight_lbs <= 0.075 THEN 6.25
                    ELSE 0
                END

                + CASE
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 3 THEN 12.5
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 4 THEN 6.25
                    ELSE 0
                END

                + CASE
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1 THEN 20
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 2 THEN 10
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 5
                    ELSE 0
                END
            )::numeric AS score
        FROM public.profiles p
        WHERE p.id <> p_user_id
          AND p.id NOT IN (
              SELECT f.following_id FROM public.follows f WHERE f.follower_id = p_user_id
          )
    )
    SELECT
        su.id, su.handle, su.name, su.avatar_url, su.status,
        su.activity, su.activity_icon, su.height,
        su.live_w AS live_weight_lbs,
        su.weight_lbs,
        su.body_fat_pct,
        su.score  AS similarity_score,
        su.meal_count, su.workout_count, su.update_count
    FROM scored_users su
    WHERE su.score > 0
    ORDER BY su.score DESC
    LIMIT 5;
END;
$$;

-- ==========================================
-- Migration: 20260429033350_sync_profile_weight_trigger
-- ==========================================
-- Function to calculate and sync estimated weight to profiles table
DROP FUNCTION IF EXISTS sync_user_weight_to_profile CASCADE;
CREATE OR REPLACE FUNCTION sync_user_weight_to_profile()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
    v_new_weight numeric;
BEGIN
    -- Determine user_id based on operation
    IF (TG_OP = 'DELETE') THEN
        v_user_id := OLD.user_id;
    ELSE
        v_user_id := NEW.user_id;
    END IF;

    -- Re-calculate the estimated weight using the authoritative logic
    -- (Same as resolve_live_weight we defined earlier)
    v_new_weight := resolve_live_weight(v_user_id);

    -- Update the profiles table
    UPDATE public.profiles
    SET weight_lbs = ROUND(v_new_weight)::integer
    WHERE id = v_user_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for weights table
DROP TRIGGER IF EXISTS on_weight_change ON public.weights;
CREATE TRIGGER on_weight_change
AFTER INSERT OR UPDATE OR DELETE ON public.weights
FOR EACH ROW EXECUTE FUNCTION sync_user_weight_to_profile();

-- Initial sync for all users to catch up
-- [CLEANED SEED DATA] UPDATE public.profiles p
-- [CLEANED SEED DATA] SET weight_lbs = ROUND(resolve_live_weight(p.id))::integer;

-- ==========================================
-- Migration: 20260429033410_fix_resolve_live_weight_week_logic
-- ==========================================
DROP FUNCTION IF EXISTS resolve_live_weight CASCADE;
CREATE OR REPLACE FUNCTION resolve_live_weight(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    WITH
    -- All entries for the user, newest-first
    all_entries AS (
        SELECT weight, date
        FROM weights
        WHERE user_id = p_user_id
        ORDER BY date DESC
    ),
    -- Helper to get Sunday of a given date
    sunday_of AS (
        SELECT (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE) || ' days')::interval)::date AS current_sun
    ),
    -- Current week: Sunday of the current week through today
    current_week AS (
        SELECT AVG(ae.weight) AS avg_weight
        FROM all_entries ae, sunday_of s
        WHERE ae.date >= s.current_sun
          AND ae.date <= CURRENT_DATE
    ),
    -- Most recent prior week with data (any Sunday-to-Saturday window)
    most_recent_prior_week AS (
        SELECT
            AVG(ae.weight) AS avg_weight
        FROM all_entries ae, sunday_of s
        WHERE ae.date < s.current_sun
        GROUP BY (ae.date - (EXTRACT(DOW FROM ae.date) || ' days')::interval)::date  -- group by Sunday
        ORDER BY (ae.date - (EXTRACT(DOW FROM ae.date) || ' days')::interval)::date DESC
        LIMIT 1
    )
    SELECT COALESCE(
        -- 1. Current week average
        (SELECT avg_weight FROM current_week),
        -- 2. Most recent prior week average
        (SELECT avg_weight FROM most_recent_prior_week),
        -- 3. Static profile fallback
        (SELECT weight_lbs::numeric FROM profiles WHERE id = p_user_id)
    );
$$;

-- Triggered update for all profiles
-- [CLEANED SEED DATA] UPDATE public.profiles p
-- [CLEANED SEED DATA] SET weight_lbs = ROUND(resolve_live_weight(p.id))::integer;

-- ==========================================
-- Migration: 20260429211248_search_explore_filtering
-- ==========================================
-- Step 1: Add indexes for frequently filtered columns
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles USING btree (status);
CREATE INDEX IF NOT EXISTS profiles_activity_idx ON public.profiles USING btree (activity);

-- Step 2: Update search_explore
DROP FUNCTION IF EXISTS public.search_explore CASCADE;
CREATE OR REPLACE FUNCTION public.search_explore(
    search_query text,
    search_type text DEFAULT 'users'::text,
    result_limit integer DEFAULT 25,
    p_user_id uuid DEFAULT NULL,
    p_filters jsonb DEFAULT '{}'::jsonb
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result json;
    v_my_activity   text;
    v_my_height_in  numeric;
    v_my_weight_lbs numeric;
    v_my_bf_pct     numeric;
BEGIN
    IF search_type = 'users' THEN
        IF p_user_id IS NOT NULL THEN
            SELECT
                p.activity,
                parse_height_to_inches(p.height),
                parse_bf_to_numeric(p.body_fat_pct)
            INTO v_my_activity, v_my_height_in, v_my_bf_pct
            FROM public.profiles p
            WHERE p.id = p_user_id;
            
            v_my_weight_lbs := resolve_live_weight(p_user_id);
        END IF;

        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                p.id,
                p.handle,
                p.name,
                p.avatar_url,
                p.bio,
                p.engagement_score,
                (
                    CASE 
                        WHEN p_user_id IS NULL THEN p.similarity_score
                        ELSE
                            (CASE WHEN p.activity = v_my_activity THEN 30 ELSE 0 END
                            + CASE
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.025 THEN 25
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.05  THEN 12.5
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.075 THEN 6.25
                                ELSE 0
                            END
                            + CASE
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 3 THEN 12.5
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 4 THEN 6.25
                                ELSE 0
                            END
                            + CASE
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1 THEN 20
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 2 THEN 10
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 5
                                ELSE 0
                            END)::numeric
                    END
                ) AS similarity_score,
                p.meal_count,
                p.workout_count,
                p.update_count,
                p.status,
                p.activity,
                p.activity_icon,
                p.height,
                COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_weight_lbs,
                p.weight_lbs,
                p.body_fat_pct
            FROM public.profiles p
            WHERE
                -- Filter by query
                (
                    search_query IS NULL
                    OR search_query = ''
                    OR p.name   ILIKE '%' || search_query || '%'
                    OR p.handle ILIKE '%' || search_query || '%'
                )
                -- Filter by Status (N/E)
                AND (
                    p_filters->>'status' IS NULL 
                    OR p_filters->>'status' = 'All' 
                    OR (p_filters->>'status' = 'none' AND (p.status IS NULL OR p.status = 'none')) 
                    OR lower(p.status) = lower(p_filters->>'status')
                )
                -- Filter by Activity
                AND (
                    p_filters->>'activity' IS NULL 
                    OR p_filters->>'activity' = 'All' 
                    OR p.activity = p_filters->>'activity'
                )
                -- Filter by min stats
                AND (p_filters->>'minMeals' IS NULL OR p.meal_count >= (p_filters->>'minMeals')::integer)
                AND (p_filters->>'minWorkouts' IS NULL OR p.workout_count >= (p_filters->>'minWorkouts')::integer)
                AND (p_filters->>'minUpdates' IS NULL OR p.update_count >= (p_filters->>'minUpdates')::integer)
                -- Filter by Height (using cm in filter, but stored height parsed to inches, so inch * 2.54 = cm)
                AND (
                    p_filters->>'heightTargetCm' IS NULL 
                    OR 
                    (
                        parse_height_to_inches(p.height) * 2.54 >= (p_filters->>'heightTargetCm')::numeric - (p_filters->>'heightRangeCm')::numeric
                        AND parse_height_to_inches(p.height) * 2.54 <= (p_filters->>'heightTargetCm')::numeric + (p_filters->>'heightRangeCm')::numeric
                    )
                )
                -- Filter by Weight
                AND (
                    p_filters->>'weightTarget' IS NULL 
                    OR
                    (
                        COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) >= (p_filters->>'weightTarget')::numeric - (p_filters->>'weightRange')::numeric
                        AND COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) <= (p_filters->>'weightTarget')::numeric + (p_filters->>'weightRange')::numeric
                    )
                )
                -- Filter by BodyFat
                AND (
                    p_filters->>'bfTarget' IS NULL 
                    OR
                    (
                        parse_bf_to_numeric(p.body_fat_pct) >= (p_filters->>'bfTarget')::numeric - (p_filters->>'bfRange')::numeric
                        AND parse_bf_to_numeric(p.body_fat_pct) <= (p_filters->>'bfTarget')::numeric + (p_filters->>'bfRange')::numeric
                    )
                )
            ORDER BY
                similarity_score DESC NULLS LAST,
                p.name ASC
            LIMIT result_limit
        ) t;

    ELSIF search_type = 'tribes' THEN
        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                tr.id,
                tr.name,
                tr.avatar_url,
                tr.theme_color,
                tr.description,
                tr.tribe_type,
                tr.visibility,
                (SELECT count(*) FROM public.tribe_members WHERE tribe_id = tr.id) AS member_count
            FROM public.tribes tr
            WHERE
                (
                    search_query IS NULL
                    OR search_query = ''
                    OR tr.name ILIKE '%' || search_query || '%'
                )
                AND (
                    p_filters->>'tribeFocus' IS NULL 
                    OR p_filters->>'tribeFocus' = 'All' 
                    OR replace(lower(tr.tribe_type), ' ', '-') = replace(lower(p_filters->>'tribeFocus'), ' ', '-')
                )
                AND (
                    p_filters->>'visibility' IS NULL 
                    OR p_filters->>'visibility' = 'All' 
                    OR lower(tr.visibility) = lower(p_filters->>'visibility')
                )
                AND (
                    p_filters->>'status' IS NULL 
                    OR p_filters->>'status' <> 'natural' 
                    OR tr.tags @> '["natural"]'::jsonb
                )
            ORDER BY member_count DESC, tr.name ASC
            LIMIT result_limit
        ) t;
    END IF;

    RETURN COALESCE(result, '[]'::json);
END;
$function$;

-- ==========================================
-- Migration: 20260429211904_fix_search_explore_tribe_column
-- ==========================================
DROP FUNCTION IF EXISTS public.search_explore CASCADE;
CREATE OR REPLACE FUNCTION public.search_explore(
    search_query text,
    search_type text DEFAULT 'users'::text,
    result_limit integer DEFAULT 25,
    p_user_id uuid DEFAULT NULL,
    p_filters jsonb DEFAULT '{}'::jsonb
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result json;
    v_my_activity   text;
    v_my_height_in  numeric;
    v_my_weight_lbs numeric;
    v_my_bf_pct     numeric;
BEGIN
    IF search_type = 'users' THEN
        IF p_user_id IS NOT NULL THEN
            SELECT
                p.activity,
                parse_height_to_inches(p.height),
                parse_bf_to_numeric(p.body_fat_pct)
            INTO v_my_activity, v_my_height_in, v_my_bf_pct
            FROM public.profiles p
            WHERE p.id = p_user_id;
            
            v_my_weight_lbs := resolve_live_weight(p_user_id);
        END IF;

        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                p.id,
                p.handle,
                p.name,
                p.avatar_url,
                p.bio,
                p.engagement_score,
                (
                    CASE 
                        WHEN p_user_id IS NULL THEN p.similarity_score
                        ELSE
                            (CASE WHEN p.activity = v_my_activity THEN 30 ELSE 0 END
                            + CASE
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.025 THEN 25
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.05  THEN 12.5
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.075 THEN 6.25
                                ELSE 0
                            END
                            + CASE
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 3 THEN 12.5
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 4 THEN 6.25
                                ELSE 0
                            END
                            + CASE
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1 THEN 20
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 2 THEN 10
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 5
                                ELSE 0
                            END)::numeric
                    END
                ) AS similarity_score,
                p.meal_count,
                p.workout_count,
                p.update_count,
                p.status,
                p.activity,
                p.activity_icon,
                p.height,
                COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_weight_lbs,
                p.weight_lbs,
                p.body_fat_pct
            FROM public.profiles p
            WHERE
                (
                    search_query IS NULL
                    OR search_query = ''
                    OR p.name   ILIKE '%' || search_query || '%'
                    OR p.handle ILIKE '%' || search_query || '%'
                )
                AND (
                    p_filters->>'status' IS NULL 
                    OR p_filters->>'status' = 'All' 
                    OR (p_filters->>'status' = 'none' AND (p.status IS NULL OR p.status = 'none')) 
                    OR lower(p.status) = lower(p_filters->>'status')
                )
                AND (
                    p_filters->>'activity' IS NULL 
                    OR p_filters->>'activity' = 'All' 
                    OR p.activity = p_filters->>'activity'
                )
                AND (p_filters->>'minMeals' IS NULL OR p.meal_count >= (p_filters->>'minMeals')::integer)
                AND (p_filters->>'minWorkouts' IS NULL OR p.workout_count >= (p_filters->>'minWorkouts')::integer)
                AND (p_filters->>'minUpdates' IS NULL OR p.update_count >= (p_filters->>'minUpdates')::integer)
                AND (
                    p_filters->>'heightTargetCm' IS NULL 
                    OR 
                    (
                        parse_height_to_inches(p.height) * 2.54 >= (p_filters->>'heightTargetCm')::numeric - (p_filters->>'heightRangeCm')::numeric
                        AND parse_height_to_inches(p.height) * 2.54 <= (p_filters->>'heightTargetCm')::numeric + (p_filters->>'heightRangeCm')::numeric
                    )
                )
                AND (
                    p_filters->>'weightTarget' IS NULL 
                    OR
                    (
                        COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) >= (p_filters->>'weightTarget')::numeric - (p_filters->>'weightRange')::numeric
                        AND COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) <= (p_filters->>'weightTarget')::numeric + (p_filters->>'weightRange')::numeric
                    )
                )
                AND (
                    p_filters->>'bfTarget' IS NULL 
                    OR
                    (
                        parse_bf_to_numeric(p.body_fat_pct) >= (p_filters->>'bfTarget')::numeric - (p_filters->>'bfRange')::numeric
                        AND parse_bf_to_numeric(p.body_fat_pct) <= (p_filters->>'bfTarget')::numeric + (p_filters->>'bfRange')::numeric
                    )
                )
            ORDER BY
                similarity_score DESC NULLS LAST,
                p.name ASC
            LIMIT result_limit
        ) t;

    ELSIF search_type = 'tribes' THEN
        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                tr.id,
                tr.name,
                tr.avatar_url,
                tr.theme_color,
                tr.description,
                tr.tribe_type,
                tr.privacy AS visibility,
                (SELECT count(*) FROM public.tribe_members WHERE tribe_id = tr.id) AS member_count
            FROM public.tribes tr
            WHERE
                (
                    search_query IS NULL
                    OR search_query = ''
                    OR tr.name ILIKE '%' || search_query || '%'
                )
                AND (
                    p_filters->>'tribeFocus' IS NULL 
                    OR p_filters->>'tribeFocus' = 'All' 
                    OR replace(lower(tr.tribe_type), ' ', '-') = replace(lower(p_filters->>'tribeFocus'), ' ', '-')
                )
                AND (
                    p_filters->>'visibility' IS NULL 
                    OR p_filters->>'visibility' = 'All' 
                    OR lower(tr.privacy) = lower(p_filters->>'visibility')
                )
                AND (
                    p_filters->>'status' IS NULL 
                    OR p_filters->>'status' <> 'natural' 
                    OR tr.tags @> '["natural"]'::jsonb
                )
            ORDER BY member_count DESC, tr.name ASC
            LIMIT result_limit
        ) t;
    END IF;

    RETURN COALESCE(result, '[]'::json);
END;
$function$;

-- ==========================================
-- Migration: 20260429212119_fix_tribes_tags_array_containment
-- ==========================================
DROP FUNCTION IF EXISTS public.search_explore CASCADE;
CREATE OR REPLACE FUNCTION public.search_explore(
    search_query text,
    search_type text DEFAULT 'users'::text,
    result_limit integer DEFAULT 25,
    p_user_id uuid DEFAULT NULL,
    p_filters jsonb DEFAULT '{}'::jsonb
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result json;
    v_my_activity   text;
    v_my_height_in  numeric;
    v_my_weight_lbs numeric;
    v_my_bf_pct     numeric;
BEGIN
    IF search_type = 'users' THEN
        IF p_user_id IS NOT NULL THEN
            SELECT
                p.activity,
                parse_height_to_inches(p.height),
                parse_bf_to_numeric(p.body_fat_pct)
            INTO v_my_activity, v_my_height_in, v_my_bf_pct
            FROM public.profiles p
            WHERE p.id = p_user_id;
            
            v_my_weight_lbs := resolve_live_weight(p_user_id);
        END IF;

        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                p.id,
                p.handle,
                p.name,
                p.avatar_url,
                p.bio,
                p.engagement_score,
                (
                    CASE 
                        WHEN p_user_id IS NULL THEN p.similarity_score
                        ELSE
                            (CASE WHEN p.activity = v_my_activity THEN 30 ELSE 0 END
                            + CASE
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.025 THEN 25
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.05  THEN 12.5
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.075 THEN 6.25
                                ELSE 0
                            END
                            + CASE
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 3 THEN 12.5
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 4 THEN 6.25
                                ELSE 0
                            END
                            + CASE
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1 THEN 20
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 2 THEN 10
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 5
                                ELSE 0
                            END)::numeric
                    END
                ) AS similarity_score,
                p.meal_count,
                p.workout_count,
                p.update_count,
                p.status,
                p.activity,
                p.activity_icon,
                p.height,
                COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_weight_lbs,
                p.weight_lbs,
                p.body_fat_pct
            FROM public.profiles p
            WHERE
                (
                    search_query IS NULL
                    OR search_query = ''
                    OR p.name   ILIKE '%' || search_query || '%'
                    OR p.handle ILIKE '%' || search_query || '%'
                )
                AND (
                    p_filters->>'status' IS NULL 
                    OR p_filters->>'status' = 'All' 
                    OR (p_filters->>'status' = 'none' AND (p.status IS NULL OR p.status = 'none')) 
                    OR lower(p.status) = lower(p_filters->>'status')
                )
                AND (
                    p_filters->>'activity' IS NULL 
                    OR p_filters->>'activity' = 'All' 
                    OR p.activity = p_filters->>'activity'
                )
                AND (p_filters->>'minMeals' IS NULL OR p.meal_count >= (p_filters->>'minMeals')::integer)
                AND (p_filters->>'minWorkouts' IS NULL OR p.workout_count >= (p_filters->>'minWorkouts')::integer)
                AND (p_filters->>'minUpdates' IS NULL OR p.update_count >= (p_filters->>'minUpdates')::integer)
                AND (
                    p_filters->>'heightTargetCm' IS NULL 
                    OR (
                        parse_height_to_inches(p.height) * 2.54 >= (p_filters->>'heightTargetCm')::numeric - (p_filters->>'heightRangeCm')::numeric
                        AND parse_height_to_inches(p.height) * 2.54 <= (p_filters->>'heightTargetCm')::numeric + (p_filters->>'heightRangeCm')::numeric
                    )
                )
                AND (
                    p_filters->>'weightTarget' IS NULL 
                    OR (
                        COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) >= (p_filters->>'weightTarget')::numeric - (p_filters->>'weightRange')::numeric
                        AND COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) <= (p_filters->>'weightTarget')::numeric + (p_filters->>'weightRange')::numeric
                    )
                )
                AND (
                    p_filters->>'bfTarget' IS NULL 
                    OR (
                        parse_bf_to_numeric(p.body_fat_pct) >= (p_filters->>'bfTarget')::numeric - (p_filters->>'bfRange')::numeric
                        AND parse_bf_to_numeric(p.body_fat_pct) <= (p_filters->>'bfTarget')::numeric + (p_filters->>'bfRange')::numeric
                    )
                )
            ORDER BY
                similarity_score DESC NULLS LAST,
                p.name ASC
            LIMIT result_limit
        ) t;

    ELSIF search_type = 'tribes' THEN
        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                tr.id,
                tr.name,
                tr.avatar_url,
                tr.theme_color,
                tr.description,
                tr.tribe_type,
                tr.privacy AS visibility,
                (SELECT count(*) FROM public.tribe_members WHERE tribe_id = tr.id) AS member_count
            FROM public.tribes tr
            WHERE
                (
                    search_query IS NULL
                    OR search_query = ''
                    OR tr.name ILIKE '%' || search_query || '%'
                )
                AND (
                    p_filters->>'tribeFocus' IS NULL 
                    OR p_filters->>'tribeFocus' = 'All' 
                    OR replace(lower(tr.tribe_type), ' ', '-') = replace(lower(p_filters->>'tribeFocus'), ' ', '-')
                )
                AND (
                    p_filters->>'visibility' IS NULL 
                    OR p_filters->>'visibility' = 'All' 
                    OR lower(tr.privacy) = lower(p_filters->>'visibility')
                )
                -- tags is a text[] column, use = ANY() for containment check
                AND (
                    p_filters->>'status' IS NULL 
                    OR p_filters->>'status' <> 'natural' 
                    OR ('natural' = ANY(tr.tags))
                )
            ORDER BY member_count DESC, tr.name ASC
            LIMIT result_limit
        ) t;
    END IF;

    RETURN COALESCE(result, '[]'::json);
END;
$function$;

-- ==========================================
-- Migration: 20260429212923_robust_search_explore_casting
-- ==========================================
DROP FUNCTION IF EXISTS public.search_explore CASCADE;
CREATE OR REPLACE FUNCTION public.search_explore(
    search_query text,
    search_type text DEFAULT 'users'::text,
    result_limit integer DEFAULT 25,
    p_user_id uuid DEFAULT NULL,
    p_filters jsonb DEFAULT '{}'::jsonb
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result json;
    v_my_activity   text;
    v_my_height_in  numeric;
    v_my_weight_lbs numeric;
    v_my_bf_pct     numeric;
BEGIN
    IF search_type = 'users' THEN
        IF p_user_id IS NOT NULL THEN
            SELECT
                p.activity,
                parse_height_to_inches(p.height),
                parse_bf_to_numeric(p.body_fat_pct)
            INTO v_my_activity, v_my_height_in, v_my_bf_pct
            FROM public.profiles p
            WHERE p.id = p_user_id;
            
            v_my_weight_lbs := resolve_live_weight(p_user_id);
        END IF;

        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                p.id,
                p.handle,
                p.name,
                p.avatar_url,
                p.bio,
                p.engagement_score,
                (
                    CASE 
                        WHEN p_user_id IS NULL THEN p.similarity_score
                        ELSE
                            (CASE WHEN p.activity = v_my_activity THEN 30 ELSE 0 END
                            + CASE
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.025 THEN 25
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.05  THEN 12.5
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.075 THEN 6.25
                                ELSE 0
                            END
                            + CASE
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 3 THEN 12.5
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 4 THEN 6.25
                                ELSE 0
                            END
                            + CASE
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1 THEN 20
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 2 THEN 10
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 5
                                ELSE 0
                            END)::numeric
                    END
                ) AS similarity_score,
                p.meal_count,
                p.workout_count,
                p.update_count,
                p.status,
                p.activity,
                p.activity_icon,
                p.height,
                COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_weight_lbs,
                p.weight_lbs,
                p.body_fat_pct
            FROM public.profiles p
            WHERE
                (
                    search_query IS NULL
                    OR search_query = ''
                    OR p.name   ILIKE '%' || search_query || '%'
                    OR p.handle ILIKE '%' || search_query || '%'
                )
                AND (
                    p_filters->>'status' IS NULL 
                    OR p_filters->>'status' = 'All' 
                    OR (p_filters->>'status' = 'none' AND (p.status IS NULL OR p.status = 'none')) 
                    OR lower(p.status) = lower(p_filters->>'status')
                )
                AND (
                    p_filters->>'activity' IS NULL 
                    OR p_filters->>'activity' = 'All' 
                    OR p.activity = p_filters->>'activity'
                )
                AND (NULLIF(p_filters->>'minMeals', '') IS NULL OR p.meal_count >= (p_filters->>'minMeals')::integer)
                AND (NULLIF(p_filters->>'minWorkouts', '') IS NULL OR p.workout_count >= (p_filters->>'minWorkouts')::integer)
                AND (NULLIF(p_filters->>'minUpdates', '') IS NULL OR p.update_count >= (p_filters->>'minUpdates')::integer)
                AND (
                    p_filters->>'heightTargetCm' IS NULL 
                    OR (
                        parse_height_to_inches(p.height) * 2.54 >= (p_filters->>'heightTargetCm')::numeric - (p_filters->>'heightRangeCm')::numeric
                        AND parse_height_to_inches(p.height) * 2.54 <= (p_filters->>'heightTargetCm')::numeric + (p_filters->>'heightRangeCm')::numeric
                    )
                )
                AND (
                    p_filters->>'weightTarget' IS NULL 
                    OR (
                        COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) >= (p_filters->>'weightTarget')::numeric - (p_filters->>'weightRange')::numeric
                        AND COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) <= (p_filters->>'weightTarget')::numeric + (p_filters->>'weightRange')::numeric
                    )
                )
                AND (
                    p_filters->>'bfTarget' IS NULL 
                    OR (
                        parse_bf_to_numeric(p.body_fat_pct) >= (p_filters->>'bfTarget')::numeric - (p_filters->>'bfRange')::numeric
                        AND parse_bf_to_numeric(p.body_fat_pct) <= (p_filters->>'bfTarget')::numeric + (p_filters->>'bfRange')::numeric
                    )
                )
            ORDER BY
                similarity_score DESC NULLS LAST,
                p.name ASC
            LIMIT result_limit
        ) t;

    ELSIF search_type = 'tribes' THEN
        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                tr.id,
                tr.name,
                tr.avatar_url,
                tr.theme_color,
                tr.description,
                tr.tribe_type,
                tr.privacy AS visibility,
                (SELECT count(*) FROM public.tribe_members WHERE tribe_id = tr.id) AS member_count
            FROM public.tribes tr
            WHERE
                (
                    search_query IS NULL
                    OR search_query = ''
                    OR tr.name ILIKE '%' || search_query || '%'
                )
                AND (
                    p_filters->>'tribeFocus' IS NULL 
                    OR p_filters->>'tribeFocus' = 'All' 
                    OR replace(lower(tr.tribe_type), ' ', '-') = replace(lower(p_filters->>'tribeFocus'), ' ', '-')
                )
                AND (
                    p_filters->>'visibility' IS NULL 
                    OR p_filters->>'visibility' = 'All' 
                    OR lower(tr.privacy) = lower(p_filters->>'visibility')
                )
                AND (
                    p_filters->>'status' IS NULL 
                    OR p_filters->>'status' <> 'natural' 
                    OR ('natural' = ANY(tr.tags))
                )
            ORDER BY member_count DESC, tr.name ASC
            LIMIT result_limit
        ) t;
    END IF;

    RETURN COALESCE(result, '[]'::json);
END;
$function$;

-- ==========================================
-- Migration: 20260429213314_fix_search_explore_counts_v2
-- ==========================================
DROP FUNCTION IF EXISTS public.search_explore CASCADE;
CREATE OR REPLACE FUNCTION public.search_explore(
    search_query text,
    search_type text,
    result_limit integer DEFAULT 25,
    p_user_id uuid DEFAULT NULL,
    p_filters jsonb DEFAULT '{}'::jsonb
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result json;
    v_my_activity   text;
    v_my_height_in  numeric;
    v_my_weight_lbs numeric;
    v_my_bf_pct     numeric;
BEGIN
    IF search_type = 'users' THEN
        -- Fetch current user metrics for similarity anchor
        IF p_user_id IS NOT NULL THEN
            SELECT
                p.activity,
                parse_height_to_inches(p.height),
                parse_bf_to_numeric(p.body_fat_pct)
            INTO v_my_activity, v_my_height_in, v_my_bf_pct
            FROM public.profiles p
            WHERE p.id = p_user_id;
            
            v_my_weight_lbs := resolve_live_weight(p_user_id);
        END IF;

        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                p.id,
                p.handle,
                p.name,
                p.avatar_url,
                p.bio,
                p.engagement_score,
                (
                    CASE 
                        WHEN p_user_id IS NULL THEN p.similarity_score
                        ELSE
                            (CASE WHEN p.activity = v_my_activity THEN 30 ELSE 0 END
                            + CASE
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.025 THEN 25
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.05  THEN 12.5
                                WHEN v_my_weight_lbs > 0 AND
                                     ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                                         / v_my_weight_lbs <= 0.075 THEN 6.25
                                ELSE 0
                            END
                            + CASE
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 3 THEN 12.5
                                WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 4 THEN 6.25
                                ELSE 0
                            END
                            + CASE
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1 THEN 20
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 2 THEN 10
                                WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 5
                                ELSE 0
                            END)::numeric
                    END
                ) AS similarity_score,
                COALESCE(stats.meal_count, 0) AS meal_count,
                COALESCE(stats.workout_count, 0) AS workout_count,
                COALESCE(stats.update_count, 0) AS update_count,
                p.status,
                p.activity,
                p.activity_icon,
                p.height,
                COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_weight_lbs,
                p.weight_lbs,
                p.body_fat_pct
            FROM public.profiles p
            LEFT JOIN LATERAL (
                SELECT 
                    COUNT(*) FILTER (WHERE post_type = 'meal') AS meal_count,
                    COUNT(*) FILTER (WHERE post_type = 'workout') AS workout_count,
                    COUNT(*) FILTER (WHERE post_type = 'macro_update') AS update_count
                FROM public.posts
                WHERE author_id = p.id
            ) stats ON true
            WHERE
                (
                    search_query IS NULL
                    OR search_query = ''
                    OR p.name   ILIKE '%' || search_query || '%'
                    OR p.handle ILIKE '%' || search_query || '%'
                )
                AND (
                    p_filters->>'status' IS NULL 
                    OR p_filters->>'status' = 'All' 
                    OR (p_filters->>'status' = 'none' AND (p.status IS NULL OR p.status = 'none')) 
                    OR lower(p.status) = lower(p_filters->>'status')
                )
                AND (
                    p_filters->>'activity' IS NULL 
                    OR p_filters->>'activity' = 'All' 
                    OR p.activity = p_filters->>'activity'
                )
                AND (NULLIF(p_filters->>'minMeals', '') IS NULL OR COALESCE(stats.meal_count, 0) >= (p_filters->>'minMeals')::integer)
                AND (NULLIF(p_filters->>'minWorkouts', '') IS NULL OR COALESCE(stats.workout_count, 0) >= (p_filters->>'minWorkouts')::integer)
                AND (NULLIF(p_filters->>'minUpdates', '') IS NULL OR COALESCE(stats.update_count, 0) >= (p_filters->>'minUpdates')::integer)
                AND (
                    p_filters->>'heightTargetCm' IS NULL 
                    OR (
                        parse_height_to_inches(p.height) * 2.54 >= (p_filters->>'heightTargetCm')::numeric - (p_filters->>'heightRangeCm')::numeric
                        AND parse_height_to_inches(p.height) * 2.54 <= (p_filters->>'heightTargetCm')::numeric + (p_filters->>'heightRangeCm')::numeric
                    )
                )
                AND (
                    p_filters->>'weightTarget' IS NULL 
                    OR (
                        COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) >= (p_filters->>'weightTarget')::numeric - (p_filters->>'weightRange')::numeric
                        AND COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) <= (p_filters->>'weightTarget')::numeric + (p_filters->>'weightRange')::numeric
                    )
                )
                AND (
                    p_filters->>'bfTarget' IS NULL 
                    OR (
                        parse_bf_to_numeric(p.body_fat_pct) >= (p_filters->>'bfTarget')::numeric - (p_filters->>'bfRange')::numeric
                        AND parse_bf_to_numeric(p.body_fat_pct) <= (p_filters->>'bfTarget')::numeric + (p_filters->>'bfRange')::numeric
                    )
                )
            ORDER BY
                similarity_score DESC NULLS LAST,
                p.name ASC
            LIMIT result_limit
        ) t;

    ELSIF search_type = 'tribes' THEN
        SELECT COALESCE(json_agg(t), '[]'::json) INTO result
        FROM (
            SELECT
                tr.id,
                tr.name,
                tr.avatar_url,
                tr.theme_color,
                tr.description,
                tr.tribe_type,
                tr.privacy AS visibility,
                (SELECT count(*) FROM public.tribe_members WHERE tribe_id = tr.id) AS member_count
            FROM public.tribes tr
            WHERE
                (
                    search_query IS NULL
                    OR search_query = ''
                    OR tr.name ILIKE '%' || search_query || '%'
                )
                AND (
                    p_filters->>'tribeFocus' IS NULL 
                    OR p_filters->>'tribeFocus' = 'All' 
                    OR replace(lower(tr.tribe_type), ' ', '-') = replace(lower(p_filters->>'tribeFocus'), ' ', '-')
                )
                AND (
                    p_filters->>'visibility' IS NULL 
                    OR p_filters->>'visibility' = 'All' 
                    OR lower(tr.privacy) = lower(p_filters->>'visibility')
                )
                AND (
                    p_filters->>'status' IS NULL 
                    OR p_filters->>'status' <> 'natural' 
                    OR ('natural' = ANY(tr.tags))
                )
            ORDER BY member_count DESC, tr.name ASC
            LIMIT result_limit
        ) t;
    END IF;

    RETURN COALESCE(result, '[]'::json);
END;
$function$;

-- ==========================================
-- Migration: 20260429214630_get_explore_discovery_rpc
-- ==========================================
DROP FUNCTION IF EXISTS public.get_explore_discovery CASCADE;
CREATE OR REPLACE FUNCTION public.get_explore_discovery(
    p_user_id uuid,
    p_filters jsonb DEFAULT '{}'::jsonb,
    p_limit integer DEFAULT 5
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_my_activity text;
    v_my_height_in numeric;
    v_my_weight_lbs numeric;
    v_my_bf_pct numeric;
    v_best_matches json;
    v_most_popular json;
BEGIN
    -- 1. Get current user profile data for similarity
    SELECT 
        activity, 
        parse_height_to_inches(height), 
        parse_bf_to_numeric(body_fat_pct)
    INTO v_my_activity, v_my_height_in, v_my_bf_pct
    FROM public.profiles
    WHERE id = p_user_id;

    v_my_weight_lbs := resolve_live_weight(p_user_id);

    -- 2. Fetch Best Matches (Similar) with Global Rank
    WITH all_users_scored AS (
        SELECT 
            p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height,
            COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_weight_lbs,
            p.weight_lbs,
            p.body_fat_pct,
            (
                CASE WHEN p.activity = v_my_activity THEN 30 ELSE 0 END
                + CASE
                    WHEN v_my_weight_lbs > 0 AND
                         ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                             / v_my_weight_lbs <= 0.025 THEN 25
                    WHEN v_my_weight_lbs > 0 AND
                         ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                             / v_my_weight_lbs <= 0.05  THEN 12.5
                    WHEN v_my_weight_lbs > 0 AND
                         ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                             / v_my_weight_lbs <= 0.075 THEN 6.25
                    ELSE 0
                END
                + CASE
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 3 THEN 12.5
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 4 THEN 6.25
                    ELSE 0
                END
                + CASE
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1 THEN 20
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 2 THEN 10
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 5
                    ELSE 0
                END
            )::numeric as similarity_score,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'meal') AS meal_count,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'workout') AS workout_count,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'macro_update') AS update_count
        FROM public.profiles p
        WHERE p.id <> p_user_id
    ),
    global_similarity_ranked AS (
        SELECT 
            *,
            row_number() OVER (ORDER BY similarity_score DESC, name ASC) as global_rank
        FROM all_users_scored
    )
    SELECT json_agg(t) INTO v_best_matches
    FROM (
        SELECT * FROM global_similarity_ranked
        WHERE 
            (p_filters->>'status' IS NULL OR p_filters->>'status' = 'All' OR lower(status) = lower(p_filters->>'status'))
            AND (p_filters->>'activity' IS NULL OR p_filters->>'activity' = 'All' OR activity = p_filters->>'activity')
            AND (NULLIF(p_filters->>'minMeals', '') IS NULL OR meal_count >= (p_filters->>'minMeals')::integer)
            AND (NULLIF(p_filters->>'minWorkouts', '') IS NULL OR workout_count >= (p_filters->>'minWorkouts')::integer)
            AND (NULLIF(p_filters->>'minUpdates', '') IS NULL OR update_count >= (p_filters->>'minUpdates')::integer)
            AND (
                p_filters->>'heightTargetCm' IS NULL OR 
                (
                    parse_height_to_inches(height) * 2.54 >= (p_filters->>'heightTargetCm')::numeric - (p_filters->>'heightRangeCm')::numeric
                    AND parse_height_to_inches(height) * 2.54 <= (p_filters->>'heightTargetCm')::numeric + (p_filters->>'heightRangeCm')::numeric
                )
            )
            AND (
                p_filters->>'weightTarget' IS NULL OR
                (
                    COALESCE(resolve_live_weight(id), weight_lbs::numeric) >= (p_filters->>'weightTarget')::numeric - (p_filters->>'weightRange')::numeric
                    AND COALESCE(resolve_live_weight(id), weight_lbs::numeric) <= (p_filters->>'weightTarget')::numeric + (p_filters->>'weightRange')::numeric
                )
            )
            AND (
                p_filters->>'bfTarget' IS NULL OR
                (
                    parse_bf_to_numeric(body_fat_pct) >= (p_filters->>'bfTarget')::numeric - (p_filters->>'bfRange')::numeric
                    AND parse_bf_to_numeric(body_fat_pct) <= (p_filters->>'bfTarget')::numeric + (p_filters->>'bfRange')::numeric
                )
            )
        ORDER BY similarity_score DESC, name ASC
        LIMIT p_limit
    ) t;

    -- 3. Fetch Most Popular with Global Rank
    WITH all_users_popular AS (
        SELECT 
            p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height,
            COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_weight_lbs,
            p.weight_lbs,
            p.body_fat_pct,
            (
                (SELECT count(*) FROM public.post_copies pc JOIN public.posts po ON pc.post_id = po.id WHERE po.author_id = p.id) * 3
                + (SELECT count(*) FROM public.post_likes  pl JOIN public.posts po ON pl.post_id = po.id WHERE po.author_id = p.id) * 2
                + (SELECT count(*) FROM public.comments    c  JOIN public.posts po ON c.post_id  = po.id WHERE po.author_id = p.id) * 1
            )::numeric AS popularity_score,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'meal') AS meal_count,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'workout') AS workout_count,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'macro_update') AS update_count
        FROM public.profiles p
        WHERE p.id <> p_user_id
    ),
    global_popularity_ranked AS (
        SELECT 
            *,
            row_number() OVER (ORDER BY popularity_score DESC, name ASC) as global_rank
        FROM all_users_popular
    )
    SELECT json_agg(t) INTO v_most_popular
    FROM (
        SELECT * FROM global_popularity_ranked
        WHERE 
            (p_filters->>'status' IS NULL OR p_filters->>'status' = 'All' OR lower(status) = lower(p_filters->>'status'))
            AND (p_filters->>'activity' IS NULL OR p_filters->>'activity' = 'All' OR activity = p_filters->>'activity')
            AND (NULLIF(p_filters->>'minMeals', '') IS NULL OR meal_count >= (p_filters->>'minMeals')::integer)
            AND (NULLIF(p_filters->>'minWorkouts', '') IS NULL OR workout_count >= (p_filters->>'minWorkouts')::integer)
            AND (NULLIF(p_filters->>'minUpdates', '') IS NULL OR update_count >= (p_filters->>'minUpdates')::integer)
            AND (
                p_filters->>'heightTargetCm' IS NULL OR 
                (
                    parse_height_to_inches(height) * 2.54 >= (p_filters->>'heightTargetCm')::numeric - (p_filters->>'heightRangeCm')::numeric
                    AND parse_height_to_inches(height) * 2.54 <= (p_filters->>'heightTargetCm')::numeric + (p_filters->>'heightRangeCm')::numeric
                )
            )
            AND (
                p_filters->>'weightTarget' IS NULL OR
                (
                    COALESCE(resolve_live_weight(id), weight_lbs::numeric) >= (p_filters->>'weightTarget')::numeric - (p_filters->>'weightRange')::numeric
                    AND COALESCE(resolve_live_weight(id), weight_lbs::numeric) <= (p_filters->>'weightTarget')::numeric + (p_filters->>'weightRange')::numeric
                )
            )
            AND (
                p_filters->>'bfTarget' IS NULL OR
                (
                    parse_bf_to_numeric(body_fat_pct) >= (p_filters->>'bfTarget')::numeric - (p_filters->>'bfRange')::numeric
                    AND parse_bf_to_numeric(body_fat_pct) <= (p_filters->>'bfTarget')::numeric + (p_filters->>'bfRange')::numeric
                )
            )
        ORDER BY popularity_score DESC, name ASC
        LIMIT p_limit
    ) t;

    RETURN json_build_object(
        'best_matches', COALESCE(v_best_matches, '[]'::json),
        'most_popular', COALESCE(v_most_popular, '[]'::json)
    );
END;
$$;

-- ==========================================
-- Migration: 20260501192007_implement_post_liking_system
-- ==========================================
-- 1. Rename table
ALTER TABLE public.post_likes RENAME TO likes;

-- 2. Add like_count to posts
ALTER TABLE public.posts ADD COLUMN like_count INTEGER DEFAULT 0 NOT NULL;

-- 3. Trigger functions
DROP FUNCTION IF EXISTS public.handle_post_like_increment CASCADE;
CREATE OR REPLACE FUNCTION public.handle_post_like_increment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.handle_post_like_decrement CASCADE;
CREATE OR REPLACE FUNCTION public.handle_post_like_decrement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Triggers
DROP TRIGGER IF EXISTS tr_post_like_increment ON public.likes;
CREATE TRIGGER tr_post_like_increment
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.handle_post_like_increment();

DROP TRIGGER IF EXISTS tr_post_like_decrement ON public.likes;
CREATE TRIGGER tr_post_like_decrement
AFTER DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.handle_post_like_decrement();

-- 5. RLS Policies for likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Drop old policies (Postgres might have renamed them, but we want to replace them anyway)
DROP POLICY IF EXISTS "Authenticated users can like" ON public.likes;
DROP POLICY IF EXISTS "Privacy Engine for Post Likes" ON public.likes;
DROP POLICY IF EXISTS "Users can unlike" ON public.likes;

-- Create new simplified policies
CREATE POLICY "Allow all authenticated users to view likes"
  ON public.likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to insert their own likes"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own likes"
  ON public.likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Realtime
-- Ensure the table is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
END $$;

-- ==========================================
-- Migration: 20260502214308_create_meal_log_table
-- ==========================================
CREATE TABLE public.meal_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    calories INTEGER NOT NULL DEFAULT 0,
    protein INTEGER NOT NULL DEFAULT 0,
    carbs INTEGER NOT NULL DEFAULT 0,
    fats INTEGER NOT NULL DEFAULT 0,
    portion_size TEXT,
    original_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.meal_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own meal logs"
    ON public.meal_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own meal logs"
    ON public.meal_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal logs"
    ON public.meal_log FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal logs"
    ON public.meal_log FOR DELETE
    USING (auth.uid() = user_id);

-- ==========================================
-- Migration: 20260502232814_create_lift_book_table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.lift_book (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  exercise_name text NOT NULL,
  sets integer NOT NULL,
  reps integer NOT NULL,
  weight numeric NOT NULL,
  intensity_rating integer,
  original_post_id uuid REFERENCES public.posts(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lift_book ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lift book entries"
  ON public.lift_book FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lift book entries"
  ON public.lift_book FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lift book entries"
  ON public.lift_book FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lift book entries"
  ON public.lift_book FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- Migration: 20260502232835_copy_exercises_to_lift_book_rpc
-- ==========================================
DROP FUNCTION IF EXISTS copy_exercises_to_lift_book CASCADE;
CREATE OR REPLACE FUNCTION copy_exercises_to_lift_book(
  p_post_id uuid,
  p_user_id uuid,
  p_exercise_ids text[] DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payload jsonb;
  v_exercise jsonb;
  v_exercises jsonb;
  v_sets jsonb;
  v_set jsonb;
  v_max_weight numeric;
  v_best_reps integer;
  v_set_count integer;
  v_ex_name text;
  v_ex_id text;
BEGIN
  -- 1. Fetch payload
  SELECT payload INTO v_payload
  FROM public.posts
  WHERE id = p_post_id AND post_type = 'workout';

  IF NOT FOUND OR v_payload IS NULL THEN
    RAISE EXCEPTION 'Workout post not found or invalid type';
  END IF;

  v_exercises := v_payload -> 'workout' -> 'exercises';

  IF v_exercises IS NULL OR jsonb_typeof(v_exercises) != 'array' OR jsonb_array_length(v_exercises) = 0 THEN
    RETURN; -- No exercises to copy
  END IF;

  -- 2. Iterate exercises
  FOR v_exercise IN SELECT * FROM jsonb_array_elements(v_exercises)
  LOOP
    v_ex_id := v_exercise ->> 'id';

    -- Skip if not in selective copy list (only if list is provided and not empty)
    IF p_exercise_ids IS NOT NULL AND array_length(p_exercise_ids, 1) > 0 THEN
      IF NOT (v_ex_id = ANY(p_exercise_ids)) THEN
        CONTINUE;
      END IF;
    END IF;

    v_ex_name := COALESCE(v_exercise ->> 'title', 'Unknown Exercise');
    v_sets := v_exercise -> 'sets';

    v_set_count := 0;
    v_max_weight := 0;
    v_best_reps := 0;

    IF v_sets IS NOT NULL AND jsonb_typeof(v_sets) = 'array' THEN
      v_set_count := jsonb_array_length(v_sets);

      FOR v_set IN SELECT * FROM jsonb_array_elements(v_sets)
      LOOP
        DECLARE
          w numeric := COALESCE((v_set ->> 'weight')::numeric, 0);
          r integer := COALESCE((v_set ->> 'reps')::integer, 0);
        BEGIN
          IF w >= v_max_weight THEN
            v_max_weight := w;
            v_best_reps := r;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Ignore conversion errors
        END;
      END LOOP;
    END IF;

    -- If no sets exist, insert 0 for sets/reps/weight
    INSERT INTO public.lift_book (
      user_id,
      exercise_name,
      sets,
      reps,
      weight,
      original_post_id
    ) VALUES (
      p_user_id,
      v_ex_name,
      v_set_count,
      v_best_reps,
      v_max_weight,
      p_post_id
    );

  END LOOP;
END;
$$;

-- ==========================================
-- Migration: 20260502232903_recreate_lift_book_table_v3_drop_func
-- ==========================================
DROP FUNCTION IF EXISTS public.copy_exercises_to_lift_book(uuid,uuid,text[]);
DROP TABLE IF EXISTS public.lift_book CASCADE;

CREATE TABLE public.lift_book (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_name text NOT NULL,
    type text CHECK (type IN ('Cardio', 'Strength')),
    muscle_group text,
    sets jsonb,
    speed text,
    incline text,
    duration text,
    original_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.lift_book ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own lifts."
ON public.lift_book FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own lifts."
ON public.lift_book FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own lifts."
ON public.lift_book FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lifts."
ON public.lift_book FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Redefine RPC to match new schema
DROP FUNCTION IF EXISTS public.copy_exercises_to_lift_book CASCADE;
CREATE OR REPLACE FUNCTION public.copy_exercises_to_lift_book(
    p_user_id uuid,
    p_post_id uuid,
    p_exercise_ids text[] DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_payload jsonb;
  v_exercise jsonb;
  v_exercises jsonb;
  v_ex_id text;
BEGIN
  -- 1. Fetch payload
  SELECT payload INTO v_payload
  FROM public.posts
  WHERE id = p_post_id AND post_type = 'workout';

  IF NOT FOUND OR v_payload IS NULL THEN
    RAISE EXCEPTION 'Workout post not found or invalid type';
  END IF;

  v_exercises := v_payload -> 'workout' -> 'exercises';

  IF v_exercises IS NULL OR jsonb_typeof(v_exercises) != 'array' OR jsonb_array_length(v_exercises) = 0 THEN
    RETURN; -- No exercises to copy
  END IF;

  -- 2. Iterate exercises
  FOR v_exercise IN SELECT * FROM jsonb_array_elements(v_exercises)
  LOOP
    v_ex_id := v_exercise ->> 'id';

    -- Skip if not in selective copy list (only if list is provided and not empty)
    IF p_exercise_ids IS NOT NULL AND array_length(p_exercise_ids, 1) > 0 THEN
      IF NOT (v_ex_id = ANY(p_exercise_ids)) THEN
        CONTINUE;
      END IF;
    END IF;

    -- Insert into lift_book with all fields from JSON
    INSERT INTO public.lift_book (
      user_id,
      exercise_name,
      type,
      muscle_group,
      sets,
      speed,
      incline,
      duration,
      original_post_id
    ) VALUES (
      p_user_id,
      COALESCE(v_exercise ->> 'title', 'Unknown Exercise'),
      COALESCE(v_exercise ->> 'type', 'Strength'),
      v_exercise ->> 'muscleGroup',
      v_exercise -> 'sets',
      v_exercise ->> 'speed',
      v_exercise ->> 'incline',
      v_exercise ->> 'duration',
      p_post_id
    );

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Migration: 20260502235127_update_copy_exercises_rpc_for_titles
-- ==========================================
DROP FUNCTION IF EXISTS copy_exercises_to_lift_book(uuid, uuid, text[]);

DROP FUNCTION IF EXISTS copy_exercises_to_lift_book CASCADE;
CREATE OR REPLACE FUNCTION copy_exercises_to_lift_book(
  p_post_id uuid,
  p_user_id uuid,
  p_exercise_ids text[] DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payload jsonb;
  v_exercise jsonb;
  v_exercises jsonb;
  v_sets jsonb;
  v_set jsonb;
  v_max_weight numeric;
  v_best_reps integer;
  v_set_count integer;
  v_ex_name text;
  v_ex_id text;
BEGIN
  -- 1. Fetch payload
  SELECT payload INTO v_payload
  FROM public.posts
  WHERE id = p_post_id AND post_type = 'workout';

  IF NOT FOUND OR v_payload IS NULL THEN
    RAISE EXCEPTION 'Workout post not found or invalid type';
  END IF;

  v_exercises := v_payload -> 'workout' -> 'exercises';

  IF v_exercises IS NULL OR jsonb_typeof(v_exercises) != 'array' OR jsonb_array_length(v_exercises) = 0 THEN
    RETURN; -- No exercises to copy
  END IF;

  -- 2. Iterate exercises
  FOR v_exercise IN SELECT * FROM jsonb_array_elements(v_exercises)
  LOOP
    v_ex_id := v_exercise ->> 'id';
    v_ex_name := COALESCE(v_exercise ->> 'title', 'Unknown Exercise');

    -- Skip if not in selective copy list (only if list is provided and not empty)
    -- We check both ID and Title to support different frontend implementations
    IF p_exercise_ids IS NOT NULL AND array_length(p_exercise_ids, 1) > 0 THEN
      IF NOT (v_ex_id = ANY(p_exercise_ids) OR v_ex_name = ANY(p_exercise_ids)) THEN
        CONTINUE;
      END IF;
    END IF;

    v_sets := v_exercise -> 'sets';

    v_set_count := 0;
    v_max_weight := 0;
    v_best_reps := 0;

    IF v_sets IS NOT NULL AND jsonb_typeof(v_sets) = 'array' THEN
      v_set_count := jsonb_array_length(v_sets);

      FOR v_set IN SELECT * FROM jsonb_array_elements(v_sets)
      LOOP
        DECLARE
          w numeric := COALESCE((v_set ->> 'weight')::numeric, 0);
          r integer := COALESCE((v_set ->> 'reps')::integer, 0);
        BEGIN
          IF w >= v_max_weight THEN
            v_max_weight := w;
            v_best_reps := r;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Ignore conversion errors
        END;
      END LOOP;
    END IF;

    -- If no sets exist, insert 0 for sets/reps/weight
    INSERT INTO public.lift_book (
      user_id,
      exercise_name,
      sets,
      reps,
      weight,
      original_post_id
    ) VALUES (
      p_user_id,
      v_ex_name,
      v_set_count,
      v_best_reps,
      v_max_weight,
      p_post_id
    );

  END LOOP;
END;
$$;

-- ==========================================
-- Migration: 20260502235738_fix_lift_book_schema
-- ==========================================
DROP TABLE IF EXISTS public.lift_book CASCADE;

CREATE TABLE public.lift_book (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  exercise_name text NOT NULL,
  sets integer NOT NULL,
  reps integer NOT NULL,
  weight numeric NOT NULL,
  intensity_rating integer,
  original_post_id uuid REFERENCES public.posts(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lift_book ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lift book entries"
  ON public.lift_book FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lift book entries"
  ON public.lift_book FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lift book entries"
  ON public.lift_book FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lift book entries"
  ON public.lift_book FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- Migration: 20260505184754_macro_infrastructure
-- ==========================================
-- Create macro_history table to track changes over time
CREATE TABLE IF NOT EXISTS public.macro_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    macro_targets JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on macro_history
ALTER TABLE public.macro_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own macro history"
    ON public.macro_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own macro history"
    ON public.macro_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create macro_book table for saving configurations
CREATE TABLE IF NOT EXISTS public.macro_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    protein INTEGER NOT NULL,
    carbs INTEGER NOT NULL,
    fats INTEGER NOT NULL,
    calories INTEGER NOT NULL,
    original_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on macro_book
ALTER TABLE public.macro_book ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own macro book"
    ON public.macro_book FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own macro book"
    ON public.macro_book FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own macro book entries"
    ON public.macro_book FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- RPC to update macro targets and record history + post
DROP FUNCTION IF EXISTS public.update_macro_targets_with_post CASCADE;
CREATE OR REPLACE FUNCTION public.update_macro_targets_with_post(
    p_user_id UUID,
    p_new_targets JSONB,
    p_caption TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_targets JSONB;
    v_old_date DATE;
    v_post_id UUID;
    v_profile_record RECORD;
BEGIN
    -- Get current targets
    SELECT macro_targets, last_macro_update INTO v_old_targets, v_old_date
    FROM public.profiles
    WHERE id = p_user_id;

    -- Record in history
    INSERT INTO public.macro_history (user_id, macro_targets)
    VALUES (p_user_id, v_old_targets);

    -- Update profile
    UPDATE public.profiles
    SET 
        macro_targets = p_new_targets,
        last_macro_update = CURRENT_DATE,
        update_count = update_count + 1
    WHERE id = p_user_id;

    -- Create macro_update post
    INSERT INTO public.posts (
        author_id,
        post_type,
        caption,
        payload
    )
    VALUES (
        p_user_id,
        'macro_update',
        p_caption,
        jsonb_build_object(
            'macroUpdate', jsonb_build_object(
                'oldTargets', v_old_targets,
                'newTargets', p_new_targets,
                'oldDate', TO_CHAR(v_old_date, 'MM/DD/YYYY')
            )
        )
    )
    RETURNING id INTO v_post_id;

    RETURN jsonb_build_object('success', true, 'post_id', v_post_id);
END;
$$;

-- RPC to copy macro targets from a post to macro_book
DROP FUNCTION IF EXISTS public.copy_to_macro_book CASCADE;
CREATE OR REPLACE FUNCTION public.copy_to_macro_book(
    p_user_id UUID,
    p_post_id UUID,
    p_selection_type TEXT -- 'old' or 'new' for macro_update, 'targets' for snapshot
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post RECORD;
    v_targets JSONB;
    v_label TEXT;
    v_author_handle TEXT;
    v_entry_id UUID;
BEGIN
    -- Get post details
    SELECT p.*, pr.handle INTO v_post
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.author_id
    WHERE p.id = p_post_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Post not found';
    END IF;

    -- Extract targets based on type
    IF v_post.post_type = 'macro_update' THEN
        IF p_selection_type = 'old' THEN
            v_targets := v_post.payload->'macroUpdate'->'oldTargets';
            v_label := 'Previous targets from @' || v_post.handle;
        ELSE
            v_targets := v_post.payload->'macroUpdate'->'newTargets';
            v_label := 'New targets from @' || v_post.handle;
        END IF;
    ELSIF v_post.post_type = 'snapshot' THEN
        v_targets := v_post.payload->'snapshot'->'targets';
        v_label := 'Targets from @' || v_post.handle;
    ELSE
        RAISE EXCEPTION 'Invalid post type for macro book';
    END IF;

    -- Insert into macro_book
    INSERT INTO public.macro_book (
        user_id,
        label,
        protein,
        carbs,
        fats,
        calories,
        original_post_id
    )
    VALUES (
        p_user_id,
        v_label,
        (v_targets->>'p')::INTEGER,
        (v_targets->>'c')::INTEGER,
        (v_targets->>'f')::INTEGER,
        (v_targets->>'calories')::INTEGER,
        p_post_id
    )
    RETURNING id INTO v_entry_id;

    RETURN v_entry_id;
END;
$$;

-- ==========================================
-- Migration: 20260505201408_update_macro_rpc_media
-- ==========================================
DROP FUNCTION IF EXISTS public.update_macro_targets_with_post CASCADE;
CREATE OR REPLACE FUNCTION public.update_macro_targets_with_post(
    p_user_id UUID,
    p_new_targets JSONB,
    p_caption TEXT DEFAULT NULL,
    p_media_url TEXT DEFAULT NULL,
    p_media_type TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_old_targets JSONB;
    v_old_date DATE;
    v_post_id UUID;
BEGIN
    -- Get current targets
    SELECT macro_targets, last_macro_update INTO v_old_targets, v_old_date
    FROM public.profiles
    WHERE id = p_user_id;

    -- Record in history
    INSERT INTO public.macro_history (user_id, macro_targets)
    VALUES (p_user_id, v_old_targets);

    -- Update profile
    UPDATE public.profiles
    SET 
        macro_targets = p_new_targets,
        last_macro_update = CURRENT_DATE,
        update_count = update_count + 1
    WHERE id = p_user_id;

    -- Create macro_update post
    INSERT INTO public.posts (
        author_id,
        post_type,
        caption,
        payload,
        media_url,
        media_type
    )
    VALUES (
        p_user_id,
        'macro_update',
        p_caption,
        jsonb_build_object(
            'macroUpdate', jsonb_build_object(
                'oldTargets', v_old_targets,
                'newTargets', p_new_targets,
                'oldDate', COALESCE(TO_CHAR(v_old_date, 'MM/DD/YYYY'), '')
            )
        ),
        p_media_url,
        p_media_type
    )
    RETURNING id INTO v_post_id;

    RETURN jsonb_build_object('success', true, 'post_id', v_post_id);
END;
$$;

-- ==========================================
-- Migration: 20260505214350_tribe_copy_food_function
-- ==========================================
DROP FUNCTION IF EXISTS tribe_copy_food CASCADE;
CREATE OR REPLACE FUNCTION tribe_copy_food(
    p_post_id    uuid,
    p_copier_id  uuid
)
RETURNS jsonb   -- returns the full scaled ingredients array
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post          record;
    v_ingredients   jsonb;
    v_post_ts       timestamptz;
    v_author_id     uuid;

    -- User A (poster) targets at post time
    v_target_a      jsonb;
    -- User B (copier) latest targets
    v_target_b      jsonb;

    v_ing           jsonb;
    v_p_a           numeric;
    v_c_a           numeric;
    v_f_a           numeric;
    v_food_type     text;
    v_target_a_val  numeric;
    v_target_b_val  numeric;
    v_percent_solved numeric;

    v_scaled_p      numeric;
    v_scaled_c      numeric;
    v_scaled_f      numeric;
    v_scalar        numeric;
    v_scaled_cals   numeric;

    v_results       jsonb := '[]'::jsonb;
    v_scaled_ing    jsonb;
BEGIN
    -- 1. Fetch post metadata
    SELECT author_id, created_at, payload
    INTO   v_post
    FROM   posts
    WHERE  id = p_post_id;

    IF NOT FOUND THEN
        RETURN '[]'::jsonb;
    END IF;

    v_author_id   := v_post.author_id;
    v_post_ts     := v_post.created_at;
    v_ingredients := v_post.payload -> 'meal' -> 'ingredients';

    IF v_ingredients IS NULL OR jsonb_array_length(v_ingredients) = 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    -- 2. Resolve User A's targets at post time
    SELECT macro_targets
    INTO   v_target_a
    FROM   macro_history
    WHERE  user_id   = v_author_id
      AND  created_at <= v_post_ts
    ORDER  BY created_at DESC
    LIMIT  1;

    -- Fallback: profile's current targets
    IF v_target_a IS NULL THEN
        SELECT macro_targets
        INTO   v_target_a
        FROM   profiles
        WHERE  id = v_author_id;
    END IF;

    -- 3. Resolve User B's current targets
    SELECT macro_targets
    INTO   v_target_b
    FROM   macro_history
    WHERE  user_id = p_copier_id
    ORDER  BY created_at DESC
    LIMIT  1;

    IF v_target_b IS NULL THEN
        SELECT macro_targets
        INTO   v_target_b
        FROM   profiles
        WHERE  id = p_copier_id;
    END IF;

    -- 4. Scale each ingredient
    FOR v_ing IN SELECT * FROM jsonb_array_elements(v_ingredients)
    LOOP
        v_p_a := COALESCE((v_ing -> 'macros' ->> 'p')::numeric, 0);
        v_c_a := COALESCE((v_ing -> 'macros' ->> 'c')::numeric, 0);
        v_f_a := COALESCE((v_ing -> 'macros' ->> 'f')::numeric, 0);

        -- 4a. Classify food_type (internal only)
        -- Based on absolute highest mass
        IF v_p_a >= v_c_a AND v_p_a >= v_f_a THEN
            v_food_type    := 'protein';
            v_target_a_val := COALESCE((v_target_a ->> 'p')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b ->> 'p')::numeric, 0);
        ELSIF v_c_a >= v_p_a AND v_c_a >= v_f_a THEN
            v_food_type    := 'carbs';
            v_target_a_val := COALESCE((v_target_a ->> 'c')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b ->> 'c')::numeric, 0);
        ELSE
            v_food_type    := 'fats';
            v_target_a_val := COALESCE((v_target_a ->> 'f')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b ->> 'f')::numeric, 0);
        END IF;

        -- 4b. Division-by-zero guard -> standard copy
        IF v_target_a_val = 0 OR v_target_b_val = 0 THEN
            v_scaled_ing := v_ing;
        ELSE
            -- 4c. Compute fractional solve and User B's allocation
            -- percent_solved = Logged_Amount_A / Target_A
            v_percent_solved := CASE v_food_type
                WHEN 'protein' THEN CASE WHEN v_target_a_val = 0 THEN 0 ELSE v_p_a / v_target_a_val END
                WHEN 'carbs'   THEN CASE WHEN v_target_a_val = 0 THEN 0 ELSE v_c_a / v_target_a_val END
                ELSE                CASE WHEN v_target_a_val = 0 THEN 0 ELSE v_f_a / v_target_a_val END
            END;

            -- Portion_B = Target_B * Percent_Solved
            -- v_scalar = Portion_B / Logged_Amount_A
            -- Simplified: v_scalar = (v_target_b_val * (v_logged_a / v_target_a_val)) / v_logged_a 
            -- Which reduces to: v_scalar = v_target_b_val / v_target_a_val
            
            v_scalar := v_target_b_val / v_target_a_val;

            v_scaled_p    := ROUND(v_p_a * v_scalar);
            v_scaled_c    := ROUND(v_c_a * v_scalar);
            v_scaled_f    := ROUND(v_f_a * v_scalar);
            v_scaled_cals := ROUND((v_scaled_p * 4) + (v_scaled_c * 4) + (v_scaled_f * 9));

            v_scaled_ing := v_ing
                || jsonb_build_object(
                    'macros', jsonb_build_object('p', v_scaled_p, 'c', v_scaled_c, 'f', v_scaled_f),
                    'cals',   v_scaled_cals
                );
            
            -- Also try to scale amount if possible (best effort)
            -- This is handled on the frontend if needed, but for the RPC we focus on the core macros
        END IF;

        v_results := v_results || jsonb_build_array(v_scaled_ing);
    END LOOP;

    RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION tribe_copy_food TO authenticated;

-- ==========================================
-- Migration: 20260505215238_fix_explore_discovery_table_names
-- ==========================================
DROP FUNCTION IF EXISTS public.get_explore_discovery CASCADE;
CREATE OR REPLACE FUNCTION public.get_explore_discovery(p_user_id uuid, p_filters jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 5)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_my_activity text;
    v_my_height_in numeric;
    v_my_weight_lbs numeric;
    v_my_bf_pct numeric;
    v_best_matches json;
    v_most_popular json;
BEGIN
    -- 1. Get current user profile data for similarity
    SELECT 
        activity, 
        parse_height_to_inches(height), 
        parse_bf_to_numeric(body_fat_pct)
    INTO v_my_activity, v_my_height_in, v_my_bf_pct
    FROM public.profiles
    WHERE id = p_user_id;

    v_my_weight_lbs := resolve_live_weight(p_user_id);

    -- 2. Fetch Best Matches (Similar) with Global Rank
    WITH all_users_scored AS (
        SELECT 
            p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height,
            COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_weight_lbs,
            p.weight_lbs,
            p.body_fat_pct,
            (
                CASE WHEN p.activity = v_my_activity THEN 30 ELSE 0 END
                + CASE
                    WHEN v_my_weight_lbs > 0 AND
                         ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                             / v_my_weight_lbs <= 0.025 THEN 25
                    WHEN v_my_weight_lbs > 0 AND
                         ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                             / v_my_weight_lbs <= 0.05  THEN 12.5
                    WHEN v_my_weight_lbs > 0 AND
                         ABS(COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) - v_my_weight_lbs)
                             / v_my_weight_lbs <= 0.075 THEN 6.25
                    ELSE 0
                END
                + CASE
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 1 THEN 25
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 3 THEN 12.5
                    WHEN ABS(parse_height_to_inches(p.height) - v_my_height_in) <= 4 THEN 6.25
                    ELSE 0
                END
                + CASE
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 1 THEN 20
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 2 THEN 10
                    WHEN ABS(parse_bf_to_numeric(p.body_fat_pct) - v_my_bf_pct) <= 3 THEN 5
                    ELSE 0
                END
            )::numeric as similarity_score,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'meal') AS meal_count,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'workout') AS workout_count,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'macro_update') AS update_count
        FROM public.profiles p
        WHERE p.id <> p_user_id
    ),
    global_similarity_ranked AS (
        SELECT 
            *,
            row_number() OVER (ORDER BY similarity_score DESC, name ASC) as global_rank
        FROM all_users_scored
    )
    SELECT json_agg(t) INTO v_best_matches
    FROM (
        SELECT * FROM global_similarity_ranked
        WHERE 
            (p_filters->>'status' IS NULL OR p_filters->>'status' = 'All' OR lower(status) = lower(p_filters->>'status'))
            AND (p_filters->>'activity' IS NULL OR p_filters->>'activity' = 'All' OR activity = p_filters->>'activity')
            AND (NULLIF(p_filters->>'minMeals', '') IS NULL OR meal_count >= (p_filters->>'minMeals')::integer)
            AND (NULLIF(p_filters->>'minWorkouts', '') IS NULL OR workout_count >= (p_filters->>'minWorkouts')::integer)
            AND (NULLIF(p_filters->>'minUpdates', '') IS NULL OR update_count >= (p_filters->>'minUpdates')::integer)
            AND (
                p_filters->>'heightTargetCm' IS NULL OR 
                (
                    parse_height_to_inches(height) * 2.54 >= (p_filters->>'heightTargetCm')::numeric - (p_filters->>'heightRangeCm')::numeric
                    AND parse_height_to_inches(height) * 2.54 <= (p_filters->>'heightTargetCm')::numeric + (p_filters->>'heightRangeCm')::numeric
                )
            )
            AND (
                p_filters->>'weightTarget' IS NULL OR
                (
                    COALESCE(resolve_live_weight(id), weight_lbs::numeric) >= (p_filters->>'weightTarget')::numeric - (p_filters->>'weightRange')::numeric
                    AND COALESCE(resolve_live_weight(id), weight_lbs::numeric) <= (p_filters->>'weightTarget')::numeric + (p_filters->>'weightRange')::numeric
                )
            )
            AND (
                p_filters->>'bfTarget' IS NULL OR
                (
                    parse_bf_to_numeric(body_fat_pct) >= (p_filters->>'bfTarget')::numeric - (p_filters->>'bfRange')::numeric
                    AND parse_bf_to_numeric(body_fat_pct) <= (p_filters->>'bfTarget')::numeric + (p_filters->>'bfRange')::numeric
                )
            )
        ORDER BY similarity_score DESC, name ASC
        LIMIT p_limit
    ) t;

    -- 3. Fetch Most Popular with Global Rank
    WITH all_users_popular AS (
        SELECT 
            p.id, p.handle, p.name, p.avatar_url, p.status, p.activity, p.activity_icon, p.height,
            COALESCE(resolve_live_weight(p.id), p.weight_lbs::numeric) AS live_weight_lbs,
            p.weight_lbs,
            p.body_fat_pct,
            (
                (SELECT count(*) FROM public.post_copies pc JOIN public.posts po ON pc.post_id = po.id WHERE po.author_id = p.id) * 3
                + (SELECT count(*) FROM public.likes      pl JOIN public.posts po ON pl.post_id = po.id WHERE po.author_id = p.id) * 2
                + (SELECT count(*) FROM public.comments   c  JOIN public.posts po ON c.post_id  = po.id WHERE po.author_id = p.id) * 1
            )::numeric AS popularity_score,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'meal') AS meal_count,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'workout') AS workout_count,
            (SELECT count(*)::int FROM public.posts WHERE author_id = p.id AND post_type = 'macro_update') AS update_count
        FROM public.profiles p
        WHERE p.id <> p_user_id
    ),
    global_popularity_ranked AS (
        SELECT 
            *,
            row_number() OVER (ORDER BY popularity_score DESC, name ASC) as global_rank
        FROM all_users_popular
    )
    SELECT json_agg(t) INTO v_most_popular
    FROM (
        SELECT * FROM global_popularity_ranked
        WHERE 
            (p_filters->>'status' IS NULL OR p_filters->>'status' = 'All' OR lower(status) = lower(p_filters->>'status'))
            AND (p_filters->>'activity' IS NULL OR p_filters->>'activity' = 'All' OR activity = p_filters->>'activity')
            AND (NULLIF(p_filters->>'minMeals', '') IS NULL OR meal_count >= (p_filters->>'minMeals')::integer)
            AND (NULLIF(p_filters->>'minWorkouts', '') IS NULL OR workout_count >= (p_filters->>'minWorkouts')::integer)
            AND (NULLIF(p_filters->>'minUpdates', '') IS NULL OR update_count >= (p_filters->>'minUpdates')::integer)
            AND (
                p_filters->>'heightTargetCm' IS NULL OR 
                (
                    parse_height_to_inches(height) * 2.54 >= (p_filters->>'heightTargetCm')::numeric - (p_filters->>'heightRangeCm')::numeric
                    AND parse_height_to_inches(height) * 2.54 <= (p_filters->>'heightTargetCm')::numeric + (p_filters->>'heightRangeCm')::numeric
                )
            )
            AND (
                p_filters->>'weightTarget' IS NULL OR
                (
                    COALESCE(resolve_live_weight(id), weight_lbs::numeric) >= (p_filters->>'weightTarget')::numeric - (p_filters->>'weightRange')::numeric
                    AND COALESCE(resolve_live_weight(id), weight_lbs::numeric) <= (p_filters->>'weightTarget')::numeric + (p_filters->>'weightRange')::numeric
                )
            )
            AND (
                p_filters->>'bfTarget' IS NULL OR
                (
                    parse_bf_to_numeric(body_fat_pct) >= (p_filters->>'bfTarget')::numeric - (p_filters->>'bfRange')::numeric
                    AND parse_bf_to_numeric(body_fat_pct) <= (p_filters->>'bfTarget')::numeric + (p_filters->>'bfRange')::numeric
                )
            )
        ORDER BY popularity_score DESC, name ASC
        LIMIT p_limit
    ) t;

    RETURN json_build_object(
        'best_matches', COALESCE(v_best_matches, '[]'::json),
        'most_popular', COALESCE(v_most_popular, '[]'::json)
    );
END;
$function$;

-- ==========================================
-- Migration: 20260505222653_fix_tribe_copy_food_zero_target_fallback
-- ==========================================
-- ══════════════════════════════════════════════════════════════════════════
-- FIX: tribe_copy_food – robust multi-user proportional scaling
-- 
-- Root cause of 1:1 bug:
--   macro_history for @kwadub (copier) contained a zero-value row
--   {p:0, c:0, f:0, calories:0} which is newer than the real targets.
--   The old RPC picked that row, hit the division-by-zero guard, and
--   fell through to standard copy for every ingredient.
--
-- Fix strategy:
--   1. For BOTH User A and User B: find the most recent macro_history row
--      where at least one macro value is non-zero (a "real" target row).
--   2. If no valid macro_history row exists, fall back to profiles.macro_targets.
--   3. If profiles.macro_targets is also zero/null, do standard copy (safe).
-- ══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.tribe_copy_food CASCADE;
CREATE OR REPLACE FUNCTION public.tribe_copy_food(
    p_post_id   uuid,
    p_copier_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post          record;
    v_ingredients   jsonb;
    v_post_ts       timestamptz;
    v_author_id     uuid;

    -- User A (poster) targets at/before post time
    v_target_a      jsonb;
    -- User B (copier) latest valid targets
    v_target_b      jsonb;

    v_ing           jsonb;
    v_p_a           numeric;
    v_c_a           numeric;
    v_f_a           numeric;
    v_food_type     text;
    v_target_a_val  numeric;
    v_target_b_val  numeric;
    v_scalar        numeric;

    v_scaled_p      numeric;
    v_scaled_c      numeric;
    v_scaled_f      numeric;
    v_scaled_cals   numeric;

    v_results       jsonb := '[]'::jsonb;
    v_scaled_ing    jsonb;
BEGIN
    -- ── 1. Fetch post metadata ─────────────────────────────────────────────
    SELECT author_id, created_at, payload
    INTO   v_post
    FROM   public.posts
    WHERE  id = p_post_id;

    IF NOT FOUND THEN
        RETURN '[]'::jsonb;
    END IF;

    v_author_id   := v_post.author_id;
    v_post_ts     := v_post.created_at;
    v_ingredients := v_post.payload -> 'meal' -> 'ingredients';

    IF v_ingredients IS NULL OR jsonb_array_length(v_ingredients) = 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    -- ── 2. Resolve User A's targets (poster) at/before post time ─────────
    --   Use the most recent history row with at least one non-zero macro value
    SELECT macro_targets
    INTO   v_target_a
    FROM   public.macro_history
    WHERE  user_id    = v_author_id
      AND  created_at <= v_post_ts
      AND  (
               COALESCE((macro_targets->>'p')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
           )
    ORDER  BY created_at DESC
    LIMIT  1;

    -- Fallback: current profile targets (also validate non-zero)
    IF v_target_a IS NULL THEN
        SELECT macro_targets
        INTO   v_target_a
        FROM   public.profiles
        WHERE  id = v_author_id
          AND  (
                   COALESCE((macro_targets->>'p')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
               );
    END IF;

    -- ── 3. Resolve User B's targets (copier) ─────────────────────────────
    --   Use the most recent history row with at least one non-zero macro value
    SELECT macro_targets
    INTO   v_target_b
    FROM   public.macro_history
    WHERE  user_id = p_copier_id
      AND  (
               COALESCE((macro_targets->>'p')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
           )
    ORDER  BY created_at DESC
    LIMIT  1;

    -- Fallback: current profile targets (also validate non-zero)
    IF v_target_b IS NULL THEN
        SELECT macro_targets
        INTO   v_target_b
        FROM   public.profiles
        WHERE  id = p_copier_id
          AND  (
                   COALESCE((macro_targets->>'p')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
               );
    END IF;

    -- ── 4. Scale each ingredient ──────────────────────────────────────────
    FOR v_ing IN SELECT * FROM jsonb_array_elements(v_ingredients)
    LOOP
        v_p_a := COALESCE((v_ing -> 'macros' ->> 'p')::numeric, 0);
        v_c_a := COALESCE((v_ing -> 'macros' ->> 'c')::numeric, 0);
        v_f_a := COALESCE((v_ing -> 'macros' ->> 'f')::numeric, 0);

        -- 4a. Classify dominant macro (food_type)
        IF v_p_a >= v_c_a AND v_p_a >= v_f_a THEN
            v_food_type    := 'protein';
            v_target_a_val := COALESCE((v_target_a ->>> 'p')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b ->>> 'p')::numeric, 0);
        ELSIF v_c_a >= v_p_a AND v_c_a >= v_f_a THEN
            v_food_type    := 'carbs';
            v_target_a_val := COALESCE((v_target_a ->>> 'c')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b ->>> 'c')::numeric, 0);
        ELSE
            v_food_type    := 'fats';
            v_target_a_val := COALESCE((v_target_a ->>> 'f')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b ->>> 'f')::numeric, 0);
        END IF;

        -- 4b. Division-by-zero guard → standard copy (safe 1:1 fallback)
        IF v_target_a IS NULL OR v_target_b IS NULL
           OR v_target_a_val = 0 OR v_target_b_val = 0 THEN
            v_scaled_ing := v_ing;

        ELSE
            -- 4c. Proportional scaling:
            --   percent_solved = logged_amount_A / target_A
            --   portion_B      = target_B × percent_solved
            --   scalar         = portion_B / logged_amount_A
            --                  = target_B / target_A  (algebraically simplified)
            v_scalar := v_target_b_val / v_target_a_val;

            v_scaled_p    := ROUND(v_p_a * v_scalar);
            v_scaled_c    := ROUND(v_c_a * v_scalar);
            v_scaled_f    := ROUND(v_f_a * v_scalar);
            v_scaled_cals := ROUND((v_scaled_p * 4) + (v_scaled_c * 4) + (v_scaled_f * 9));

            v_scaled_ing := v_ing
                || jsonb_build_object(
                    'macros', jsonb_build_object(
                        'p', v_scaled_p,
                        'c', v_scaled_c,
                        'f', v_scaled_f
                    ),
                    'cals', v_scaled_cals
                );
        END IF;

        v_results := v_results || jsonb_build_array(v_scaled_ing);
    END LOOP;

    RETURN v_results;
END;
$$;

-- ==========================================
-- Migration: 20260505222729_fix_tribe_copy_food_operator_typo
-- ==========================================
DROP FUNCTION IF EXISTS public.tribe_copy_food CASCADE;
CREATE OR REPLACE FUNCTION public.tribe_copy_food(
    p_post_id   uuid,
    p_copier_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post          record;
    v_ingredients   jsonb;
    v_post_ts       timestamptz;
    v_author_id     uuid;

    v_target_a      jsonb;  -- User A (poster) targets at/before post time
    v_target_b      jsonb;  -- User B (copier) latest valid targets

    v_ing           jsonb;
    v_p_a           numeric;
    v_c_a           numeric;
    v_f_a           numeric;
    v_food_type     text;
    v_target_a_val  numeric;
    v_target_b_val  numeric;
    v_scalar        numeric;

    v_scaled_p      numeric;
    v_scaled_c      numeric;
    v_scaled_f      numeric;
    v_scaled_cals   numeric;

    v_results       jsonb := '[]'::jsonb;
    v_scaled_ing    jsonb;
BEGIN
    -- 1. Fetch post metadata
    SELECT author_id, created_at, payload
    INTO   v_post
    FROM   public.posts
    WHERE  id = p_post_id;

    IF NOT FOUND THEN
        RETURN '[]'::jsonb;
    END IF;

    v_author_id   := v_post.author_id;
    v_post_ts     := v_post.created_at;
    v_ingredients := v_post.payload -> 'meal' -> 'ingredients';

    IF v_ingredients IS NULL OR jsonb_array_length(v_ingredients) = 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    -- 2. Resolve User A's targets (poster) at/before post time.
    --    Skip zero-value rows (placeholder entries from UI resets, etc.).
    SELECT macro_targets
    INTO   v_target_a
    FROM   public.macro_history
    WHERE  user_id    = v_author_id
      AND  created_at <= v_post_ts
      AND  (
               COALESCE((macro_targets->>'p')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
           )
    ORDER  BY created_at DESC
    LIMIT  1;

    -- Fallback: current profile targets if no valid history row found
    IF v_target_a IS NULL THEN
        SELECT macro_targets
        INTO   v_target_a
        FROM   public.profiles
        WHERE  id = v_author_id
          AND  (
                   COALESCE((macro_targets->>'p')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
               );
    END IF;

    -- 3. Resolve User B's targets (copier) — most recent valid row.
    --    Skip zero-value rows so a UI reset does not break scaling.
    SELECT macro_targets
    INTO   v_target_b
    FROM   public.macro_history
    WHERE  user_id = p_copier_id
      AND  (
               COALESCE((macro_targets->>'p')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
           )
    ORDER  BY created_at DESC
    LIMIT  1;

    -- Fallback: current profile targets if no valid history row found
    IF v_target_b IS NULL THEN
        SELECT macro_targets
        INTO   v_target_b
        FROM   public.profiles
        WHERE  id = p_copier_id
          AND  (
                   COALESCE((macro_targets->>'p')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
               );
    END IF;

    -- 4. Scale each ingredient proportionally
    FOR v_ing IN SELECT * FROM jsonb_array_elements(v_ingredients)
    LOOP
        v_p_a := COALESCE((v_ing -> 'macros' ->> 'p')::numeric, 0);
        v_c_a := COALESCE((v_ing -> 'macros' ->> 'c')::numeric, 0);
        v_f_a := COALESCE((v_ing -> 'macros' ->> 'f')::numeric, 0);

        -- 4a. Classify dominant macro (food_type) by highest gram mass
        IF v_p_a >= v_c_a AND v_p_a >= v_f_a THEN
            v_food_type    := 'protein';
            v_target_a_val := COALESCE((v_target_a->>'p')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b->>'p')::numeric, 0);
        ELSIF v_c_a >= v_p_a AND v_c_a >= v_f_a THEN
            v_food_type    := 'carbs';
            v_target_a_val := COALESCE((v_target_a->>'c')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b->>'c')::numeric, 0);
        ELSE
            v_food_type    := 'fats';
            v_target_a_val := COALESCE((v_target_a->>'f')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b->>'f')::numeric, 0);
        END IF;

        -- 4b. Division-by-zero guard → standard copy (exact 1:1 fallback)
        IF v_target_a IS NULL OR v_target_b IS NULL
           OR v_target_a_val = 0 OR v_target_b_val = 0 THEN
            v_scaled_ing := v_ing;

        ELSE
            -- 4c. Proportional scaling formula:
            --   percent_solved = logged_macro_A / target_A
            --   portion_B      = target_B × percent_solved
            --   scalar         = portion_B / logged_macro_A
            --                  = target_B / target_A  (algebraically simplified)
            v_scalar := v_target_b_val / v_target_a_val;

            v_scaled_p    := ROUND(v_p_a * v_scalar);
            v_scaled_c    := ROUND(v_c_a * v_scalar);
            v_scaled_f    := ROUND(v_f_a * v_scalar);
            v_scaled_cals := ROUND((v_scaled_p * 4) + (v_scaled_c * 4) + (v_scaled_f * 9));

            v_scaled_ing := v_ing
                || jsonb_build_object(
                    'macros', jsonb_build_object(
                        'p', v_scaled_p,
                        'c', v_scaled_c,
                        'f', v_scaled_f
                    ),
                    'cals', v_scaled_cals
                );
        END IF;

        v_results := v_results || jsonb_build_array(v_scaled_ing);
    END LOOP;

    RETURN v_results;
END;
$$;

-- ==========================================
-- Migration: 20260505233507_fix_tribe_copy_food_target_order_and_amount_scaling
-- ==========================================
DROP FUNCTION IF EXISTS public.tribe_copy_food CASCADE;
CREATE OR REPLACE FUNCTION public.tribe_copy_food(
    p_post_id   uuid,
    p_copier_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post          record;
    v_ingredients   jsonb;
    v_post_ts       timestamptz;
    v_author_id     uuid;

    v_target_a      jsonb;  -- User A (poster) targets at/before post time
    v_target_b      jsonb;  -- User B (copier) current active targets

    v_ing           jsonb;
    v_p_a           numeric;
    v_c_a           numeric;
    v_f_a           numeric;
    v_food_type     text;
    v_target_a_val  numeric;
    v_target_b_val  numeric;
    v_scalar        numeric;

    v_scaled_p      numeric;
    v_scaled_c      numeric;
    v_scaled_f      numeric;
    v_scaled_cals   numeric;

    -- Amount string scaling helpers
    v_amount_str    text;
    v_amount_num    numeric;
    v_amount_unit   text;
    v_scaled_amount text;

    v_results       jsonb := '[]'::jsonb;
    v_scaled_ing    jsonb;
BEGIN
    -- ── 1. Fetch post metadata ─────────────────────────────────────────────
    SELECT author_id, created_at, payload
    INTO   v_post
    FROM   public.posts
    WHERE  id = p_post_id;

    IF NOT FOUND THEN
        RETURN '[]'::jsonb;
    END IF;

    v_author_id   := v_post.author_id;
    v_post_ts     := v_post.created_at;
    v_ingredients := v_post.payload -> 'meal' -> 'ingredients';

    IF v_ingredients IS NULL OR jsonb_array_length(v_ingredients) = 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    -- ── 2. Resolve User A's targets (poster) at/before post time ──────────
    --   macro_history stores the PREVIOUS targets before each update,
    --   so the correct row is the most recent one <= post timestamp.
    --   Skip zero-value rows (UI resets / bad data).
    SELECT macro_targets
    INTO   v_target_a
    FROM   public.macro_history
    WHERE  user_id    = v_author_id
      AND  created_at <= v_post_ts
      AND  (
               COALESCE((macro_targets->>'p')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
           )
    ORDER  BY created_at DESC
    LIMIT  1;

    -- Fallback for User A: current profile targets
    IF v_target_a IS NULL THEN
        SELECT macro_targets
        INTO   v_target_a
        FROM   public.profiles
        WHERE  id = v_author_id
          AND  (
                   COALESCE((macro_targets->>'p')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
               );
    END IF;

    -- ── 3. Resolve User B's current ACTIVE targets (copier) ───────────────
    --   IMPORTANT: profiles.macro_targets holds the user's CURRENT active
    --   targets. macro_history stores OLD snapshots (before updates).
    --   So for the copier we ALWAYS start from profiles, not history.
    SELECT macro_targets
    INTO   v_target_b
    FROM   public.profiles
    WHERE  id = p_copier_id
      AND  (
               COALESCE((macro_targets->>'p')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
            OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
           );

    -- Fallback for User B: most recent valid macro_history row
    IF v_target_b IS NULL THEN
        SELECT macro_targets
        INTO   v_target_b
        FROM   public.macro_history
        WHERE  user_id = p_copier_id
          AND  (
                   COALESCE((macro_targets->>'p')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'c')::numeric, 0) > 0
                OR COALESCE((macro_targets->>'f')::numeric, 0) > 0
               )
        ORDER  BY created_at DESC
        LIMIT  1;
    END IF;

    -- ── 4. Scale each ingredient proportionally ────────────────────────────
    FOR v_ing IN SELECT * FROM jsonb_array_elements(v_ingredients)
    LOOP
        v_p_a := COALESCE((v_ing -> 'macros' ->> 'p')::numeric, 0);
        v_c_a := COALESCE((v_ing -> 'macros' ->> 'c')::numeric, 0);
        v_f_a := COALESCE((v_ing -> 'macros' ->> 'f')::numeric, 0);

        -- 4a. Classify dominant macro (food_type) by highest gram mass
        IF v_p_a >= v_c_a AND v_p_a >= v_f_a THEN
            v_food_type    := 'protein';
            v_target_a_val := COALESCE((v_target_a->>'p')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b->>'p')::numeric, 0);
        ELSIF v_c_a >= v_p_a AND v_c_a >= v_f_a THEN
            v_food_type    := 'carbs';
            v_target_a_val := COALESCE((v_target_a->>'c')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b->>'c')::numeric, 0);
        ELSE
            v_food_type    := 'fats';
            v_target_a_val := COALESCE((v_target_a->>'f')::numeric, 0);
            v_target_b_val := COALESCE((v_target_b->>'f')::numeric, 0);
        END IF;

        -- 4b. Division-by-zero guard → standard copy (exact 1:1 fallback)
        IF v_target_a IS NULL OR v_target_b IS NULL
           OR v_target_a_val = 0 OR v_target_b_val = 0 THEN

            v_scaled_ing := v_ing;

        ELSE
            -- 4c. Proportional scaling:
            --   percent_solved = logged_macro_A / target_A
            --   portion_B      = target_B × percent_solved
            --   scalar         = portion_B / logged_macro_A
            --                  = target_B / target_A  (algebraically simplified)
            v_scalar := v_target_b_val / v_target_a_val;

            v_scaled_p    := ROUND(v_p_a * v_scalar);
            v_scaled_c    := ROUND(v_c_a * v_scalar);
            v_scaled_f    := ROUND(v_f_a * v_scalar);
            v_scaled_cals := ROUND((v_scaled_p * 4) + (v_scaled_c * 4) + (v_scaled_f * 9));

            -- 4d. Scale the amount string (e.g. "2 cups cooked" → "1.1 cups cooked")
            --   Parse leading numeric token from amount, apply scalar, reconstruct.
            v_amount_str := COALESCE(v_ing->>'amount', '');
            v_amount_num := NULL;
            v_amount_unit := '';

            -- Try to extract a leading number (int or decimal, e.g. "2", "1.5", "0.75")
            BEGIN
                SELECT
                    (regexp_match(v_amount_str, '^(\d+\.?\d*)'))[1]::numeric,
                    trim(regexp_replace(v_amount_str, '^\d+\.?\d*\s*', ''))
                INTO v_amount_num, v_amount_unit;
            EXCEPTION WHEN OTHERS THEN
                v_amount_num := NULL;
                v_amount_unit := v_amount_str;
            END;

            IF v_amount_num IS NOT NULL AND v_amount_num > 0 THEN
                -- Round to 1 decimal place for readability (e.g. 1.1, not 1.136)
                DECLARE
                    v_new_num numeric := ROUND(v_amount_num * v_scalar, 1);
                    v_num_str text;
                BEGIN
                    -- Trim trailing zero after decimal (e.g. "2.0" → "2")
                    v_num_str := CASE
                        WHEN v_new_num = TRUNC(v_new_num)
                        THEN TRUNC(v_new_num)::text
                        ELSE v_new_num::text
                    END;
                    v_scaled_amount := CASE
                        WHEN v_amount_unit = '' THEN v_num_str
                        ELSE v_num_str || ' ' || v_amount_unit
                    END;
                END;
            ELSE
                -- No leading number found; keep original amount string
                v_scaled_amount := v_amount_str;
            END IF;

            -- 4e. Build scaled ingredient. Strip 'metadata' (USDA servingSize etc.)
            --     so the frontend edit screen doesn't show a conflicting 100g-based
            --     recalculation for a free-text unit like "cups cooked".
            v_scaled_ing := (v_ing - 'metadata')
                || jsonb_build_object(
                    'macros',  jsonb_build_object('p', v_scaled_p, 'c', v_scaled_c, 'f', v_scaled_f),
                    'cals',    v_scaled_cals,
                    'amount',  v_scaled_amount
                );
        END IF;

        v_results := v_results || jsonb_build_array(v_scaled_ing);
    END LOOP;

    RETURN v_results;
END;
$$;

-- ==========================================
-- Migration: 20260508013957_add_notes_and_macro_book_fields
-- ==========================================
-- Add notes to meal_log
ALTER TABLE public.meal_log ADD COLUMN IF NOT EXISTS notes text;

-- Add notes to lift_book
ALTER TABLE public.lift_book ADD COLUMN IF NOT EXISTS notes text;

-- Add fields to macro_book
ALTER TABLE public.macro_book ADD COLUMN IF NOT EXISTS is_delta_row boolean DEFAULT false;
ALTER TABLE public.macro_book ADD COLUMN IF NOT EXISTS date_label text;

-- ==========================================
-- Migration: 20260509003849_update_copy_to_macro_book
-- ==========================================
DROP FUNCTION IF EXISTS public.copy_to_macro_book CASCADE;
CREATE OR REPLACE FUNCTION public.copy_to_macro_book(
    p_user_id UUID,
    p_post_id UUID,
    p_selection_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post RECORD;
    v_targets JSONB;
    v_label TEXT;
    v_entry_id UUID;
    v_is_delta BOOLEAN := false;
    v_p INTEGER;
    v_c INTEGER;
    v_f INTEGER;
    v_cal INTEGER;
BEGIN
    -- Get post details
    SELECT p.*, pr.handle INTO v_post
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.author_id
    WHERE p.id = p_post_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Post not found';
    END IF;

    -- Extract targets based on type
    IF v_post.post_type = 'macro_update' THEN
        IF p_selection_type = 'old' THEN
            v_targets := v_post.payload->'macroUpdate'->'oldTargets';
            v_label := 'Previous targets from @' || v_post.handle;
            v_p := (v_targets->>'p')::INTEGER;
            v_c := (v_targets->>'c')::INTEGER;
            v_f := (v_targets->>'f')::INTEGER;
            v_cal := (v_targets->>'calories')::INTEGER;
        ELSIF p_selection_type = 'delta' OR p_selection_type = 'diff' THEN
            DECLARE
                v_old JSONB := v_post.payload->'macroUpdate'->'oldTargets';
                v_new JSONB := v_post.payload->'macroUpdate'->'newTargets';
            BEGIN
                v_p := (v_new->>'p')::INTEGER - (v_old->>'p')::INTEGER;
                v_c := (v_new->>'c')::INTEGER - (v_old->>'c')::INTEGER;
                v_f := (v_new->>'f')::INTEGER - (v_old->>'f')::INTEGER;
                v_cal := (v_new->>'calories')::INTEGER - (v_old->>'calories')::INTEGER;
                v_label := 'Update from @' || v_post.handle;
                v_is_delta := true;
            END;
        ELSE
            v_targets := v_post.payload->'macroUpdate'->'newTargets';
            v_label := 'New targets from @' || v_post.handle;
            v_p := (v_targets->>'p')::INTEGER;
            v_c := (v_targets->>'c')::INTEGER;
            v_f := (v_targets->>'f')::INTEGER;
            v_cal := (v_targets->>'calories')::INTEGER;
        END IF;
    ELSIF v_post.post_type = 'snapshot' THEN
        v_targets := v_post.payload->'snapshot'->'targets';
        v_label := 'Targets from @' || v_post.handle;
        v_p := (v_targets->>'p')::INTEGER;
        v_c := (v_targets->>'c')::INTEGER;
        v_f := (v_targets->>'f')::INTEGER;
        v_cal := (v_targets->>'calories')::INTEGER;
    ELSE
        RAISE EXCEPTION 'Invalid post type for macro book';
    END IF;

    -- Insert into macro_book
    INSERT INTO public.macro_book (
        user_id,
        label,
        protein,
        carbs,
        fats,
        calories,
        original_post_id,
        is_delta_row
    )
    VALUES (
        p_user_id,
        v_label,
        v_p,
        v_c,
        v_f,
        v_cal,
        p_post_id,
        v_is_delta
    )
    RETURNING id INTO v_entry_id;

    RETURN v_entry_id;
END;
$$;

-- ==========================================
-- Migration: 20260513235822_add_tribe_discovery_fields_and_search_rpc
-- ==========================================
-- 1. Add new columns to tribes table
ALTER TABLE public.tribes
  ADD COLUMN IF NOT EXISTS natural_status boolean,         -- nullable: null = not set, true = natural, false = enhanced
  ADD COLUMN IF NOT EXISTS activity_type  text,            -- e.g. 'Bodybuilder (Bulk)'
  ADD COLUMN IF NOT EXISTS activity_icon  text,            -- e.g. 'hammer'
  ADD COLUMN IF NOT EXISTS focus_type     text,            -- e.g. 'accountability', 'head-to-head', 'tribe-vs-tribe'
  ADD COLUMN IF NOT EXISTS member_count   integer NOT NULL DEFAULT 0;

-- 2. Trigram index for fast ILIKE searches on tribe name
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_tribes_name_trgm ON public.tribes USING gin (name gin_trgm_ops);

-- 3. Drop old search_explore function signature for tribes if it exists, then create focused tribe search RPC
DROP FUNCTION IF EXISTS public.search_tribes CASCADE;
CREATE OR REPLACE FUNCTION public.search_tribes(
  p_user_id   uuid,
  p_query     text    DEFAULT '',
  p_limit     integer DEFAULT 25
)
RETURNS TABLE(
  id             uuid,
  name           text,
  avatar_url     text,
  theme_color    text,
  tribe_type     text,
  privacy        text,
  description    text,
  tags           text[],
  member_count   integer,
  natural_status boolean,
  activity_type  text,
  activity_icon  text,
  focus_type     text,
  join_status    text   -- 'none' | 'member' | 'pending'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.avatar_url,
    t.theme_color,
    t.tribe_type,
    t.privacy,
    t.description,
    t.tags,
    t.member_count,
    t.natural_status,
    COALESCE(t.activity_type, t.tags[1]) AS activity_type,
    t.activity_icon,
    COALESCE(t.focus_type, t.tribe_type)  AS focus_type,
    CASE
      WHEN tm_active.role IN ('chief','member') THEN 'member'
      WHEN tm_pending.role = 'pending'           THEN 'pending'
      ELSE 'none'
    END AS join_status
  FROM public.tribes t
  LEFT JOIN public.tribe_members tm_active
         ON tm_active.tribe_id = t.id
        AND tm_active.user_id  = p_user_id
        AND tm_active.role IN ('chief','member')
  LEFT JOIN public.tribe_members tm_pending
         ON tm_pending.tribe_id = t.id
        AND tm_pending.user_id  = p_user_id
        AND tm_pending.role = 'pending'
  WHERE (
    p_query = ''
    OR t.name ILIKE '%' || p_query || '%'
  )
  ORDER BY t.name ASC
  LIMIT p_limit;
END;
$$;

-- ==========================================
-- Migration: 20260514034930_create_search_tribes_rpc
-- ==========================================
DROP FUNCTION IF EXISTS search_tribes CASCADE;
CREATE OR REPLACE FUNCTION search_tribes(
  p_user_id UUID,
  p_query TEXT DEFAULT '',
  p_limit INT DEFAULT 25
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  avatar_url TEXT,
  theme_color TEXT,
  tribe_type TEXT,
  privacy TEXT,
  description TEXT,
  tags TEXT[],
  member_count INT,
  natural_status BOOLEAN,
  activity_type TEXT,
  activity_icon TEXT,
  focus_type TEXT,
  join_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.avatar_url,
    t.theme_color,
    t.tribe_type,
    t.privacy,
    t.description,
    t.tags,
    (SELECT COUNT(*)::INT FROM public.tribe_members tm WHERE tm.tribe_id = t.id AND tm.role != 'pending') AS member_count,
    t.natural_status,
    t.activity_type,
    t.activity_icon,
    t.focus_type,
    CASE 
      WHEN tm.role = 'chief' THEN 'member'
      WHEN tm.role = 'member' THEN 'member'
      WHEN tm.role = 'pending' THEN 'pending'
      ELSE 'none'
    END AS join_status
  FROM public.tribes t
  LEFT JOIN public.tribe_members tm ON tm.tribe_id = t.id AND tm.user_id = p_user_id
  WHERE 
    (p_query = '' OR t.name ILIKE '%' || p_query || '%' OR t.description ILIKE '%' || p_query || '%')
  ORDER BY t.name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Migration: 20260514161004_fix_tribe_chief_ids_and_backfill_metadata
-- ==========================================
-- ── 1a: Fix chief_id for 5 newer tribes from their tribe_members ──────────────
-- [CLEANED SEED DATA] UPDATE tribes SET chief_id = '00000000-0000-0000-0000-000000000005'
-- [CLEANED SEED DATA] WHERE id = '00000000-0000-0000-0000-111111111111' AND chief_id IS NULL;

-- [CLEANED SEED DATA] UPDATE tribes SET chief_id = '00000000-0000-0000-0000-000000000008'
-- [CLEANED SEED DATA] WHERE id = '00000000-0000-0000-0000-222222222222' AND chief_id IS NULL;

-- [CLEANED SEED DATA] UPDATE tribes SET chief_id = '00000000-0000-0000-0000-000000000001'
-- [CLEANED SEED DATA] WHERE id = '00000000-0000-0000-0000-333333333333' AND chief_id IS NULL;

-- [CLEANED SEED DATA] UPDATE tribes SET chief_id = '00000000-0000-0000-0000-000000000009'
-- [CLEANED SEED DATA] WHERE id = '00000000-0000-0000-0000-444444444444' AND chief_id IS NULL;

-- [CLEANED SEED DATA] UPDATE tribes SET chief_id = '00000000-0000-0000-0000-000000000011'
-- [CLEANED SEED DATA] WHERE id = '00000000-0000-0000-0000-555555555555' AND chief_id IS NULL;

-- ── 1b: Backfill metadata for 4 legacy b0000 tribes ─────────────────────────
-- [CLEANED SEED DATA] UPDATE tribes SET
-- [CLEANED SEED DATA]     natural_status  = false,
-- [CLEANED SEED DATA]     activity_type   = 'Bodybuilding (Bulk)',
-- [CLEANED SEED DATA]     activity_icon   = 'hammer',
-- [CLEANED SEED DATA]     focus_type      = 'accountability'
-- [CLEANED SEED DATA] WHERE id = 'b0000000-0000-0000-0000-000000000001';  -- Harvard Alum League

-- [CLEANED SEED DATA] UPDATE tribes SET
-- [CLEANED SEED DATA]     natural_status  = false,
-- [CLEANED SEED DATA]     activity_type   = 'Powerlifting',
-- [CLEANED SEED DATA]     activity_icon   = 'weight-lifter',
-- [CLEANED SEED DATA]     focus_type      = 'head-to-head'
-- [CLEANED SEED DATA] WHERE id = 'b0000000-0000-0000-0000-000000000002';  -- Iron Brotherhood

-- [CLEANED SEED DATA] UPDATE tribes SET
-- [CLEANED SEED DATA]     natural_status  = false,
-- [CLEANED SEED DATA]     activity_type   = 'Bodybuilding (Cut)',
-- [CLEANED SEED DATA]     activity_icon   = 'fire',
-- [CLEANED SEED DATA]     focus_type      = 'head-to-head'
-- [CLEANED SEED DATA] WHERE id = 'b0000000-0000-0000-0000-000000000003';  -- Team Flex

-- [CLEANED SEED DATA] UPDATE tribes SET
-- [CLEANED SEED DATA]     natural_status  = true,
-- [CLEANED SEED DATA]     activity_type   = 'Bodybuilding (Cut)',
-- [CLEANED SEED DATA]     activity_icon   = 'leaf',
-- [CLEANED SEED DATA]     focus_type      = 'tribe-vs-tribe'
-- [CLEANED SEED DATA] WHERE id = 'b0000000-0000-0000-0000-000000000004';  -- The Cut Squad

-- ── 1c: Add tribe_members for b0000 legacy tribes (chiefs + seed members) ───
-- Harvard Alum League (b001): chief = @jsmith (000...0002)
-- [CLEANED SEED DATA] INSERT INTO tribe_members (tribe_id, user_id, role) VALUES
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','chief'),
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012','member'),
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000013','member'),
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000014','member'),
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000015','member')
-- [CLEANED SEED DATA] ON CONFLICT (tribe_id, user_id) DO NOTHING;

-- Iron Brotherhood (b002): chief = @arivera (000...0003), private
-- [CLEANED SEED DATA] INSERT INTO tribe_members (tribe_id, user_id, role) VALUES
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','chief'),
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000016','member'),
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000017','member'),
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000020','member')
-- [CLEANED SEED DATA] ON CONFLICT (tribe_id, user_id) DO NOTHING;

-- Team Flex (b003): already has members — add a few more for richer feed
-- [CLEANED SEED DATA] INSERT INTO tribe_members (tribe_id, user_id, role) VALUES
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000012','member'),
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000013','member'),
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000014','member')
-- [CLEANED SEED DATA] ON CONFLICT (tribe_id, user_id) DO NOTHING;

-- The Cut Squad (b004): already has members
-- [CLEANED SEED DATA] INSERT INTO tribe_members (tribe_id, user_id, role) VALUES
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000011','member'),
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000007','member'),
-- [CLEANED SEED DATA]   ('b0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','member')
-- [CLEANED SEED DATA] ON CONFLICT (tribe_id, user_id) DO NOTHING;

-- ==========================================
-- Migration: 20260514161020_tribe_member_count_trigger_and_rpcs
-- ==========================================
-- ── 1d: Sync member_count from actual tribe_members rows ─────────────────────
-- [CLEANED SEED DATA] UPDATE tribes t
-- [CLEANED SEED DATA] SET member_count = (
-- [CLEANED SEED DATA]     SELECT COUNT(*) FROM tribe_members tm
-- [CLEANED SEED DATA]     WHERE tm.tribe_id = t.id
-- [CLEANED SEED DATA]     AND tm.role IN ('chief', 'member')
-- [CLEANED SEED DATA] );

-- Trigger function to keep member_count in sync
DROP FUNCTION IF EXISTS sync_tribe_member_count CASCADE;
CREATE OR REPLACE FUNCTION sync_tribe_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.role IN ('chief', 'member') THEN
            UPDATE tribes SET member_count = member_count + 1 WHERE id = NEW.tribe_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.role IN ('chief', 'member') THEN
            UPDATE tribes SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.tribe_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle role change (e.g. pending -> member)
        IF OLD.role NOT IN ('chief','member') AND NEW.role IN ('chief','member') THEN
            UPDATE tribes SET member_count = member_count + 1 WHERE id = NEW.tribe_id;
        ELSIF OLD.role IN ('chief','member') AND NEW.role NOT IN ('chief','member') THEN
            UPDATE tribes SET member_count = GREATEST(0, member_count - 1) WHERE id = NEW.tribe_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_tribe_member_count ON tribe_members;
CREATE TRIGGER trg_tribe_member_count
    AFTER INSERT OR UPDATE OR DELETE ON tribe_members
    FOR EACH ROW EXECUTE FUNCTION sync_tribe_member_count();

-- ── 1e: join_tribe RPC ────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS join_tribe CASCADE;
CREATE OR REPLACE FUNCTION join_tribe(p_user_id uuid, p_tribe_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_privacy text;
    v_result  text;
BEGIN
    SELECT privacy INTO v_privacy FROM tribes WHERE id = p_tribe_id;

    IF v_privacy = 'private' THEN
        INSERT INTO tribe_members (tribe_id, user_id, role)
        VALUES (p_tribe_id, p_user_id, 'pending')
        ON CONFLICT (tribe_id, user_id) DO NOTHING;
        v_result := 'requested';
    ELSE
        INSERT INTO tribe_members (tribe_id, user_id, role)
        VALUES (p_tribe_id, p_user_id, 'member')
        ON CONFLICT (tribe_id, user_id)
        DO UPDATE SET role = 'member';
        v_result := 'joined';
    END IF;

    RETURN v_result;
END;
$$;

-- ── 1f: leave_tribe RPC ───────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS leave_tribe CASCADE;
CREATE OR REPLACE FUNCTION leave_tribe(p_user_id uuid, p_tribe_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM tribe_members
    WHERE tribe_id = p_tribe_id AND user_id = p_user_id;
END;
$$;

-- ── Enable Realtime on the likes table ────────────────────────────────────────
ALTER TABLE likes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE likes;

-- ==========================================
-- Migration: 20260514161114_seed_tribe_posts_may_14_2026
-- ==========================================
-- ── 1g: Seed tribe posts for May 14 2026 ──────────────────────────────────────
-- Team Flex (b003) — @kwadub meal
-- [CLEANED SEED DATA] INSERT INTO posts (author_id, post_type, payload, caption, tribe_id, created_at, like_count, comment_count) VALUES
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000001', 'meal',
-- [CLEANED SEED DATA]  '{"meal":{"id":"tp-m1","title":"Pre-workout Fuel","type":"Breakfast","calories":720,"macros":{"p":52,"c":80,"f":14},"ingredients":[{"id":"i1","name":"Oatmeal","amount":"1 cup","cals":300,"macros":{"p":10,"c":54,"f":5}},{"id":"i2","name":"Whey Protein","amount":"1 scoop","cals":120,"macros":{"p":25,"c":5,"f":2}},{"id":"i3","name":"Banana","amount":"1 medium","cals":105,"macros":{"p":1,"c":27,"f":0}},{"id":"i4","name":"Almond Butter","amount":"1 tbsp","cals":98,"macros":{"p":3,"c":3,"f":9}}]}}',
-- [CLEANED SEED DATA]  'Fueling up for leg day 🔥', 'b0000000-0000-0000-0000-000000000003', '2026-05-14T08:30:00Z', 7, 2),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Team Flex (b003) — @swhite meal
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000008', 'meal',
-- [CLEANED SEED DATA]  '{"meal":{"id":"tp-m2","title":"Cheat meal!!!!","type":"Dinner","calories":1200,"macros":{"p":54,"c":140,"f":30},"ingredients":[{"id":"i5","name":"Chicken","amount":"6 oz","cals":280,"macros":{"p":50,"c":0,"f":6}},{"id":"i6","name":"Pasta","amount":"2 cups","cals":400,"macros":{"p":14,"c":80,"f":2}},{"id":"i7","name":"Olive Oil","amount":"2 tbsp","cals":240,"macros":{"p":0,"c":0,"f":28}}]}}',
-- [CLEANED SEED DATA]  'Earned this one 💪', 'b0000000-0000-0000-0000-000000000003', '2026-05-14T19:00:00Z', 12, 3),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Team Flex (b003) — @rcooper workout
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000005', 'workout',
-- [CLEANED SEED DATA]  '{"workout":{"id":"tp-w1","title":"Push Day","timestamp":1747224600000,"exercises":[{"id":"e1","title":"Bench Press","type":"Strength","muscleGroup":"Chest","sets":[{"id":"s1","reps":8,"weight":185,"rpe":8,"completed":true},{"id":"s2","reps":8,"weight":185,"rpe":9,"completed":true},{"id":"s3","reps":6,"weight":185,"rpe":10,"completed":true}]},{"id":"e2","title":"Overhead Press","type":"Strength","muscleGroup":"Shoulders","sets":[{"id":"s4","reps":10,"weight":115,"rpe":7,"completed":true},{"id":"s5","reps":10,"weight":115,"rpe":8,"completed":true}]}]}}',
-- [CLEANED SEED DATA]  'Push day W 💪', 'b0000000-0000-0000-0000-000000000003', '2026-05-14T10:00:00Z', 5, 1),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Iron Warriors (111) — @rcooper meal
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000005', 'meal',
-- [CLEANED SEED DATA]  '{"meal":{"id":"tp-m3","title":"Bulk Meal #2","type":"Lunch","calories":950,"macros":{"p":75,"c":100,"f":22},"ingredients":[{"id":"i8","name":"Ground Beef (93%)","amount":"8 oz","cals":350,"macros":{"p":48,"c":0,"f":16}},{"id":"i9","name":"Brown Rice","amount":"1.5 cups","cals":330,"macros":{"p":7,"c":69,"f":3}},{"id":"i10","name":"Broccoli","amount":"2 cups","cals":60,"macros":{"p":5,"c":12,"f":1}},{"id":"i11","name":"Olive Oil","amount":"1 tbsp","cals":120,"macros":{"p":0,"c":0,"f":14}}]}}',
-- [CLEANED SEED DATA]  'Staying on the bulk 🔨', '00000000-0000-0000-0000-111111111111', '2026-05-14T12:30:00Z', 9, 2),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Iron Warriors (111) — @swhite snapshot
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000008', 'snapshot',
-- [CLEANED SEED DATA]  '{"snapshot":{"id":"tp-s1","timestamp":1747267200000,"caption":"End of day check-in","targets":{"calories":3200,"p":220,"c":380,"f":70},"consumed":{"calories":2890,"p":198,"c":340,"f":64}}}',
-- [CLEANED SEED DATA]  'Good day of eating 📊', '00000000-0000-0000-0000-111111111111', '2026-05-14T20:00:00Z', 4, 0),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Iron Warriors (111) — @kwadub workout
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000001', 'workout',
-- [CLEANED SEED DATA]  '{"workout":{"id":"tp-w2","title":"Leg Day","timestamp":1747224600000,"exercises":[{"id":"e3","title":"Squat","type":"Strength","muscleGroup":"Quads","sets":[{"id":"s6","reps":5,"weight":315,"rpe":9,"completed":true},{"id":"s7","reps":5,"weight":315,"rpe":9,"completed":true},{"id":"s8","reps":5,"weight":315,"rpe":10,"completed":true}]},{"id":"e4","title":"Romanian Deadlift","type":"Strength","muscleGroup":"Hamstrings","sets":[{"id":"s9","reps":8,"weight":225,"rpe":8,"completed":true},{"id":"s10","reps":8,"weight":225,"rpe":8,"completed":true}]}]}}',
-- [CLEANED SEED DATA]  'Squatted 315 for 3 sets 🦵', '00000000-0000-0000-0000-111111111111', '2026-05-14T09:00:00Z', 15, 4),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Nature''s Pack (333) — @kwadub meal (natural tribe)
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000001', 'meal',
-- [CLEANED SEED DATA]  '{"meal":{"id":"tp-m4","title":"Clean Bulk Plate","type":"Lunch","calories":680,"macros":{"p":58,"c":72,"f":15},"ingredients":[{"id":"i12","name":"Salmon","amount":"6 oz","cals":300,"macros":{"p":42,"c":0,"f":14}},{"id":"i13","name":"Quinoa","amount":"1 cup","cals":220,"macros":{"p":8,"c":39,"f":4}},{"id":"i14","name":"Spinach","amount":"2 cups","cals":14,"macros":{"p":2,"c":2,"f":0}},{"id":"i15","name":"Avocado","amount":"0.5 medium","cals":80,"macros":{"p":1,"c":4,"f":7}}]}}',
-- [CLEANED SEED DATA]  'Natural gains only 🌿', '00000000-0000-0000-0000-333333333333', '2026-05-14T13:00:00Z', 6, 1),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Nature''s Pack (333) — @amiller snapshot
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000011', 'snapshot',
-- [CLEANED SEED DATA]  '{"snapshot":{"id":"tp-s2","timestamp":1747267200000,"caption":"Today''s macros — feeling balanced","targets":{"calories":2400,"p":180,"c":270,"f":53},"consumed":{"calories":2250,"p":172,"c":248,"f":51}}}',
-- [CLEANED SEED DATA]  'Almost hit my targets 💚', '00000000-0000-0000-0000-333333333333', '2026-05-14T21:00:00Z', 3, 0),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Apex Lifters (222) — @preed workout
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000009', 'workout',
-- [CLEANED SEED DATA]  '{"workout":{"id":"tp-w3","title":"Max Deadlift Day","timestamp":1747224600000,"exercises":[{"id":"e5","title":"Deadlift","type":"Strength","muscleGroup":"Back","sets":[{"id":"s11","reps":1,"weight":495,"rpe":10,"completed":true},{"id":"s12","reps":2,"weight":455,"rpe":9,"completed":true},{"id":"s13","reps":3,"weight":405,"rpe":8,"completed":true}]},{"id":"e6","title":"Bent Over Row","type":"Strength","muscleGroup":"Back","sets":[{"id":"s14","reps":8,"weight":225,"rpe":7,"completed":true},{"id":"s15","reps":8,"weight":225,"rpe":7,"completed":true}]}]}}',
-- [CLEANED SEED DATA]  'New PR incoming 🏋️', '00000000-0000-0000-0000-222222222222', '2026-05-14T11:00:00Z', 18, 5),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Apex Lifters (222) — @swhite meal
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000008', 'meal',
-- [CLEANED SEED DATA]  '{"meal":{"id":"tp-m5","title":"Post-lift Recovery","type":"Post-Workout","calories":560,"macros":{"p":60,"c":55,"f":8},"ingredients":[{"id":"i16","name":"Whey Isolate","amount":"2 scoops","cals":240,"macros":{"p":50,"c":4,"f":2}},{"id":"i17","name":"White Rice","amount":"1 cup","cals":200,"macros":{"p":4,"c":44,"f":0}},{"id":"i18","name":"Apple","amount":"1 medium","cals":80,"macros":{"p":0,"c":21,"f":0}}]}}',
-- [CLEANED SEED DATA]  'Shake + rice = gains 💪', '00000000-0000-0000-0000-222222222222', '2026-05-14T14:00:00Z', 8, 2),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- The Cut Squad (b004) — @qtaylor meal
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000006', 'meal',
-- [CLEANED SEED DATA]  '{"meal":{"id":"tp-m6","title":"Cut Day Plate","type":"Dinner","calories":440,"macros":{"p":55,"c":35,"f":10},"ingredients":[{"id":"i19","name":"Chicken Breast","amount":"7 oz","cals":230,"macros":{"p":48,"c":0,"f":5}},{"id":"i20","name":"Asparagus","amount":"1 cup","cals":40,"macros":{"p":4,"c":7,"f":0}},{"id":"i21","name":"Sweet Potato","amount":"0.5 cup","cals":90,"macros":{"p":2,"c":21,"f":0}},{"id":"i22","name":"Greek Yogurt","amount":"0.5 cup","cals":60,"macros":{"p":8,"c":5,"f":0}}]}}',
-- [CLEANED SEED DATA]  'Cut szn 🔪 staying disciplined', 'b0000000-0000-0000-0000-000000000004', '2026-05-14T18:30:00Z', 11, 3),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- The Cut Squad (b004) — @kwadub snapshot
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000001', 'snapshot',
-- [CLEANED SEED DATA]  '{"snapshot":{"id":"tp-s3","timestamp":1747267200000,"caption":"Cut check-in — week 4","targets":{"calories":2200,"p":200,"c":220,"f":49},"consumed":{"calories":2180,"p":195,"c":215,"f":48}}}',
-- [CLEANED SEED DATA]  'Week 4 of cut — holding strong 💪', 'b0000000-0000-0000-0000-000000000004', '2026-05-14T22:00:00Z', 7, 1),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Harvard Alum League (b001) — @jsmith meal
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000002', 'meal',
-- [CLEANED SEED DATA]  '{"meal":{"id":"tp-m7","title":"Morning Stack","type":"Breakfast","calories":620,"macros":{"p":42,"c":70,"f":16},"ingredients":[{"id":"i23","name":"Eggs","amount":"4 large","cals":280,"macros":{"p":24,"c":2,"f":20}},{"id":"i24","name":"Whole Grain Toast","amount":"2 slices","cals":160,"macros":{"p":6,"c":30,"f":2}},{"id":"i25","name":"Orange Juice","amount":"8 oz","cals":110,"macros":{"p":2,"c":26,"f":0}}]}}',
-- [CLEANED SEED DATA]  'Accountability starts with breakfast 📚', 'b0000000-0000-0000-0000-000000000001', '2026-05-14T07:00:00Z', 4, 0),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Zenith (555) — @amiller meal (yoga/pilates)
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000011', 'meal',
-- [CLEANED SEED DATA]  '{"meal":{"id":"tp-m8","title":"Plant Power Bowl","type":"Lunch","calories":520,"macros":{"p":28,"c":65,"f":16},"ingredients":[{"id":"i26","name":"Chickpeas","amount":"1 cup","cals":210,"macros":{"p":12,"c":35,"f":3}},{"id":"i27","name":"Farro","amount":"0.75 cup","cals":170,"macros":{"p":6,"c":35,"f":2}},{"id":"i28","name":"Tahini","amount":"2 tbsp","cals":90,"macros":{"p":3,"c":4,"f":8}},{"id":"i29","name":"Kale","amount":"2 cups","cals":33,"macros":{"p":3,"c":6,"f":0}}]}}',
-- [CLEANED SEED DATA]  'Mind and body in sync 🧘', '00000000-0000-0000-0000-555555555555', '2026-05-14T12:00:00Z', 5, 1),
-- [CLEANED SEED DATA] 
-- [CLEANED SEED DATA] -- Zenith (555) — @kwadub snapshot
-- [CLEANED SEED DATA] ('00000000-0000-0000-0000-000000000001', 'snapshot',
-- [CLEANED SEED DATA]  '{"snapshot":{"id":"tp-s4","timestamp":1747267200000,"caption":"Balanced day — feeling centered","targets":{"calories":2600,"p":160,"c":320,"f":65},"consumed":{"calories":2490,"p":152,"c":305,"f":62}}}',
-- [CLEANED SEED DATA]  'Zenith mindset 🏔️', '00000000-0000-0000-0000-555555555555', '2026-05-14T20:30:00Z', 2, 0);

-- ==========================================
-- Migration: 20260515000304_create_tribe_messages
-- ==========================================
CREATE TABLE tribe_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tribe_id UUID REFERENCES tribes(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE tribe_messages ENABLE ROW LEVEL SECURITY;

-- Read policy
CREATE POLICY "Read tribe messages" ON tribe_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tribe_members
            WHERE tribe_id = tribe_messages.tribe_id
              AND user_id = auth.uid()
              AND role IN ('member', 'chief')
        )
        OR
        EXISTS (
            SELECT 1 FROM tribes
            WHERE id = tribe_messages.tribe_id
              AND privacy = 'public'
        )
    );

-- Insert policy
CREATE POLICY "Insert tribe messages" ON tribe_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tribe_members
            WHERE tribe_id = tribe_messages.tribe_id
              AND user_id = auth.uid()
              AND role IN ('member', 'chief')
        )
        AND
        (
            EXISTS (
                SELECT 1 FROM tribes
                WHERE id = tribe_messages.tribe_id
                  AND privacy = 'private'
            )
            OR
            EXISTS (
                SELECT 1 FROM tribes
                WHERE id = tribe_messages.tribe_id
                  AND privacy = 'public'
                  AND member_count <= 100
            )
            OR
            (
                EXISTS (
                    SELECT 1 FROM tribes
                    WHERE id = tribe_messages.tribe_id
                      AND privacy = 'public'
                      AND member_count > 100
                )
                AND
                EXISTS (
                    SELECT 1 FROM tribe_members
                    WHERE tribe_id = tribe_messages.tribe_id
                      AND user_id = auth.uid()
                      AND role = 'chief'
                )
            )
        )
    );

-- ==========================================
-- Migration: 20260515182345_update_tribe_activity_icons_to_be_more_accurate
-- ==========================================
-- Update activity icons to be more accurate
-- [CLEANED SEED DATA] UPDATE tribes SET activity_icon = 'arm-flex' WHERE activity_type ILIKE '%bodybuild%';
-- [CLEANED SEED DATA] UPDATE tribes SET activity_icon = 'weight-lifter' WHERE activity_type ILIKE '%powerlift%';
-- [CLEANED SEED DATA] UPDATE tribes SET activity_icon = 'kettlebell' WHERE activity_type ILIKE '%crossfit%' OR activity_type ILIKE '%functional%';
-- [CLEANED SEED DATA] UPDATE tribes SET activity_icon = 'run' WHERE activity_type ILIKE '%run%' OR activity_type ILIKE '%athlete%';
-- [CLEANED SEED DATA] UPDATE tribes SET activity_icon = 'bike' WHERE activity_type ILIKE '%cycling%' OR activity_type ILIKE '%bike%';
-- [CLEANED SEED DATA] UPDATE tribes SET activity_icon = 'boxing-glove' WHERE activity_type ILIKE '%combat%' OR activity_type ILIKE '%mma%' OR activity_type ILIKE '%boxing%';
-- [CLEANED SEED DATA] UPDATE tribes SET activity_icon = 'yoga' WHERE activity_type ILIKE '%yoga%' OR activity_type ILIKE '%pilates%';

-- ==========================================
-- Migration: 20260515182743_revert_bodybuilder_icons_to_hammer
-- ==========================================
-- Revert bodybuilding icons to hammer as requested
-- [CLEANED SEED DATA] UPDATE tribes SET activity_icon = 'hammer' WHERE activity_type ILIKE '%bodybuild%';

-- ==========================================
-- Migration: 20260517215522_scoreboard_infrastructure
-- ==========================================
-- 1. Profiles Table Modifications
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS highest_streak integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_logged_date date DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- 2. Performance Indexing
CREATE INDEX IF NOT EXISTS idx_meal_log_user_created ON public.meal_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_weights_user_created ON public.weights(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lift_book_user_created ON public.lift_book(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_macro_book_user_created ON public.macro_book(user_id, created_at);

-- 3. Trigger Function for Daily Activity Tracking
DROP FUNCTION IF EXISTS public.handle_daily_activity CASCADE;
CREATE OR REPLACE FUNCTION public.handle_daily_activity()
RETURNS TRIGGER AS $$
DECLARE
    user_tz text;
    user_last_date date;
    local_date date;
    current_str int;
    highest_str int;
BEGIN
    -- Get user profile streak info
    SELECT timezone, last_logged_date, current_streak, highest_streak
    INTO user_tz, user_last_date, current_str, highest_str
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF user_tz IS NULL THEN
        user_tz := 'UTC';
    END IF;

    -- Calculate the current local date in the user's timezone
    local_date := (timezone('UTC', CURRENT_TIMESTAMP) AT TIME ZONE user_tz)::date;

    IF user_last_date IS NULL THEN
        -- First log ever
        UPDATE public.profiles
        SET current_streak = 1,
            highest_streak = GREATEST(highest_streak, 1),
            last_logged_date = local_date
        WHERE id = NEW.user_id;
    ELSIF local_date > user_last_date THEN
        IF local_date = user_last_date + 1 THEN
            -- Yesterday was the last log, increment streak
            UPDATE public.profiles
            SET current_streak = current_str + 1,
                highest_streak = GREATEST(highest_streak, current_str + 1),
                last_logged_date = local_date
            WHERE id = NEW.user_id;
        ELSE
            -- Missed a day, reset streak to 1
            UPDATE public.profiles
            SET current_streak = 1,
                highest_streak = GREATEST(highest_streak, 1),
                last_logged_date = local_date
            WHERE id = NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Triggers Setup on Logging Tables
DROP TRIGGER IF EXISTS trg_meal_log_activity ON public.meal_log;
CREATE TRIGGER trg_meal_log_activity 
AFTER INSERT ON public.meal_log 
FOR EACH ROW 
EXECUTE FUNCTION public.handle_daily_activity();

DROP TRIGGER IF EXISTS trg_weights_activity ON public.weights;
CREATE TRIGGER trg_weights_activity 
AFTER INSERT ON public.weights 
FOR EACH ROW 
EXECUTE FUNCTION public.handle_daily_activity();

DROP TRIGGER IF EXISTS trg_lift_book_activity ON public.lift_book;
CREATE TRIGGER trg_lift_book_activity 
AFTER INSERT ON public.lift_book 
FOR EACH ROW 
EXECUTE FUNCTION public.handle_daily_activity();

DROP TRIGGER IF EXISTS trg_macro_book_activity ON public.macro_book;
CREATE TRIGGER trg_macro_book_activity 
AFTER INSERT ON public.macro_book 
FOR EACH ROW 
EXECUTE FUNCTION public.handle_daily_activity();

-- 5. Rolling Streaks Reset Function
DROP FUNCTION IF EXISTS public.reset_expired_streaks CASCADE;
CREATE OR REPLACE FUNCTION public.reset_expired_streaks()
RETURNS void AS $$
DECLARE
    r RECORD;
    local_today date;
    local_yesterday date;
BEGIN
    FOR r IN 
        SELECT id, timezone, last_logged_date, current_streak
        FROM public.profiles
        WHERE current_streak > 0
    LOOP
        -- Calculate local today and yesterday in the user's timezone
        local_today := (timezone('UTC', CURRENT_TIMESTAMP) AT TIME ZONE COALESCE(r.timezone, 'UTC'))::date;
        local_yesterday := local_today - 1;

        -- If their last log date is older than yesterday, their streak is broken!
        IF r.last_logged_date IS NULL OR r.last_logged_date < local_yesterday THEN
            UPDATE public.profiles
            SET current_streak = 0
            WHERE id = r.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Cron Schedule for resets
-- Check if cron is enabled and schedule it
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('reset-expired-streaks-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-expired-streaks-hourly');
SELECT cron.schedule(
    'reset-expired-streaks-hourly',
    '0 * * * *',
    'SELECT public.reset_expired_streaks()'
);

-- ==========================================
-- Migration: 20260517215527_get_scoreboard_members
-- ==========================================
DROP FUNCTION IF EXISTS public.get_scoreboard_members CASCADE;
CREATE OR REPLACE FUNCTION public.get_scoreboard_members(target_tribe_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    handle text,
    avatar_url text,
    status text,
    activity text,
    activity_icon text,
    logged boolean,
    streak integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.handle,
        p.avatar_url,
        p.status,
        p.activity,
        p.activity_icon,
        (
            -- Check if user logged today in their local timezone
            p.last_logged_date IS NOT NULL AND 
            p.last_logged_date = (timezone('UTC', CURRENT_TIMESTAMP) AT TIME ZONE COALESCE(p.timezone, 'UTC'))::date
        ) AS logged,
        COALESCE(p.current_streak, 0) AS streak
    FROM public.tribe_members tm
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.tribe_id = target_tribe_id AND tm.role != 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Migration: 20260517232313_enable_realtime_and_ttl
-- ==========================================
-- Enable Realtime replication for tribe_messages
ALTER PUBLICATION supabase_realtime ADD TABLE tribe_messages;

-- Enable pg_cron extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the 7-day TTL daily purge job at 00:00 UTC
SELECT cron.schedule(
    'purge-tribe-messages',
    '0 0 * * *',
    $$DELETE FROM tribe_messages WHERE created_at < NOW() - INTERVAL '7 days'$$
);

-- ==========================================
-- Migration: 20260518152501_create_competitions_schema
-- ==========================================
-- 1. Create Competitions Table
CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tribe_id UUID NOT NULL REFERENCES public.tribes(id) ON DELETE CASCADE,
    style TEXT NOT NULL DEFAULT 'premier' CHECK (style IN ('premier', 'traditional')),
    metric TEXT NOT NULL DEFAULT 'habits' CHECK (metric IN ('habits', 'weight_change')),
    total_weeks INTEGER NOT NULL DEFAULT 10,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    
    -- Point Matrix rules configurations
    pts_tier_1 INTEGER NOT NULL DEFAULT 10,       -- within +/- 2.5g
    pts_tier_2 INTEGER NOT NULL DEFAULT 5,        -- within +/- 10g
    pts_tier_3 INTEGER NOT NULL DEFAULT 2,        -- within +/- 15g
    pts_exercise_bonus INTEGER NOT NULL DEFAULT 10, -- exercise bonus
    pts_penalty_miss INTEGER NOT NULL DEFAULT -10,  -- deviation > +/- 20g or missing log
    pts_penalty_no_log INTEGER DEFAULT -60,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for competitions
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select access on competitions"
ON public.competitions FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Allow all access on competitions for tribe chiefs"
ON public.competitions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tribes t
        WHERE t.id = tribe_id AND t.chief_id = auth.uid()
    )
);

-- 2. Create Competition Scores Ledger Table
CREATE TABLE IF NOT EXISTS public.competition_scores_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    points_awarded INTEGER NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Idempotency Guardrail
    CONSTRAINT unique_comp_user_date UNIQUE (competition_id, user_id, date)
);

-- Enable RLS for ledger
ALTER TABLE public.competition_scores_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select access on ledger"
ON public.competition_scores_ledger FOR SELECT
TO authenticated, anon
USING (true);

-- 3. Dynamic Week Calculation PostgreSQL functions
DROP FUNCTION IF EXISTS calculate_competition_week CASCADE;
CREATE OR REPLACE FUNCTION calculate_competition_week(start_date TIMESTAMPTZ, total_weeks INTEGER)
RETURNS INTEGER AS $$
DECLARE
  weeks_elapsed INTEGER;
BEGIN
  weeks_elapsed := floor(extract(day from (now() - start_date)) / 7) + 1;
  IF weeks_elapsed > total_weeks THEN
    RETURN total_weeks;
  ELSIF weeks_elapsed < 1 THEN
    RETURN 1;
  ELSE
    RETURN weeks_elapsed;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Dynamic Tribe Metadata Header RPC
DROP FUNCTION IF EXISTS get_tribe_scoreboard_header CASCADE;
CREATE OR REPLACE FUNCTION get_tribe_scoreboard_header(p_tribe_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tribe_type TEXT;
  v_tribe_name TEXT;
  v_comp_style TEXT;
  v_comp_metric TEXT;
  v_comp_week INTEGER;
  v_comp_total_weeks INTEGER;
  v_header_line1 TEXT;
  v_header_line2 TEXT;
  v_header_line3 TEXT;
BEGIN
  SELECT name, tribe_type INTO v_tribe_name, v_tribe_type FROM public.tribes WHERE id = p_tribe_id;
  
  IF v_tribe_type = 'accountability' THEN
    RETURN jsonb_build_object(
      'line1', 'ACCOUNTABILITY',
      'line2', upper(v_tribe_name),
      'line3', null,
      'is_competitive', false
    );
  ELSE
    -- Find active competition
    SELECT style, metric, calculate_competition_week(start_date, total_weeks), total_weeks
    INTO v_comp_style, v_comp_metric, v_comp_week, v_comp_total_weeks
    FROM public.competitions
    WHERE tribe_id = p_tribe_id AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      -- Style/Metric Enums formatted to uppercase strings
      v_header_line1 := upper(v_tribe_type) || ' · ' || upper(v_comp_style) || ' · ' || upper(v_comp_metric);
      v_header_line3 := 'Week ' || v_comp_week || '/' || v_comp_total_weeks;
    ELSE
      v_header_line1 := upper(v_tribe_type);
      v_header_line3 := null;
    END IF;
    
    RETURN jsonb_build_object(
      'line1', v_header_line1,
      'line2', upper(v_tribe_name),
      'line3', v_header_line3,
      'is_competitive', true
    );
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Seed default active competition for Team Flex (tribe id: b0000000-0000-0000-0000-000000000003)
-- [CLEANED SEED DATA] INSERT INTO public.competitions (
-- [CLEANED SEED DATA]     id,
-- [CLEANED SEED DATA]     tribe_id,
-- [CLEANED SEED DATA]     style,
-- [CLEANED SEED DATA]     metric,
-- [CLEANED SEED DATA]     total_weeks,
-- [CLEANED SEED DATA]     start_date,
-- [CLEANED SEED DATA]     status
-- [CLEANED SEED DATA] ) VALUES (
-- [CLEANED SEED DATA]     'c0000000-0000-0000-0000-000000000001',
-- [CLEANED SEED DATA]     'b0000000-0000-0000-0000-000000000003',
-- [CLEANED SEED DATA]     'premier',
-- [CLEANED SEED DATA]     'habits',
-- [CLEANED SEED DATA]     10,
-- [CLEANED SEED DATA]     now(),
-- [CLEANED SEED DATA]     'active'
-- [CLEANED SEED DATA] )
-- [CLEANED SEED DATA] ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Migration: 20260518152522_scoring_ledger_calculations
-- ==========================================
-- 1. Create Automated Point-Calculation Function
DROP FUNCTION IF EXISTS calculate_user_daily_points CASCADE;
CREATE OR REPLACE FUNCTION calculate_user_daily_points(
  p_competition_id UUID,
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_comp RECORD;
  v_profile RECORD;
  v_timezone TEXT;
  
  -- Target Macros
  v_target_p NUMERIC;
  v_target_c NUMERIC;
  v_target_f NUMERIC;
  
  -- Actual Consumed Macros
  v_actual_p NUMERIC;
  v_actual_c NUMERIC;
  v_actual_f NUMERIC;
  
  -- Deviation
  v_diff_p NUMERIC;
  v_diff_c NUMERIC;
  v_diff_f NUMERIC;
  
  -- Score breakdown
  v_score_p INTEGER := 0;
  v_score_c INTEGER := 0;
  v_score_f INTEGER := 0;
  v_score_workout INTEGER := 0;
  v_total_points INTEGER := 0;
  
  v_has_workout BOOLEAN := false;
  v_has_meals BOOLEAN := false;
BEGIN
  -- 1. Fetch competition rules matrix configuration
  SELECT * INTO v_comp FROM public.competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;
  
  -- 2. Fetch user's profile targets and timezone
  SELECT macro_targets, COALESCE(timezone, 'UTC') AS timezone INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  
  v_timezone := v_profile.timezone;
  v_target_p := COALESCE((v_profile.macro_targets->>'p')::numeric, 150.0);
  v_target_c := COALESCE((v_profile.macro_targets->>'c')::numeric, 200.0);
  v_target_f := COALESCE((v_profile.macro_targets->>'f')::numeric, 60.0);
  
  -- 3. Sum up yesterday's consumed macros from meal_log in user's timezone
  SELECT 
    COALESCE(SUM(protein), 0),
    COALESCE(SUM(carbs), 0),
    COALESCE(SUM(fats), 0),
    COUNT(*) > 0
  INTO 
    v_actual_p,
    v_actual_c,
    v_actual_f,
    v_has_meals
  FROM public.meal_log
  WHERE user_id = p_user_id
    AND (created_at AT TIME ZONE v_timezone)::date = p_date;
    
  -- 4. Check if they completed a daily exercise/workout session
  SELECT EXISTS(
    SELECT 1 FROM public.posts
    WHERE author_id = p_user_id
      AND post_type = 'workout'
      AND (created_at AT TIME ZONE v_timezone)::date = p_date
  ) INTO v_has_workout;
  
  -- 5. Calculate macro scoring individually for Protein, Carbs, and Fats
  IF NOT v_has_meals THEN
    -- Penalty for missing a log for the day completely!
    -- Applied as pts_penalty_miss for EACH of the three macro categories!
    v_score_p := v_comp.pts_penalty_miss;
    v_score_c := v_comp.pts_penalty_miss;
    v_score_f := v_comp.pts_penalty_miss;
  ELSE
    -- Protein Points Calculation
    v_diff_p := abs(v_actual_p - v_target_p);
    IF v_diff_p <= 2.5 THEN
      v_score_p := v_comp.pts_tier_1;
    ELSIF v_diff_p <= 10.0 THEN
      v_score_p := v_comp.pts_tier_2;
    ELSIF v_diff_p <= 15.0 THEN
      v_score_p := v_comp.pts_tier_3;
    ELSIF v_diff_p >= 20.0 THEN
      v_score_p := v_comp.pts_penalty_miss;
    ELSE
      v_score_p := 0; -- Neutral Zone (15g to 20g deviation)
    END IF;

    -- Carbs Points Calculation
    v_diff_c := abs(v_actual_c - v_target_c);
    IF v_diff_c <= 2.5 THEN
      v_score_c := v_comp.pts_tier_1;
    ELSIF v_diff_c <= 10.0 THEN
      v_score_c := v_comp.pts_tier_2;
    ELSIF v_diff_c <= 15.0 THEN
      v_score_c := v_comp.pts_tier_3;
    ELSIF v_diff_c >= 20.0 THEN
      v_score_c := v_comp.pts_penalty_miss;
    ELSE
      v_score_c := 0;
    END IF;

    -- Fats Points Calculation
    v_diff_f := abs(v_actual_f - v_target_f);
    IF v_diff_f <= 2.5 THEN
      v_score_f := v_comp.pts_tier_1;
    ELSIF v_diff_f <= 10.0 THEN
      v_score_f := v_comp.pts_tier_2;
    ELSIF v_diff_f <= 15.0 THEN
      v_score_f := v_comp.pts_tier_3;
    ELSIF v_diff_f >= 20.0 THEN
      v_score_f := v_comp.pts_penalty_miss;
    ELSE
      v_score_f := 0;
    END IF;
  END IF;
  
  -- 6. Workout session bonus points
  IF v_has_workout THEN
    v_score_workout := v_comp.pts_exercise_bonus;
  END IF;
  
  -- 7. Calculate net total daily points
  v_total_points := v_score_p + v_score_c + v_score_f + v_score_workout;
  
  RETURN jsonb_build_object(
    'total_points', v_total_points,
    'protein_score', v_score_p,
    'carbs_score', v_score_c,
    'fats_score', v_score_f,
    'workout_score', v_score_workout,
    'actual_p', v_actual_p,
    'actual_c', v_actual_c,
    'actual_f', v_actual_f,
    'target_p', v_target_p,
    'target_c', v_target_c,
    'target_f', v_target_f,
    'has_workout', v_has_workout,
    'has_meals', v_has_meals
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Create Ledger Commit Function
DROP FUNCTION IF EXISTS commit_user_daily_points CASCADE;
CREATE OR REPLACE FUNCTION commit_user_daily_points(
  p_competition_id UUID,
  p_user_id UUID,
  p_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_calc JSONB;
  v_points INTEGER;
BEGIN
  -- Perform calculation
  v_calc := calculate_user_daily_points(p_competition_id, p_user_id, p_date);
  v_points := (v_calc->>'total_points')::integer;
  
  -- Insert into ledger (UPSERT protected: ON CONFLICT DO NOTHING to make it completely final and immutable)
  INSERT INTO public.competition_scores_ledger (
    competition_id,
    user_id,
    date,
    points_awarded,
    metadata
  ) VALUES (
    p_competition_id,
    p_user_id,
    p_date,
    v_points,
    v_calc
  )
  ON CONFLICT (competition_id, user_id, date) DO NOTHING;
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 3. Enforce Ledger Immutability Trigger
DROP FUNCTION IF EXISTS prevent_ledger_modification CASCADE;
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Competition scores ledger records are immutable and cannot be updated or deleted!';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER enforce_ledger_immutability
BEFORE UPDATE OR DELETE ON public.competition_scores_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_modification();

-- ==========================================
-- Migration: 20260518152536_register_hourly_cron_job
-- ==========================================
-- 1. Create timezone-aware midnight score processor
DROP FUNCTION IF EXISTS public.process_hourly_local_midnight_points CASCADE;
CREATE OR REPLACE FUNCTION public.process_hourly_local_midnight_points()
RETURNS void AS $$
DECLARE
  v_rec RECORD;
  v_yesterday DATE;
BEGIN
  -- Find active members in active competitions
  FOR v_rec IN 
    SELECT DISTINCT
      c.id AS competition_id,
      m.user_id,
      COALESCE(p.timezone, 'UTC') AS timezone
    FROM public.competitions c
    JOIN public.tribe_members m ON m.tribe_id = c.tribe_id
    JOIN public.profiles p ON p.id = m.user_id
    WHERE c.status = 'active'
      AND m.role IN ('chief', 'member')
  LOOP
    -- Check if it is currently midnight hour (0) in the user's specific local timezone
    IF extract(hour from (now() AT TIME ZONE v_rec.timezone)) = 0 THEN
      -- Deduced yesterday relative to that local midnight transition
      v_yesterday := (now() AT TIME ZONE v_rec.timezone - interval '1 day')::date;
      
      -- Process points and hard-commit to immutable ledger
      PERFORM public.commit_user_daily_points(v_rec.competition_id, v_rec.user_id, v_yesterday);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 2. Register pg_cron schedule to execute hourly
-- Unschedules first if the job already exists to maintain clean, zero-duplicate idempotency
SELECT cron.unschedule('process-midnight-tribe-scores') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-midnight-tribe-scores'
);

SELECT cron.schedule(
  'process-midnight-tribe-scores',
  '0 * * * *',
  'SELECT public.process_hourly_local_midnight_points();'
);

-- ==========================================
-- Migration: 20260518154030_update_calculate_user_daily_points_rules
-- ==========================================
DROP FUNCTION IF EXISTS public.calculate_user_daily_points CASCADE;
CREATE OR REPLACE FUNCTION public.calculate_user_daily_points(p_competition_id uuid, p_user_id uuid, p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_comp RECORD;
  v_profile RECORD;
  v_timezone TEXT;
  
  -- Target Macros
  v_target_p NUMERIC;
  v_target_c NUMERIC;
  v_target_f NUMERIC;
  
  -- Actual Consumed Macros
  v_actual_p NUMERIC;
  v_actual_c NUMERIC;
  v_actual_f NUMERIC;
  
  -- Deviation
  v_diff_p NUMERIC;
  v_diff_c NUMERIC;
  v_diff_f NUMERIC;
  
  -- Score breakdown
  v_score_p INTEGER := 0;
  v_score_c INTEGER := 0;
  v_score_f INTEGER := 0;
  v_score_workout INTEGER := 0;
  v_total_points INTEGER := 0;
  
  v_has_workout BOOLEAN := false;
  v_has_meals BOOLEAN := false;
BEGIN
  -- 1. Fetch competition rules matrix configuration
  SELECT * INTO v_comp FROM public.competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;
  
  -- 2. Fetch user's profile targets and timezone
  SELECT macro_targets, COALESCE(timezone, 'UTC') AS timezone INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  
  v_timezone := v_profile.timezone;
  v_target_p := COALESCE((v_profile.macro_targets->>'p')::numeric, 150.0);
  v_target_c := COALESCE((v_profile.macro_targets->>'c')::numeric, 200.0);
  v_target_f := COALESCE((v_profile.macro_targets->>'f')::numeric, 60.0);
  
  -- 3. Sum up yesterday's consumed macros from meal_log in user's timezone
  SELECT 
    COALESCE(SUM(protein), 0),
    COALESCE(SUM(carbs), 0),
    COALESCE(SUM(fats), 0),
    COUNT(*) > 0
  INTO 
    v_actual_p,
    v_actual_c,
    v_actual_f,
    v_has_meals
  FROM public.meal_log
  WHERE user_id = p_user_id
    AND (created_at AT TIME ZONE v_timezone)::date = p_date;
    
  -- 4. Check if they completed a daily exercise/workout session
  SELECT EXISTS(
    SELECT 1 FROM public.posts
    WHERE author_id = p_user_id
      AND post_type = 'workout'
      AND (created_at AT TIME ZONE v_timezone)::date = p_date
  ) INTO v_has_workout;
  
  -- 5. Calculate macro scoring individually for Protein, Carbs, and Fats
  IF NOT v_has_meals THEN
    -- Penalty for missing a log for the day completely!
    -- Splitting pts_penalty_no_log / 3 for each category (e.g. -60 / 3 = -20)
    v_score_p := v_comp.pts_penalty_no_log / 3;
    v_score_c := v_comp.pts_penalty_no_log / 3;
    v_score_f := v_comp.pts_penalty_no_log / 3;
  ELSE
    -- Protein Points Calculation
    v_diff_p := abs(v_actual_p - v_target_p);
    IF v_diff_p <= 2.5 THEN
      v_score_p := v_comp.pts_tier_1;
    ELSIF v_diff_p <= 10.0 THEN
      v_score_p := v_comp.pts_tier_2;
    ELSIF v_diff_p <= 15.0 THEN
      v_score_p := v_comp.pts_tier_3;
    ELSIF v_diff_p >= 20.0 THEN
      v_score_p := v_comp.pts_penalty_miss;
    ELSE
      v_score_p := 0; -- Neutral Zone (15g to 20g deviation)
    END IF;

    -- Carbs Points Calculation
    v_diff_c := abs(v_actual_c - v_target_c);
    IF v_diff_c <= 2.5 THEN
      v_score_c := v_comp.pts_tier_1;
    ELSIF v_diff_c <= 10.0 THEN
      v_score_c := v_comp.pts_tier_2;
    ELSIF v_diff_c <= 15.0 THEN
      v_score_c := v_comp.pts_tier_3;
    ELSIF v_diff_c >= 20.0 THEN
      v_score_c := v_comp.pts_penalty_miss;
    ELSE
      v_score_c := 0;
    END IF;

    -- Fats Points Calculation
    v_diff_f := abs(v_actual_f - v_target_f);
    IF v_diff_f <= 2.5 THEN
      v_score_f := v_comp.pts_tier_1;
    ELSIF v_diff_f <= 10.0 THEN
      v_score_f := v_comp.pts_tier_2;
    ELSIF v_diff_f <= 15.0 THEN
      v_score_f := v_comp.pts_tier_3;
    ELSIF v_diff_f >= 20.0 THEN
      v_score_f := v_comp.pts_penalty_miss;
    ELSE
      v_score_f := 0;
    END IF;
  END IF;
  
  -- 6. Workout session bonus points
  IF v_has_workout THEN
    v_score_workout := v_comp.pts_exercise_bonus;
  END IF;
  
  -- 7. Calculate net total daily points
  v_total_points := v_score_p + v_score_c + v_score_f + v_score_workout;
  
  RETURN jsonb_build_object(
    'total_points', v_total_points,
    'protein_score', v_score_p,
    'carbs_score', v_score_c,
    'fats_score', v_score_f,
    'workout_score', v_score_workout,
    'actual_p', v_actual_p,
    'actual_c', v_actual_c,
    'actual_f', v_actual_f,
    'target_p', v_target_p,
    'target_c', v_target_c,
    'target_f', v_target_f,
    'has_workout', v_has_workout,
    'has_meals', v_has_meals
  );
END;
$function$;

-- ==========================================
-- Migration: 20260518155001_create_scoreboard_tiebreakers_rpc
-- ==========================================
DROP FUNCTION IF EXISTS public.get_competition_scoreboard_tiebreakers CASCADE;
CREATE OR REPLACE FUNCTION public.get_competition_scoreboard_tiebreakers(p_competition_id uuid)
RETURNS TABLE (
    user_id uuid,
    total_points bigint,
    max_streak bigint,
    pct_2_5 numeric,
    pct_10 numeric,
    pct_15 numeric,
    pct_workout numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH ledger_data AS (
        SELECT 
            csl.user_id,
            csl.points_awarded,
            COALESCE((csl.metadata->>'has_meals')::boolean, false) AS has_meals,
            COALESCE((csl.metadata->>'has_workout')::boolean, false) AS has_workout,
            COALESCE((csl.metadata->>'actual_p')::numeric, 0) AS actual_p,
            COALESCE((csl.metadata->>'actual_c')::numeric, 0) AS actual_c,
            COALESCE((csl.metadata->>'actual_f')::numeric, 0) AS actual_f,
            COALESCE((csl.metadata->>'target_p')::numeric, 150) AS target_p,
            COALESCE((csl.metadata->>'target_c')::numeric, 200) AS target_c,
            COALESCE((csl.metadata->>'target_f')::numeric, 60) AS target_f
        FROM public.competition_scores_ledger csl
        WHERE csl.competition_id = p_competition_id
    ),
    -- Calculate Gaps-and-Islands longest consecutive meals logged streak
    user_dates AS (
        SELECT DISTINCT csl.user_id, csl.date
        FROM public.competition_scores_ledger csl
        WHERE csl.competition_id = p_competition_id
          AND COALESCE((csl.metadata->>'has_meals')::boolean, false) = true
    ),
    date_groups AS (
        SELECT 
            ud.user_id,
            ud.date,
            ud.date - ROW_NUMBER() OVER (PARTITION BY ud.user_id ORDER BY ud.date)::integer AS grp
        FROM user_dates ud
    ),
    streaks AS (
        SELECT 
            dg.user_id,
            COUNT(*) AS streak_len
        FROM date_groups dg
        GROUP BY dg.user_id, dg.grp
    ),
    max_streaks AS (
        SELECT 
            s.user_id,
            MAX(s.streak_len) AS max_streak
        FROM streaks s
        GROUP BY s.user_id
    ),
    -- Aggregate stats per user
    user_aggregates AS (
        SELECT 
            ld.user_id,
            SUM(ld.points_awarded) AS total_points,
            -- Count macro completion bounds
            SUM(CASE WHEN ld.has_meals AND abs(ld.actual_p - ld.target_p) <= 2.5 THEN 1 ELSE 0 END +
                CASE WHEN ld.has_meals AND abs(ld.actual_c - ld.target_c) <= 2.5 THEN 1 ELSE 0 END +
                CASE WHEN ld.has_meals AND abs(ld.actual_f - ld.target_f) <= 2.5 THEN 1 ELSE 0 END) AS count_2_5,
            
            SUM(CASE WHEN ld.has_meals AND abs(ld.actual_p - ld.target_p) <= 10.0 THEN 1 ELSE 0 END +
                CASE WHEN ld.has_meals AND abs(ld.actual_c - ld.target_c) <= 10.0 THEN 1 ELSE 0 END +
                CASE WHEN ld.has_meals AND abs(ld.actual_f - ld.target_f) <= 10.0 THEN 1 ELSE 0 END) AS count_10,
                
            SUM(CASE WHEN ld.has_meals AND abs(ld.actual_p - ld.target_p) <= 15.0 THEN 1 ELSE 0 END +
                CASE WHEN ld.has_meals AND abs(ld.actual_c - ld.target_c) <= 15.0 THEN 1 ELSE 0 END +
                CASE WHEN ld.has_meals AND abs(ld.actual_f - ld.target_f) <= 15.0 THEN 1 ELSE 0 END) AS count_15,
            
            SUM(CASE WHEN ld.has_workout THEN 1 ELSE 0 END) AS count_workout,
            -- Denominators
            SUM(CASE WHEN ld.has_meals THEN 3 ELSE 0 END) AS total_logged_macros,
            COUNT(*) AS total_competition_days
        FROM ledger_data ld
        GROUP BY ld.user_id
    )
    SELECT 
        ua.user_id,
        COALESCE(ua.total_points, 0)::bigint AS total_points,
        COALESCE(ms.max_streak, 0)::bigint AS max_streak,
        CASE WHEN ua.total_logged_macros > 0 THEN (ua.count_2_5::numeric / ua.total_logged_macros::numeric) * 100.0 ELSE 0.0 END::numeric AS pct_2_5,
        CASE WHEN ua.total_logged_macros > 0 THEN (ua.count_10::numeric / ua.total_logged_macros::numeric) * 100.0 ELSE 0.0 END::numeric AS pct_10,
        CASE WHEN ua.total_logged_macros > 0 THEN (ua.count_15::numeric / ua.total_logged_macros::numeric) * 100.0 ELSE 0.0 END::numeric AS pct_15,
        CASE WHEN ua.total_competition_days > 0 THEN (ua.count_workout::numeric / ua.total_competition_days::numeric) * 100.0 ELSE 0.0 END::numeric AS pct_workout
    FROM user_aggregates ua
    LEFT JOIN max_streaks ms ON ms.user_id = ua.user_id;
END;
$$;

-- ==========================================
-- Migration: 20260518155250_redefine_calculate_competition_week
-- ==========================================
DROP FUNCTION IF EXISTS public.calculate_competition_week(timestamp with time zone, integer);

DROP FUNCTION IF EXISTS public.calculate_competition_week CASCADE;
CREATE OR REPLACE FUNCTION public.calculate_competition_week(
    p_tribe_id uuid,
    p_start_date timestamp with time zone,
    p_total_weeks integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_chief_id uuid;
    v_timezone text;
    v_start_sun date;
    v_now_sun date;
    v_weeks_elapsed integer;
BEGIN
    -- 1. Fetch the tribe chief's timezone
    SELECT t.chief_id INTO v_chief_id FROM public.tribes t WHERE t.id = p_tribe_id;
    IF v_chief_id IS NOT NULL THEN
        SELECT COALESCE(p.timezone, 'UTC') INTO v_timezone FROM public.profiles p WHERE p.id = v_chief_id;
    ELSE
        v_timezone := 'UTC';
    END IF;
    
    -- 2. Calculate Sunday dates for start and now in chief's timezone
    v_start_sun := (date_trunc('week', (p_start_date AT TIME ZONE v_timezone) + interval '1 day') - interval '1 day')::date;
    v_now_sun := (date_trunc('week', (now() AT TIME ZONE v_timezone) + interval '1 day') - interval '1 day')::date;
    
    -- 3. Calculate weeks elapsed
    v_weeks_elapsed := ((v_now_sun - v_start_sun) / 7) + 1;
    
    -- 4. Apply boundaries
    IF v_weeks_elapsed > p_total_weeks THEN
        RETURN p_total_weeks;
    ELSIF v_weeks_elapsed < 1 THEN
        RETURN 1;
    ELSE
        RETURN v_weeks_elapsed;
    END IF;
END;
$$;

-- ==========================================
-- Migration: 20260518155255_update_get_tribe_scoreboard_header_param
-- ==========================================
DROP FUNCTION IF EXISTS public.get_tribe_scoreboard_header CASCADE;
CREATE OR REPLACE FUNCTION public.get_tribe_scoreboard_header(p_tribe_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tribe_type TEXT;
  v_tribe_name TEXT;
  v_comp_style TEXT;
  v_comp_metric TEXT;
  v_comp_week INTEGER;
  v_comp_total_weeks INTEGER;
  v_header_line1 TEXT;
  v_header_line2 TEXT;
  v_header_line3 TEXT;
BEGIN
  SELECT name, tribe_type INTO v_tribe_name, v_tribe_type FROM public.tribes WHERE id = p_tribe_id;
  
  IF v_tribe_type = 'accountability' THEN
    RETURN jsonb_build_object(
      'line1', 'ACCOUNTABILITY',
      'line2', upper(v_tribe_name),
      'line3', null,
      'is_competitive', false
    );
  ELSE
    -- Find active competition
    SELECT style, metric, calculate_competition_week(p_tribe_id, start_date, total_weeks), total_weeks
    INTO v_comp_style, v_comp_metric, v_comp_week, v_comp_total_weeks
    FROM public.competitions
    WHERE tribe_id = p_tribe_id AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      -- Style/Metric Enums formatted to uppercase strings
      v_header_line1 := upper(v_tribe_type) || ' · ' || upper(v_comp_style) || ' · ' || upper(v_comp_metric);
      v_header_line3 := 'Week ' || v_comp_week || '/' || v_comp_total_weeks;
    ELSE
      v_header_line1 := upper(v_tribe_type);
      v_header_line3 := null;
    END IF;
    
    RETURN jsonb_build_object(
      'line1', v_header_line1,
      'line2', upper(v_tribe_name),
      'line3', v_header_line3,
      'is_competitive', true
    );
  END IF;
END;
$$;

-- ==========================================
-- Migration: 20260518161912_create_is_competition_locked
-- ==========================================
DROP FUNCTION IF EXISTS public.is_competition_locked CASCADE;
CREATE OR REPLACE FUNCTION public.is_competition_locked(p_competition_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date timestamp with time zone;
    v_total_weeks integer;
    v_tribe_id uuid;
    v_member_timezone text;
    v_local_end timestamp with time zone;
    v_max_local_end timestamp with time zone := '-infinity'::timestamp with time zone;
BEGIN
    SELECT start_date, total_weeks, tribe_id INTO v_start_date, v_total_weeks, v_tribe_id
    FROM public.competitions
    WHERE id = p_competition_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Iterate over each tribe member's timezone to find the absolute latest local end boundary
    FOR v_member_timezone IN
        SELECT DISTINCT COALESCE(p.timezone, 'UTC')
        FROM public.tribe_members tm
        JOIN public.profiles p ON p.id = tm.user_id
        WHERE tm.tribe_id = v_tribe_id AND tm.role != 'pending'
    LOOP
        -- Midnight of the final day in that user's timezone:
        -- Competition ends at (start_date + (total_weeks * 7) days) local midnight
        v_local_end := ((v_start_date + (v_total_weeks * 7) * interval '1 day')::date) AT TIME ZONE v_member_timezone;
        
        IF v_local_end > v_max_local_end THEN
            v_max_local_end := v_local_end;
        END IF;
    END LOOP;
    
    RETURN now() >= v_max_local_end;
END;
$$;

-- ==========================================
-- Migration: 20260518161920_drop_old_calculate_competition_week
-- ==========================================
DROP FUNCTION IF EXISTS public.calculate_competition_week(uuid, timestamp with time zone, integer);

-- ==========================================
-- Migration: 20260518161923_create_user_specific_calculate_competition_week
-- ==========================================
DROP FUNCTION IF EXISTS public.calculate_competition_week CASCADE;
CREATE OR REPLACE FUNCTION public.calculate_competition_week(
    p_user_id uuid,
    p_start_date timestamp with time zone,
    p_total_weeks integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_timezone text;
    v_start_sun date;
    v_now_sun date;
    v_weeks_elapsed integer;
BEGIN
    -- 1. Fetch user's local timezone
    SELECT COALESCE(p.timezone, 'UTC') INTO v_timezone FROM public.profiles p WHERE p.id = p_user_id;
    
    -- 2. Calculate Sunday dates for start and now in user's timezone
    -- Shifting by +1 day forces Saturday 11:59:59 PM to map to the preceding Sunday, 
    -- while Sunday 00:00:00 AM maps to the new Sunday (Saturday Midnight Rule)
    v_start_sun := (date_trunc('week', (p_start_date AT TIME ZONE v_timezone) + interval '1 day') - interval '1 day')::date;
    v_now_sun := (date_trunc('week', (now() AT TIME ZONE v_timezone) + interval '1 day') - interval '1 day')::date;
    
    -- 3. Calculate weeks elapsed
    v_weeks_elapsed := ((v_now_sun - v_start_sun) / 7) + 1;
    
    -- 4. Apply boundaries
    IF v_weeks_elapsed > p_total_weeks THEN
        RETURN p_total_weeks;
    ELSIF v_weeks_elapsed < 1 THEN
        RETURN 1;
    ELSE
        RETURN v_weeks_elapsed;
    END IF;
END;
$$;

-- ==========================================
-- Migration: 20260518161927_drop_old_get_tribe_scoreboard_header
-- ==========================================
DROP FUNCTION IF EXISTS public.get_tribe_scoreboard_header(uuid);

-- ==========================================
-- Migration: 20260518161930_create_user_specific_get_tribe_scoreboard_header
-- ==========================================
DROP FUNCTION IF EXISTS public.get_tribe_scoreboard_header CASCADE;
CREATE OR REPLACE FUNCTION public.get_tribe_scoreboard_header(p_tribe_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tribe_type TEXT;
  v_tribe_name TEXT;
  v_comp_style TEXT;
  v_comp_metric TEXT;
  v_comp_week INTEGER;
  v_comp_total_weeks INTEGER;
  v_header_line1 TEXT;
  v_header_line2 TEXT;
  v_header_line3 TEXT;
BEGIN
  SELECT name, tribe_type INTO v_tribe_name, v_tribe_type FROM public.tribes WHERE id = p_tribe_id;
  
  IF v_tribe_type = 'accountability' THEN
    RETURN jsonb_build_object(
      'line1', 'ACCOUNTABILITY',
      'line2', upper(v_tribe_name),
      'line3', null,
      'is_competitive', false
    );
  ELSE
    -- Find active or completed competition
    SELECT style, metric, calculate_competition_week(p_user_id, start_date, total_weeks), total_weeks
    INTO v_comp_style, v_comp_metric, v_comp_week, v_comp_total_weeks
    FROM public.competitions
    WHERE tribe_id = p_tribe_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      -- Style/Metric Enums formatted to uppercase strings
      v_header_line1 := upper(v_tribe_type) || ' · ' || upper(v_comp_style) || ' · ' || upper(v_comp_metric);
      v_header_line3 := 'Week ' || v_comp_week || '/' || v_comp_total_weeks;
    ELSE
      v_header_line1 := upper(v_tribe_type);
      v_header_line3 := null;
    END IF;
    
    RETURN jsonb_build_object(
      'line1', v_header_line1,
      'line2', upper(v_tribe_name),
      'line3', v_header_line3,
      'is_competitive', true
    );
  END IF;
END;
$$;

-- ==========================================
-- Migration: 20260518161934_create_evaluate_competition_locks
-- ==========================================
DROP FUNCTION IF EXISTS public.evaluate_competition_locks CASCADE;
CREATE OR REPLACE FUNCTION public.evaluate_competition_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comp RECORD;
BEGIN
    FOR v_comp IN
        SELECT id FROM public.competitions WHERE status = 'active'
    LOOP
        IF public.is_competition_locked(v_comp.id) THEN
            UPDATE public.competitions
            SET status = 'completed'
            WHERE id = v_comp.id;
        END IF;
    END LOOP;
END;
$$;

-- ==========================================
-- Migration: 20260518161938_create_qa_simulate_competition_win
-- ==========================================
DROP FUNCTION IF EXISTS public.qa_simulate_competition_win CASCADE;
CREATE OR REPLACE FUNCTION public.qa_simulate_competition_win(p_tribe_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comp_id uuid;
BEGIN
    SELECT id INTO v_comp_id
    FROM public.competitions
    WHERE tribe_id = p_tribe_id AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_comp_id IS NOT NULL THEN
        UPDATE public.competitions
        SET status = 'completed',
            start_date = now() - total_weeks * interval '7 days' - interval '1 day'
        WHERE id = v_comp_id;
        
        RETURN true;
    END IF;
    
    -- If none is active, look for the most recent competition to force complete
    SELECT id INTO v_comp_id
    FROM public.competitions
    WHERE tribe_id = p_tribe_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_comp_id IS NOT NULL THEN
        UPDATE public.competitions
        SET status = 'completed',
            start_date = now() - total_weeks * interval '7 days' - interval '1 day'
        WHERE id = v_comp_id;
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- ==========================================
-- Migration: 20260518222922_update_qa_simulate_competition_win_function
-- ==========================================
DROP FUNCTION IF EXISTS public.qa_simulate_competition_win CASCADE;
CREATE OR REPLACE FUNCTION public.qa_simulate_competition_win(p_tribe_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comp_id uuid;
    v_member record;
    v_points integer;
BEGIN
    -- Find the competition
    SELECT id INTO v_comp_id
    FROM public.competitions
    WHERE tribe_id = p_tribe_id AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_comp_id IS NULL THEN
        SELECT id INTO v_comp_id
        FROM public.competitions
        WHERE tribe_id = p_tribe_id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    IF v_comp_id IS NOT NULL THEN
        -- Force complete the competition
        UPDATE public.competitions
        SET status = 'completed',
            start_date = now() - total_weeks * interval '7 days' - interval '1 day'
        WHERE id = v_comp_id;
        
        -- Clear existing ledger entries for this competition
        DELETE FROM public.competition_scores_ledger
        WHERE competition_id = v_comp_id;
        
        -- Seed simulated ledger entries for all members of the tribe
        FOR v_member IN 
            SELECT tm.user_id, p.handle, p.name 
            FROM public.tribe_members tm
            JOIN public.profiles p ON p.id = tm.user_id
            WHERE tm.tribe_id = p_tribe_id AND tm.role != 'pending'
        LOOP
            -- Assign simulated points
            IF lower(v_member.handle) = '@preed' OR lower(v_member.name) LIKE '%peyton%' THEN
                v_points := 450;
            ELSIF lower(v_member.handle) = '@rcooper' OR lower(v_member.name) LIKE '%riley%' THEN
                v_points := 420;
            ELSIF lower(v_member.handle) = '@swhite' OR lower(v_member.name) LIKE '%skyler%' THEN
                v_points := 380;
            ELSIF lower(v_member.handle) = '@amiller' OR lower(v_member.name) LIKE '%avery%' THEN
                v_points := 290;
            ELSIF lower(v_member.handle) = '@kwadub' OR lower(v_member.name) LIKE '%kwaku%' THEN
                v_points := 250;
            ELSIF lower(v_member.handle) = '@cjones' OR lower(v_member.name) LIKE '%casey%' THEN
                v_points := 210;
            ELSIF lower(v_member.handle) = '@qtaylor' OR lower(v_member.name) LIKE '%quinn%' THEN
                v_points := 180;
            ELSIF lower(v_member.handle) = '@arivera' OR lower(v_member.name) LIKE '%alex%' THEN
                v_points := 150;
            ELSIF lower(v_member.handle) = '@hsolo' OR lower(v_member.name) LIKE '%han%' THEN
                v_points := 120;
            ELSIF lower(v_member.handle) = '@lorgana' OR lower(v_member.name) LIKE '%leia%' THEN
                v_points := 90;
            ELSIF lower(v_member.handle) = '@lskywalker' OR lower(v_member.name) LIKE '%luke%' THEN
                v_points := 60;
            ELSIF lower(v_member.handle) = '@mbailey' OR lower(v_member.name) LIKE '%morgan%' THEN
                v_points := 40;
            ELSIF lower(v_member.handle) = '@pscott' OR lower(v_member.name) LIKE '%parker%' THEN
                v_points := 10;
            ELSE
                v_points := 0;
            END IF;
            
            -- Insert simulated row into the ledger
            INSERT INTO public.competition_scores_ledger (
                id,
                competition_id,
                user_id,
                date,
                points_awarded,
                metadata,
                created_at
            ) VALUES (
                gen_random_uuid(),
                v_comp_id,
                v_member.user_id,
                now()::date,
                v_points,
                jsonb_build_object(
                    'has_meals', true,
                    'has_workout', true,
                    'actual_p', 150,
                    'actual_c', 200,
                    'actual_f', 60,
                    'target_p', 150,
                    'target_c', 200,
                    'target_f', 60
                ),
                now()
            );
        END LOOP;
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- ==========================================
-- Migration: 20260518223545_update_qa_simulate_win_disable_trigger
-- ==========================================
DROP FUNCTION IF EXISTS public.qa_simulate_competition_win CASCADE;
CREATE OR REPLACE FUNCTION public.qa_simulate_competition_win(p_tribe_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comp_id uuid;
    v_member record;
    v_points integer;
BEGIN
    -- Find the competition
    SELECT id INTO v_comp_id
    FROM public.competitions
    WHERE tribe_id = p_tribe_id AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_comp_id IS NULL THEN
        SELECT id INTO v_comp_id
        FROM public.competitions
        WHERE tribe_id = p_tribe_id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    IF v_comp_id IS NOT NULL THEN
        -- Force complete the competition
        UPDATE public.competitions
        SET status = 'completed',
            start_date = now() - total_weeks * interval '7 days' - interval '1 day'
        WHERE id = v_comp_id;
        
        -- Temporarily disable immutability trigger for simulation
        ALTER TABLE public.competition_scores_ledger DISABLE TRIGGER enforce_ledger_immutability;
        
        -- Clear existing ledger entries for this competition
        DELETE FROM public.competition_scores_ledger
        WHERE competition_id = v_comp_id;
        
        -- Seed simulated ledger entries for all members of the tribe
        FOR v_member IN 
            SELECT tm.user_id, p.handle, p.name 
            FROM public.tribe_members tm
            JOIN public.profiles p ON p.id = tm.user_id
            WHERE tm.tribe_id = p_tribe_id AND tm.role != 'pending'
        LOOP
            -- Assign simulated points
            IF lower(v_member.handle) = '@preed' OR lower(v_member.name) LIKE '%peyton%' THEN
                v_points := 450;
            ELSIF lower(v_member.handle) = '@rcooper' OR lower(v_member.name) LIKE '%riley%' THEN
                v_points := 420;
            ELSIF lower(v_member.handle) = '@swhite' OR lower(v_member.name) LIKE '%skyler%' THEN
                v_points := 380;
            ELSIF lower(v_member.handle) = '@amiller' OR lower(v_member.name) LIKE '%avery%' THEN
                v_points := 290;
            ELSIF lower(v_member.handle) = '@kwadub' OR lower(v_member.name) LIKE '%kwaku%' THEN
                v_points := 250;
            ELSIF lower(v_member.handle) = '@cjones' OR lower(v_member.name) LIKE '%casey%' THEN
                v_points := 210;
            ELSIF lower(v_member.handle) = '@qtaylor' OR lower(v_member.name) LIKE '%quinn%' THEN
                v_points := 180;
            ELSIF lower(v_member.handle) = '@arivera' OR lower(v_member.name) LIKE '%alex%' THEN
                v_points := 150;
            ELSIF lower(v_member.handle) = '@hsolo' OR lower(v_member.name) LIKE '%han%' THEN
                v_points := 120;
            ELSIF lower(v_member.handle) = '@lorgana' OR lower(v_member.name) LIKE '%leia%' THEN
                v_points := 90;
            ELSIF lower(v_member.handle) = '@lskywalker' OR lower(v_member.name) LIKE '%luke%' THEN
                v_points := 60;
            ELSIF lower(v_member.handle) = '@mbailey' OR lower(v_member.name) LIKE '%morgan%' THEN
                v_points := 40;
            ELSIF lower(v_member.handle) = '@pscott' OR lower(v_member.name) LIKE '%parker%' THEN
                v_points := 10;
            ELSE
                v_points := 0;
            END IF;
            
            -- Insert simulated row into the ledger
            INSERT INTO public.competition_scores_ledger (
                id,
                competition_id,
                user_id,
                date,
                points_awarded,
                metadata,
                created_at
            ) VALUES (
                gen_random_uuid(),
                v_comp_id,
                v_member.user_id,
                now()::date,
                v_points,
                jsonb_build_object(
                    'has_meals', true,
                    'has_workout', true,
                    'actual_p', 150,
                    'actual_c', 200,
                    'actual_f', 60,
                    'target_p', 150,
                    'target_c', 200,
                    'target_f', 60
                ),
                now()
            );
        END LOOP;
        
        -- Re-enable immutability trigger
        ALTER TABLE public.competition_scores_ledger ENABLE TRIGGER enforce_ledger_immutability;
        
        RETURN true;
    END IF;
    
    RETURN false;
EXCEPTION
    WHEN OTHERS THEN
        -- Ensure trigger is always re-enabled even if an error occurs
        ALTER TABLE public.competition_scores_ledger ENABLE TRIGGER enforce_ledger_immutability;
        RAISE;
END;
$$;

-- ==========================================
-- Migration: 20260519154151_update_competition_style_constraint
-- ==========================================
-- Drop constraint
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_style_check;

-- Update existing data
-- [CLEANED SEED DATA] UPDATE competitions SET style = 'faceoff' WHERE style = 'traditional';

-- Add new constraint
ALTER TABLE competitions ADD CONSTRAINT competitions_style_check CHECK (style = ANY (ARRAY['premier'::text, 'faceoff'::text]));

-- ==========================================
-- Migration: 20260519192343_fix_tribe_scoreboard_header_order
-- ==========================================
DROP FUNCTION IF EXISTS public.get_tribe_scoreboard_header CASCADE;
CREATE OR REPLACE FUNCTION public.get_tribe_scoreboard_header(p_tribe_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_tribe_type TEXT;
  v_tribe_name TEXT;
  v_comp_style TEXT;
  v_comp_metric TEXT;
  v_comp_week INTEGER;
  v_comp_total_weeks INTEGER;
  v_header_line1 TEXT;
  v_header_line2 TEXT;
  v_header_line3 TEXT;
  v_comp_style_fmt TEXT;
  v_tribe_type_fmt TEXT;
  v_metric_fmt TEXT;
BEGIN
  SELECT name, tribe_type INTO v_tribe_name, v_tribe_type FROM public.tribes WHERE id = p_tribe_id;
  
  IF v_tribe_type = 'accountability' THEN
    RETURN jsonb_build_object(
      'line1', 'ACCOUNTABILITY',
      'line2', upper(v_tribe_name),
      'line3', null,
      'is_competitive', false
    );
  ELSE
    -- Find active or completed competition
    SELECT style, metric, calculate_competition_week(p_user_id, start_date, total_weeks), total_weeks
    INTO v_comp_style, v_comp_metric, v_comp_week, v_comp_total_weeks
    FROM public.competitions
    WHERE tribe_id = p_tribe_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      -- Format competition style (tribe type)
      IF v_comp_style = 'faceoff' THEN
        v_comp_style_fmt := 'FACEOFF';
      ELSIF v_comp_style = 'premier' THEN
        v_comp_style_fmt := 'PREMIER';
      ELSIF v_comp_style = 'traditional' THEN
        v_comp_style_fmt := 'TRADITIONAL';
      ELSE
        v_comp_style_fmt := upper(v_comp_style);
      END IF;

      -- Format tribe type (competition type)
      IF v_tribe_type = 'head-to-head' THEN
        v_tribe_type_fmt := 'HEAD-TO-HEAD';
      ELSIF v_tribe_type = 'tribe-vs-tribe' THEN
        v_tribe_type_fmt := 'TRIBE BATTLE';
      ELSE
        v_tribe_type_fmt := upper(v_tribe_type);
      END IF;

      -- Format metric
      IF v_comp_metric = 'habits' THEN
        v_metric_fmt := 'HABITS';
      ELSIF v_comp_metric = 'weight' THEN
        v_metric_fmt := 'WEIGHT';
      ELSE
        v_metric_fmt := upper(v_comp_metric);
      END IF;

      v_header_line1 := v_comp_style_fmt || ' · ' || v_tribe_type_fmt || ' · ' || v_metric_fmt;
      v_header_line3 := 'Week ' || v_comp_week || '/' || v_comp_total_weeks;
    ELSE
      v_header_line1 := upper(v_tribe_type);
      v_header_line3 := null;
    END IF;
    
    RETURN jsonb_build_object(
      'line1', v_header_line1,
      'line2', upper(v_tribe_name),
      'line3', v_header_line3,
      'is_competitive', true
    );
  END IF;
END;
$function$;

-- ==========================================
-- Migration: 20260519192606_fix_tribe_scoreboard_header_title_case_order
-- ==========================================
DROP FUNCTION IF EXISTS public.get_tribe_scoreboard_header CASCADE;
CREATE OR REPLACE FUNCTION public.get_tribe_scoreboard_header(p_tribe_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_tribe_type TEXT;
  v_tribe_name TEXT;
  v_comp_style TEXT;
  v_comp_metric TEXT;
  v_comp_week INTEGER;
  v_comp_total_weeks INTEGER;
  v_header_line1 TEXT;
  v_header_line2 TEXT;
  v_header_line3 TEXT;
  v_comp_style_fmt TEXT;
  v_tribe_type_fmt TEXT;
  v_metric_fmt TEXT;
BEGIN
  SELECT name, tribe_type INTO v_tribe_name, v_tribe_type FROM public.tribes WHERE id = p_tribe_id;
  
  IF v_tribe_type = 'accountability' THEN
    RETURN jsonb_build_object(
      'line1', 'Accountability',
      'line2', upper(v_tribe_name),
      'line3', null,
      'is_competitive', false
    );
  ELSE
    -- Find active or completed competition
    SELECT style, metric, calculate_competition_week(p_user_id, start_date, total_weeks), total_weeks
    INTO v_comp_style, v_comp_metric, v_comp_week, v_comp_total_weeks
    FROM public.competitions
    WHERE tribe_id = p_tribe_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      -- Format tribe type (competition type)
      IF v_tribe_type = 'head-to-head' THEN
        v_tribe_type_fmt := 'Head-to-Head';
      ELSIF v_tribe_type = 'tribe-vs-tribe' THEN
        v_tribe_type_fmt := 'Tribe Battle';
      ELSE
        v_tribe_type_fmt := initcap(v_tribe_type);
      END IF;

      -- Format competition style (tribe type)
      IF v_comp_style = 'faceoff' THEN
        v_comp_style_fmt := 'Faceoff';
      ELSIF v_comp_style = 'premier' THEN
        v_comp_style_fmt := 'Premier';
      ELSIF v_comp_style = 'traditional' THEN
        v_comp_style_fmt := 'Traditional';
      ELSE
        v_comp_style_fmt := initcap(v_comp_style);
      END IF;

      -- Format metric
      IF v_comp_metric = 'habits' THEN
        v_metric_fmt := 'Habits';
      ELSIF v_comp_metric = 'weight' THEN
        v_metric_fmt := 'Weight';
      ELSE
        v_metric_fmt := initcap(v_comp_metric);
      END IF;

      v_header_line1 := v_tribe_type_fmt || ' · ' || v_comp_style_fmt || ' · ' || v_metric_fmt;
      v_header_line3 := 'Week ' || v_comp_week || '/' || v_comp_total_weeks;
    ELSE
      v_header_line1 := initcap(v_tribe_type);
      v_header_line3 := null;
    END IF;
    
    RETURN jsonb_build_object(
      'line1', v_header_line1,
      'line2', upper(v_tribe_name),
      'line3', v_header_line3,
      'is_competitive', true
    );
  END IF;
END;
$function$;

-- ==========================================
-- Migration: 20260520172200_create_faceoff_matchups_table_and_view
-- ==========================================
CREATE TABLE IF NOT EXISTS faceoff_matchups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tribe_id UUID REFERENCES tribes(id) ON DELETE CASCADE,
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    user_1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    user_2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    user_1_weekly_points INT DEFAULT 0,
    user_2_weekly_points INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_weekly_matchup UNIQUE (competition_id, week_number, user_1_id, user_2_id)
);

CREATE INDEX IF NOT EXISTS idx_faceoff_matchups_lookup ON faceoff_matchups (tribe_id, week_number);

CREATE OR REPLACE VIEW v_faceoff_matchups AS
SELECT 
    m.id AS matchup_id,
    m.tribe_id,
    m.competition_id,
    m.week_number,
    
    -- Competitor 1 Core Profile Data
    m.user_1_id,
    p1.name AS user_1_display_name,
    p1.handle AS user_1_username,
    p1.avatar_url AS user_1_pfp_url,
    p1.status AS user_1_natural_status,
    p1.activity AS user_1_activity_type,
    p1.activity_icon AS user_1_activity_icon,
    m.user_1_weekly_points,

    -- Competitor 2 Core Profile Data
    m.user_2_id,
    p2.name AS user_2_display_name,
    p2.handle AS user_2_username,
    p2.avatar_url AS user_2_pfp_url,
    p2.status AS user_2_natural_status,
    p2.activity AS user_2_activity_type,
    p2.activity_icon AS user_2_activity_icon,
    m.user_2_weekly_points

FROM faceoff_matchups m
JOIN profiles p1 ON m.user_1_id = p1.id
JOIN profiles p2 ON m.user_2_id = p2.id;

-- Seed matchups for weeks 1 to 9
-- [CLEANED SEED DATA] INSERT INTO faceoff_matchups (tribe_id, competition_id, week_number, user_1_id, user_2_id, user_1_weekly_points, user_2_weekly_points)
-- [CLEANED SEED DATA] VALUES
-- [CLEANED SEED DATA] (
-- [CLEANED SEED DATA]   'b0000000-0000-0000-0000-000000000004', 
-- [CLEANED SEED DATA]   'c0000000-0000-0000-0000-000000000002', 
-- [CLEANED SEED DATA]   1, 
-- [CLEANED SEED DATA]   '00000000-0000-0000-0000-000000000005', 
-- [CLEANED SEED DATA]   '00000000-0000-0000-0000-000000000009', 
-- [CLEANED SEED DATA]   49, 
-- [CLEANED SEED DATA]   35
-- [CLEANED SEED DATA] ),
-- [CLEANED SEED DATA] (
-- [CLEANED SEED DATA]   'b0000000-0000-0000-0000-000000000004', 
-- [CLEANED SEED DATA]   'c0000000-0000-0000-0000-000000000002', 
-- [CLEANED SEED DATA]   1, 
-- [CLEANED SEED DATA]   '00000000-0000-0000-0000-000000000001', 
-- [CLEANED SEED DATA]   '00000000-0000-0000-0000-000000000004', 
-- [CLEANED SEED DATA]   35, 
-- [CLEANED SEED DATA]   42
-- [CLEANED SEED DATA] ),
-- [CLEANED SEED DATA] (
-- [CLEANED SEED DATA]   'b0000000-0000-0000-0000-000000000004', 
-- [CLEANED SEED DATA]   'c0000000-0000-0000-0000-000000000002', 
-- [CLEANED SEED DATA]   1, 
-- [CLEANED SEED DATA]   '00000000-0000-0000-0000-000000000011', 
-- [CLEANED SEED DATA]   '00000000-0000-0000-0000-000000000008', 
-- [CLEANED SEED DATA]   28, 
-- [CLEANED SEED DATA]   28
-- [CLEANED SEED DATA] )
-- [CLEANED SEED DATA] ON CONFLICT (competition_id, week_number, user_1_id, user_2_id) DO UPDATE SET
-- [CLEANED SEED DATA] user_1_weekly_points = EXCLUDED.user_1_weekly_points,
-- [CLEANED SEED DATA] user_2_weekly_points = EXCLUDED.user_2_weekly_points;

-- Also seed week 2 to 9 to ensure data isn't blank when weeks increment
-- [CLEANED SEED DATA] INSERT INTO faceoff_matchups (tribe_id, competition_id, week_number, user_1_id, user_2_id, user_1_weekly_points, user_2_weekly_points)
-- [CLEANED SEED DATA] SELECT 
-- [CLEANED SEED DATA]   'b0000000-0000-0000-0000-000000000004'::uuid, 
-- [CLEANED SEED DATA]   'c0000000-0000-0000-0000-000000000002'::uuid, 
-- [CLEANED SEED DATA]   w, 
-- [CLEANED SEED DATA]   user_1_id, 
-- [CLEANED SEED DATA]   user_2_id, 
-- [CLEANED SEED DATA]   (random() * 50)::int, 
-- [CLEANED SEED DATA]   (random() * 50)::int
-- [CLEANED SEED DATA] FROM (SELECT generate_series(2, 9) AS w) AS weeks
-- [CLEANED SEED DATA] CROSS JOIN (
-- [CLEANED SEED DATA]   VALUES 
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000009'::uuid),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000004'::uuid),
-- [CLEANED SEED DATA]     ('00000000-0000-0000-0000-000000000011'::uuid, '00000000-0000-0000-0000-000000000008'::uuid)
-- [CLEANED SEED DATA] ) AS pairs(user_1_id, user_2_id)
-- [CLEANED SEED DATA] ON CONFLICT (competition_id, week_number, user_1_id, user_2_id) DO NOTHING;

-- ==========================================
-- Migration: 20260521020408_generate_tribe_matchups_rpc
-- ==========================================
-- ─── 1. Update v_faceoff_matchups to LEFT JOIN user_2 so Bye weeks show up ────
DROP VIEW IF EXISTS v_faceoff_matchups;

CREATE VIEW v_faceoff_matchups AS
SELECT
    m.id           AS matchup_id,
    m.tribe_id,
    m.competition_id,
    m.week_number,

    m.user_1_id,
    p1.name         AS user_1_display_name,
    p1.handle       AS user_1_username,
    p1.avatar_url   AS user_1_pfp_url,
    p1.status       AS user_1_natural_status,
    p1.activity     AS user_1_activity_type,
    p1.activity_icon AS user_1_activity_icon,
    m.user_1_weekly_points,

    m.user_2_id,
    p2.name         AS user_2_display_name,
    p2.handle       AS user_2_username,
    p2.avatar_url   AS user_2_pfp_url,
    p2.status       AS user_2_natural_status,
    p2.activity     AS user_2_activity_type,
    p2.activity_icon AS user_2_activity_icon,
    m.user_2_weekly_points
FROM faceoff_matchups m
JOIN  profiles p1 ON m.user_1_id = p1.id
LEFT JOIN profiles p2 ON m.user_2_id = p2.id;

-- ─── 2. Round-Robin Matchup Generator ────────────────────────────────────────
--
-- Algorithm: Circle Method
--   - Fetches all active tribe members (chief + member roles)
--   - If member count is odd, one player receives a "Bye" (null user_2_id) each round
--   - Each round pairs every player against exactly one unique opponent
--   - Number of rounds = N-1 (even N) or N (odd N, with one bye per round)
--   - For competitions longer than required rounds, the schedule cycles/repeats
--
DROP FUNCTION IF EXISTS generate_tribe_matchups CASCADE;
CREATE OR REPLACE FUNCTION generate_tribe_matchups(
    p_tribe_id       UUID,
    p_competition_id UUID,
    p_total_weeks    INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_members        UUID[];
    v_n              INT;
    v_rounds         INT;
    v_week           INT;
    v_round          INT;
    v_i              INT;
    v_j              INT;
    v_fixed          UUID;
    v_rotated        UUID[];
    v_u1             UUID;
    v_u2             UUID;
BEGIN
    -- Collect active member IDs (ordered for deterministic pairing)
    SELECT ARRAY_AGG(user_id ORDER BY joined_at, user_id)
    INTO v_members
    FROM tribe_members
    WHERE tribe_id = p_tribe_id
      AND role IN ('chief', 'member');

    v_n := COALESCE(ARRAY_LENGTH(v_members, 1), 0);
    IF v_n < 2 THEN
        RAISE EXCEPTION 'Need at least 2 members to generate matchups (found %)', v_n;
    END IF;

    -- If odd, append NULL as the "Bye" placeholder
    IF v_n % 2 = 1 THEN
        v_members := v_members || ARRAY[NULL::UUID];
        v_n := v_n + 1;
    END IF;

    -- Rounds needed for each player to face every other player once
    v_rounds := v_n - 1;

    -- Delete any previously generated matchups for this competition
    DELETE FROM faceoff_matchups
    WHERE competition_id = p_competition_id;

    -- Fix the first player, rotate the rest (Circle Method)
    v_fixed    := v_members[1];
    v_rotated  := v_members[2:v_n];  -- elements 2..n

    FOR v_week IN 1..p_total_weeks LOOP
        -- Map week → round (cycle through rounds if total_weeks > v_rounds)
        v_round := ((v_week - 1) % v_rounds) + 1;

        -- Build the rotation for this round
        -- Round r uses: rotate v_rotated by (r-1) positions
        -- rotated_for_round[i] = v_rotated[ ((i-1 + (v_round-1)) % (v_n-1)) + 1 ]

        -- Pair fixed vs rotated[0]
        v_u1 := v_fixed;
        v_u2 := v_rotated[ ((0 + (v_round - 1)) % (v_n - 1)) + 1 ];

        IF v_u1 IS NOT NULL AND v_u2 IS NOT NULL THEN
            INSERT INTO faceoff_matchups
                (tribe_id, competition_id, week_number, user_1_id, user_2_id,
                 user_1_weekly_points, user_2_weekly_points)
            VALUES
                (p_tribe_id, p_competition_id, v_week, v_u1, v_u2, 0, 0);
        ELSIF v_u1 IS NULL OR v_u2 IS NULL THEN
            -- One of them has a Bye — store as single-user row with null opponent
            INSERT INTO faceoff_matchups
                (tribe_id, competition_id, week_number,
                 user_1_id, user_2_id,
                 user_1_weekly_points, user_2_weekly_points)
            VALUES
                (p_tribe_id, p_competition_id, v_week,
                 COALESCE(v_u1, v_u2), NULL,
                 0, 0);
        END IF;

        -- Pair remaining slots: rotated[i] vs rotated[n-2-i] for i in 1..n/2-1
        FOR v_i IN 1..(v_n/2 - 1) LOOP
            v_j  := v_n - 1 - v_i;

            v_u1 := v_rotated[ ((v_i       + (v_round - 1)) % (v_n - 1)) + 1 ];
            v_u2 := v_rotated[ ((v_j       + (v_round - 1)) % (v_n - 1)) + 1 ];

            IF v_u1 IS NOT NULL AND v_u2 IS NOT NULL THEN
                INSERT INTO faceoff_matchups
                    (tribe_id, competition_id, week_number, user_1_id, user_2_id,
                     user_1_weekly_points, user_2_weekly_points)
                VALUES
                    (p_tribe_id, p_competition_id, v_week, v_u1, v_u2, 0, 0);
            ELSIF v_u1 IS NULL OR v_u2 IS NULL THEN
                INSERT INTO faceoff_matchups
                    (tribe_id, competition_id, week_number,
                     user_1_id, user_2_id,
                     user_1_weekly_points, user_2_weekly_points)
                VALUES
                    (p_tribe_id, p_competition_id, v_week,
                     COALESCE(v_u1, v_u2), NULL,
                     0, 0);
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- ─── 3. Trigger: auto-generate matchups when a faceoff competition is created ─
DROP FUNCTION IF EXISTS trg_auto_generate_faceoff_matchups CASCADE;
CREATE OR REPLACE FUNCTION trg_auto_generate_faceoff_matchups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only fire for faceoff style competitions that are active
    IF NEW.style = 'faceoff' AND NEW.status = 'active' THEN
        PERFORM generate_tribe_matchups(NEW.tribe_id, NEW.id, NEW.total_weeks);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_faceoff_matchups_on_competition_create ON competitions;

CREATE TRIGGER trg_faceoff_matchups_on_competition_create
AFTER INSERT ON competitions
FOR EACH ROW
EXECUTE FUNCTION trg_auto_generate_faceoff_matchups();

-- ==========================================
-- Migration: 20260521024222_update_tribe_privacy_and_natural_validation
-- ==========================================
-- 1. Streamline feed access by recreating "Privacy Engine for Posts"
DROP POLICY IF EXISTS "Privacy Engine for Posts" ON posts;
CREATE POLICY "Privacy Engine for Posts" ON posts
FOR SELECT
USING (
  (auth.uid() = author_id) OR
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = posts.author_id
      AND (
        (p.is_private = false) OR
        ((p.is_private = true) AND (
          EXISTS (
            SELECT 1 FROM follows f
            WHERE f.follower_id = auth.uid()
              AND f.following_id = posts.author_id
          ) AND (
            (posts.post_type = 'meal'::text AND p.show_meals_to_public = true) OR
            (posts.post_type = 'workout'::text AND p.show_workouts_to_public = true) OR
            (posts.post_type = ANY(ARRAY['macro_update'::text, 'snapshot'::text]) AND p.show_macros_to_public = true)
          )
        ))
      )
  )) OR
  (EXISTS (
    SELECT 1
    FROM tribe_members tm1
    JOIN tribe_members tm2 ON tm1.tribe_id = tm2.tribe_id
    WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = posts.author_id
      AND tm1.role IN ('member', 'chief')
      AND tm2.role IN ('member', 'chief')
  ))
);

-- 2. Create the Natural Tribe eligibility check function
DROP FUNCTION IF EXISTS check_tribe_natural_eligibility CASCADE;
CREATE OR REPLACE FUNCTION check_tribe_natural_eligibility(p_tribe_id uuid)
RETURNS boolean AS $$
DECLARE
  v_eligible boolean;
BEGIN
  -- Check if any active member (role in 'member', 'chief') has profile status != 'natural'
  SELECT NOT EXISTS (
    SELECT 1
    FROM tribe_members tm
    JOIN profiles p ON tm.user_id = p.id
    WHERE tm.tribe_id = p_tribe_id
      AND tm.role IN ('member', 'chief')
      AND (p.status IS NULL OR p.status != 'natural')
  ) INTO v_eligible;
  
  RETURN v_eligible;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update join_tribe to enforce Natural Status restriction
DROP FUNCTION IF EXISTS public.join_tribe CASCADE;
CREATE OR REPLACE FUNCTION public.join_tribe(p_user_id uuid, p_tribe_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_privacy text;
    v_natural_status boolean;
    v_user_status text;
    v_result  text;
BEGIN
    SELECT privacy, natural_status INTO v_privacy, v_natural_status FROM tribes WHERE id = p_tribe_id;
    SELECT status INTO v_user_status FROM profiles WHERE id = p_user_id;

    -- If the tribe is Natural (natural_status = true), block users whose status is not 'natural'
    IF v_natural_status = true AND (v_user_status IS NULL OR v_user_status != 'natural') THEN
        RAISE EXCEPTION 'Only athletes with verified Natural status can join a Natural Tribe.';
    END IF;

    IF v_privacy = 'private' THEN
-- [CLEANED SEED DATA]         INSERT INTO tribe_members (tribe_id, user_id, role)
-- [CLEANED SEED DATA]         VALUES (p_tribe_id, p_user_id, 'pending')
-- [CLEANED SEED DATA]         ON CONFLICT (tribe_id, user_id) DO NOTHING;
        v_result := 'requested';
    ELSE
-- [CLEANED SEED DATA]         INSERT INTO tribe_members (tribe_id, user_id, role)
-- [CLEANED SEED DATA]         VALUES (p_tribe_id, p_user_id, 'member')
-- [CLEANED SEED DATA]         ON CONFLICT (tribe_id, user_id)
-- [CLEANED SEED DATA]         DO UPDATE SET role = 'member';
        v_result := 'joined';
    END IF;

    RETURN v_result;
END;
$function$;

-- ==========================================
-- Migration: 20260521035011_update_leave_tribe_chief_logic
-- ==========================================
DROP FUNCTION IF EXISTS public.leave_tribe CASCADE;
CREATE OR REPLACE FUNCTION public.leave_tribe(p_user_id uuid, p_tribe_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_role text;
    v_new_chief_id uuid;
    v_member_count int;
BEGIN
    -- 1. Check the role of the user leaving
    SELECT role INTO v_role
    FROM tribe_members
    WHERE tribe_id = p_tribe_id AND user_id = p_user_id;

    -- 2. Delete the member first
-- [CLEANED SEED DATA]     DELETE FROM tribe_members
-- [CLEANED SEED DATA]     WHERE tribe_id = p_tribe_id AND user_id = p_user_id;

    -- 3. If the leaving user was the chief
    IF v_role = 'chief' THEN
        -- Check if any other active members exist
        SELECT user_id INTO v_new_chief_id
        FROM tribe_members
        WHERE tribe_id = p_tribe_id AND role = 'member'
        ORDER BY joined_at ASC
        LIMIT 1;

        IF v_new_chief_id IS NOT NULL THEN
            -- Promote the longest-tenured member to chief in tribe_members
-- [CLEANED SEED DATA]             UPDATE tribe_members
-- [CLEANED SEED DATA]             SET role = 'chief'
-- [CLEANED SEED DATA]             WHERE tribe_id = p_tribe_id AND user_id = v_new_chief_id;

            -- Update chief_id in tribes
-- [CLEANED SEED DATA]             UPDATE tribes
-- [CLEANED SEED DATA]             SET chief_id = v_new_chief_id
-- [CLEANED SEED DATA]             WHERE id = p_tribe_id;
        ELSE
            -- No active members left, check if any pending exist
            SELECT count(*) INTO v_member_count
            FROM tribe_members
            WHERE tribe_id = p_tribe_id;

            -- If absolutely no members remain (active or pending), or we just want to delete the tribe
            IF v_member_count = 0 THEN
-- [CLEANED SEED DATA]                 DELETE FROM tribes
-- [CLEANED SEED DATA]                 WHERE id = p_tribe_id;
            ELSE
                -- If there are only pending members left, since they cannot be chief without being approved,
                -- delete the tribe as well because there are no active members or chiefs.
-- [CLEANED SEED DATA]                 DELETE FROM tribes
-- [CLEANED SEED DATA]                 WHERE id = p_tribe_id;
            END IF;
        END IF;
    ELSE
        -- If leaving user was a standard member or pending, check if the tribe now has 0 members
        SELECT count(*) INTO v_member_count
        FROM tribe_members
        WHERE tribe_id = p_tribe_id;

        IF v_member_count = 0 THEN
-- [CLEANED SEED DATA]             DELETE FROM tribes
-- [CLEANED SEED DATA]             WHERE id = p_tribe_id;
        END IF;
    END IF;
END;
$function$;

-- ==========================================
-- Migration: 20260523204522_macro_maps_migration

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
  creator_status_snapshot VARCHAR,
  creator_activity_snapshot VARCHAR,
  creator_activity_icon_snapshot VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE public.macro_map_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.macro_maps(id) ON DELETE CASCADE,
  sequence_index INT NOT NULL,
  trigger_type trigger_type NOT NULL,
  intent_tag intent_tag NOT NULL,
  trigger_weight_delta_pct NUMERIC,
  trigger_time_elapsed_days INT,
  trigger_days_elapsed INT,
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
DROP FUNCTION IF EXISTS public.calculate_user_bmr CASCADE;
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
DROP FUNCTION IF EXISTS public.trigger_live_map_overwrite CASCADE;
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
  auth.uid() = (SELECT creator_id FROM public.macro_maps WHERE id = map_id)
) WITH CHECK (
  auth.uid() = (SELECT creator_id FROM public.macro_maps WHERE id = map_id)
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
DROP FUNCTION IF EXISTS public.get_published_macro_maps CASCADE;
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
DROP FUNCTION IF EXISTS public.fetch_historical_log_range CASCADE;
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
BEGIN
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
DROP FUNCTION IF EXISTS public.publish_experiential_map CASCADE;
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
DROP FUNCTION IF EXISTS public.fetch_historical_meal_averages CASCADE;
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
DROP VIEW IF EXISTS public.public_discovery_maps CASCADE;
CREATE OR REPLACE VIEW public.public_discovery_maps AS
SELECT 
    m.id,
    m.creator_id,
    m.name AS map_name,
    m.engine_type,
    m.goal_type AS global_track,
    m.generation_type,
    m.is_live,
    m.is_published,
    m.created_at,
    m.created_at AS sort_date,
    p.handle AS username,
    p.name AS display_name,
    p.avatar_url,
    p.bio AS verified_bio,
    COALESCE(m.creator_status_snapshot, p.status) AS status,
    COALESCE(m.creator_status_snapshot, p.status) AS natural_status,
    (COALESCE(m.creator_status_snapshot, p.status) = 'natural') AS is_natural,
    COALESCE(m.creator_activity_snapshot, p.activity) AS activity_type,
    COALESCE(m.creator_activity_icon_snapshot, p.activity_icon) AS activity_icon,
    COALESCE(live_stats.avg_protein, 0) AS global_protein,
    COALESCE(live_stats.avg_carbs, 0) AS global_carbs,
    COALESCE(live_stats.avg_fats, 0) AS global_fats,
    COALESCE(live_stats.avg_calories, 0) AS global_calories
FROM public.macro_maps m
JOIN public.profiles p ON m.creator_id = p.id
LEFT JOIN (
    SELECT 
        map_id,
        AVG((macro_payload->>'p')::numeric) AS avg_protein,
        AVG((macro_payload->>'c')::numeric) AS avg_carbs,
        AVG((macro_payload->>'f')::numeric) AS avg_fats,
        AVG((macro_payload->>'calories')::numeric) AS avg_calories
    FROM public.macro_map_live_events
    GROUP BY map_id
) live_stats ON live_stats.map_id = m.id
WHERE m.is_published = true OR m.is_live = true
ORDER BY sort_date DESC;

GRANT SELECT ON public.public_discovery_maps TO authenticated;

-- 13. USER MAP PROGRESS TRACKING (STATEFUL JOURNEY)
CREATE TABLE public.user_map_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  map_id UUID NOT NULL REFERENCES public.macro_maps(id) ON DELETE CASCADE,
  current_checkpoint_id UUID REFERENCES public.macro_map_checkpoints(id) ON DELETE SET NULL,
  completed_checkpoint_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, map_id)
);

ALTER TABLE public.user_map_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own map progress" ON public.user_map_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);



-- Migration: 20260525233058_update_public_discovery_maps_view_shifts
-- ==========================================
DROP VIEW IF EXISTS public.public_discovery_maps CASCADE;
CREATE OR REPLACE VIEW public.public_discovery_maps AS
SELECT 
    m.id,
    m.creator_id,
    m.name AS map_name,
    m.engine_type,
    m.goal_type AS global_track,
    m.generation_type,
    m.is_live,
    m.is_published,
    m.created_at,
    m.created_at AS sort_date,
    p.handle AS username,
    p.name AS display_name,
    p.avatar_url,
    p.bio AS verified_bio,
    p.status AS natural_status,
    p.activity AS activity_type,
    COALESCE(live_stats.avg_protein, 0) AS global_protein,
    COALESCE(live_stats.avg_carbs, 0) AS global_carbs,
    COALESCE(live_stats.avg_fats, 0) AS global_fats,
    COALESCE(live_stats.avg_calories, 0) AS global_calories,
    COALESCE(checkpoint_stats.total_calorie_shift, 0) AS global_calorie_shift_pct,
    COALESCE(checkpoint_stats.total_weight_shift, 0) AS global_weight_shift_pct
FROM public.macro_maps m
JOIN public.profiles p ON m.creator_id = p.id
LEFT JOIN (
    SELECT 
        map_id,
        AVG((macro_payload->>'p')::numeric) AS avg_protein,
        AVG((macro_payload->>'c')::numeric) AS avg_carbs,
        AVG((macro_payload->>'f')::numeric) AS avg_fats,
        AVG((macro_payload->>'calories')::numeric) AS avg_calories
    FROM public.macro_map_live_events
    GROUP BY map_id
) live_stats ON live_stats.map_id = m.id
LEFT JOIN (
    SELECT
        map_id,
        SUM(calorie_delta_pct) AS total_calorie_shift,
        SUM(trigger_weight_delta_pct) AS total_weight_shift
    FROM public.macro_map_checkpoints
    GROUP BY map_id
) checkpoint_stats ON checkpoint_stats.map_id = m.id
WHERE m.is_published = true OR m.is_live = true
ORDER BY sort_date DESC;

-- ==========================================
-- Migration: 20260529170053_user_onboarding_rpc_and_rls
-- ==========================================
-- TASK 1: Handle Availability RPC
DROP FUNCTION IF EXISTS check_handle_available CASCADE;
CREATE OR REPLACE FUNCTION check_handle_available(requested_handle text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles WHERE lower(handle) = lower(requested_handle)
  );
END;
$$;

-- TASK 2: Finalize Onboarding RPC Transaction
DROP FUNCTION IF EXISTS finalize_user_onboarding CASCADE;
CREATE OR REPLACE FUNCTION finalize_user_onboarding(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_handle text;
  v_name text;
  v_height_cm int;
  v_weight_lbs float;
  v_activity text;
  v_is_private boolean;
  v_map_id uuid;
  v_tribe_id uuid;
  v_follow_id uuid;
BEGIN
  -- Extract variables
  v_user_id := (payload->>'user_id')::uuid;
  v_handle := payload->>'handle';
  v_name := payload->>'name';
  v_height_cm := (payload->>'height_cm')::int;
  v_weight_lbs := (payload->>'weight_lbs')::float;
  v_activity := payload->>'activity';
  v_is_private := (payload->>'is_private')::boolean;

  -- 1. Update profiles
  UPDATE profiles
  SET 
    handle = v_handle,
    name = v_name,
    height_cm = v_height_cm,
    weight_lbs = v_weight_lbs,
    activity = v_activity,
    is_private = v_is_private
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile with id % not found', v_user_id;
  END IF;

  -- 2. Insert map_subscriptions
  IF payload->'map_subscriptions' IS NOT NULL AND jsonb_array_length(payload->'map_subscriptions') > 0 THEN
    FOR v_map_id IN SELECT jsonb_array_elements_text(payload->'map_subscriptions')::uuid
    LOOP
      INSERT INTO map_subscriptions (subscriber_id, map_id, status)
      VALUES (v_user_id, v_map_id, 'ACTIVE');
    END LOOP;
  END IF;

  -- 3. Insert tribe_members
  IF payload->'tribe_joins' IS NOT NULL AND jsonb_array_length(payload->'tribe_joins') > 0 THEN
    FOR v_tribe_id IN SELECT jsonb_array_elements_text(payload->'tribe_joins')::uuid
    LOOP
      INSERT INTO tribe_members (user_id, tribe_id, role)
      VALUES (v_user_id, v_tribe_id, 'member');
    END LOOP;
  END IF;

  -- 4. Insert follows
  IF payload->'follows' IS NOT NULL AND jsonb_array_length(payload->'follows') > 0 THEN
    FOR v_follow_id IN SELECT jsonb_array_elements_text(payload->'follows')::uuid
    LOOP
      INSERT INTO follows (follower_id, following_id)
      VALUES (v_user_id, v_follow_id);
    END LOOP;
  END IF;
END;
$$;

-- TASK 3: Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent errors on multiple runs
DROP POLICY IF EXISTS profiles_select_self ON profiles;
DROP POLICY IF EXISTS profiles_select_public ON profiles;
DROP POLICY IF EXISTS profiles_select_private_followers ON profiles;
DROP POLICY IF EXISTS profiles_select_private_tribe_members ON profiles;
DROP POLICY IF EXISTS profiles_update_self ON profiles;

CREATE POLICY profiles_select_self ON profiles
FOR SELECT USING (
  auth.uid() = id
);

CREATE POLICY profiles_select_public ON profiles
FOR SELECT USING (
  is_private = false
);

CREATE POLICY profiles_select_private_followers ON profiles
FOR SELECT USING (
  is_private = true AND EXISTS (
    SELECT 1 FROM follows 
    WHERE follower_id = auth.uid() AND following_id = profiles.id
  )
);

CREATE POLICY profiles_select_private_tribe_members ON profiles
FOR SELECT USING (
  is_private = true AND EXISTS (
    SELECT 1 FROM tribe_members tm1
    JOIN tribe_members tm2 ON tm1.tribe_id = tm2.tribe_id
    WHERE tm1.user_id = auth.uid() AND tm2.user_id = profiles.id
  )
);

CREATE POLICY profiles_update_self ON profiles
FOR UPDATE USING (
  auth.uid() = id
);

-- ==========================================
-- Migration: 20260531043302_update_onboarding_rpc_with_dob
-- ==========================================
DROP FUNCTION IF EXISTS finalize_user_onboarding CASCADE;
CREATE OR REPLACE FUNCTION finalize_user_onboarding(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_handle text;
  v_name text;
  v_height_cm int;
  v_weight_lbs float;
  v_activity text;
  v_is_private boolean;
  v_dob text;
  v_map_id uuid;
  v_tribe_id uuid;
  v_follow_id uuid;
BEGIN
  -- Extract variables
  v_user_id := (payload->>'user_id')::uuid;
  v_handle := payload->>'handle';
  v_name := payload->>'name';
  v_height_cm := (payload->>'height_cm')::int;
  v_weight_lbs := (payload->>'weight_lbs')::float;
  v_activity := payload->>'activity';
  v_is_private := (payload->>'is_private')::boolean;
  v_dob := payload->>'dob';

  -- 1. Update profiles
  UPDATE profiles
  SET 
    handle = v_handle,
    name = v_name,
    height_cm = v_height_cm,
    weight_lbs = v_weight_lbs,
    activity = v_activity,
    is_private = v_is_private,
    dob = v_dob
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile with id % not found', v_user_id;
  END IF;

  -- 2. Insert map_subscriptions
  IF payload->'map_subscriptions' IS NOT NULL AND jsonb_array_length(payload->'map_subscriptions') > 0 THEN
    FOR v_map_id IN SELECT jsonb_array_elements_text(payload->'map_subscriptions')::uuid
    LOOP
      INSERT INTO map_subscriptions (subscriber_id, map_id, status)
      VALUES (v_user_id, v_map_id, 'ACTIVE');
    END LOOP;
  END IF;

  -- 3. Insert tribe_members
  IF payload->'tribe_joins' IS NOT NULL AND jsonb_array_length(payload->'tribe_joins') > 0 THEN
    FOR v_tribe_id IN SELECT jsonb_array_elements_text(payload->'tribe_joins')::uuid
    LOOP
      INSERT INTO tribe_members (user_id, tribe_id, role)
      VALUES (v_user_id, v_tribe_id, 'member');
    END LOOP;
  END IF;

  -- 4. Insert follows
  IF payload->'follows' IS NOT NULL AND jsonb_array_length(payload->'follows') > 0 THEN
    FOR v_follow_id IN SELECT jsonb_array_elements_text(payload->'follows')::uuid
    LOOP
      INSERT INTO follows (follower_id, following_id)
      VALUES (v_user_id, v_follow_id);
    END LOOP;
  END IF;
END;
$$;

-- ==========================================
-- Migration: 20260531052959_update_onboarding_rpc_with_macros
-- ==========================================
DROP FUNCTION IF EXISTS finalize_user_onboarding CASCADE;
CREATE OR REPLACE FUNCTION finalize_user_onboarding(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_handle text;
  v_name text;
  v_height_cm int;
  v_weight_lbs float;
  v_activity text;
  v_is_private boolean;
  v_dob text;
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
  v_height_cm := (payload->>'height_cm')::int;
  v_weight_lbs := (payload->>'weight_lbs')::float;
  v_activity := payload->>'activity';
  v_is_private := (payload->>'is_private')::boolean;
  v_dob := payload->>'dob';
  v_protein := (payload->>'protein')::int;
  v_carbs := (payload->>'carbs')::int;
  v_fats := (payload->>'fats')::int;
  v_calories := (payload->>'calories')::int;

  -- 1. Update profiles
  UPDATE profiles
  SET 
    handle = v_handle,
    name = v_name,
    height_cm = v_height_cm,
    weight_lbs = v_weight_lbs,
    activity = v_activity,
    is_private = v_is_private,
    dob = v_dob,
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
      VALUES (v_user_id, v_map_id, 'ACTIVE');
    END LOOP;
  END IF;

  -- 3. Insert tribe_members
  IF payload->'tribe_joins' IS NOT NULL AND jsonb_array_length(payload->'tribe_joins') > 0 THEN
    FOR v_tribe_id IN SELECT jsonb_array_elements_text(payload->'tribe_joins')::uuid
    LOOP
      INSERT INTO tribe_members (user_id, tribe_id, role)
      VALUES (v_user_id, v_tribe_id, 'member');
    END LOOP;
  END IF;

  -- 4. Insert follows
  IF payload->'follows' IS NOT NULL AND jsonb_array_length(payload->'follows') > 0 THEN
    FOR v_follow_id IN SELECT jsonb_array_elements_text(payload->'follows')::uuid
    LOOP
      INSERT INTO follows (follower_id, following_id)
      VALUES (v_user_id, v_follow_id);
    END LOOP;
  END IF;
END;
$$;

-- ==========================================
-- Migration: 20260531060320_update_onboarding_rpc_with_sex_gender
-- ==========================================
DROP FUNCTION IF EXISTS finalize_user_onboarding CASCADE;
CREATE OR REPLACE FUNCTION finalize_user_onboarding(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_handle text;
  v_name text;
  v_height_cm int;
  v_weight_lbs float;
  v_activity text;
  v_is_private boolean;
  v_dob text;
  v_sex text;
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
  v_height_cm := (payload->>'height_cm')::int;
  v_weight_lbs := (payload->>'weight_lbs')::float;
  v_activity := payload->>'activity';
  v_is_private := (payload->>'is_private')::boolean;
  v_dob := payload->>'dob';
  v_sex := payload->>'sex';
  v_protein := (payload->>'protein')::int;
  v_carbs := (payload->>'carbs')::int;
  v_fats := (payload->>'fats')::int;
  v_calories := (payload->>'calories')::int;

  -- 1. Update profiles
  UPDATE profiles
  SET 
    handle = v_handle,
    name = v_name,
    height_cm = v_height_cm,
    weight_lbs = v_weight_lbs,
    activity = v_activity,
    is_private = v_is_private,
    dob = v_dob,
    gender = v_sex,
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
      VALUES (v_user_id, v_map_id, 'ACTIVE');
    END LOOP;
  END IF;

  -- 3. Insert tribe_members
  IF payload->'tribe_joins' IS NOT NULL AND jsonb_array_length(payload->'tribe_joins') > 0 THEN
    FOR v_tribe_id IN SELECT jsonb_array_elements_text(payload->'tribe_joins')::uuid
    LOOP
      INSERT INTO tribe_members (user_id, tribe_id, role)
      VALUES (v_user_id, v_tribe_id, 'member');
    END LOOP;
  END IF;

  -- 4. Insert follows
  IF payload->'follows' IS NOT NULL AND jsonb_array_length(payload->'follows') > 0 THEN
    FOR v_follow_id IN SELECT jsonb_array_elements_text(payload->'follows')::uuid
    LOOP
      INSERT INTO follows (follower_id, following_id)
      VALUES (v_user_id, v_follow_id);
    END LOOP;
  END IF;
END;
$$;

-- ==========================================
-- Migration: 20260531062618_update_onboarding_rpc_with_lifting_experience
-- ==========================================
-- Add the lifting_experience column if it does not exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifting_experience text;

-- Update the onboarding RPC
DROP FUNCTION IF EXISTS finalize_user_onboarding CASCADE;
CREATE OR REPLACE FUNCTION finalize_user_onboarding(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_handle text;
  v_name text;
  v_height_cm int;
  v_weight_lbs float;
  v_activity text;
  v_is_private boolean;
  v_dob text;
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
  v_height_cm := (payload->>'height_cm')::int;
  v_weight_lbs := (payload->>'weight_lbs')::float;
  v_activity := payload->>'activity';
  v_is_private := (payload->>'is_private')::boolean;
  v_dob := payload->>'dob';
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
      VALUES (v_user_id, v_map_id, 'ACTIVE');
    END LOOP;
  END IF;

  -- 3. Insert tribe_members
  IF payload->'tribe_joins' IS NOT NULL AND jsonb_array_length(payload->'tribe_joins') > 0 THEN
    FOR v_tribe_id IN SELECT jsonb_array_elements_text(payload->'tribe_joins')::uuid
    LOOP
      INSERT INTO tribe_members (user_id, tribe_id, role)
      VALUES (v_user_id, v_tribe_id, 'member');
    END LOOP;
  END IF;

  -- 4. Insert follows
  IF payload->'follows' IS NOT NULL AND jsonb_array_length(payload->'follows') > 0 THEN
    FOR v_follow_id IN SELECT jsonb_array_elements_text(payload->'follows')::uuid
    LOOP
      INSERT INTO follows (follower_id, following_id)
      VALUES (v_user_id, v_follow_id);
    END LOOP;
  END IF;
END;
$$;

-- ==========================================
-- Migration: 20260531210519_update_finalize_user_onboarding_security_definer
-- ==========================================
CREATE OR REPLACE FUNCTION finalize_user_onboarding(payload jsonb) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_handle text;
  v_name text;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
