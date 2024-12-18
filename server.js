const express = require('express');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());

// CORS middleware for Vercel
const corsMiddleware = (req, res, next) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://www.blitztclub.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    next();
};

// Apply CORS middleware to all routes
app.use(corsMiddleware);

// Get absolute path to project directory
const PROJECT_ROOT = path.resolve(__dirname);

// Serve static files with proper MIME types
app.use(express.static(PROJECT_ROOT, {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'dashboard.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'register.html'));
});

// Email configuration
const transporter = nodemailer.createTransport({
    host: 'smtp.privateemail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'info@blitztclub.com',
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Test email connection
transporter.verify(function(error, success) {
    if (error) {
        console.log('Email server error:', error);
    } else {
        console.log("Email server is ready to send messages");
    }
});

// Supabase configuration
const supabaseUrl = 'https://qhkcrrphsjpytdfqfamq.supabase.co';
const supabaseKey = 'your_supabase_key';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Add this function to generate member IDs
async function generateMemberId(membershipType) {
    try {
        // Get the latest member ID for the given type
        const prefix = membershipType === 'premium' ? 'VIP-' : 'REG-';
        
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('member_id')
            .like('member_id', `${prefix}%`)
            .order('member_id', { ascending: false })
            .limit(1);

        if (error) throw error;

        let nextNumber = 1;
        if (data && data.length > 0) {
            // Extract the number from the latest ID and increment
            const latestId = data[0].member_id;
            const currentNumber = parseInt(latestId.split('-')[1]);
            nextNumber = currentNumber + 1;
        }

        // Format the new ID with padding zeros
        return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
        console.error('Error generating member ID:', error);
        throw error;
    }
}

// Add verification token generation
const generateVerificationToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, fullName, username } = req.body;
        const verificationToken = generateVerificationToken();

        // Register with Supabase
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { 
                    full_name: fullName, 
                    username,
                    membership_status: 'pending',
                    membership_type: 'regular',
                    verification_token: verificationToken
                }
            }
        });

        if (error) throw error;
        if (!data.user) throw new Error('Registration failed');

        // Create profile
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert([{
                id: data.user.id,
                email: email,
                username: username,
                full_name: fullName,
                membership_status: 'pending',
                membership_type: 'regular',
                verification_token: verificationToken
            }]);

        if (profileError) throw profileError;

        // Send verification email
        const verificationUrl = `https://blitz-tesla-club.vercel.app/verify-email?token=${verificationToken}`;
        await transporter.sendMail({
            from: 'info@blitztclub.com',
            to: email,
            subject: 'Verify Your Blitz Tesla Club Membership',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <img src="https://i.postimg.cc/BvmtNLtB/logo.png" alt="Blitz Tesla Club Logo" style="width: 150px; margin: 20px auto; display: block;">
                    <h1 style="color: #171a20; text-align: center;">Welcome to Blitz Tesla Club!</h1>
                    <p>Hi ${fullName},</p>
                    <p>Thank you for joining Blitz Tesla Club! Please verify your email to activate your membership.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background: #171a20; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        If you didn't create this account, please ignore this email.
                    </p>
                </div>
            `
        });

        res.json({ 
            message: 'Registration successful! Please check your email to verify your account.',
            userId: data.user.id 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add verification endpoint
app.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        // Find user by verification token
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('verification_token', token)
            .single();

        if (error || !profile) {
            return res.redirect('/verification-failed.html');
        }

        // Update profile status
        await supabaseClient
            .from('profiles')
            .update({ 
                membership_status: 'active',
                verification_token: null 
            })
            .eq('id', profile.id);

        res.redirect('/verification-success.html');

    } catch (error) {
        console.error('Verification error:', error);
        res.redirect('/verification-failed.html');
    }
});

// Admin endpoint to upgrade member to premium
app.post('/api/admin/upgrade-member', async (req, res) => {
    try {
        const { userId, adminKey, specificMemberId } = req.body;

        // Verify admin key
        if (adminKey !== process.env.ADMIN_KEY) {
            throw new Error('Unauthorized');
        }

        // Get current member details
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        // Generate or use specific member ID
        const newMemberId = specificMemberId || await generateMemberId('premium');

        // Update profile to premium
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ 
                membership_type: 'premium',
                member_id: newMemberId,
                username: 'kevinlin' // Only for this specific case
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // Send premium membership confirmation email
        await transporter.sendMail({
            from: 'info@blitztclub.com',
            to: profile.email,
            subject: 'Welcome to Blitz Tesla Club Premium Membership!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <img src="https://i.postimg.cc/BvmtNLtB/logo.png" alt="Blitz Tesla Club Logo" style="width: 150px; margin: 20px auto; display: block;">
                    <h1 style="color: #171a20; text-align: center;">Welcome to Premium Membership!</h1>
                    <p>Hi ${profile.full_name},</p>
                    <p>Congratulations! Your membership has been upgraded to Premium status.</p>
                    <p>Your new VIP Member ID is: <strong>${newMemberId}</strong></p>
                    <p>Enjoy your exclusive premium benefits!</p>
                </div>
            `
        });

        res.json({ 
            message: 'Member upgraded to premium successfully',
            newMemberId 
        });

    } catch (error) {
        console.error('Upgrade error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add resend verification endpoint
app.post('/api/resend-verification', async (req, res) => {
    try {
        const { userId, email } = req.body;
        const verificationToken = generateVerificationToken();

        // Update verification token in profile
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ verification_token: verificationToken })
            .eq('id', userId);

        if (updateError) throw updateError;

        // Send verification email
        const verificationUrl = `https://blitz-tesla-club.vercel.app/verify-email?token=${verificationToken}`;
        await transporter.sendMail({
            from: 'info@blitztclub.com',
            to: email,
            subject: 'Verify Your Blitz Tesla Club Membership',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <img src="https://i.postimg.cc/BvmtNLtB/logo.png" alt="Blitz Tesla Club Logo" style="width: 150px; margin: 20px auto; display: block;">
                    <h1 style="color: #171a20; text-align: center;">Verify Your Email</h1>
                    <p>Please verify your email to activate your Blitz Tesla Club membership.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background: #171a20; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        If you didn't request this email, please ignore it.
                    </p>
                </div>
            `
        });

        res.json({ message: 'Verification email resent successfully' });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add test endpoint for email
app.get('/test-email', async (req, res) => {
    try {
        await transporter.sendMail({
            from: 'info@blitztclub.com',
            to: 'info@blitztclub.com', // Send to self for testing
            subject: 'Test Email Connection',
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h1>Test Email</h1>
                    <p>This is a test email to verify the email server connection.</p>
                    <p>Time sent: ${new Date().toLocaleString()}</p>
                </div>
            `
        });
        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Email test error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});