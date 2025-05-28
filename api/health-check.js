export default async function handler(req, res) {
    // Set CORS headers
    const allowedOrigins = [
        'https://www.blitztclub.com',
        'https://blitztclub.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ];

    const origin = req.headers.origin;
    const isLocalDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isLocalDevelopment) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', 'https://www.blitztclub.com');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        return res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        console.error('Health check error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
} 