-- Setup Supabase Storage for Shop Images (Updated)
-- Run this in your Supabase SQL editor

-- Create storage bucket for shop images (only if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload shop images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view shop images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update shop images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete shop images" ON storage.objects;

-- Create RLS policies for the shop-images bucket

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload shop images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'shop-images' 
    AND auth.role() = 'authenticated'
);

-- Allow public to view shop images
CREATE POLICY "Allow public to view shop images" ON storage.objects
FOR SELECT USING (
    bucket_id = 'shop-images'
);

-- Allow authenticated users to update their own uploads
CREATE POLICY "Allow authenticated users to update shop images" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'shop-images' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Allow authenticated users to delete shop images" ON storage.objects
FOR DELETE USING (
    bucket_id = 'shop-images' 
    AND auth.role() = 'authenticated'
);

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create a function to generate unique filenames (only if it doesn't exist)
CREATE OR REPLACE FUNCTION generate_unique_filename()
RETURNS TEXT AS $$
BEGIN
    RETURN 'product-images/' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || 
           SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8) || '.jpg';
END;
$$ LANGUAGE plpgsql;

-- Verify the setup
SELECT 
    'Storage bucket exists' as status,
    id,
    name,
    public
FROM storage.buckets 
WHERE id = 'shop-images';

-- Show created policies
SELECT 
    'Policy created' as status,
    policyname,
    tablename
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'; 