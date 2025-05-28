-- Drop existing schema if it exists
DROP SCHEMA IF EXISTS auth CASCADE;

-- Create auth schema
CREATE SCHEMA auth;

-- Create necessary enums
CREATE TYPE auth.code_challenge_method AS ENUM ('s256', 'plain');
CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn');
CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');

-- Create users table
CREATE TABLE auth.users (
    instance_id uuid,
    id uuid PRIMARY KEY,
    aud character varying(255),
    role character varying(255),
    email character varying(255) UNIQUE,
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    phone character varying(255),
    phone_confirmed_at timestamp with time zone,
    phone_change character varying(255),
    phone_change_token character varying(255),
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    email_change_token_current character varying(255),
    email_change_confirm_status smallint,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255),
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);

-- Create sessions table
CREATE TABLE auth.sessions (
    id uuid NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    factor_id uuid,
    aal character varying(255),
    not_after timestamp with time zone
);

-- Create refresh tokens table
CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigserial PRIMARY KEY,
    token character varying(255) UNIQUE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    revoked boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent character varying(255),
    session_id uuid REFERENCES auth.sessions(id) ON DELETE CASCADE
);

-- Create instances table
CREATE TABLE auth.instances (
    id uuid NOT NULL PRIMARY KEY,
    uuid uuid UNIQUE,
    raw_base_config text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create schema migrations table
CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL PRIMARY KEY
);

-- Add indexes
CREATE INDEX users_instance_id_idx ON auth.users(instance_id);
CREATE INDEX users_email_idx ON auth.users(email);
CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens(instance_id);
CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens(instance_id, user_id);
CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens(parent);
CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens(session_id, revoked);
CREATE INDEX refresh_tokens_token_idx ON auth.refresh_tokens(token);

-- Grant permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres, service_role;

GRANT USAGE ON SCHEMA auth TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO postgres, service_role;

-- Grant specific permissions for auth tables
GRANT SELECT, INSERT, UPDATE ON auth.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON auth.sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON auth.refresh_tokens TO anon, authenticated;

-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own data" ON auth.users
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update their own data" ON auth.users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Allow anonymous sign up" ON auth.users
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Users can view their own sessions" ON auth.sessions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own sessions" ON auth.sessions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view their own refresh tokens" ON auth.refresh_tokens
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own refresh tokens" ON auth.refresh_tokens
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- Initialize instance
INSERT INTO auth.instances (id, uuid, raw_base_config)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    '{"site_url":"http://localhost:3000","jwt_exp":3600,"jwt_aud":"authenticated","hooks":{},"external":{"provider":"","enabled":false}}'
);

-- Add initial schema version
INSERT INTO auth.schema_migrations (version) VALUES ('20240101000000');
  