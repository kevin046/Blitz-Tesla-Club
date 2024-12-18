import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, fullName, username } = req.body;

        // Validate input
        if (!email || !password || !fullName || !username) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Initialize Supabase
        const supabaseUrl = 'https://qhkcrrphsjpytdfqfamq.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa2NycnBoc2pweXRkZnFmYW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMjQ4NzgsImV4cCI6MjA0OTkwMDg3OH0.S9JT_WmCWYMvSixRq1RrB1UlqXm6fix_riLFYCR3JOI';
        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        // Create auth user
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    username: username
                }
            }
        });

        if (authError) {
            console.error('Auth error:', authError);
            return res.status(400).json({ error: authError.message });
        }

        if (!authData || !authData.user) {
            console.error('No user data returned from auth signup');
            return res.status(400).json({ error: 'Failed to create user account' });
        }

        console.log('Auth user created:', authData.user);

        // Generate member ID
        const memberId = 'BTC' + Date.now().toString().slice(-6);

        // Create profile
        const profileData = {
            id: authData.user.id,
            full_name: fullName,
            username: username,
            email: email,
            member_id: memberId,
            membership_status: 'pending',
            membership_type: 'standard',
        };

        console.log('Creating profile with data:', profileData);

        // Wait for profile creation
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .upsert([profileData], {
                onConflict: 'id',
                returning: 'minimal'
            });

        if (profileError) {
            console.error('Profile creation error:', profileError);
            console.error('Profile data:', profileData);
            return res.status(400).json({ error: 'Database error saving new user' });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Update profile with verification token
        const { error: tokenError } = await supabaseClient
            .from('profiles')
            .update({ verification_token: verificationToken })
            .eq('id', authData.user.id);

        if (tokenError) {
            console.error('Token update error:', tokenError);
            return res.status(400).json({ error: tokenError.message });
        }

        // Send verification email using FormSubmit
        const verificationUrl = `https://www.blitztclub.com/verify-email?token=${verificationToken}`;
        const formData = new FormData();
        formData.append('email', email);
        formData.append('_captcha', 'false');
        formData.append('_template', 'box');
        formData.append('_subject', 'Verify Your Blitz Tesla Club Membership');
        formData.append('message', `Welcome to Blitz Tesla Club!

Your Member ID: ${memberId}

Please click the link below to verify your email and activate your membership:
${verificationUrl}

Next Steps:
1. Click the verification link above
2. Your membership will be activated instantly
3. Access your digital membership card
4. Start enjoying member benefits

If you didn't request this email, please ignore it.

Best regards,
Blitz Tesla Club Team`);

        const emailResponse = await fetch(`https://formsubmit.co/ajax/${email}`, {
            method: 'POST',
            body: formData
        });

        if (!emailResponse.ok) {
            console.error('Email sending error');
            return res.status(500).json({ error: 'Failed to send verification email' });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Registration successful. Please check your email to verify your account.' 
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 