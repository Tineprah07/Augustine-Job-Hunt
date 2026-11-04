import express from 'express';
import { fileURLToPath } from 'node:url';
import { companiesRouter } from './routes/companies.js';

const publicDir = fileURLToPath(new URL('../public', import.meta.url));
const sharedDir = fileURLToPath(new URL('./shared', import.meta.url));

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', companiesRouter(db));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // Modules shared by server and browser: the same file, no build step.
  app.use('/shared', express.static(sharedDir));
  app.use(express.static(publicDir));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Body is not valid JSON' });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  return app;
}
