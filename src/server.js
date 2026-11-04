import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openDb } from './db/connection.js';
import { loadSponsors, seedCompanies } from './db/seed.js';
import { countApplied, countCompanies } from './data/companies.js';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

const PORT = Number(process.env.PORT ?? 3000);
const DB_PATH = process.env.DB_PATH ?? root('data/jobhunt.db');
const SPONSORS_PATH = process.env.SPONSORS_PATH ?? root('sponsors.json');

const db = openDb(DB_PATH);

if (countCompanies(db) === 0) {
  const inserted = seedCompanies(db, loadSponsors(SPONSORS_PATH));
  console.log(`Seeded ${inserted.toLocaleString('en-GB')} companies from sponsors.json`);
}

const server = createApp(db).listen(PORT, () => {
  console.log(`Augustine's Job Hunt → http://localhost:${PORT}`);
  console.log(`  ${countCompanies(db).toLocaleString('en-GB')} companies · ${countApplied(db)} applied`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
