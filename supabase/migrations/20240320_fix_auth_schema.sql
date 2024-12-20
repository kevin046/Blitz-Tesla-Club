-- Drop existing policies and triggers first
drop policy if exists "Users can update own user data" on auth.users;
drop policy if exists "Service role can manage users" on auth.users;
drop trigger if exists on_profile_update on public.profiles;
drop function if exists public.handle_user_update();

-- Enable RLS
alter table auth.users enable row level security;

-- Create policy for users to update their own data
create policy "Users can update own user data"
    on auth.users
    for all using (
        auth.uid() = id
    );

-- Create policy for service role to manage users
create policy "Service role can manage users"
    on auth.users
    for all using (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- Add trigger to sync user data
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (
        id,
        email,
        full_name,
        member_id,
        membership_type,
        membership_status,
        created_at
    )
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'member_id',
        coalesce(new.raw_user_meta_data->>'membership_type', 'standard'),
        coalesce(new.raw_user_meta_data->>'membership_status', 'pending'),
        now()
    );
    return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new users
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute procedure public.handle_new_user();

-- Grant necessary permissions
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;