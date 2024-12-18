import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Set CORS headers for all requests
    res.setHeader('Access-Control-Allow-Origin', 'http://192.168.2.86:8080');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Handle actual request
    if (req.method === 'POST') {
        try {
            const { userId, email } = req.body;

            // Initialize Supabase client
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_KEY;
            const supabaseClient = createClient(supabaseUrl, supabaseKey);

            // Generate new verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');

            // Update verification token in profile
            const { error: updateError } = await supabaseClient
                .from('profiles')
                .update({ verification_token: verificationToken })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Get user's profile data
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            // Send verification email
            const baseUrl = process.env.NODE_ENV === 'production' 
                ? 'https://www.blitztclub.com' 
                : 'http://192.168.2.86:8080';
            const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

            const formData = new URLSearchParams();
            formData.append('email', email);
            formData.append('_captcha', 'false');
            formData.append('_template', 'box');
            formData.append('_replyto', email);
            formData.append('_from', 'Blitz Tesla Club <info@blitztclub.com>');
            formData.append('_autoresponse', `Thank you for joining Blitz Tesla Club! Your Member ID is ${profile.member_id}. Please click the verification button to activate your membership.`);
            formData.append('_subject', 'Verify Your Blitz Tesla Club Membership');
            formData.append('_next', verificationUrl);
            formData.append('message', `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <img src="https://i.postimg.cc/BvmtNLtB/logo.png" alt="Blitz Tesla Club Logo" style="width: 150px; margin: 20px auto; display: block;">
                    <h1 style="color: #171a20; text-align: center;">Verify Your Email</h1>
                    <p>Please verify your email to activate your Blitz Tesla Club membership.</p>
                    <p style="text-align: center; margin: 30px 0;">
                        Click the button below to verify your email address and activate your membership.
                    </p>
                    <p style="text-align: center; color: #171a20;">
                        <strong>Member ID:</strong> ${profile.member_id}
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        If you didn't request this email, please ignore it.
                    </p>
                </div>
            `);

            // Send email using FormSubmit
            const response = await fetch('https://formsubmit.co/info@blitztclub.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to send verification email');
            }

            res.status(200).json({ 
                success: true,
                message: 'Verification email resent successfully' 
            });
        } catch (error) {
            console.error('Resend verification error:', error);
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
} 