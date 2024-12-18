const express = require('express');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(cors());

// Get absolute path to project directory
const PROJECT_ROOT = path.resolve(__dirname);

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

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
    port: 465,  // Use 465 for secure SSL/TLS
    secure: true,
    auth: {
        user: 'info@blitztclub.com',
        pass: 'your_email_password'
    }
});

// Supabase configuration
const supabaseUrl = 'https://qhkcrrphsjpytdfqfamq.supabase.co';
const supabaseKey = 'your_supabase_key';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, fullName, username } = req.body;

        // Register with Supabase without email confirmation
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { 
                    full_name: fullName, 
                    username,
                    member_id: `BTC${Date.now().toString().slice(-6)}`,
                    membership_status: 'pending',
                    membership_type: 'standard'
                },
                emailRedirectTo: 'http://localhost:3000/verify-email'
            }
        });

        if (error) throw error;
        if (!data.user) throw new Error('Registration failed');

        // Send verification email
        const verificationUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;
        await transporter.sendMail({
            from: 'info@blitztclub.com',
            to: email,
            subject: 'Welcome to Blitz Tesla Club - Verify Your Email',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <img src="https://i.postimg.cc/BvmtNLtB/logo.png" alt="Blitz Tesla Club Logo" style="width: 150px; margin: 20px auto; display: block;">
                    <h1 style="color: #171a20; text-align: center;">Welcome to Blitz Tesla Club!</h1>
                    <p>Hi ${fullName},</p>
                    <p>Thank you for joining Blitz Tesla Club! We're excited to have you as a member.</p>
                    <p>Your Member ID is: <strong>${memberId}</strong></p>
                    <p>Please verify your email address by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background: #171a20; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p>${verificationUrl}</p>
                    <p>This verification link will expire in 24 hours.</p>
                    <hr style="margin: 30px 0; border: 1px solid #eee;">
                    <p style="color: #666; font-size: 14px;">
                        If you didn't create this account, please ignore this email.
                    </p>
                </div>
            `
        });

        res.json({ 
            message: 'Registration successful! Please check your email to verify your account.',
            memberId 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Email verification endpoint
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});