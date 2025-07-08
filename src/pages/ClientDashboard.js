// src/pages/ClientDashboard.js
import React, { useState, useEffect } from 'react';
import { assignments, exerciseCompletions } from '../services/airtable';
import { auth } from '../services/auth';
import { formatISO, isToday, parseISO } from 'date-fns';

export default function ClientDashboard() {
  const [user, setUser] = useState(null);
  const [assignList, setAssignList] = useState([]);
  const [completions, setCompletions] = useState([]);

  useEffect(() => {
    (async () => {
      const u = await auth.getCurrentUser();
      setUser(u);
      const a = await assignments.listForClient(u.email);
      setAssignList(a);
      const c = await exerciseCompletions.listForClient(u.email);
      setCompletions(c);
    })();
  }, []);

  const todayStr = formatISO(new Date(), { representation: 'date' });

  const handleChange = async (assign) => {
    const existing = completions.find(c => c['Assignment ID'] === assign.id && c['Completion Date'] === todayStr);
    if (existing) {
      await exerciseCompletions.delete(existing.id);
    } else {
      await exerciseCompletions.create({
        'Client Email': user.email,
        'Assignment ID': assign.id,
        'Completion Date': todayStr
      });
    }
    // Refresh
    const refreshed = await exerciseCompletions.listForClient(user.email);
    setCompletions(refreshed);
  };

  return (
    <div>
      <h2>Today's Exercises</h2>
      <ul>
        {assignList.map(a => {
          const done = completions.some(c => c['Assignment ID'] === a.id && c['Completion Date'] === todayStr);
          return (
            <li key={a.id}>
              <label>
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => handleChange(a)}
                />
                {a.ExerciseName} — {a.Sets}×{a.Reps}
              </label>
            </li>
          );
        })}
      </ul>
      <a href="/progress">View Progress</a>
    </div>
  );
}