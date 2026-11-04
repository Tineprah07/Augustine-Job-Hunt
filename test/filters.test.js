import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FILTERS, MAX_LIMIT, buildWhere, escapeLike, parseFilters } from '../src/lib/filters.js';
import { markApplied, searchCompanies, unmarkApplied } from '../src/data/companies.js';
import { seedCompanies } from '../src/db/seed.js';
import { companyLinks } from '../src/shared/links.js';
import { FIXTURE, freshDb } from './helpers.js';

const ALL = {
  areas: ['Portsmouth area', 'London', 'South East', 'Rest of UK'],
  matches: ['Named tech firm', 'Strong', 'Possible'],
  show: 'all',
};
const filters = (overrides = {}) => ({ ...DEFAULT_FILTERS, ...ALL, ...overrides });
const ids = (result) => result.items.map((c) => c.id).sort((a, b) => a - b);

describe('parseFilters', () => {
  test('an empty query gives the defaults', () => {
    assert.deepEqual(parseFilters({}), {
      q: '',
      areas: ['Portsmouth area', 'London'],
      matches: ['Named tech firm', 'Strong'],
      show: 'todo',
      offset: 0,
      limit: 60,
    });
  });

  test('lists accept commas or repeats, drop unknowns, and come back in canonical order', () => {
    assert.deepEqual(parseFilters({ area: 'Rest of UK,London,Mars,London' }).areas, ['London', 'Rest of UK']);
    assert.deepEqual(parseFilters({ match: ['Possible', 'Strong'] }).matches, ['Strong', 'Possible']);
  });

  test('a present but empty list means nothing selected', () => {
    assert.deepEqual(parseFilters({ area: '' }).areas, []);
  });

  test('show, offset and limit are validated', () => {
    assert.equal(parseFilters({ show: 'applied' }).show, 'applied');
    assert.equal(parseFilters({ show: 'nonsense' }).show, 'todo');
    assert.equal(parseFilters({ offset: '-5' }).offset, 0);
    assert.equal(parseFilters({ limit: '9999' }).limit, MAX_LIMIT);
  });
});

describe('buildWhere', () => {
  test('never puts user text into the SQL', () => {
    const { sql, params } = buildWhere(filters({ q: "x'); DROP TABLE companies; --" }));
    assert.ok(!sql.includes('DROP'));
    assert.ok(Object.values(params).some((v) => String(v).includes('DROP')));
  });

  test('escapeLike escapes %, _ and backslash', () => {
    assert.equal(escapeLike('100%_a\\b'), '100\\%\\_a\\\\b');
  });
});

describe('searchCompanies', () => {
  test('default filters: Portsmouth area + London, Named + Strong, not applied', () => {
    const r = searchCompanies(freshDb(), parseFilters({}));
    assert.deepEqual(ids(r), [1, 2, 4, 5]);
    assert.equal(r.total, FIXTURE.length);
    assert.equal(r.matched, 4);
  });

  test('area and match filters combine', () => {
    const db = freshDb();
    assert.deepEqual(ids(searchCompanies(db, filters({ areas: ['South East'], matches: ['Possible'] }))), [9]);
    assert.deepEqual(ids(searchCompanies(db, filters({ areas: ['London'], matches: ['Strong', 'Possible'] }))), [5, 6]);
    assert.equal(searchCompanies(db, filters({ matches: [] })).matched, 0);
  });

  test('search covers name and town, case-insensitive, every word must match', () => {
    const db = freshDb();
    assert.deepEqual(ids(searchCompanies(db, filters({ q: 'MONZO' }))), [4]);
    assert.deepEqual(ids(searchCompanies(db, filters({ q: 'reading' }))), [7]);
    assert.deepEqual(ids(searchCompanies(db, filters({ q: 'portsmouth' }))), [1, 9]);
    assert.deepEqual(ids(searchCompanies(db, filters({ q: 'data london' }))), [5]);
  });

  test('% and _ in the search are literal', () => {
    const db = freshDb();
    assert.deepEqual(ids(searchCompanies(db, filters({ q: '%' }))), [6]);
    assert.deepEqual(ids(searchCompanies(db, filters({ q: 'leeds_' }))), [8]);
  });

  test('show: todo / applied / all', () => {
    const db = freshDb();
    markApplied(db, 4, '2026-11-04');
    const def = { areas: ['Portsmouth area', 'London'], matches: ['Named tech firm', 'Strong'] };
    assert.deepEqual(ids(searchCompanies(db, filters({ ...def, show: 'todo' }))), [1, 2, 5]);
    assert.deepEqual(ids(searchCompanies(db, filters({ ...def, show: 'applied' }))), [4]);
    assert.deepEqual(ids(searchCompanies(db, filters({ ...def, show: 'all' }))), [1, 2, 4, 5]);
  });

  test('pagination pages through a stable order with named firms first', () => {
    const db = freshDb();
    const seen = [0, 4, 8].flatMap((offset) => searchCompanies(db, filters({ limit: 4, offset })).items);
    assert.equal(new Set(seen.map((c) => c.id)).size, 9);
    assert.deepEqual(seen.slice(0, 2).map((c) => c.match), ['Named tech firm', 'Named tech firm']);
  });

  test('facet counts ignore their own dimension but respect the others', () => {
    const r = searchCompanies(freshDb(), filters({ areas: ['London'], matches: ['Strong'] }));
    assert.deepEqual(r.facets.area, { 'Portsmouth area': 1, London: 1, 'South East': 1, 'Rest of UK': 1 });
    assert.deepEqual(r.facets.match, { 'Named tech firm': 1, Strong: 1, Possible: 1 });
  });
});

describe('marking applied', () => {
  test('mark sets the date, unmark clears it, counts follow', () => {
    const db = freshDb();
    assert.equal(markApplied(db, 4, '2026-11-04').appliedOn, '2026-11-04');
    assert.equal(searchCompanies(db, filters()).applied, 1);
    assert.equal(unmarkApplied(db, 4).appliedOn, null);
    assert.equal(searchCompanies(db, filters()).applied, 0);
  });

  test('marking twice keeps the first date', () => {
    const db = freshDb();
    markApplied(db, 4, '2026-11-01');
    assert.equal(markApplied(db, 4, '2026-11-09').appliedOn, '2026-11-01');
  });

  test('unknown company returns null', () => {
    assert.equal(markApplied(freshDb(), 9999), null);
    assert.equal(unmarkApplied(freshDb(), 9999), null);
  });
});

describe('seedCompanies', () => {
  test('seeds once and never reseeds or touches applied marks', () => {
    const db = freshDb();
    markApplied(db, 1);
    assert.equal(seedCompanies(db, FIXTURE), 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM applied').get().n, 1);
  });

  test('a bad record rolls the whole seed back', () => {
    const db = freshDb();
    db.exec('DELETE FROM companies');
    assert.throws(() => seedCompanies(db, [...FIXTURE.slice(0, 3), { ...FIXTURE[3], area: 'Narnia' }]));
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM companies').get().n, 0);
  });
});

describe('companyLinks', () => {
  test('builds the four links with fully encoded queries', () => {
    const links = Object.fromEntries(companyLinks('AT&T Labs').map((l) => [l.key, l.url]));
    assert.equal(links.website, 'https://duckduckgo.com/?q=%5C%20AT%26T%20Labs%20UK');
    assert.equal(links.careers, 'https://duckduckgo.com/?q=%5C%20AT%26T%20Labs%20careers%20jobs');
    assert.equal(links.linkedin, 'https://www.linkedin.com/jobs/search/?keywords=AT%26T%20Labs&f_E=1%2C2');
    assert.equal(links['companies-house'], 'https://find-and-update.company-information.service.gov.uk/search?q=AT%26T%20Labs');
  });
});
