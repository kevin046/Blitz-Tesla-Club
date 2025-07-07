const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// ZeptoMail configuration
const ZEPTO_API_URL = 'https://api.zeptomail.com/v1.1/email';
const ZEPTO_TOKEN = 'Zoho-enczapikey wSsVR61zrx/5C/wulWb5cr8/m1pTDlOkQEV03FH0v3eoS/yXp8c6kUWdUAemT6QZFTI/FTRHp+5/m01ThjAIjNp8zVsBDiiF9mqRe1U4J3x17qnvhDzKW2VelhaKKoMBxQ5tnmVhGswl+g==';
const ZEPTO_MAIL_AGENT_ALIAS = '243a7da32b365398';
const ZEPTO_TEMPLATE_KEY = '2d6f.237914bc765f2517.k1.243d0f00-5a20-11f0-9e2f-86f7e6aa0425.197ddf423f0';

// Send email endpoint using ZeptoMail
router.post('/send-email', async (req, res) => {
    try {
        const { to, subject, html } = req.body;

        console.log('Received email request:', { to, subject, htmlLength: html?.length });

        if (!to || !subject || !html) {
            return res.status(400).json({ 
                error: 'Missing required fields: to, subject, html' 
            });
        }

        // ZeptoMail API request
        const emailData = {
            from: {
                address: 'info@blitztclub.com',
                name: 'Blitz Tesla Club'
            },
            to: [
                {
                    email_address: {
                        address: to,
                        name: to.split('@')[0] // Use email prefix as name
                    }
                }
            ],
            subject: subject,
            htmlbody: html
        };

        console.log('Sending to ZeptoMail API:', JSON.stringify(emailData, null, 2));

        const response = await axios.post(ZEPTO_API_URL, emailData, {
            headers: {
                'Authorization': ZEPTO_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        console.log('Email sent successfully via ZeptoMail:', response.data);
        res.json({ 
            success: true, 
            messageId: response.data?.data?.tracking_id || 'sent',
            message: 'Email sent successfully via ZeptoMail' 
        });

    } catch (error) {
        console.error('Error sending email via ZeptoMail:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        console.error('Error headers:', error.response?.headers);
        
        res.status(500).json({ 
            error: 'Failed to send email via ZeptoMail',
            details: error.response?.data || error.message,
            status: error.response?.status
        });
    }
});

// Test endpoint for debugging
router.get('/test-email', async (req, res) => {
    try {
        const testEmailData = {
            from: {
                address: 'info@blitztclub.com',
                name: 'Blitz Tesla Club'
            },
            to: [
                {
                    email_address: {
                        address: 'test@example.com',
                        name: 'Test User'
                    }
                }
            ],
            subject: 'Test Email from ZeptoMail',
            htmlbody: '<h1>Test Email</h1><p>This is a test email from ZeptoMail API.</p>'
        };

        console.log('Testing ZeptoMail API with data:', JSON.stringify(testEmailData, null, 2));

        const response = await axios.post(ZEPTO_API_URL, testEmailData, {
            headers: {
                'Authorization': ZEPTO_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        console.log('Test email sent successfully:', response.data);
        res.json({ 
            success: true, 
            message: 'Test email sent successfully',
            data: response.data
        });

    } catch (error) {
        console.error('Test email error:', error);
        console.error('Error response:', error.response?.data);
        res.status(500).json({ 
            error: 'Test email failed',
            details: error.response?.data || error.message,
            status: error.response?.status
        });
    }
});

module.exports = router; 