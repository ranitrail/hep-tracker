// src/services/airtable.js
import Airtable from 'airtable';
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } from '../config';

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);

// -- Exercises Table (master exercise library)
export const exercises = {
  list: async () => {
    const records = await base('Exercises')
      .select({ fields: ['Name', 'Description', 'Category', 'Instructions'] })
      .all();
    return records.map((r) => ({ id: r.id, ...r.fields }));
  },
  create: async (fields) => {
    const [record] = await base('Exercises').create([{ fields }]);
    return { id: record.id, ...record.fields };
  },
};

// -- Clients Table (list of physiotherapy clients)
export const clients = {
  list: async () => {
    const records = await base('Clients')
      .select({ fields: ['Name', 'Email', 'Status', 'Date Joined'] })
      .all();
    return records.map((r) => ({ id: r.id, ...r.fields }));
  },
  findByEmail: async (email) => {
    const records = await base('Clients')
      .select({ filterByFormula: `{Email} = '${email}'`, maxRecords: 1 })
      .all();
    if (!records.length) return null;
    const rec = records[0];
    return { id: rec.id, ...rec.fields };
  },
  create: async (fields) => {
    const [record] = await base('Clients').create([{ fields }]);
    return { id: record.id, ...record.fields };
  },
};

// -- Assignments Table (physio assigns exercises to clients)
export const assignments = {
  listForClient: async (clientEmail) => {
    // Uses a Lookup field in Airtable named "Client Email"
    const records = await base('Assignments')
      .select({
        filterByFormula: `{Client Email} = '${clientEmail}'`,
        fields: ['Exercise', 'Sets', 'Reps'],
      })
      .all();
    return records.map((r) => ({ id: r.id, ...r.fields }));
  },
  create: async (fields) => {
    const [record] = await base('Assignments').create([{ fields }]);
    return { id: record.id, ...record.fields };
  },
  delete: async (id) => {
    await base('Assignments').destroy([id]);
  },
};

// -- Completions Table (daily client check-ins)
export const exerciseCompletions = {
  listForClient: async (clientEmail) => {
    // get all assignment record-IDs for this client
    const assigns = await assignments.listForClient(clientEmail);
    if (!assigns.length) return [];

    // OR({Assignment} = 'recA', {Assignment} = 'recB', …)
    const filterFormula = `OR(${assigns
      .map(a => `{Assignment} = '${a.id}'`)
      .join(',')})`;

    const records = await base('Completions')
      .select({
        filterByFormula: filterFormula,
        fields: ['Assignment', 'Completion Date', 'Notes'],
      })
      .all();

    return records.map(r => ({ id: r.id, ...r.fields }));
  },
  create: async (fields) => {
    const [record] = await base('Completions').create([{ fields }]);
    return { id: record.id, ...record.fields };
  },
  update: async (id, fields) => {
    await base('Completions').update(id, fields);
  },
  delete: async (id) => {
    await base('Completions').destroy([id]);
  },
};