-- Migration: Add moderation columns for temporal banning and soft-deletes/hidden state
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

ALTER TABLE public.macro_maps
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
