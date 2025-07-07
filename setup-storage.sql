-- Setup Supabase Storage for Shop Images
-- Run this in your Supabase SQL editor

-- Create storage bucket for shop images
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO NOTHING;

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

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create a function to generate unique filenames
CREATE OR REPLACE FUNCTION generate_unique_filename()
RETURNS TEXT AS $$
BEGIN
    RETURN 'product-images/' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || 
           SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8) || '.jpg';
END;
$$ LANGUAGE plpgsql; 