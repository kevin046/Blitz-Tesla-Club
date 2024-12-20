module.exports = async (req, res) => {
  res.json({
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_KEY
    },
    headers: req.headers,
    method: req.method,
    url: req.url
  });
}; 