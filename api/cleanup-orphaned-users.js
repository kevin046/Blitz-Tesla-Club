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

        // Delete profile first
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user_id);

        if (profileError) {
            console.error('Profile deletion error:', profileError);
            throw profileError;
        }

        // Delete auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(user_id);

        if (authError) {
            console.error('Auth deletion error:', authError);
            throw authError;
        }

        res.json({ message: 'User cleaned up successfully' });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: error.message });
    }
}; 