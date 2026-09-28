export const CAUSES = [
  { key: 'Drowning', label: 'Drowning' },
  { key: 'Mixed or unknown', label: 'Mixed or unknown' },
  { key: 'Vehicle accident / death linked to hazardous transport', label: 'Hazardous transport' },
  { key: 'Multiple reported causes', label: 'Multiple reported causes' },
  { key: 'Harsh environmental conditions / lack of adequate shelter, food, water', label: 'Harsh conditions / lack of essentials' },
  { key: 'Sickness / lack of access to adequate healthcare', label: 'Sickness / lack of healthcare' },
  { key: 'Accidental death', label: 'Accidental death' },
];
export function expandPeople(rows) {
  const people = [];
  for (const row of rows) {
    const raw = (row['Cause of Death'] || '').trim();
    // Exact matches first: some single category names contain commas.
    const cause = CAUSES.some(c => c.key === raw) ? raw :
      (raw.includes(',') ? 'Multiple reported causes' : 'Mixed or unknown');
    const n = Number(row['Total Number of Dead and Missing']);
    if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid count: ${row['Main ID']}`);
    for (let i = 0; i < n; i++) people.push({ recordId: row['Main ID'], cause, rawCause: raw, index: i, count: n });
  }
  return people;
}
