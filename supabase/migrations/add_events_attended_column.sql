-- Add events_attended column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS events_attended INTEGER DEFAULT 0;

-- Comment on the column to document its purpose
COMMENT ON COLUMN public.profiles.events_attended IS 'Count of events the member has attended';

-- Create an index for faster queries involving the events_attended column
CREATE INDEX IF NOT EXISTS idx_profiles_events_attended ON public.profiles(events_attended); 