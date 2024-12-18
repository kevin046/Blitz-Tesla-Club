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

-- Create profiles table
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text,
    username text unique,
    email text unique,
    member_id text unique,
    membership_status text default 'pending',
    membership_type text default 'standard',
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone"
    on profiles for select
    using ( true );

create policy "Users can insert their own profile"
    on profiles for insert
    with check ( auth.uid() = id );

create policy "Users can update own profile"
    on profiles for update
    using ( auth.uid() = id );

-- Create trigger function for new users
create function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name');
    return new;
end;
$$ language plpgsql security definer;

-- Create trigger
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user(); 