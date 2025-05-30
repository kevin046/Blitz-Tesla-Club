import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin access
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL || 'https://qhkcrrphsjpytdfqfamq.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
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

    // Verify that we have the required environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
        return res.status(500).json({
            error: 'Server configuration error',
            details: 'Missing required environment variables'
        });
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
            member_id,
            full_address 
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
            role: req.body.role || 'member',
            updated_at: new Date().toISOString()
        };

        console.log('Attempting to create profile with data:', profileData);

        // Check if profile exists
        const { data: existingProfile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', user_id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error('Error checking existing profile:', fetchError);
            return res.status(500).json({
                error: 'Database error',
                details: fetchError.message
            });
        }

        let result;
        if (existingProfile) {
            // Update existing profile
            const { data: updatedProfile, error: updateError } = await supabaseAdmin
                .from('profiles')
                .update(profileData)
                .eq('id', user_id)
                .select()
                .single();

            if (updateError) {
                console.error('Profile update error:', updateError);
                return res.status(500).json({
                    error: 'Failed to update profile',
                    details: updateError.message
                });
            }
            result = { profile: updatedProfile, message: 'Profile updated successfully' };
        } else {
            // Insert new profile
            const { data: insertedProfile, error: insertError } = await supabaseAdmin
                .from('profiles')
                .insert(profileData)
                .select()
                .single();

            if (insertError) {
                console.error('Profile creation error:', insertError);
                return res.status(500).json({
                    error: 'Failed to create profile',
                    details: insertError.message
                });
            }
            result = { profile: insertedProfile, message: 'Profile created successfully' };
        }

        console.log('Operation successful:', result);
        return res.status(200).json(result);

    } catch (error) {
        console.error('Unexpected error in /api/create-profile:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
} 