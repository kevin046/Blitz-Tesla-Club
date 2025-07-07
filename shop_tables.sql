-- Blitz Shop Database Tables
-- This script creates the necessary tables for the shop functionality

-- Create shop_products table
CREATE TABLE IF NOT EXISTS shop_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    inventory INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(100) NOT NULL,
    image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shop_orders table
CREATE TABLE IF NOT EXISTS shop_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    items JSONB NOT NULL, -- Array of order items
    total_amount DECIMAL(10,2) NOT NULL,
    pickup_note TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shop_products_published ON shop_products(is_published);
CREATE INDEX IF NOT EXISTS idx_shop_products_category ON shop_products(category);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);
CREATE INDEX IF NOT EXISTS idx_shop_orders_created_at ON shop_orders(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shop_products
-- Allow all users to view published products
CREATE POLICY "Allow view published products" ON shop_products
    FOR SELECT USING (is_published = true);

-- Allow admins to manage all products
CREATE POLICY "Allow admin manage products" ON shop_products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.membership_type = 'premium')
        )
    );

-- RLS Policies for shop_orders
-- Allow users to view their own orders
CREATE POLICY "Allow users view own orders" ON shop_orders
    FOR SELECT USING (user_id = auth.uid());

-- Allow users to create their own orders
CREATE POLICY "Allow users create own orders" ON shop_orders
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow admins to view all orders
CREATE POLICY "Allow admin view all orders" ON shop_orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.membership_type = 'premium')
        )
    );

-- Allow admins to update orders
CREATE POLICY "Allow admin update orders" ON shop_orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.membership_type = 'premium')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_shop_products_updated_at 
    BEFORE UPDATE ON shop_products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_orders_updated_at 
    BEFORE UPDATE ON shop_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample products (optional)
INSERT INTO shop_products (title, description, price, inventory, category, image_url, is_published) VALUES
('Blitz T Club T-Shirt', 'Premium cotton t-shirt with Blitz T Club logo', 25.00, 50, 'clothing', 'https://via.placeholder.com/300x300?text=Blitz+T-Shirt', true),
('Tesla Model S Keychain', 'High-quality keychain with Tesla Model S design', 15.00, 30, 'accessories', 'https://via.placeholder.com/300x300?text=Keychain', true),
('Blitz Club Hoodie', 'Comfortable hoodie with embroidered club logo', 45.00, 25, 'clothing', 'https://via.placeholder.com/300x300?text=Hoodie', true),
('Tesla Charging Cable Organizer', 'Neat organizer for Tesla charging cables', 20.00, 40, 'accessories', 'https://via.placeholder.com/300x300?text=Cable+Organizer', true),
('Blitz Club Sticker Pack', 'Set of 5 high-quality vinyl stickers', 12.00, 100, 'accessories', 'https://via.placeholder.com/300x300?text=Stickers', true)
ON CONFLICT DO NOTHING; 