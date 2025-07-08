// src/services/airtable.js
import Airtable from 'airtable';
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } from '../config';

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);

// Helper function to ensure dates are in ISO format for Airtable
const formatDateForAirtable = (date) => {
  if (!date) return null;
  // If it's already a string in YYYY-MM-DD format, return as is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  // Otherwise, parse and format
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// -- Exercises Table (master exercise library)
export const exercises = {
  list: async () => {
    const records = await base('Exercises')
      .select({ 
        fields: ['Name', 'Description', 'Category', 'Instructions'],
        sort: [{ field: 'Name', direction: 'asc' }]
      })
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
      .select({ 
        fields: ['Name', 'Email', 'Status', 'Date Joined'],
        sort: [{ field: 'Name', direction: 'asc' }]
      })
      .all();
    return records.map((r) => ({ id: r.id, ...r.fields }));
  },
  findByEmail: async (email) => {
    const records = await base('Clients')
      .select({ 
        filterByFormula: `LOWER({Email}) = LOWER('${email}')`, 
        maxRecords: 1 
      })
      .all();
    if (!records.length) return null;
    const rec = records[0];
    return { id: rec.id, ...rec.fields };
  },
  create: async (fields) => {
    // Ensure Date Joined is properly formatted
    if (fields['Date Joined']) {
      fields['Date Joined'] = formatDateForAirtable(fields['Date Joined']);
    }
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
        filterByFormula: `LOWER({Client Email}) = LOWER('${clientEmail}')`,
        fields: ['Exercise', 'Sets', 'Reps', 'Client', 'Created'],
        sort: [{ field: 'Created', direction: 'desc' }]
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
    // First, get all assignment record-IDs for this client
    const assigns = await assignments.listForClient(clientEmail);
    if (!assigns.length) return [];

    // Build filter formula for all assignments
    // OR({Assignment} = 'recA', {Assignment} = 'recB', ...)
    const filterFormula = assigns.length === 1
      ? `{Assignment} = '${assigns[0].id}'`
      : `OR(${assigns.map(a => `{Assignment} = '${a.id}'`).join(',')})`;

    try {
      const records = await base('Completions')
        .select({
          filterByFormula: filterFormula,
          fields: ['Assignment', 'Completion Date', 'Notes'],
          sort: [{ field: 'Completion Date', direction: 'desc' }]
        })
        .all();

      return records.map(r => ({ id: r.id, ...r.fields }));
    } catch (error) {
      console.error('Error fetching completions:', error);
      return [];
    }
  },
  
  create: async (fields) => {
    // Ensure Completion Date is properly formatted
    if (fields['Completion Date']) {
      fields['Completion Date'] = formatDateForAirtable(fields['Completion Date']);
    }
    const [record] = await base('Completions').create([{ fields }]);
    return { id: record.id, ...record.fields };
  },
  
  update: async (id, fields) => {
    // Ensure Completion Date is properly formatted if being updated
    if (fields['Completion Date']) {
      fields['Completion Date'] = formatDateForAirtable(fields['Completion Date']);
    }
    const [record] = await base('Completions').update([{ id, fields }]);
    return { id: record.id, ...record.fields };
  },
  
  delete: async (id) => {
    await base('Completions').destroy([id]);
  },
};