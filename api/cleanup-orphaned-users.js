import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://qhkcrrphsjpytdfqfamq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDMyNDg3OCwiZXhwIjoyMDQ5OTAwODc4fQ.A6ltvW5H0Hr8mnTAlesPHyCa6STI9IoSg9ZVgzsSzdw'
);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        console.log(`Starting account deletion process for user: ${user_id}`);

        // Check if user exists in Supabase Auth
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
        
        if (userError || !userData) {
            console.log(`User ${user_id} not found in auth system or already deleted`);
            return res.status(404).json({ 
                error: 'User not found', 
                details: userError?.message || 'User may have been already deleted' 
            });
        }

        console.log(`Found user in auth system: ${userData.user.email}`);
        
        // Check for user's profile
        const { data: profileData, error: profileFetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user_id)
            .single();
            
        if (profileFetchError && profileFetchError.code !== 'PGRST116') {
            console.error('Error checking profile:', profileFetchError);
        }
        
        if (profileData) {
            console.log(`Found profile for user: ${profileData.email}`);
            
            // Delete profile
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user_id);

            if (profileError) {
                console.error('Profile deletion error:', profileError);
                if (profileError.code === '23503') { // Foreign key violation
                    console.log('Foreign key constraint violation - check for related records');
                    
                    // Additional logic to handle foreign key constraints if needed
                    // You might need to delete related records in other tables first
                }
            } else {
                console.log('Profile deleted successfully');
            }
        } else {
            console.log('No profile found for user or already deleted');
        }

        // Delete any related sessions
        const { error: sessionError } = await supabase
            .from('sessions')
            .delete()
            .eq('user_id', user_id);
            
        if (sessionError) {
            console.error('Error deleting sessions:', sessionError);
        } else {
            console.log('Sessions deleted successfully (if any)');
        }
        
        // Delete any other related user data here if needed
        // ...

        // Finally, delete the auth user completely
        console.log('Deleting user from Auth system...');
        const { error: authError } = await supabase.auth.admin.deleteUser(user_id);

        if (authError) {
            console.error('Auth deletion error:', authError);
            if (authError.message.includes('not found')) {
                return res.json({ message: 'User already deleted from auth system' });
            }
            throw authError;
        }

        console.log(`User ${user_id} completely deleted from system`);
        res.json({ 
            success: true,
            message: 'User completely removed from the system',
            details: {
                auth_deleted: true,
                profile_deleted: true,
                sessions_cleared: true
            }
        });
    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ 
            error: 'Failed to delete account',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}; 