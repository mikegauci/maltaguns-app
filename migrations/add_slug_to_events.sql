-- Add slug column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT;

-- Update existing events to have a slug based on their title
UPDATE events SET slug = 
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(title, '[^\w\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '--+', '-', 'g'
    )
  )
WHERE slug IS NULL;

-- Create a unique index on the slug column
CREATE UNIQUE INDEX IF NOT EXISTS events_slug_idx ON events (slug);

-- Add a trigger to automatically generate a slug when a new event is created or title is updated
CREATE OR REPLACE FUNCTION generate_event_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate a slug from the title
  NEW.slug := LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(NEW.title, '[^\w\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '--+', '-', 'g'
    )
  );
  
  -- If the slug already exists, append a random string
  WHILE EXISTS (SELECT 1 FROM events WHERE slug = NEW.slug AND id != NEW.id) LOOP
    NEW.slug := NEW.slug || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS event_slug_trigger ON events;

-- Create the trigger
CREATE TRIGGER event_slug_trigger
BEFORE INSERT OR UPDATE OF title ON events
FOR EACH ROW
EXECUTE FUNCTION generate_event_slug(); 