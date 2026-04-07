-- Add missing INSERT policy to profiles
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Clean up any partial state
TRUNCATE auth.users CASCADE;
TRUNCATE public.tribes CASCADE;

-- Helpers for generating dates
CREATE OR REPLACE FUNCTION days_ago(d int) RETURNS timestamptz AS $$
  SELECT now() - (d || ' days')::interval;
$$ LANGUAGE SQL;

-- Create auth users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, is_super_admin) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'kwadub72@gmail.com', crypt('Tribe62', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', false),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'jordan.smith@tumiapp.dev', crypt('TestPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', false),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'alex.rivera@tumiapp.dev', crypt('TestPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', false),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'casey.jones@tumiapp.dev', crypt('TestPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', false),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'riley.cooper@tumiapp.dev', crypt('TestPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', false),
('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'quinn.taylor@tumiapp.dev', crypt('TestPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', false),
('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'morgan.bailey@tumiapp.dev', crypt('TestPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', false),
('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'skyler.white@tumiapp.dev', crypt('TestPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', false),
('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'peyton.reed@tumiapp.dev', crypt('TestPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', false),
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'parker.scott@tumiapp.dev', crypt('TestPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', false),
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'avery.miller@tumiapp.dev', crypt('TestPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', false);

INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT id, id, format('{"sub":"%s","email":"%s"}', id, email)::jsonb, 'email', now(), now(), now() FROM auth.users;

-- Create profiles
INSERT INTO public.profiles (id, handle, name, avatar_url, status, activity, activity_icon, height, weight_lbs, body_fat_pct, macro_targets, training_target) VALUES
('00000000-0000-0000-0000-000000000001', '@kwadub', 'Kwaku Adubofour', 'https://i.pravatar.cc/150?u=kwadub', 'natural', 'Bodybuilder (Cut)', 'hammer', '6''3', 203, '8%', '{"p": 250, "c": 200, "f": 60, "calories": 2380}'::jsonb, 'Lean is law.'),
('00000000-0000-0000-0000-000000000002', '@jsmith', 'Jordan Smith', 'https://i.pravatar.cc/150?u=1', 'natural', 'Powerlifting', 'weight-lifter', '5''11', 215, '12%', '{"p": 220, "c": 380, "f": 80, "calories": 3160}'::jsonb, 'Total world domination.'),
('00000000-0000-0000-0000-000000000003', '@arivera', 'Alex Rivera', 'https://i.pravatar.cc/150?u=2', 'enhanced', 'Bodybuilder (Bulk)', 'hammer', '6''1', 230, '10%', '{"p": 280, "c": 450, "f": 100, "calories": 3820}'::jsonb, 'Size over everything.'),
('00000000-0000-0000-0000-000000000004', '@cjones', 'Casey Jones', 'https://i.pravatar.cc/150?u=3', 'natural', 'Hybrid Athlete', 'infinity', '5''9', 178, '9%', '{"p": 195, "c": 310, "f": 70, "calories": 2690}'::jsonb, 'Strong AND fast.'),
('00000000-0000-0000-0000-000000000005', '@rcooper', 'Riley Cooper', 'https://i.pravatar.cc/150?u=4', 'none', 'Distance Runner', 'run-fast', '5''7', 148, '7%', '{"p": 160, "c": 420, "f": 55, "calories": 2855}'::jsonb, 'Sub-3 marathon.'),
('00000000-0000-0000-0000-000000000006', '@qtaylor', 'Quinn Taylor', 'https://i.pravatar.cc/150?u=5', 'natural', 'Bodybuilder (Cut)', 'hammer', '5''10', 185, '10%', '{"p": 225, "c": 180, "f": 55, "calories": 2155}'::jsonb, 'Stage ready.'),
('00000000-0000-0000-0000-000000000007', '@mbailey', 'Morgan Bailey', 'https://i.pravatar.cc/150?u=6', 'natural', 'Glute Growth', 'cake-variant', '5''6', 145, '18%', '{"p": 165, "c": 280, "f": 65, "calories": 2405}'::jsonb, 'Built, not small.'),
('00000000-0000-0000-0000-000000000008', '@swhite', 'Skyler White', 'https://i.pravatar.cc/150?u=7', 'enhanced', 'Bodybuilder (Bulk)', 'hammer', '6''0', 245, '13%', '{"p": 300, "c": 500, "f": 110, "calories": 4270}'::jsonb, '300 lbs lean.'),
('00000000-0000-0000-0000-000000000009', '@preed', 'Peyton Reed', 'https://i.pravatar.cc/150?u=8', 'none', 'Functional', 'kettlebell', '5''8', 165, '14%', '{"p": 175, "c": 260, "f": 65, "calories": 2345}'::jsonb, 'Fit for life.'),
('00000000-0000-0000-0000-000000000010', '@pscott', 'Parker Scott', 'https://i.pravatar.cc/150?u=9', 'natural', 'Combat Athlete', 'karate', '5''11', 170, '8%', '{"p": 200, "c": 300, "f": 60, "calories": 2620}'::jsonb, 'Compete at 170.'),
('00000000-0000-0000-0000-000000000011', '@amiller', 'Avery Miller', 'https://i.pravatar.cc/150?u=10', 'natural', 'Bodybuilder (Bulk)', 'hammer', '5''9', 195, '11%', '{"p": 240, "c": 400, "f": 85, "calories": 3385}'::jsonb, 'Mass or nothing.');

-- Create follows (kwadub -> everyone else)
INSERT INTO public.follows (follower_id, following_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM public.profiles WHERE id != '00000000-0000-0000-0000-000000000001';

-- Full mesh for seed accounts (users 2 through 11 following each other)
INSERT INTO public.follows (follower_id, following_id)
SELECT a.id, b.id FROM public.profiles a JOIN public.profiles b ON a.id != b.id
WHERE a.id != '00000000-0000-0000-0000-000000000001' AND b.id != '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- Create tribes
INSERT INTO public.tribes (id, name, avatar_url, theme_color, tribe_type, privacy, description, tags, chief_id) VALUES
('b0000000-0000-0000-0000-000000000001', 'Harvard Alum League', 'https://i.pravatar.cc/150?u=100', '#9FB89F', 'accountability', 'public', 'For the alums and the grinders.', ARRAY['natural', 'active'], '00000000-0000-0000-0000-000000000002'),
('b0000000-0000-0000-0000-000000000002', 'Iron Brotherhood', 'https://i.pravatar.cc/150?u=101', '#3E2A4A', 'head-to-head', 'private', 'Strength athletes only.', ARRAY['natural'], '00000000-0000-0000-0000-000000000003'),
('b0000000-0000-0000-0000-000000000003', 'Team Flex', 'https://i.pravatar.cc/150?u=102', '#E6A8A8', 'head-to-head', 'public', 'Getting big every day.', ARRAY['active'], '00000000-0000-0000-0000-000000000008'),
('b0000000-0000-0000-0000-000000000004', 'The Cut Squad', 'https://i.pravatar.cc/150?u=103', '#2D3A26', 'tribe-vs-tribe', 'public', 'Who can get the leanest?', ARRAY['natural', 'active'], '00000000-0000-0000-0000-000000000006');

-- Add members to Team Flex (Everyone)
INSERT INTO public.tribe_members (tribe_id, user_id, role)
SELECT 'b0000000-0000-0000-0000-000000000003', id, CASE WHEN id = '00000000-0000-0000-0000-000000000008' THEN 'chief' ELSE 'member' END FROM public.profiles;

-- Add members to The Cut Squad
INSERT INTO public.tribe_members (tribe_id, user_id, role) VALUES
('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006', 'chief'), -- qtaylor
('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'member'), -- kwadub
('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'member'), -- jsmith
('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'member'), -- cjones
('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000009', 'member'); -- preed

-- Create 12 posts for each of the 10 seed users (Skipping kwadub)
-- 3 meals, 3 workouts, 3 macro updates, 3 snapshots
DO $$
DECLARE
  seed_users uuid[] := ARRAY[
    '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011'
  ];
  uid uuid;
  i int;
  meal_json jsonb := '{"meal": {"id": "1", "type": "Lunch", "title": "Meal Prep Classic", "macros": {"c": 110, "f": 20, "p": 72}, "calories": 920, "ingredients": [{"id": "1", "name": "Chicken Breast", "cals": 335, "amount": "8 oz", "macros": {"c": 0, "f": 7, "p": 63}}, {"id": "2", "name": "Brown Rice", "cals": 432, "amount": "2 cups cooked", "macros": {"c": 90, "f": 3, "p": 9}}]}}'::jsonb;
  workout_json jsonb := '{"workout": {"id": "w1", "title": "Leg Day", "duration": 80, "exercises": [{"id": "ex1", "sets": [{"id": "s1", "reps": 6, "weight": 315, "completed": true}, {"id": "s2", "reps": 6, "weight": 315, "completed": true}], "type": "Strength", "title": "Squat", "muscleGroup": "Quads"}], "timestamp": 1}}'::jsonb;
  macro_json jsonb := '{"macroUpdate": {"id": "mu1", "caption": "Dropping cals for the push.", "oldDate": "02/15/2026", "newTargets": {"c": 250, "f": 65, "p": 230, "calories": 2400}, "oldTargets": {"c": 330, "f": 75, "p": 220, "calories": 2800}, "trainingTarget": "Cutting Phase"}}'::jsonb;
  snapshot_json jsonb := '{"snapshot": {"id": "sn1", "caption": "Nearly dialed in.", "targets": {"c": 320, "f": 75, "p": 220, "calories": 2800}, "consumed": {"c": 305, "f": 68, "p": 210, "calories": 2650}}}'::jsonb;
BEGIN
  FOREACH uid IN ARRAY seed_users LOOP
    FOR i IN 1..3 LOOP
      INSERT INTO public.posts (author_id, post_type, payload, created_at, tribe_id) VALUES (uid, 'meal', meal_json, days_ago(i), 'b0000000-0000-0000-0000-000000000003');
      INSERT INTO public.posts (author_id, post_type, payload, created_at) VALUES (uid, 'workout', workout_json, days_ago((i+1)));
      INSERT INTO public.posts (author_id, post_type, payload, created_at) VALUES (uid, 'macro_update', macro_json, days_ago((i+2)));
      INSERT INTO public.posts (author_id, post_type, payload, created_at) VALUES (uid, 'snapshot', snapshot_json, days_ago((i+3)));
    END LOOP;
  END LOOP;
END $$;
