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

  try {
    const { user_id, email, full_name, member_id, verification_token } = req.body;

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();

    if (existingProfile) {
      return res.json({ message: 'Profile already exists' });
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: user_id,
        email: email,
        full_name: full_name,
        member_id: member_id,
        membership_type: 'standard',
        membership_status: 'pending',
        created_at: new Date().toISOString(),
        verification_token: verification_token
      }]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw profileError;
    }

    res.json({ message: 'Profile created successfully' });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: error.message });
  }
}; 