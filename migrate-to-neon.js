const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Neon configuration
const neonPool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrateData() {
    try {
        console.log('Starting migration...');

        // Get all users from Supabase
        const { data: users, error: userError } = await supabase.auth.admin.listUsers();
        if (userError) throw userError;

        console.log(`Found ${users.length} users to migrate`);

        // Connect to Neon
        const neonClient = await neonPool.connect();

        for (const user of users) {
            // Begin transaction
            await neonClient.query('BEGIN');

            try {
                // Insert user
                const userResult = await neonClient.query(
                    'INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                    [
                        user.id,
                        user.email,
                        user.encrypted_password || await bcrypt.hash(user.password || 'MIGRATED_USER', 10),
                        user.created_at,
                        user.updated_at || new Date()
                    ]
                );

                // Get profile data from Supabase
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileError) throw profileError;

                // Insert profile
                if (profile) {
                    await neonClient.query(
                        `INSERT INTO profiles (
                            id, username, full_name, avatar_url, member_id, 
                            email, phone, membership_status, membership_type,
                            verification_token, token_expires_at, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                        [
                            profile.id,
                            profile.username,
                            profile.full_name,
                            profile.avatar_url,
                            profile.member_id,
                            profile.email,
                            profile.phone,
                            profile.membership_status,
                            profile.membership_type,
                            profile.verification_token,
                            profile.token_expires_at,
                            profile.created_at || new Date(),
                            profile.updated_at || new Date()
                        ]
                    );
                }

                // Commit transaction
                await neonClient.query('COMMIT');
                console.log(`Migrated user: ${user.email}`);
            } catch (error) {
                // Rollback on error
                await neonClient.query('ROLLBACK');
                console.error(`Error migrating user ${user.email}:`, error);
            }
        }

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await neonPool.end();
    }
}

migrateData(); 