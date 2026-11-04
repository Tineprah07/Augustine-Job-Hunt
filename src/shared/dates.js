// Shared by the server and the browser (served at /shared/dates.js).

const pad = (n) => String(n).padStart(2, '0');

/** Today's date on this machine, as YYYY-MM-DD. */
export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isValidIsoDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "4 Nov" */
export function formatDate(iso) {
  if (!isValidIsoDate(iso)) return String(iso ?? '');
  const [y, m, d] = iso.split('-').map(Number);
  return fmt.format(new Date(Date.UTC(y, m - 1, d)));
}
