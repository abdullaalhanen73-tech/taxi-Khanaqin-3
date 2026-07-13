/*
# Update trips table to include passenger_name

1. Adds passenger_name column to trips table for FIX 2
2. Adds passenger_id column reference
*/

-- Add passenger_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'passenger_name') THEN
    ALTER TABLE trips ADD COLUMN passenger_name text;
  END IF;
END $$;

-- Add passenger_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'passenger_id') THEN
    ALTER TABLE trips ADD COLUMN passenger_id uuid REFERENCES passengers(id) ON DELETE SET NULL;
  END IF;
END $$;