// Shared by the server and the browser (served at /shared/constants.js).

export const AREAS = Object.freeze(['Portsmouth area', 'London', 'South East', 'Rest of UK']);
export const MATCHES = Object.freeze(['Named tech firm', 'Strong', 'Possible']);

/** Which companies to list: ones you have not applied to, ones you have, or all. */
export const SHOW = Object.freeze(['todo', 'applied', 'all']);

export const DEFAULT_AREAS = Object.freeze(['Portsmouth area', 'London']);
export const DEFAULT_MATCHES = Object.freeze(['Named tech firm', 'Strong']);
export const DEFAULT_SHOW = 'todo';
export const PAGE_SIZE = 60;
