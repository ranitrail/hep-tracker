// src/pages/ClientProgress.js
import React, { useState, useEffect } from 'react';
import { auth } from '../services/auth';
import { clients, exerciseCompletions } from '../services/airtable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  startOfWeek, endOfWeek, eachWeekOfInterval,
  format, parse
} from 'date-fns';

export default function ClientProgress() {
  const [data, setData] = useState([]);

  useEffect(() => {
    (async () => {
      const user = await auth.getCurrentUser();
      const clientRec = await clients.findByEmail(user.email);
      const comps = await exerciseCompletions.listForClient(user.email);

      /* -------------------------------------------------------------
         Work out the first date to chart
      ------------------------------------------------------------- */
      let startDate;
      if (clientRec['Date Joined']) {
        startDate = new Date(clientRec['Date Joined']); // Airtable sends ISO here
      } else if (comps.length) {
        const earliest = comps
          .map(c => c['Completion Date'])
          .sort((a, b) => new Date(a) - new Date(b))[0];
        startDate = new Date(earliest);
      } else {
        startDate = new Date();
      }

      /* -------------------------------------------------------------
         Helper that safely parses either "YYYY-MM-DD" or "M/D/YYYY"
      ------------------------------------------------------------- */
      const parseDate = str =>
        str.includes('-')
          ? new Date(str)                         // ISO
          : parse(str, 'M/d/yyyy', new Date());  // Airtable UI format

      /* -------------------------------------------------------------
         Build weekly buckets and count completions
      ------------------------------------------------------------- */
      const today = new Date();
      const weeks = eachWeekOfInterval({
        start: startOfWeek(startDate),
        end: today
      });

      const chartData = weeks.map(wStart => {
        const wEnd = endOfWeek(wStart);
        const completed = comps.filter(c => {
          const d = parseDate(c['Completion Date']);
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
          <YAxis allowDecimals={false} />    {/* 0-1-2-3… */}
          <Tooltip />
          <Bar dataKey="completed" name="Completed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
