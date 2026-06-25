ALTER TABLE public.posts DROP CONSTRAINT posts_post_type_check;

ALTER TABLE public.posts
ADD CONSTRAINT posts_post_type_check 
CHECK (post_type = ANY (ARRAY[
    'meal'::text, 
    'workout'::text, 
    'macro_update'::text, 
    'snapshot'::text,
    'map_subscribe'::text,
    'map_publish'::text,
    'map_silent'::text
]));
