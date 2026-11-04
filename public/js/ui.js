/**
 * Tiny DOM builder. Text children become text nodes, so data is never parsed
 * as HTML. null / false children and props are skipped.
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false || child === '') continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export const nf = new Intl.NumberFormat('en-GB');

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const PATHS = {
  website: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  careers: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7.5 10v6.5M7.5 7.3v.2M11.5 16.5V10M11.5 12.8c0-1.6 1.1-2.8 2.6-2.8s2.4 1 2.4 2.7v3.8"/>',
  'companies-house': '<path d="M3 20h18M4 10h16M12 3.5 4 8v2h16V8zM6.5 10v7M10 10v7M14 10v7M17.5 10v7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
};

const cache = new Map();

export function icon(name, size = 16) {
  if (!cache.has(name)) {
    const t = document.createElement('template');
    t.innerHTML = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] ?? ''}</svg>`;
    cache.set(name, t.content.firstElementChild);
  }
  const svg = cache.get(name).cloneNode(true);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  return svg;
}
