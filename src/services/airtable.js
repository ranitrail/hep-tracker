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
    return records.map(r => ({ id: r.id, ...r.fields }));
  },
  create: async fields => {
    const [record] = await base('Exercises').create([{ fields }]);
    return { id: record.id, ...record.fields };
  }
};

// -- Clients Table (list of physiotherapy clients)
export const clients = {
  list: async () => {
    const records = await base('Clients')
      .select({ fields: ['Name', 'Email', 'Status', 'Date Joined'] })
      .all();
    return records.map(r => ({ id: r.id, ...r.fields }));
  },
  findByEmail: async email => {
    const records = await base('Clients')
      .select({ filterByFormula: `{Email} = '${email}'`, maxRecords: 1 })
      .all();
    if (!records.length) return null;
    const rec = records[0];
    return { id: rec.id, ...rec.fields };
  },
  create: async fields => {
    const [record] = await base('Clients').create([{ fields }]);
    return { id: record.id, ...record.fields };
  }
};

// -- Assignments Table (physio assigns exercises to clients)
export const assignments = {
  listForClient: async clientEmail => {
    const client = await clients.findByEmail(clientEmail);
    if (!client) return [];

    // Filter assignments where linked Client field contains this client ID
    const records = await base('Assignments')
      .select({
        filterByFormula: `FIND('${client.id}', ARRAYJOIN({Client}))`,
        fields: ['Exercise', 'Sets', 'Reps']
      })
      .all();

    return records.map(r => ({ id: r.id, ...r.fields }));
  },
  create: async fields => {
    const [record] = await base('Assignments').create([{ fields }]);
    return { id: record.id, ...record.fields };
  },
  delete: async id => {
    await base('Assignments').destroy([id]);
  }
};

// -- Completions Table (daily client check-ins)
export const exerciseCompletions = {
  listForClient: async clientEmail => {
    const client = await clients.findByEmail(clientEmail);
    if (!client) return [];

    // Fetch assignments to build OR formula
    const assigns = await assignments.listForClient(clientEmail);
    if (!assigns.length) return [];

    const orConditions = assigns
      .map(a => `FIND('${a.id}', ARRAYJOIN({Assignment}))`)
      .join(',');

    const records = await base('Completions')
      .select({
        filterByFormula: `OR(${orConditions})`,
        fields: ['Assignment', 'Completion Date', 'Notes']
      })
      .all();

    return records.map(r => ({ id: r.id, ...r.fields }));
  },
  create: async fields => {
    const [record] = await base('Completions').create([{ fields }]);
    return { id: record.id, ...record.fields };
  },
  update: async (id, fields) => {
    await base('Completions').update(id, fields);
  },
  delete: async id => {
    await base('Completions').destroy([id]);
  }
};
```## src/pages/ClientDashboard.js
```jsx
// src/pages/ClientDashboard.js
import React, { useState, useEffect } from 'react';
import { auth } from '../services/auth';
import { assignments, exerciseCompletions, exercises } from '../services/airtable';
import { formatISO } from 'date-fns';

export default function ClientDashboard() {
  const [user, setUser] = useState(null);
  const [assignList, setAssignList] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [exerciseMap, setExerciseMap] = useState({});

  useEffect(() => {
    (async () => {
      const u = await auth.getCurrentUser();
      setUser(u);

      const assigns = await assignments.listForClient(u.email);
      setAssignList(assigns);

      const comps = await exerciseCompletions.listForClient(u.email);
      setCompletions(comps);

      const exList = await exercises.list();
      const map = {};
      exList.forEach(ex => { map[ex.id] = ex.Name; });
      setExerciseMap(map);
    })();
  }, []);

  const todayStr = formatISO(new Date(), { representation: 'date' });

  const handleChange = async assign => {
    const doneRecord = completions.find(
      c => c.Assignment === assign.id && c['Completion Date'] === todayStr
    );
    if (doneRecord) {
      await exerciseCompletions.delete(doneRecord.id);
    } else {
      await exerciseCompletions.create({
        Assignment: [assign.id],
        'Completion Date': todayStr
      });
    }
    const updated = await exerciseCompletions.listForClient(user.email);
    setCompletions(updated);
  };

  return (
    <div>
      <h2>Today's Exercises</h2>
      <ul>
        {assignList.map(a => {
          const done = completions.some(
            c => c.Assignment === a.id && c['Completion Date'] === todayStr
          );
          const exId = Array.isArray(a.Exercise) ? a.Exercise[0] : null;
          const exName = exerciseMap[exId] || 'Exercise';
          return (
            <li key={a.id}>
              <label>
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => handleChange(a)}
                />{' '}
                {exName} — {a.Sets}×{a.Reps}
              </label>
            </li>
          );
        })}
      </ul>
      <a href="/progress">View Progress</a>
    </div>
  );
}