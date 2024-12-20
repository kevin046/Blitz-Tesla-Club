-- Drop existing constraint and index if they exist
alter table public.profiles
drop constraint if exists profiles_username_key;

drop index if exists profiles_username_idx;

-- Add case-insensitive unique constraint to username
alter table public.profiles
add constraint profiles_username_key unique (lower(username));

-- Create case-insensitive index for username lookups
create index profiles_username_idx
on public.profiles (lower(username));

-- Add trigger to enforce case-insensitive uniqueness
create or replace function public.check_username_case_insensitive()
returns trigger as $$
begin
    if exists (
        select 1 from public.profiles
        where lower(username) = lower(new.username)
        and id != new.id
    ) then
        raise exception 'Username already exists (case-insensitive)';
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_username_case_insensitive on public.profiles;

create trigger enforce_username_case_insensitive
before insert or update on public.profiles
for each row
execute function public.check_username_case_insensitive(); 