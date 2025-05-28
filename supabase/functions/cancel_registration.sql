DROP FUNCTION IF EXISTS cancel_registration(uuid, timestamptz);

CREATE OR REPLACE FUNCTION cancel_registration(registration_id uuid, cancel_time timestamptz)
RETURNS json AS $$
DECLARE
    updated_record record;
BEGIN
    -- Update the registration: only set cancelled_at
    UPDATE event_registrations
    SET 
        cancelled_at = cancel_time
    WHERE 
        id = registration_id
        AND cancelled_at IS NULL
    RETURNING * INTO updated_record;

    -- Check if update was successful
    IF updated_record IS NULL THEN
        RAISE EXCEPTION 'Registration not found or already cancelled. Registration ID: %', registration_id;
    END IF;

    -- Return the updated record as JSON
    RETURN row_to_json(updated_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant execute permission just in case (though it should persist)
GRANT EXECUTE ON FUNCTION cancel_registration(uuid, timestamptz) TO authenticated; 