const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Proxy API requests
app.use('/api', createProxyMiddleware({
    target: 'https://blitz-tesla-club-cyan.vercel.app',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '/api'
    }
}));

// Handle all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, req.path));
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Dev server running at http://localhost:${PORT}`);
}); 