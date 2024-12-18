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
        const { membership_type } = req.body;
        const prefix = membership_type === 'vip' ? 'VIP' : 'BTC';

        // Get the latest member ID for the specific type
        const { data: latestMember, error: queryError } = await supabase
            .from('profiles')
            .select('member_id')
            .like('member_id', `${prefix}%`)
            .order('member_id', { ascending: false })
            .limit(1);

        if (queryError) throw queryError;

        let nextNumber = 1;
        if (latestMember && latestMember.length > 0) {
            // Extract the number from the latest member ID and increment
            const currentNumber = parseInt(latestMember[0].member_id.slice(3));
            nextNumber = currentNumber + 1;
        }

        // Format the new member ID with leading zeros
        const member_id = `${prefix}${String(nextNumber).padStart(3, '0')}`;

        return res.status(200).json({ member_id });

    } catch (error) {
        console.error('Error generating member ID:', error);
        return res.status(500).json({ error: 'Failed to generate member ID' });
    }
} 