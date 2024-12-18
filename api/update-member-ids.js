import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get all profiles
        const { data: profiles, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        let btcCounter = 1;
        let vipCounter = 1;
        
        // Update each profile with new member ID format
        for (const profile of profiles) {
            const prefix = profile.membership_type === 'vip' ? 'VIP' : 'BTC';
            const counter = profile.membership_type === 'vip' ? vipCounter++ : btcCounter++;
            const newMemberId = `${prefix}${String(counter).padStart(3, '0')}`;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ member_id: newMemberId })
                .eq('id', profile.id);

            if (updateError) throw updateError;
        }

        return res.status(200).json({ 
            message: 'Successfully updated member IDs',
            updated_count: profiles.length 
        });

    } catch (error) {
        console.error('Error updating member IDs:', error);
        return res.status(500).json({ error: 'Failed to update member IDs' });
    }
} 