export default function handler(req, res) {
    // Check if it's a cron job request
    const isCron = req.headers['x-vercel-cron'] === '1';
    
    if (!isCron) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Your cron job logic here
        console.log('Cron job running at:', new Date().toISOString());
        
        // Add your email sending or other scheduled tasks here
        
        res.status(200).json({ 
            success: true, 
            message: 'Cron job executed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Cron job error:', error);
        res.status(500).json({ error: error.message });
    }
} 