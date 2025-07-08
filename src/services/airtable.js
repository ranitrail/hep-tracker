// src/services/airtable.js
import Airtable from 'airtable';
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } from '../config';

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);

/* -------------------------------------------------------------
   Helper – always store dates as YYYY-MM-DD strings
------------------------------------------------------------- */
const formatDateForAirtable = (date) => {
  if (!date) return null;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;                 // already ISO date-only
  }
  return new Date(date).toISOString().split('T')[0];
};

/* -------------------------------------------------------------
   Exercises
------------------------------------------------------------- */
export const exercises = {
  list: async () => {
    const records = await base('Exercises').select({
      fields: ['Name', 'Description', 'Category', 'Instructions'],
      sort: [{ field: 'Name', direction: 'asc' }],
    }).all();
    return records.map(r => ({ id: r.id, ...r.fields }));
  },
  create: async (fields) => {
    const [record] = await base('Exercises').create([{ fields }]);
    return { id: record.id, ...record.fields };
  },
};

/* -------------------------------------------------------------
   Clients
------------------------------------------------------------- */
export const clients = {
  list: async () => {
    const records = await base('Clients').select({
      fields: ['Name', 'Email', 'Status', 'Date Joined'],
      sort: [{ field: 'Name', direction: 'asc' }],
    }).all();
    return records.map(r => ({ id: r.id, ...r.fields }));
  },
  findByEmail: async (email) => {
    const records = await base('Clients').select({
      filterByFormula: `LOWER({Email}) = LOWER('${email}')`,
      maxRecords: 1,
    }).all();
    return records.length ? { id: records[0].id, ...records[0].fields } : null;
  },
  create: async (fields) => {
    if (fields['Date Joined']) {
      fields['Date Joined'] = formatDateForAirtable(fields['Date Joined']);
    }
    const [record] = await base('Clients').create([{ fields }]);
    return { id: record.id, ...record.fields };
  },
};

/* -------------------------------------------------------------
   Assignments  (linked Client ➟ lookup «Client Email»)
------------------------------------------------------------- */
export const assignments = {
  listForClient: async (clientEmail) => {
    // Fast path – use lookup field “Client Email”
    try {
      const fast = await base('Assignments').select({
        filterByFormula: `LOWER({Client Email}) = LOWER('${clientEmail}')`,
        fields: ['Exercise', 'Sets', 'Reps', 'Client'],
        sort: [{ field: 'Assignment ID', direction: 'desc' }],
      }).all();
      if (fast.length) return fast.map(r => ({ id: r.id, ...r.fields }));
    } catch (e) {
      console.warn('Lookup field missing, falling back to Client ID', e);
    }

    // Fallback – get client record then filter on {Client}
    const clientRec = await clients.findByEmail(clientEmail);
    if (!clientRec) return [];

    const records = await base('Assignments').select({
      filterByFormula: `{Client} = '${clientRec.id}'`,
      fields: ['Exercise', 'Sets', 'Reps', 'Client'],
      sort: [{ field: 'Assignment ID', direction: 'desc' }],
    }).all();
    return records.map(r => ({ id: r.id, ...r.fields }));
  },
  create: async (fields) => {
    const [record] = await base('Assignments').create([{ fields }]);
    return { id: record.id, ...record.fields };
  },
  delete: async (id) => base('Assignments').destroy([id]),
};

/* -------------------------------------------------------------
   Completions
------------------------------------------------------------- */
export const exerciseCompletions = {
  listForClient: async (clientEmail) => {
    const assigns = await assignments.listForClient(clientEmail);
    if (!assigns.length) return [];

    // OR({Assignment} = 'recA', {Assignment} = 'recB', …)
    const filterFormula = assigns.length === 1
      ? `{Assignment} = '${assigns[0].id}'`
      : `OR(${assigns.map(a => `{Assignment} = '${a.id}'`).join(',')})`;

    const records = await base('Completions').select({
      filterByFormula: filterFormula,
      fields: ['Assignment', 'Completion Date', 'Notes'],
      sort: [{ field: 'Completion Date', direction: 'desc' }],
    }).all();
    return records.map(r => ({ id: r.id, ...r.fields }));
  },

  create: async (fields) => {
    if (fields['Completion Date']) {
      fields['Completion Date'] = formatDateForAirtable(fields['Completion Date']);
    }
    const [record] = await base('Completions').create([{ fields }]);
    return { id: record.id, ...record.fields };
  },

  update: async (id, fields) => {
    if (fields['Completion Date']) {
      fields['Completion Date'] = formatDateForAirtable(fields['Completion Date']);
    }
    const [record] = await base('Completions').update([{ id, fields }]);
    return { id: record.id, ...record.fields };
  },

  delete: async (id) => base('Completions').destroy([id]),
};