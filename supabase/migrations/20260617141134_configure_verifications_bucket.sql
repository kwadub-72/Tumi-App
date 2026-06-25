-- 1. Create the 'verifications' bucket with strict size and MIME type limits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'verifications', 
    'verifications', 
    false, -- Private bucket for sensitive verification/medical docs
    10485760, -- 10MB limit in bytes
    ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'application/pdf'::text]
)
ON CONFLICT (id) DO UPDATE 
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Clean up old policies for the verifications bucket if any
DROP POLICY IF EXISTS "Allow Upload to Verifications for Owner" ON storage.objects;
DROP POLICY IF EXISTS "Allow View to Verifications for Owner" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update to Verifications for Owner" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete to Verifications for Owner" ON storage.objects;

-- 3. RLS Policies for Owner-Only Access to Verifications Documents

-- Allow authenticated users to upload verifications to their own subfolder
CREATE POLICY "Allow Upload to Verifications for Owner" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'verifications' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
);

-- Allow authenticated users to view only their own verifications
CREATE POLICY "Allow View to Verifications for Owner" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'verifications' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
);

-- Allow authenticated users to update only their own verifications
CREATE POLICY "Allow Update to Verifications for Owner" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'verifications' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'verifications' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
);

-- Allow authenticated users to delete only their own verifications
CREATE POLICY "Allow Delete to Verifications for Owner" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'verifications' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
);
