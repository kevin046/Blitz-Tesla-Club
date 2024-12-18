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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { user_id } = req.body;

        // Delete profile first
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user_id);

        if (profileError) {
            console.error('Profile deletion error:', profileError);
            throw profileError;
        }

        // Then delete auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(user_id);

        if (authError) {
            console.error('Auth deletion error:', authError);
            throw authError;
        }

        return res.status(200).json({ message: 'User cleaned up successfully' });
    } catch (error) {
        console.error('Cleanup error:', error);
        return res.status(500).json({ error: 'Failed to clean up user' });
    }
} 