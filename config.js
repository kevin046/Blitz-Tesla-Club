const SUPABASE_URL = 'https://rlvqmzsvmkypfzqkjqld.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsdnFtenN2bWt5cGZ6cWtqcWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5NTM1MzAsImV4cCI6MjAxODUyOTUzMH0.Nh83ebqzb2xoMgKTSKVOcZgF9kHoE2GJ5CTj_rG-TFc';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 