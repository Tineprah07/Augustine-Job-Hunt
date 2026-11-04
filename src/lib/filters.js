import { AREAS, MATCHES, SHOW, DEFAULT_AREAS, DEFAULT_MATCHES, DEFAULT_SHOW, PAGE_SIZE } from '../shared/constants.js';

export const MAX_LIMIT = 200;

export const DEFAULT_FILTERS = Object.freeze({
  q: '',
  areas: [...DEFAULT_AREAS],
  matches: [...DEFAULT_MATCHES],
  show: DEFAULT_SHOW,
  offset: 0,
  limit: PAGE_SIZE,
});

/** Missing param = default; present but empty = nothing selected. Unknown values are dropped. */
function parseList(raw, allowed, fallback) {
  if (raw === undefined) return [...fallback];
  const parts = (Array.isArray(raw) ? raw : [raw]).flatMap((v) => String(v).split(',')).map((s) => s.trim());
  return allowed.filter((a) => parts.includes(a));
}

function parseIntInRange(raw, fallback, min, max) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

/** Turn an Express query object into a validated filter object. */
export function parseFilters(query = {}) {
  return {
    q: String(query.q ?? '').trim().slice(0, 200),
    areas: parseList(query.area, AREAS, DEFAULT_AREAS),
    matches: parseList(query.match, MATCHES, DEFAULT_MATCHES),
    show: SHOW.includes(query.show) ? query.show : DEFAULT_SHOW,
    offset: parseIntInRange(query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
    limit: parseIntInRange(query.limit, PAGE_SIZE, 1, MAX_LIMIT),
  };
}

/** Escape LIKE wildcards so a typed "%" or "_" matches literally. */
export function escapeLike(s) {
  return String(s).replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function inClause(column, values, prefix, params) {
  if (values.length === 0) return '0'; // nothing selected, so nothing matches
  const names = values.map((v, i) => {
    params[`${prefix}${i}`] = v;
    return `@${prefix}${i}`;
  });
  return `${column} IN (${names.join(', ')})`;
}

/**
 * WHERE clause for `companies c LEFT JOIN applied a`. The SQL text is built
 * only from fixed fragments and placeholder names; every value goes in params.
 * `skip` leaves out one dimension so the filter buttons can show counts.
 */
export function buildWhere(filters, { skip } = {}) {
  const clauses = [];
  const params = {};

  filters.q.split(/\s+/).filter(Boolean).slice(0, 8).forEach((term, i) => {
    params[`q${i}`] = `%${escapeLike(term)}%`;
    clauses.push(`(c.name LIKE @q${i} ESCAPE '\\' OR c.town LIKE @q${i} ESCAPE '\\')`);
  });

  if (skip !== 'area') clauses.push(inClause('c.area', filters.areas, 'area', params));
  if (skip !== 'match') clauses.push(inClause('c.match', filters.matches, 'match', params));
  if (filters.show === 'todo') clauses.push('a.company_id IS NULL');
  if (filters.show === 'applied') clauses.push('a.company_id IS NOT NULL');

  return { sql: clauses.length ? clauses.join(' AND ') : '1', params };
}
