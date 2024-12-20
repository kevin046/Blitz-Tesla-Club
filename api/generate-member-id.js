export const config = {
  runtime: 'edge'
};

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://qhkcrrphsjpytdfqfamq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDMyNDg3OCwiZXhwIjoyMDQ5OTAwODc4fQ.A6ltvW5H0Hr8mnTAlesPHyCa6STI9IoSg9ZVgzsSzdw',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(req) {
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    const body = await req.json();
    console.log('Request body:', body);
    const { membership_type } = body;
    
    if (!membership_type) {
      return new Response(JSON.stringify({
        error: {
          message: 'membership_type is required'
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

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
      return new Response(JSON.stringify({
        error: {
          message: 'Failed to generate member ID',
          details: queryError.message
        }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log('Latest member:', latestMember);

    let nextNumber = 1;
    if (latestMember && latestMember.length > 0) {
      const currentNumber = parseInt(latestMember[0].member_id.slice(3));
      nextNumber = currentNumber + 1;
    }

    const member_id = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    console.log('Generated member_id:', member_id);
    return new Response(JSON.stringify({ member_id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error:', error);
    console.error('Stack trace:', error.stack);
    return new Response(JSON.stringify({
      error: {
        message: error.message || 'Internal server error',
        type: 'database_error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 