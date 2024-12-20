const { createClient } = require('@supabase/supabase-js');

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { membership_type } = req.body;
    
    if (!membership_type) {
      return res.status(400).json({
        error: 'membership_type is required'
      });
    }

    const prefix = membership_type === 'vip' ? 'VIP' : 'BTC';
    
    const { data: latestMember, error: queryError } = await supabase
      .from('profiles')
      .select('member_id')
      .like('member_id', `${prefix}%`)
      .order('member_id', { ascending: false })
      .limit(1);

    if (queryError) {
      console.error('Database query error:', queryError);
      return res.status(500).json({
        error: 'Failed to generate member ID'
      });
    }

    let nextNumber = 1;
    if (latestMember && latestMember.length > 0) {
      const currentNumber = parseInt(latestMember[0].member_id.slice(3));
      nextNumber = currentNumber + 1;
    }

    const member_id = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    return res.status(200).json({ member_id });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}; 