-- Update shop_products table to support dual pricing
-- This script adds regular_price and member_price columns

-- Add new price columns
ALTER TABLE shop_products 
ADD COLUMN IF NOT EXISTS regular_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS member_price DECIMAL(10,2);

-- Update existing products to have both prices set to the current price
-- This ensures backward compatibility
UPDATE shop_products 
SET regular_price = price, member_price = price 
WHERE regular_price IS NULL OR member_price IS NULL;

-- Make the new columns NOT NULL after setting default values
ALTER TABLE shop_products 
ALTER COLUMN regular_price SET NOT NULL,
ALTER COLUMN member_price SET NOT NULL;

-- Add default values for future inserts
ALTER TABLE shop_products 
ALTER COLUMN regular_price SET DEFAULT 0.00,
ALTER COLUMN member_price SET DEFAULT 0.00;

-- Create index for better performance on price queries
CREATE INDEX IF NOT EXISTS idx_shop_products_regular_price ON shop_products(regular_price);
CREATE INDEX IF NOT EXISTS idx_shop_products_member_price ON shop_products(member_price);

-- Update RLS policies to include new columns
-- The existing policies should work fine with the new columns
-- No additional policy changes needed

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'shop_products' 
ORDER BY ordinal_position; 