import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { freshDb } from './helpers.js';

let server;
let base;

before(async () => {
  server = createApp(freshDb()).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const call = (method, path, body) =>
  fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

test('mark applied → hidden from "Not applied" → shown under "Applied" → unmark', async () => {
  const marked = await (await call('PUT', '/api/companies/5/applied', { date: '2026-11-04' })).json();
  assert.equal(marked.appliedOn, '2026-11-04');

  const todo = await (await call('GET', '/api/companies?q=shoreditch')).json();
  assert.equal(todo.matched, 0);
  const applied = await (await call('GET', '/api/companies?q=shoreditch&show=applied')).json();
  assert.equal(applied.items[0].appliedOn, '2026-11-04');
  assert.equal(applied.applied, 1);

  const unmarked = await (await call('DELETE', '/api/companies/5/applied')).json();
  assert.equal(unmarked.appliedOn, null);
});

test('bad ids are 400, unknown ids are 404', async () => {
  assert.equal((await call('PUT', '/api/companies/abc/applied')).status, 400);
  assert.equal((await call('PUT', '/api/companies/9999/applied')).status, 404);
});

test('the page and shared modules are served', async () => {
  for (const path of ['/', '/styles.css', '/js/directory.js', '/shared/links.js']) {
    assert.equal((await fetch(base + path)).status, 200, path);
  }
});
