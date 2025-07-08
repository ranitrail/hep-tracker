// src/pages/PhysiotherapistDashboard.js
import React, { useState, useEffect } from 'react';
import { clients, assignments, exerciseCompletions } from '../services/airtable';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export default function PhysiotherapistDashboard() {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    (async () => {
      const cl = await clients.list();
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      const all = await Promise.all(cl.map(async client => {
        const asg = await assignments.listForClient(client.Email);
        const comp = await exerciseCompletions.listForClient(client.Email);
        const done = comp.filter(c => {
          const d = new Date(c['Completion Date']);
          return d >= weekStart && d <= weekEnd;
        }).length;
        return { name: client.Name, assigned: asg.length, completedThisWeek: done };
      }));
      setStats(all);
    })();
  }, []);

  return (
    <div>
      <h2>Client Summary (This Week)</h2>
      <table>
        <thead>
          <tr><th>Client</th><th>Assigned</th><th>Completed</th></tr>
        </thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.name}>
              <td>{s.name}</td>
              <td>{s.assigned}</td>
              <td>{s.completedThisWeek}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <a href="/clients">Manage Clients</a>
    </div>
  );
}