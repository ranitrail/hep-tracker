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
  format, parseISO, isValid
} from 'date-fns';

export default function ClientProgress() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await auth.getCurrentUser();
        console.log('[ClientProgress] Current user:', user);
        
        // Get all completions
        const comps = await exerciseCompletions.listForClient(user.email);
        console.log('[ClientProgress] Completions:', comps);

        if (comps.length === 0) {
          // No completions yet - show empty chart for current week
          const weekStart = startOfWeek(new Date());
          setData([{ week: format(weekStart, 'MM/dd'), completed: 0 }]);
          setLoading(false);
          return;
        }

        /* -------------------------------------------------------------
           Helper to parse dates - Airtable returns dates in ISO format
        ------------------------------------------------------------- */
        const parseDate = (dateStr) => {
          if (!dateStr) return null;
          
          // Try parsing as ISO date first
          let date = parseISO(dateStr);
          if (isValid(date)) return date;
          
          // If that fails, try creating a new Date object
          date = new Date(dateStr);
          if (isValid(date)) return date;
          
          console.error('Invalid date:', dateStr);
          return null;
        };

        /* -------------------------------------------------------------
           Find the date range for the chart
        ------------------------------------------------------------- */
        const validDates = comps
          .map(c => parseDate(c['Completion Date']))
          .filter(d => d !== null);

        if (validDates.length === 0) {
          console.error('No valid dates found in completions');
          setData([{ week: format(startOfWeek(new Date()), 'MM/dd'), completed: 0 }]);
          setLoading(false);
          return;
        }

        const earliestDate = new Date(Math.min(...validDates));
        const latestDate = new Date(Math.max(...validDates));
        const today = new Date();
        const endDate = latestDate > today ? latestDate : today;

        /* -------------------------------------------------------------
           Build weekly buckets and count completions
        ------------------------------------------------------------- */
        const weeks = eachWeekOfInterval({
          start: startOfWeek(earliestDate),
          end: endOfWeek(endDate)
        });

        const chartData = weeks.map(wStart => {
          const wEnd = endOfWeek(wStart);
          
          // Count completions in this week
          const completed = comps.filter(c => {
            const d = parseDate(c['Completion Date']);
            return d && d >= wStart && d <= wEnd;
          }).length;
          
          return { 
            week: format(wStart, 'MM/dd'), 
            completed,
            // Add tooltip info
            fullWeek: `Week of ${format(wStart, 'MMM dd, yyyy')}`
          };
        });

        console.log('Chart data:', chartData);
        setData(chartData);
      } catch (error) {
        console.error('Error loading progress data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Loading progress data...</div>;

  return (
    <div>
      <h2>Weekly Progress</h2>
      {data.length === 0 ? (
        <p>No exercise completion data to display yet. Complete some exercises to see your progress!</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis 
              allowDecimals={false}
              label={{ value: 'Exercises Completed', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  return (
                    <div style={{ 
                      backgroundColor: 'white', 
                      padding: '10px', 
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}>
                      <p>{payload[0].payload.fullWeek}</p>
                      <p style={{ color: '#007bff' }}>
                        Completed: {payload[0].value}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="completed" fill="#007bff" name="Exercises Completed" />
          </BarChart>
        </ResponsiveContainer>
      )}
      <div style={{ marginTop: '20px' }}>
        <a href="/my-exercises">← Back to Exercises</a>
      </div>
    </div>
  );
}