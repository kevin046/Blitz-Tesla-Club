import { createClient } from '@supabase/supabase-js';
import { verifyEmail } from '../routes/auth';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { token } = req.query;

            if (!token) {
                console.error('No token provided');
                return res.redirect('/verification-failed.html');
            }

            const result = await verifyEmail(token);

            if (!result.success) {
                console.error('Verification failed:', result.error);
                return res.redirect('/verification-failed.html');
            }

            console.log('Successfully verified profile:', result.profile.id);
            return res.redirect('/verification-success.html?verified=true&id=' + result.profile.id);

        } catch (error) {
            console.error('Verification error:', error);
            return res.redirect('/verification-failed.html');
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
} 