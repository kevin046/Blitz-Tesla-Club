import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Handle verification request
    if (req.method === 'GET') {
        try {
            const { token } = req.query;

            if (!token) {
                return res.redirect('/verification-failed.html');
            }

            // Initialize Supabase client
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_KEY;
            const supabaseClient = createClient(supabaseUrl, supabaseKey);

            console.log('Verifying token:', token);

            // Find user by verification token
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('verification_token', token)
                .single();

            if (error) {
                console.error('Error finding profile:', error);
                return res.redirect('/verification-failed.html');
            }

            if (!profile) {
                console.error('No profile found with token:', token);
                return res.redirect('/verification-failed.html');
            }

            // Update profile status
            const { error: updateError } = await supabaseClient
                .from('profiles')
                .update({ 
                    membership_status: 'active',
                    verification_token: null 
                })
                .eq('id', profile.id);

            if (updateError) {
                console.error('Error updating profile:', updateError);
                return res.redirect('/verification-failed.html');
            }

            console.log('Successfully verified profile:', profile.id);
            // Redirect to success page
            res.redirect('/verification-success.html');

        } catch (error) {
            console.error('Verification error:', error);
            res.redirect('/verification-failed.html');
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
} 