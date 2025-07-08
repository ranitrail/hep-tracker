// src/pages/ExerciseLibrary.js
import React, { useState, useEffect } from 'react';
import { exercises } from '../services/airtable';

export default function ExerciseLibrary() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => { exercises.list().then(setList); }, []);

  const handleAdd = async () => {
    const rec = await exercises.create({
      Name: name,
      Description: desc
    });
    setList(prev => [...prev, { id: rec.id, Name: name, Description: desc }]);
    setName(''); setDesc('');
  };

  return (
    <div>
      <h2>Exercise Library</h2>
      <ul>
        {list.map(e => <li key={e.id}>{e.Name}: {e.Description}</li>)}
      </ul>
      <h3>Add New Exercise</h3>
      <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
      <button onClick={handleAdd}>Add</button>
    </div>
  );
}