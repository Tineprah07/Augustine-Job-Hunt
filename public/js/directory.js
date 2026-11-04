import { AREAS, MATCHES, SHOW, DEFAULT_AREAS, DEFAULT_MATCHES, DEFAULT_SHOW, PAGE_SIZE } from '/shared/constants.js';
import { companyLinks } from '/shared/links.js';
import { formatDate, localToday } from '/shared/dates.js';
import { api } from './api.js';
import { debounce, h, icon, nf } from './ui.js';

const $ = (sel) => document.querySelector(sel);
const els = {
  search: $('#search'),
  areaChips: $('#area-chips'),
  matchChips: $('#match-chips'),
  show: $('#show'),
  count: $('#count'),
  applied: $('#applied-count'),
  list: $('#results'),
  more: $('#show-more'),
  empty: $('#empty'),
};

/* ---------- Filter state, kept in the URL so a reload keeps it ---------- */

const state = (() => {
  const p = new URLSearchParams(location.search);
  const list = (key, allowed, fallback) => (p.has(key) ? allowed.filter((v) => p.get(key).split(',').includes(v)) : [...fallback]);
  return {
    q: p.get('q') ?? '',
    areas: new Set(list('area', AREAS, DEFAULT_AREAS)),
    matches: new Set(list('match', MATCHES, DEFAULT_MATCHES)),
    show: SHOW.includes(p.get('show')) ? p.get('show') : DEFAULT_SHOW,
  };
})();

const ordered = (set, all) => all.filter((v) => set.has(v));
const same = (set, arr) => set.size === arr.length && arr.every((v) => set.has(v));

function saveState() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (!same(state.areas, DEFAULT_AREAS)) p.set('area', ordered(state.areas, AREAS).join(','));
  if (!same(state.matches, DEFAULT_MATCHES)) p.set('match', ordered(state.matches, MATCHES).join(','));
  if (state.show !== DEFAULT_SHOW) p.set('show', state.show);
  history.replaceState(null, '', p.size ? `?${p}` : location.pathname);
}

/* ---------- Loading ---------- */

const rows = new Map(); // id -> { company, el }
let remaining = 0;
let controller;

/**
 * Rows you mark (or unmark) stay on screen until the next filter change, so
 * nothing jumps under your cursor. The server has already dropped them from
 * the current view, so "Show more" offsets by the rows it still counts.
 */
function serverOffset() {
  let n = 0;
  for (const { company } of rows.values()) {
    const isApplied = company.appliedOn != null;
    if (state.show === 'all' || (state.show === 'applied') === isApplied) n++;
  }
  return n;
}

async function load({ append = false } = {}) {
  controller?.abort();
  controller = new AbortController();
  document.body.classList.add('is-loading');
  try {
    const offset = append ? serverOffset() : 0;
    const data = await api.companies(
      {
        q: state.q,
        area: ordered(state.areas, AREAS).join(','),
        match: ordered(state.matches, MATCHES).join(','),
        show: state.show,
        offset,
        limit: PAGE_SIZE,
      },
      controller.signal,
    );
    if (!append) {
      rows.clear();
      els.list.replaceChildren();
    }
    for (const c of data.items) {
      if (rows.has(c.id)) continue;
      const el = renderRow(c);
      rows.set(c.id, { company: c, el });
      els.list.append(el);
    }
    remaining = Math.max(0, data.matched - offset - data.items.length);
    els.count.replaceChildren(h('strong', {}, nf.format(data.matched)), ` of ${nf.format(data.total)} companies match`);
    els.applied.textContent = nf.format(data.applied);
    updateChipCounts(data.facets);
    els.more.hidden = remaining === 0;
    els.more.textContent = `Show more (${nf.format(remaining)} left)`;
    els.empty.hidden = data.matched > 0 || rows.size > 0;
  } catch (err) {
    if (err.name !== 'AbortError') els.count.textContent = err.message;
  } finally {
    document.body.classList.remove('is-loading');
  }
}

function refilter() {
  saveState();
  load();
}

/* ---------- Filters ---------- */

const chips = { area: new Map(), match: new Map() };

function buildChips(dim, values, set, host, keyOf) {
  for (const value of values) {
    const el = h(
      'button',
      {
        type: 'button',
        class: `chip chip-${keyOf(value)}`,
        onclick: () => {
          set.has(value) ? set.delete(value) : set.add(value);
          el.setAttribute('aria-pressed', String(set.has(value)));
          refilter();
        },
      },
      h('span', { class: 'chip-dot', 'aria-hidden': 'true' }),
      value,
      h('span', { class: 'chip-n' }),
    );
    el.setAttribute('aria-pressed', String(set.has(value)));
    chips[dim].set(value, el);
    host.append(el);
  }
}

function updateChipCounts(facets) {
  for (const dim of ['area', 'match']) {
    for (const [value, el] of chips[dim]) el.querySelector('.chip-n').textContent = nf.format(facets[dim][value] ?? 0);
  }
}

const areaKey = (a) => ({ 'Portsmouth area': 'portsmouth', London: 'london', 'South East': 'southeast', 'Rest of UK': 'rest' })[a];
const matchKey = (m) => ({ 'Named tech firm': 'named', Strong: 'strong', Possible: 'possible' })[m];

buildChips('area', AREAS, state.areas, els.areaChips, areaKey);
buildChips('match', MATCHES, state.matches, els.matchChips, matchKey);

for (const input of els.show.querySelectorAll('input')) {
  input.checked = input.value === state.show;
  input.addEventListener('change', () => {
    state.show = input.value;
    refilter();
  });
}

els.search.value = state.q;
els.search.addEventListener('input', debounce(() => {
  state.q = els.search.value.trim();
  refilter();
}, 180));

els.more.addEventListener('click', () => load({ append: true }));

$('#reset').addEventListener('click', () => {
  location.search = '';
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
    e.preventDefault();
    els.search.focus();
  }
});

/* ---------- Rows ---------- */

function renderRow(c) {
  const applied = c.appliedOn != null;
  const place = [...new Set([c.town, c.county].filter(Boolean))].join(', ');

  return h(
    'li',
    { class: `co${applied ? ' is-applied' : ''}` },
    h(
      'div',
      { class: 'co-main' },
      h(
        'div',
        { class: 'co-title' },
        h('h3', { class: 'co-name' }, c.name),
        h('span', { class: `badge badge-area area-${areaKey(c.area)}` }, c.area),
        h('span', { class: `badge badge-match match-${matchKey(c.match)}` }, c.match === 'Named tech firm' && h('span', { class: 'star', 'aria-hidden': 'true' }, '★'), c.match),
        c.licence === 'B' && h('span', { class: 'badge badge-b', title: 'The Home Office has put this sponsor on an action plan' }, 'B rating'),
      ),
      place && h('p', { class: 'co-place' }, icon('pin', 13), place),
      h(
        'nav',
        { class: 'co-links', 'aria-label': `Links for ${c.name}` },
        companyLinks(c.searchName).map((l) =>
          h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, icon(l.key, 15), l.label),
        ),
      ),
    ),
    applied
      ? h(
          'button',
          { type: 'button', class: 'btn-applied is-on', title: 'Click to unmark', 'aria-pressed': 'true', onclick: (e) => toggle(c, e.currentTarget) },
          icon('check', 15),
          h('span', { class: 'when' }, `Applied ${formatDate(c.appliedOn)}`),
          h('span', { class: 'undo' }, 'Unmark'),
        )
      : h(
          'button',
          { type: 'button', class: 'btn-applied', 'aria-pressed': 'false', onclick: (e) => toggle(c, e.currentTarget) },
          icon('check', 15),
          'Mark applied',
        ),
  );
}

async function toggle(c, button) {
  button.disabled = true;
  try {
    const updated = c.appliedOn ? await api.unmarkApplied(c.id) : await api.markApplied(c.id, localToday());
    c.appliedOn = updated.appliedOn;
    const entry = rows.get(c.id);
    const el = renderRow(c);
    entry.el.replaceWith(el);
    entry.el = el;
    el.querySelector('.btn-applied').focus();
    const n = Number(els.applied.textContent.replace(/,/g, '')) + (c.appliedOn ? 1 : -1);
    els.applied.textContent = nf.format(Math.max(0, n));
  } catch (err) {
    button.disabled = false;
    alert(err.message);
  }
}

load();
