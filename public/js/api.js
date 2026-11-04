async function request(method, url, body, signal) {
  let res;
  try {
    res = await fetch(url, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('Cannot reach the server. Is `npm start` still running?');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data;
}

export const api = {
  companies: (params, signal) => request('GET', `/api/companies?${new URLSearchParams(params)}`, undefined, signal),
  markApplied: (id, date) => request('PUT', `/api/companies/${id}/applied`, { date }),
  unmarkApplied: (id) => request('DELETE', `/api/companies/${id}/applied`),
};
