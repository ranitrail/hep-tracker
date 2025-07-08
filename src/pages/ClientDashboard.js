// src/pages/ClientDashboard.js
import React, { useState, useEffect } from 'react';
import { auth } from '../services/auth';
import { assignments, exerciseCompletions, exercises } from '../services/airtable';
import { formatISO } from 'date-fns';
import Button from '../components/ui/Button';

export default function ClientDashboard() {
  const [user, setUser] = useState(null);
  const [assignList, setAssignList] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [exerciseMap, setExerciseMap] = useState({});
  const [selections, setSelections] = useState({});
  const [initialSelections, setInitialSelections] = useState({});
  const [compMap, setCompMap] = useState({});

  useEffect(() => {
    (async () => {
      const u = await auth.getCurrentUser();
      setUser(u);

      // load assignments + existing completions
      const assigns = await assignments.listForClient(u.email);
      const comps = await exerciseCompletions.listForClient(u.email);
      setAssignList(assigns);
      setCompletions(comps);

      // build selection state + compMap
      const sel = {};
      const initSel = {};
      const cmap = {};
      comps.forEach(c => {
        const aid = Array.isArray(c.Assignment) ? c.Assignment[0] : c.Assignment;
        sel[aid] = true;
        initSel[aid] = true;
        cmap[aid] = c.id;
      });
      assigns.forEach(a => {
        if (!(a.id in sel)) sel[a.id] = false;
        if (!(a.id in initSel)) initSel[a.id] = false;
      });
      setSelections(sel);
      setInitialSelections(initSel);
      setCompMap(cmap);

      // exercise name lookup
      const exList = await exercises.list();
      const map = {};
      exList.forEach(ex => (map[ex.id] = ex.Name));
      setExerciseMap(map);
    })();
  }, []);

  const todayStr = formatISO(new Date(), { representation: 'date' });

  // toggle UI state only
  const toggleSelection = aid => {
    setSelections(s => ({ ...s, [aid]: !s[aid] }));
  };

  // send diffs to Airtable
  const handleSend = async () => {
    for (const aid of Object.keys(selections)) {
      const was = initialSelections[aid];
      const now = selections[aid];
      if (now && !was) {
        await exerciseCompletions.create({
          Assignment: [aid],
          'Completion Date': todayStr
        });
      } else if (!now && was) {
        const cid = compMap[aid];
        if (cid) await exerciseCompletions.delete(cid);
      }
    }
    // refresh
    const updated = await exerciseCompletions.listForClient(user.email);
    setCompletions(updated);
    setInitialSelections({ ...selections });
    const newMap = {};
    updated.forEach(c => {
      const aid = Array.isArray(c.Assignment) ? c.Assignment[0] : c.Assignment;
      newMap[aid] = c.id;
    });
    setCompMap(newMap);
    alert('Saved!');
  };

  return (
    <div>
      <h2>Today's Exercises</h2>
      <ul>
        {assignList.map(a => {
          const done = selections[a.id];
          const exId = Array.isArray(a.Exercise) ? a.Exercise[0] : a.Exercise;
          const exName = exerciseMap[exId] || 'Exercise';
          return (
            <li key={a.id}>
              <label>
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggleSelection(a.id)}
                />{' '}
                {exName} — {a.Sets}×{a.Reps}
              </label>
            </li>
          );
        })}
      </ul>
      <Button onClick={handleSend}>Send</Button>
      <a href="/progress" style={{ marginLeft: 16 }}>View Progress</a>
    </div>
  );
}
