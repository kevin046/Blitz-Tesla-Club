-- Refresh schema cache and ensure proper column handling
-- This script helps Supabase recognize the new columns

-- Refresh the schema cache by querying the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'shop_products' 
ORDER BY ordinal_position;

-- Ensure all existing products have the new price columns populated
UPDATE shop_products 
SET regular_price = COALESCE(regular_price, price, 0.00),
    member_price = COALESCE(member_price, price, 0.00)
WHERE regular_price IS NULL OR member_price IS NULL;

-- Verify the data
SELECT id, title, price, regular_price, member_price 
FROM shop_products 
LIMIT 5;

-- Force a schema refresh by creating a temporary view
CREATE OR REPLACE VIEW shop_products_schema_check AS
SELECT 
    id,
    title,
    description,
    price,
    regular_price,
    member_price,
    inventory,
    category,
    image_url,
    is_published,
    created_at,
    updated_at
FROM shop_products
LIMIT 1;

-- Drop the temporary view
DROP VIEW IF EXISTS shop_products_schema_check; 