import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export default async function handler(req, res) {
    // Set JSON content type
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        console.log('Attempting to delete user:', user_id);

        // Delete profile first
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user_id);

        if (profileError) {
            console.error('Profile deletion error:', profileError);
            return res.status(500).json({ 
                error: 'Failed to delete profile',
                details: profileError.message 
            });
        }

        console.log('Profile deleted successfully');

        // Then delete auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(user_id);

        if (authError) {
            console.error('Auth deletion error:', authError);
            return res.status(500).json({ 
                error: 'Failed to delete auth user',
                details: authError.message 
            });
        }

        console.log('Auth user deleted successfully');

        return res.status(200).json({ message: 'User cleaned up successfully' });
    } catch (error) {
        console.error('Cleanup error:', error);
        return res.status(500).json({ 
            error: 'Failed to clean up user',
            details: error.message || 'Unknown error occurred'
        });
    }
} 