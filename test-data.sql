INSERT INTO public.profiles (id, username, full_name, membership_status)
VALUES (
    '31f25dda-d747-412d-94c8-d49021f7bfc4',  -- Your user ID
    'linkevin046',
    'Kevin Lin',
    'active'
);

INSERT INTO public.events (id, title, event_date, location)
VALUES (
    'a1b2c3d4-1234-5678-9012-abcdef123456',
    'Tesla Light Show Meetup',
    '2024-03-20 18:00:00+00',
    'Toronto Tesla Supercharger'
);

INSERT INTO public.user_events (user_id, event_id)
VALUES (
    '31f25dda-d747-412d-94c8-d49021f7bfc4',
    'a1b2c3d4-1234-5678-9012-abcdef123456'
); 