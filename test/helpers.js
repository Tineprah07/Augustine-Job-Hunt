import { openDb } from '../src/db/connection.js';
import { seedCompanies } from '../src/db/seed.js';

/** Small, hand-picked fixture covering every area, match level and licence. */
export const FIXTURE = [
  { id: 1, name: 'Airbus Defence and Space Limited', searchName: 'Airbus Defence and Space', town: 'Portsmouth', county: 'Hampshire', licence: 'A', area: 'Portsmouth area', match: 'Named tech firm' },
  { id: 2, name: 'Babcock Training Limited', searchName: 'Babcock Training', town: 'Cosham', county: 'Portsmouth', licence: 'A', area: 'Portsmouth area', match: 'Strong' },
  { id: 3, name: 'Fareham Software Ltd', searchName: 'Fareham Software', town: 'Fareham', county: '', licence: 'B', area: 'Portsmouth area', match: 'Possible' },
  { id: 4, name: 'Monzo Bank Ltd', searchName: 'Monzo Bank', town: 'London', county: '', licence: 'A', area: 'London', match: 'Named tech firm' },
  { id: 5, name: 'Shoreditch Data Co', searchName: 'Shoreditch Data', town: 'London', county: 'Greater London', licence: 'A', area: 'London', match: 'Strong' },
  { id: 6, name: '100% Digital Ltd', searchName: '100% Digital', town: 'London', county: '', licence: '?', area: 'London', match: 'Possible' },
  { id: 7, name: 'Reading Cloud Ltd', searchName: 'Reading Cloud', town: 'Reading', county: 'Berkshire', licence: 'A', area: 'South East', match: 'Strong' },
  { id: 8, name: 'Leeds_Code Ltd', searchName: 'Leeds_Code', town: 'Leeds', county: 'West Yorkshire', licence: 'A', area: 'Rest of UK', match: 'Strong' },
  { id: 9, name: 'Portsmouth Road Systems', searchName: 'Portsmouth Road Systems', town: 'Guildford', county: 'Surrey', licence: 'A', area: 'South East', match: 'Possible' },
];

export function freshDb() {
  const db = openDb(':memory:');
  seedCompanies(db, FIXTURE);
  return db;
}
