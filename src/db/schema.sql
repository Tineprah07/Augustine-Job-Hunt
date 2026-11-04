-- Safe to run on every start: nothing here drops or rewrites existing data.

CREATE TABLE IF NOT EXISTS companies (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  search_name TEXT NOT NULL,
  town        TEXT,
  county      TEXT,
  licence     TEXT NOT NULL CHECK (licence IN ('A', 'B', '?')),
  area        TEXT NOT NULL CHECK (area IN ('Portsmouth area', 'London', 'South East', 'Rest of UK')),
  match       TEXT NOT NULL CHECK (match IN ('Named tech firm', 'Strong', 'Possible'))
);

CREATE INDEX IF NOT EXISTS idx_companies_area_match ON companies (area, match);

-- One row per company you have marked as applied.
CREATE TABLE IF NOT EXISTS applied (
  company_id INTEGER PRIMARY KEY REFERENCES companies (id) ON DELETE CASCADE,
  applied_on TEXT NOT NULL -- 'YYYY-MM-DD'
);
