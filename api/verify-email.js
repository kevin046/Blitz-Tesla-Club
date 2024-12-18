import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { token } = req.query;

            if (!token) {
                console.error('No token provided');
                return res.redirect('/verification-failed.html');
            }

            console.log('Received token:', token);

            // Initialize Supabase client with correct credentials
            const supabaseUrl = 'https://qhkcrrphsjpytdfqfamq.supabase.co';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMjQ4NzgsImV4cCI6MjA0OTkwMDg3OH0.S9JT_WmCWYMvSixRq1RrB1UlqXm6fix_riLFYCR3JOI';
            const supabaseClient = createClient(supabaseUrl, supabaseKey);

            // Find user by verification token
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('verification_token', token)
                .single();

            console.log('Found profile:', profile);

            if (error) {
                console.error('Error finding profile:', error);
                return res.redirect('/verification-failed.html');
            }

            if (!profile) {
                console.error('No profile found with token:', token);
                return res.redirect('/verification-failed.html');
            }

            console.log('Updating profile status for ID:', profile.id);

            // Update profile status
            const { error: updateError } = await supabaseClient
                .from('profiles')
                .update({ 
                    membership_status: 'active',
                    verification_token: null,
                    verified_at: new Date().toISOString()
                })
                .eq('id', profile.id);

            if (updateError) {
                console.error('Error updating profile:', updateError);
                return res.redirect('/verification-failed.html');
            }

            // Double-check the update
            const { data: checkProfile, error: checkError } = await supabaseClient
                .from('profiles')
                .select('membership_status')
                .eq('id', profile.id)
                .single();

            if (checkError || checkProfile.membership_status !== 'active') {
                console.error('Verification status not updated properly');
                return res.redirect('/verification-failed.html');
            }

            console.log('Successfully verified profile:', profile.id);
            return res.redirect('/verification-success.html?verified=true&id=' + profile.id);

        } catch (error) {
            console.error('Verification error:', error);
            return res.redirect('/verification-failed.html');
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
} 