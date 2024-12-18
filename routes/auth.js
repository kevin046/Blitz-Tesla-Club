import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://qhkcrrphsjpytdfqfamq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMjQ4NzgsImV4cCI6MjA0OTkwMDg3OH0.S9JT_WmCWYMvSixRq1RrB1UlqXm6fix_riLFYCR3JOI';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

export async function verifyEmail(token) {
    try {
        const cleanToken = token.trim();
        console.log('Verifying email with token:', cleanToken);

        // Find user by verification token
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('verification_token', cleanToken)
            .single();

        if (error || !profile) {
            console.error('Profile not found:', error);
            return { success: false, error: 'Invalid verification token' };
        }

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
            console.error('Update failed:', updateError);
            return { success: false, error: 'Failed to verify email' };
        }

        return { success: true, profile };
    } catch (error) {
        console.error('Verification error:', error);
        return { success: false, error: 'Internal server error' };
    }
}

module.exports = { verifyEmail }; 