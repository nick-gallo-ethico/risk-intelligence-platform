-- Add tsvector column for full-text search
ALTER TABLE cases ADD COLUMN search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX cases_search_idx ON cases USING GIN(search_vector);

-- Create trigger function to auto-update search_vector on insert/update
-- Weights: A (highest) for reference_number and summary, B for details, C for reporter_name
CREATE OR REPLACE FUNCTION cases_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.reference_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.details, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.reporter_name, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger to run function before insert or update
CREATE TRIGGER cases_search_trigger
  BEFORE INSERT OR UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION cases_search_update();

-- Populate search_vector for existing rows
UPDATE cases SET search_vector =
  setweight(to_tsvector('english', coalesce(reference_number, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(details, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(reporter_name, '')), 'C');
