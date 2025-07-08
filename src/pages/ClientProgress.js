// src/pages/ClientProgress.js
import React, { useState, useEffect } from 'react';
import { auth } from '../services/auth';
import { clients, exerciseCompletions } from '../services/airtable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  startOfWeek, endOfWeek, eachWeekOfInterval,
  format, parseISO
} from 'date-fns';

export default function ClientProgress() {
  const [data, setData] = useState([]);

  useEffect(() => {
    (async () => {
      const user = await auth.getCurrentUser();
      const clientRec = await clients.findByEmail(user.email);
      const comps = await exerciseCompletions.listForClient(user.email);

      // Determine chart start date:
      let startDate;
      if (clientRec['Date Joined']) {
        startDate = parseISO(clientRec['Date Joined']);
      } else if (comps.length) {
        startDate = parseISO(
          comps.reduce(
            (min, c) => c['Completion Date'] < min ? c['Completion Date'] : min,
            comps[0]['Completion Date']
          )
        );
      } else {
        startDate = new Date();
      }

      const today = new Date();
      const weeks = eachWeekOfInterval({
        start: startOfWeek(startDate),
        end: today
      });

      const chartData = weeks.map(wStart => {
        const wEnd = endOfWeek(wStart);
        const completed = comps.filter(c => {
          const d = parseISO(c['Completion Date']);
          return d >= wStart && d <= wEnd;
        }).length;
        return { week: format(wStart, 'MM/dd'), completed };
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
          <YAxis allowDecimals={false} />   {/* whole-number ticks only */}
          <Tooltip />
          <Bar dataKey="completed" name="Completed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
