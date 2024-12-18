import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://www.blitztclub.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
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

            // Initialize email transporter
            const transporter = nodemailer.createTransport({
                host: 'smtp.privateemail.com',
                port: 465,
                secure: true,
                auth: {
                    user: 'info@blitztclub.com',
                    pass: process.env.EMAIL_PASSWORD
                }
            });

            // Send verification email
            const verificationUrl = `https://www.blitztclub.com/verify-email?token=${verificationToken}`;
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