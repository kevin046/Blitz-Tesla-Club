const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const app = express();
const path = require('path');
const cors = require('cors');

app.use(express.json());
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Supabase configuration
const supabaseUrl = 'https://qhkcrrphsjpytdfqfamq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMjQ4NzgsImV4cCI6MjA0OTkwMDg3OH0.S9JT_WmCWYMvSixRq1RrB1UlqXm6fix_riLFYCR3JOI';
const supabase = createClient(supabaseUrl, supabaseKey);

// Enable RLS policies for users table
const enableRLS = async () => {
    try {
        await supabase.rpc('enable_rls', { table_name: 'users' });
        console.log('Row Level Security enabled for users table');
    } catch (error) {
        console.error('Error enabling RLS:', error);
    }
};

enableRLS();

// Email configuration
const transporter = nodemailer.createTransport({
    host: 'smtp.privateemail.com',
    port: 143,
    secure: false,
    auth: {
        user: 'info@blitztclub.com',
        pass: 'yukimailbox99'
    }
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('members')
            .select('email')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Generate member ID
        const memberId = `BTC${Date.now().toString().slice(-6)}`;

        // Create new member in Supabase
        const { data: newMember, error: insertError } = await supabase
            .from('members')
            .insert([
                {
                    member_id: memberId,
                    full_name: fullName,
                    email: email,
                    password: hashedPassword,
                    verification_token: verificationToken,
                    verification_expires: verificationExpires,
                    verified: false,
                    membership_status: 'pending',
                    membership_type: 'standard'
                }
            ])
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            throw new Error('Failed to create account');
        }

        // Send verification email
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
                        <a href="http://localhost:3000/api/verify?token=${verificationToken}" 
                           style="background: #171a20; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p>http://localhost:3000/api/verify?token=${verificationToken}</p>
                    <p>This verification link will expire in 24 hours.</p>
                    <hr style="margin: 30px 0; border: 1px solid #eee;">
                    <p style="color: #666; font-size: 14px;">
                        If you didn't create this account, please ignore this email.
                    </p>
                </div>
            `
        });

        res.status(200).json({ 
            message: 'Registration successful! Please check your email to verify your account.',
            memberId: memberId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message || 'Registration failed' });
    }
});

// Verification endpoint
app.get('/api/verify', async (req, res) => {
    try {
        const { token } = req.query;

        // Find member with matching token that hasn't expired
        const { data: member, error } = await supabase
            .from('members')
            .select('*')
            .eq('verification_token', token)
            .gt('verification_expires', new Date().toISOString())
            .single();

        if (error || !member) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        // Update member verification status
        const { error: updateError } = await supabase
            .from('members')
            .update({
                verified: true,
                verification_token: null,
                verification_expires: null,
                membership_status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', member.id);

        if (updateError) {
            throw updateError;
        }

        // Redirect to verification success page
        res.redirect('/verification-success.html');

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Resend verification endpoint
app.post('/api/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        // Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user || user.verified) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Update user with new token
        const { error: updateError } = await supabase
            .from('users')
            .update({
                verification_token: verificationToken,
                verification_expires: verificationExpires,
                updated_at: new Date()
            })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }

        // Send new verification email
        const verificationLink = `http://blitztclub.com/verify?token=${verificationToken}`;
        await transporter.sendMail({
            from: 'info@blitztclub.com',
            to: email,
            subject: 'Verify your Blitz Tesla Club account',
            html: `
                <h1>Welcome to Blitz Tesla Club!</h1>
                <p>Hi ${user.full_name},</p>
                <p>Please click the button below to verify your email address:</p>
                <a href="${verificationLink}" style="
                    display: inline-block;
                    padding: 12px 24px;
                    background: #171a20;
                    color: white;
                    text-decoration: none;
                    border-radius: 4px;
                    margin: 16px 0;
                ">Verify Email</a>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p>${verificationLink}</p>
                <p>This verification link will expire in 24 hours.</p>
            `
        });

        res.status(200).json({ message: 'Verification email resent' });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        // Find member by email
        const { data: member, error } = await supabase
            .from('members')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !member) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if member is verified
        if (!member.verified) {
            return res.status(401).json({ error: 'Please verify your email before logging in' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, member.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: member.id,
                memberId: member.member_id,
                email: member.email,
                fullName: member.full_name,
                membershipType: member.membership_type,
                membershipStatus: member.membership_status
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: rememberMe ? '30d' : '24h' }
        );

        // Update last login
        await supabase
            .from('members')
            .update({ 
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', member.id);

        // Log login activity
        await supabase
            .from('member_activity')
            .insert([{
                member_id: member.id,
                activity_type: 'login',
                details: {
                    timestamp: new Date().toISOString(),
                    ip: req.ip
                }
            }]);

        res.status(200).json({
            token,
            user: {
                id: member.id,
                memberId: member.member_id,
                email: member.email,
                fullName: member.full_name,
                membershipType: member.membership_type,
                membershipStatus: member.membership_status,
                profileImage: member.profile_image
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Protected dashboard data endpoint
app.get('/api/dashboard/data', authenticateToken, async (req, res) => {
    try {
        // Get upcoming events
        const { data: events } = await supabase
            .from('events')
            .select('*')
            .gt('event_date', new Date().toISOString())
            .order('event_date', { ascending: true })
            .limit(3);

        // Get recent activity
        const { data: activities } = await supabase
            .from('member_activity')
            .select('*')
            .eq('member_id', req.user.userId)
            .order('activity_date', { ascending: false })
            .limit(5);

        // Get member details
        const { data: memberDetails } = await supabase
            .from('members')
            .select('*')
            .eq('id', req.user.userId)
            .single();

        res.json({
            events,
            activities,
            memberDetails
        });

    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
});

// Add this middleware function
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.redirect('/login');
    }
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = verified;
        next();
    } catch (error) {
        res.redirect('/login');
    }
};

// Protect dashboard route
app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 