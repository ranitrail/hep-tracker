// src/pages/ClientManagement.js
import React, { useState, useEffect } from 'react';
import { clients, exercises, assignments } from '../services/airtable';
import Button from '../components/ui/Button';

export default function ClientManagement() {
  const [clientList, setClientList] = useState([]);
  const [exerciseList, setExerciseList] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedEx, setSelectedEx] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);

  useEffect(() => {
    clients.list().then(setClientList);
    exercises.list().then(setExerciseList);
  }, []);

  const handleAssign = async () => {
    if (!selectedClient || !selectedEx) {
      alert('Please select both a client and an exercise.');
      return;
    }

    await assignments.create({
      Client: [selectedClient],   // linked-record takes an array of record IDs
      Exercise: [selectedEx], 
      Sets: sets,
      Reps: reps
    });
    alert('Assigned successfully!');
  };

  return (
    <div>
      <h2>Assign Exercises</h2>

      <label>
        Client:{' '}
        <select
          value={selectedClient}
          onChange={e => setSelectedClient(e.target.value)}
        >
          <option value="">-- Select client --</option>
          {clientList.map(c => (
            <option key={c.id} value={c.id}>
              {c.Name}
            </option>
          ))}
        </select>
      </label>
      <br />

      <label>
        Exercise:{' '}
        <select
          value={selectedEx}
          onChange={e => setSelectedEx(e.target.value)}
        >
          <option value="">-- Select exercise --</option>
          {exerciseList.map(ex => (
            <option key={ex.id} value={ex.id}>
              {ex.Name}
            </option>
          ))}
        </select>
      </label>
      <br />

      <label>
        Sets:{' '}
        <input
          type="number"
          value={sets}
          onChange={e => setSets(+e.target.value)}
          min={1}
        />
      </label>
      <label style={{ marginLeft: '1em' }}>
        Reps:{' '}
        <input
          type="number"
          value={reps}
          onChange={e => setReps(+e.target.value)}
          min={1}
        />
      </label>
      <br />

      <Button onClick={handleAssign}>Assign</Button>
    </div>
  );
}
