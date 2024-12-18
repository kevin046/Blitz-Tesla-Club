import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://www.blitztclub.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'GET') {
        try {
            const { token } = req.query;

            // Initialize Supabase client
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_KEY;
            const supabaseClient = createClient(supabaseUrl, supabaseKey);

            // Find user by verification token
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('verification_token', token)
                .single();

            if (error || !profile) {
                return res.redirect('https://www.blitztclub.com/verification-failed');
            }

            // Update profile status
            await supabaseClient
                .from('profiles')
                .update({ 
                    membership_status: 'active',
                    verification_token: null 
                })
                .eq('id', profile.id);

            // Redirect to success page
            res.redirect('https://www.blitztclub.com/verification-success');

        } catch (error) {
            console.error('Verification error:', error);
            res.redirect('https://www.blitztclub.com/verification-failed');
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
} 