import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

/**
 * Open (or create) the database and make sure the schema exists.
 * Pass ':memory:' for a throwaway database, which is what the tests use.
 */
export function openDb(path = ':memory:') {
  const inMemory = path === ':memory:';
  if (!inMemory) mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  if (!inMemory) db.pragma('journal_mode = WAL');
  db.exec(schema);
  return db;
}
