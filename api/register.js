const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase with service role key
const supabase = createClient(
    'https://qhkcrrphsjpytdfqfamq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDMyNDg3OCwiZXhwIjoyMDQ5OTAwODc4fQ.A6ltvW5H0Hr8mnTAlesPHyCa6STI9IoSg9ZVgzsSzdw'
);

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, fullName, memberId } = req.body;

        // Validate input
        if (!email || !password || !fullName || !memberId) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Step 1: Create auth user with admin API
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                member_id: memberId
            }
        });

        if (authError) {
            console.error('Auth error:', authError);
            return res.status(400).json({ error: authError.message });
        }

        // Step 2: Create profile
        const verificationToken = crypto.randomUUID();
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                email: email,
                full_name: fullName,
                member_id: memberId,
                membership_status: 'pending',
                membership_type: 'standard',
                created_at: new Date().toISOString(),
                verification_token: verificationToken
            });

        if (profileError) {
            console.error('Profile error:', profileError);
            // Try to clean up the auth user if profile creation fails
            await supabase.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({ error: 'Failed to create profile' });
        }

        // Step 3: Send verification email
        const verificationUrl = `${req.headers.origin}/verify-email.html?token=${verificationToken}`;
        const formData = {
            email: email,
            _captcha: 'false',
            _template: 'box',
            _subject: 'Verify Your Blitz Tesla Club Membership',
            _replyto: email,
            message: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <img src="https://i.postimg.cc/BvmtNLtB/logo.png" alt="Blitz Tesla Club Logo" style="width: 150px; margin: 20px auto; display: block;">
                    <h1 style="color: #171a20; text-align: center;">Welcome to Blitz Tesla Club!</h1>
                    <p style="text-align: center; color: #666;">Thank you for joining Blitz Tesla Club!</p>
                    <p style="text-align: center; margin: 20px 0;">
                        <strong>Your Member ID:</strong> ${memberId}
                    </p>
                    <p style="text-align: center; color: #666;">Please verify your email address to activate your membership:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background: #171a20; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px; text-align: center;">
                        If you can't click the button, copy and paste this URL into your browser:
                        <br>
                        <span style="color: #171a20;">${verificationUrl}</span>
                    </p>
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 14px;">
                            This email was sent by Blitz Tesla Club
                            <br>
                            If you didn't register for an account, please ignore this email.
                        </p>
                    </div>
                </div>
            `
        };

        const emailResponse = await fetch('https://formsubmit.co/ajax/info@blitztclub.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (!emailResponse.ok) {
            console.error('Failed to send verification email:', await emailResponse.text());
            return res.status(500).json({ error: 'Failed to send verification email' });
        }

        // Success
        res.status(200).json({
            message: 'Registration successful',
            user: {
                id: authData.user.id,
                email: email,
                memberId: memberId
            }
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 