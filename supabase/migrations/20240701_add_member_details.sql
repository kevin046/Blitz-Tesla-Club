-- Add new member details columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS car_models TEXT[];

-- Create index for phone number search (useful for admin purposes)
CREATE INDEX IF NOT EXISTS profiles_phone_number_idx ON public.profiles (phone_number);

-- Update RLS policies to ensure these new fields are protected
DROP POLICY IF EXISTS "Users can select their own profile with personal details" ON profiles;
CREATE POLICY "Users can select their own profile with personal details" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

COMMENT ON COLUMN public.profiles.phone_number IS 'Member phone number in format (xxx)-xxx-xxxx';
COMMENT ON COLUMN public.profiles.date_of_birth IS 'Member date of birth for birthday surprises';
COMMENT ON COLUMN public.profiles.address IS 'Member home address';
COMMENT ON COLUMN public.profiles.car_models IS 'Array of Tesla models owned by the member'; 