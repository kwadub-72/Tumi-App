ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS map_id uuid REFERENCES public.macro_maps(id) ON DELETE CASCADE;
