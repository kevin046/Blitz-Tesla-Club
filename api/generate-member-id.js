const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://www.blitztclub.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { membership_type } = req.body;
    const prefix = membership_type === 'vip' ? 'VIP' : 'BTC';
    
    // Get the latest member ID
    const { data: latestMember, error: queryError } = await supabase
      .from('profiles')
      .select('member_id')
      .like('member_id', `${prefix}%`)
      .order('member_id', { ascending: false })
      .limit(1);

    if (queryError) {
      console.error('Database query error:', queryError);
      return res.status(500).json({ 
        error: { 
          message: 'Failed to generate member ID',
          details: queryError.message
        } 
      });
    }

    let nextNumber = 1;
    if (latestMember && latestMember.length > 0) {
      const currentNumber = parseInt(latestMember[0].member_id.slice(3));
      nextNumber = currentNumber + 1;
    }

    const member_id = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    res.json({ member_id });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: {
        message: error.message || 'Internal server error',
        type: 'database_error'
      }
    });
  }
}; 