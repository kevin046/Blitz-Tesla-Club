import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', 'https://www.blitztclub.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { membership_type } = req.body;
        
        if (!membership_type) {
            return res.status(400).json({ error: 'Membership type is required' });
        }

        // Get latest member ID
        const { data: latestMember, error: queryError } = await supabase
            .from('profiles')
            .select('member_id')
            .like('member_id', 'BTC%')
            .order('member_id', { ascending: false })
            .limit(1);

        if (queryError) {
            console.error('Database query error:', queryError);
            return res.status(500).json({ error: 'Failed to generate member ID' });
        }

        // Generate next member ID
        let nextNumber = 1;
        if (latestMember && latestMember.length > 0) {
            const currentNumber = parseInt(latestMember[0].member_id.slice(3));
            nextNumber = currentNumber + 1;
        }

        const member_id = `BTC${String(nextNumber).padStart(3, '0')}`;
        
        return res.status(200).json({ member_id });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 