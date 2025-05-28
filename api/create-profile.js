import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin access
const supabaseAdmin = createClient(
    'https://qhkcrrphsjpytdfqfamq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwOTc2NjE3MCwiZXhwIjoyMDI1MzQyMTcwfQ.Oi6qWPiPaZPzXdvGJqF9T5DvWjkbr6JvQFCUXWQoAqM',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export default async function handler(req, res) {
    // Set CORS headers for all requests
    const allowedOrigins = [
        'https://www.blitztclub.com',
        'https://blitztclub.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ];

    const origin = req.headers.origin;
    const isLocalDevelopment = process.env.NODE_ENV !== 'production';
    
    // Handle CORS headers
    if (isLocalDevelopment) {
        // In development, allow all origins
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && allowedOrigins.includes(origin)) {
        // In production, only allow specific origins
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // Default to main domain in production
        res.setHeader('Access-Control-Allow-Origin', 'https://www.blitztclub.com');
    }

    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
    
    // Only set credentials header if not in development mode
    if (!isLocalDevelopment) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    res.setHeader('Vary', 'Origin');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Received profile creation request:', req.body);
        
        const {
            user_id, 
            email,
            username,
            full_name,
            first_name,
            last_name,
            phone,
            date_of_birth,
            car_models,
            street,
            city,
            province,
            postal_code,
            member_id 
        } = req.body;

        // Validate required fields
        const requiredFields = [
            'user_id', 'email', 'username', 'full_name',
            'phone', 'date_of_birth', 'car_models',
            'street', 'city', 'province', 'postal_code', 'member_id'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            console.error('Missing required fields:', missingFields);
            return res.status(400).json({
                error: 'Missing required fields for profile creation',
                details: `Missing fields: ${missingFields.join(', ')}`
            });
        }

        // Construct the full address
        const full_address = `${street}, ${city}, ${province}, ${postal_code}`;
        
        // Prepare the profile data
        const profileData = {
            id: user_id,
            email,
            username,
            full_name,
            first_name,
            last_name,
            phone,
            date_of_birth,
            car_models,
            street,
            city,
            province,
            postal_code,
            full_address,
            member_id,
            is_active: true,
            verification_status: 'pending',
            role: 'member',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('Attempting to create profile with data:', profileData);

        // First try to insert the profile
        const { data: insertedProfile, error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert(profileData)
            .select()
            .single();

        if (insertError) {
            console.log('Insert failed, attempting update:', insertError.message);
            // If insert fails, try to update
            const { data: updatedProfile, error: updateError } = await supabaseAdmin
                .from('profiles')
                .update(profileData)
                .eq('id', user_id)
                .select()
                .single();

            if (updateError) {
                console.error('Profile update error:', updateError.message);
                return res.status(500).json({
                    error: 'Failed to create or update profile',
                    details: updateError.message
                });
            }

            console.log('Profile updated successfully:', updatedProfile);
            return res.status(200).json({
                message: 'Profile updated successfully',
                profile: updatedProfile
            });
        }

        console.log('Profile created successfully:', insertedProfile);
        return res.status(201).json({
            message: 'Profile created successfully',
            profile: insertedProfile
        });

    } catch (error) {
        console.error('Unexpected error in /api/create-profile:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
} 