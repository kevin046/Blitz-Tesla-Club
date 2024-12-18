create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text,
    username text unique,
    email text unique,
    member_id text unique,
    membership_status text default 'pending',
    membership_type text default 'standard',
    verification_token text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Set up Row Level Security (RLS)
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

-- Create indexes
create index profiles_username_idx on profiles (username);
create index profiles_email_idx on profiles (email);
create index profiles_member_id_idx on profiles (member_id);
create index profiles_verification_token_idx on profiles (verification_token);