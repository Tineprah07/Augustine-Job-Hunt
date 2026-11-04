import { Router } from 'express';
import { markApplied, searchCompanies, unmarkApplied } from '../data/companies.js';
import { HttpError } from '../lib/errors.js';
import { parseFilters } from '../lib/filters.js';
import { isValidIsoDate } from '../shared/dates.js';

function parseId(raw) {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) throw new HttpError(400, 'Invalid company id');
  return n;
}

function found(company) {
  if (!company) throw new HttpError(404, 'Company not found');
  return company;
}

export function companiesRouter(db) {
  const router = Router();

  router.get('/companies', (req, res) => {
    res.json(searchCompanies(db, parseFilters(req.query)));
  });

  // The browser sends its own date so "today" matches the clock you see.
  router.put('/companies/:id/applied', (req, res) => {
    const today = isValidIsoDate(req.body?.date) ? req.body.date : undefined;
    res.json(found(markApplied(db, parseId(req.params.id), today)));
  });

  router.delete('/companies/:id/applied', (req, res) => {
    res.json(found(unmarkApplied(db, parseId(req.params.id))));
  });

  return router;
}
