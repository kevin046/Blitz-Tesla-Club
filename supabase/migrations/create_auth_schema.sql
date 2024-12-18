-- Create auth schema if it doesn't exist
create schema if not exists auth;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop existing objects
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists profiles;

-- Create profiles table (if not exists)
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text,
    username text unique,
    email text unique,
    member_id text unique,
    membership_status text default 'pending',
    membership_type text default 'standard',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    verification_token text
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Enable insert for authenticated users only"
    on profiles for insert
    to authenticated, anon
    with check (true);

create policy "Enable select for authenticated users only"
    on profiles for select
    to authenticated, anon
    using (true);

create policy "Enable update for users based on id"
    on profiles for update
    to authenticated
    using (auth.uid() = id);

-- Create trigger for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
    -- Only create profile if it doesn't exist
    if not exists (select 1 from public.profiles where id = new.id) then
        insert into public.profiles (
            id,
            email,
            full_name,
            username,
            member_id,
            membership_status,
            membership_type
        )
        values (
            new.id,
            new.email,
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'username',
            new.raw_user_meta_data->>'member_id',
            coalesce(new.raw_user_meta_data->>'membership_status', 'pending'),
            coalesce(new.raw_user_meta_data->>'membership_type', 'standard')
        );
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Create trigger
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Grant permissions
grant usage on schema public to anon, authenticated;
grant all on public.profiles to anon, authenticated;
  