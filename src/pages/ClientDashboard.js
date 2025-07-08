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