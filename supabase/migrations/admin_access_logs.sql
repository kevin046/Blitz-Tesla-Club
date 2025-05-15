-- Create admin_access_logs table if it doesn't exist
CREATE OR REPLACE FUNCTION create_admin_logs_table()
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'admin_access_logs'
    ) THEN
        CREATE TABLE public.admin_access_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            email TEXT NOT NULL,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
            successful BOOLEAN NOT NULL DEFAULT false,
            ip_address TEXT,
            user_agent TEXT,
            details JSONB
        );

        -- Add indexes
        CREATE INDEX idx_admin_logs_user_id ON public.admin_access_logs(user_id);
        CREATE INDEX idx_admin_logs_successful ON public.admin_access_logs(successful);
        CREATE INDEX idx_admin_logs_timestamp ON public.admin_access_logs(timestamp);
        
        -- Set up RLS
        ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;
        
        -- Only allow admin users to select from this table
        CREATE POLICY "Admin users can view access logs" 
        ON public.admin_access_logs
        FOR SELECT 
        USING (
            auth.uid() IN (
                SELECT id FROM public.profiles 
                WHERE role = 'admin' AND membership_status = 'active'
            )
        );
        
        -- Anyone can insert into this table (for logging purposes)
        CREATE POLICY "All users can insert access logs"
        ON public.admin_access_logs
        FOR INSERT
        WITH CHECK (true);
        
        -- Only the same user can update their own records
        CREATE POLICY "Admin users can update their own logs"
        ON public.admin_access_logs
        FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
        -- Only admin users can delete logs
        CREATE POLICY "Admin users can delete logs"
        ON public.admin_access_logs
        FOR DELETE
        USING (
            auth.uid() IN (
                SELECT id FROM public.profiles
                WHERE role = 'admin' AND membership_status = 'active'
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 