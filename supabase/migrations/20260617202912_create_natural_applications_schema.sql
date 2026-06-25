-- 1. Create the 'natural_applications' table
CREATE TABLE IF NOT EXISTS public.natural_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CONSTRAINT check_natural_applications_status CHECK (status IN ('pending', 'approved', 'rejected', 'info_requested')),
    years_training INTEGER NOT NULL,
    dob DATE NOT NULL,
    photo_start_url TEXT NOT NULL,
    timestamp_start TEXT NOT NULL,
    photo_today_url TEXT NOT NULL,
    timestamp_today TEXT NOT NULL,
    doc_polygraph_url TEXT,
    doc_medical_url TEXT,
    email_opt_in BOOLEAN NOT NULL DEFAULT true,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on the table
ALTER TABLE public.natural_applications ENABLE ROW LEVEL SECURITY;

-- Clean up old policies if any
DROP POLICY IF EXISTS "Allow Select for Application Owner" ON public.natural_applications;
DROP POLICY IF EXISTS "Allow Insert for Application Owner" ON public.natural_applications;

-- Create RLS Policies for public.natural_applications table
CREATE POLICY "Allow Select for Application Owner" 
ON public.natural_applications FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Allow Insert for Application Owner" 
ON public.natural_applications FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 2. Create the 'natural_applications' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'natural_applications', 
    'natural_applications', 
    false, -- Private bucket for sensitive identity/medical/polygraph docs
    10485760, -- 10MB limit in bytes
    ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'application/pdf'::text]
)
ON CONFLICT (id) DO UPDATE 
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Clean up old policies for the natural_applications bucket if any
DROP POLICY IF EXISTS "Allow Upload to Natural Applications for Owner" ON storage.objects;
DROP POLICY IF EXISTS "Allow View to Natural Applications for Owner" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update to Natural Applications for Owner" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete to Natural Applications for Owner" ON storage.objects;

-- RLS Policies for Owner-Only Access to Application Documents in storage.objects
CREATE POLICY "Allow Upload to Natural Applications for Owner" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'natural_applications' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
);

CREATE POLICY "Allow View to Natural Applications for Owner" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'natural_applications' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
);

CREATE POLICY "Allow Update to Natural Applications for Owner" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'natural_applications' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'natural_applications' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
);

CREATE POLICY "Allow Delete to Natural Applications for Owner" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'natural_applications' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
);
