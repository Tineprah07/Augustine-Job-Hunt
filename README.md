# Augustine's Job Hunt

A simple local list of the 7,127 UK Skilled Worker sponsors in software and IT. Filter it, open a company's website, careers page, LinkedIn jobs or Companies House record, and press **Mark applied** once you have applied. One click marks it with today's date; click again to unmark.

## Setup

Needs Node.js 20 or newer.

```sh
npm install
npm start          # → http://localhost:3000
npm test
```

The first `npm start` creates `data/jobhunt.db` and loads `sponsors.json` into it in one transaction. Later starts never reload it and never touch your applied marks. To back up, copy `data/jobhunt.db`.

## Schema

- **companies** holds the sponsor list (`name`, `search_name`, `town`, `county`, `licence`, `area`, `match`). It is loaded once and read-only after that.
- **applied** has one row per company you have marked: `company_id` and `applied_on` (YYYY-MM-DD). Unmarking deletes the row.
- The filters join the two tables, so "Not applied", "Applied" and "All" are a single query.

## Layout

```
src/server.js      start-up: open DB, load sponsors on first run, listen
src/app.js         Express setup
src/routes/        GET /api/companies, PUT/DELETE /api/companies/:id/applied
src/data/          database queries (parameterised only)
src/lib/filters.js turns query params into a safe WHERE clause
src/shared/        code used by both server and browser (links, dates, constants)
public/            index.html, styles.css, js/
test/              node:test, using an in-memory database
```
