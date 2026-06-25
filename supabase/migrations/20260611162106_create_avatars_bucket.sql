-- 1. Create the 'avatars' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Clean up old policies if any
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload for Authenticated Users" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update for Owners" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete for Owners" ON storage.objects;

-- Allow public read access to avatars
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload files to their own directory
CREATE POLICY "Allow Upload for Authenticated Users" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'avatars' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
);

-- Allow authenticated users to update files in their own directory
CREATE POLICY "Allow Update for Owners" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'avatars' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
);

-- Allow authenticated users to delete files in their own directory
CREATE POLICY "Allow Delete for Owners" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'avatars' 
  AND (split_part(name, '/', 1) = auth.uid()::text)
);
