// src/pages/ClientProgress.js
import React, { useState, useEffect } from 'react';
import { auth } from '../services/auth';
import { clients, exerciseCompletions } from '../services/airtable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  startOfWeek, endOfWeek, eachWeekOfInterval,
  format
} from 'date-fns';

export default function ClientProgress() {
  const [data, setData] = useState([]);

  useEffect(() => {
    (async () => {
      // 1. Fetch user and their Airtable records
      const user = await auth.getCurrentUser();  
      const clientRec = await clients.findByEmail(user.email);
      const comps = await exerciseCompletions.listForClient(user.email);

      // 2. Figure out when to start the chart
      let startDate;
      if (clientRec['Date Joined']) {
        // Airtable “Date Joined” is in M/D/YYYY format, so use Date constructor
        startDate = new Date(clientRec['Date Joined']);
      } else if (comps.length) {
        // Or, fall back to the very first completion date
        const earliest = comps
          .map(c => c['Completion Date'])
          .sort((a, b) => new Date(a) - new Date(b))[0];
        startDate = new Date(earliest);
      } else {
        startDate = new Date();
      }

      // 3. Build weekly buckets up through today
      const today = new Date();
      const weeks = eachWeekOfInterval({
        start: startOfWeek(startDate),
        end: today
      });

      // 4. Count completions per week
      const chartData = weeks.map(wStart => {
        const wEnd = endOfWeek(wStart);
        const completed = comps.filter(c => {
          const d = new Date(c['Completion Date']);
          return d >= wStart && d <= wEnd;
        }).length;
        return {
          week: format(wStart, 'MM/dd'),
          completed
        };
      });

      setData(chartData);
    })();
  }, []);

  return (
    <div>
      <h2>Weekly Progress</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis allowDecimals={false} />   {/* force whole-number ticks */}
          <Tooltip />
          <Bar dataKey="completed" name="Completed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
