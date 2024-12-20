const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://www.blitztclub.com', 'https://blitztclub.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Pre-flight requests
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.static('.'));

// Get Supabase credentials from environment variables
const SUPABASE_URL = 'https://qhkcrrphsjpytdfqfamq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDMyNDg3OCwiZXhwIjoyMDQ5OTAwODc4fQ.A6ltvW5H0Hr8mnTAlesPHyCa6STI9IoSg9ZVgzsSzdw';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Test connection function
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', {
        error: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }
    console.log('Test query result:', data);
    return true;
  } catch (error) {
    console.error('Connection test failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

// Verify Supabase connection
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    res.json({ 
      status: 'connected',
      supabaseUrl: process.env.SUPABASE_URL,
      keyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Supabase connection failed',
      details: error.message
    });
  }
});

// Handle generate-member-id endpoint
app.post('/api/generate-member-id', async (req, res) => {
  try {
    // Enable CORS for localhost
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const { membership_type } = req.body;
    if (!membership_type) {
      return res.status(400).json({ 
        error: { message: 'Membership type is required' }
      });
    }

    // Get the latest member ID
    const { data: latestMember, error: queryError } = await supabase
      .from('profiles')
      .select('member_id')
      .like('member_id', 'BTC%')
      .order('member_id', { ascending: false })
      .limit(1);

    if (queryError) {
      console.error('Database query error:', queryError);
      return res.status(500).json({ 
        error: { message: 'Failed to generate member ID' }
      });
    }

    let nextNumber = 1;
    if (latestMember && latestMember.length > 0) {
      const currentNumber = parseInt(latestMember[0].member_id.slice(3));
      nextNumber = currentNumber + 1;
    }

    const member_id = `BTC${String(nextNumber).padStart(3, '0')}`;
    res.json({ member_id });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: { message: 'Internal server error' }
    });
  }
});

// Handle cleanup of orphaned users
app.post('/api/cleanup-orphaned-users', async (req, res) => {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !user) {
      return res.json({ message: 'User not found' });
    }

    // Delete profile first
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user_id);

    if (profileError) {
      if (profileError.code === '23503') { // Foreign key violation
        return res.json({ message: 'Profile already deleted' });
      }
      console.error('Profile deletion error:', profileError);
      throw profileError;
    }

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id);

    if (authError) {
      if (authError.message.includes('not found')) {
        return res.json({ message: 'User already deleted' });
      }
      console.error('Auth deletion error:', authError);
      throw authError;
    }

    res.json({ message: 'User cleaned up successfully' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle profile creation
app.post('/api/create-profile', async (req, res) => {
  try {
    const { user_id, email, full_name, member_id, verification_token } = req.body;

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
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
      if (profileError.code === '23505') { // Unique constraint violation
        return res.json({ message: 'Profile already exists' });
      }
      console.error('Profile creation error:', profileError);
      throw profileError;
    }

    res.json({ message: 'Profile created successfully' });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Test route to check environment variables
app.get('/api/test-env', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Not set',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
    nodeEnv: process.env.NODE_ENV || 'Not set'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test Supabase connection on startup
  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    console.log('Successfully connected to Supabase');
  } else {
    console.error('Failed to connect to Supabase');
    console.error('Please check your environment variables');
    console.error('Server started but database connection failed');
  }
}); 