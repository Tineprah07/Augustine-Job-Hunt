import { readFileSync } from 'node:fs';

export function loadSponsors(path) {
  const records = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(records)) throw new Error(`${path} should contain a JSON array`);
  return records;
}

const blankToNull = (v) => {
  const s = v == null ? '' : String(v).trim();
  return s === '' ? null : s;
};

/**
 * Insert sponsor records, but only if the companies table is empty.
 * Runs in one transaction: either every row lands or none do.
 * Never touches the applications table.
 * Returns the number of rows inserted (0 when already seeded).
 */
export function seedCompanies(db, records) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM companies').get();
  if (n > 0) return 0;

  const insert = db.prepare(`
    INSERT INTO companies (id, name, search_name, town, county, licence, area, match)
    VALUES (@id, @name, @search_name, @town, @county, @licence, @area, @match)
  `);

  const insertAll = db.transaction((rows) => {
    for (const r of rows) {
      insert.run({
        id: r.id,
        name: String(r.name).trim(),
        search_name: blankToNull(r.searchName) ?? String(r.name).trim(),
        town: blankToNull(r.town),
        county: blankToNull(r.county),
        licence: blankToNull(r.licence) ?? '?',
        area: r.area,
        match: r.match,
      });
    }
    return rows.length;
  });

  return insertAll(records);
}
