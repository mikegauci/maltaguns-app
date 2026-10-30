-- Structured billing location so Vialet checkout can skip its details step.
-- `address` keeps holding the street address; the country is always Malta.
alter table public.profiles add column if not exists city text;
