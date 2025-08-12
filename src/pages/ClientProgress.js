// src/pages/ClientProgress.js
import React, { useState, useEffect } from 'react';
import { auth } from '../services/auth';
import { assignments, exerciseCompletions } from '../services/airtable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  startOfWeek, endOfWeek, format, parseISO, isValid,
  addWeeks, isSameWeek
} from 'date-fns';

export default function ClientProgress() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [streak, setStreak] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0); // for goal line

  const calculateStreak = (comps) => {
    if (!comps || comps.length === 0) return 0;
    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        let d = parseISO(dateStr);
        if (isValid(d)) return d;
        d = new Date(dateStr);
        if (isValid(d)) return d;
        return null;
      };

      const valid = comps
        .map(c => parseDate(c['Completion Date']))
        .filter(Boolean)
        .map(d => format(d, 'yyyy-MM-dd'))
        .filter(s => s <= todayStr);

      if (valid.length === 0) return 0;

      const sorted = [...new Set(valid)].sort().reverse();
      let current = 0;
      let cur = new Date(today);

      for (let i = 0; i < 365; i++) {
        const ds = format(cur, 'yyyy-MM-dd');
        if (sorted.includes(ds)) {
          current++;
          cur.setDate(cur.getDate() - 1);
        } else {
          break;
        }
      }
      return current;
    } catch (e) {
      console.error('Error calculating streak:', e);
      return 0;
    }
  };

  const updateStreak = (comps) => setStreak(calculateStreak(comps));

  const parseDateSafe = (dateStr) => {
    if (!dateStr) return null;
    let d = parseISO(dateStr);
    if (isValid(d)) return d;
    d = new Date(dateStr);
    if (isValid(d)) return d;
    return null;
  };

  const generateDailyDataForWeek = (weekStart, comps) => {
    const weekEnd = endOfWeek(weekStart);
    const days = [];
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      const dayStr = format(d, 'yyyy-MM-dd');
      const completed = comps?.filter(c => {
        const cd = parseDateSafe(c['Completion Date']);
        if (!cd) return false;
        return format(cd, 'yyyy-MM-dd') === dayStr;
      }).length ?? 0;

      days.push({
        day: format(d, 'EEE'),
        date: format(d, 'MM/dd'),
        completed,
        fullDate: format(d, 'MMM dd, yyyy')
      });
    }
    return days;
    };

  // Load data whenever the selected week changes
  useEffect(() => {
    (async () => {
      try {
        const user = await auth.getCurrentUser();
        const [comps, assigns] = await Promise.all([
          exerciseCompletions.listForClient(user.email),
          assignments.listForClient(user.email)
        ]);

        setAssignedCount(assigns?.length || 0);
        updateStreak(comps);

        const daily = generateDailyDataForWeek(startOfWeek(selectedDate), comps);
        setData(daily);
      } catch (err) {
        console.error('Error loading progress data:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate]);

  // When the Today page saves, re-compute the streak (and refresh chart for the current week)
  useEffect(() => {
    const handler = async () => {
      try {
        const user = await auth.getCurrentUser();
        const [comps, assigns] = await Promise.all([
          exerciseCompletions.listForClient(user.email),
          assignments.listForClient(user.email)
        ]);
        setAssignedCount(assigns?.length || 0);
        updateStreak(comps);
        const daily = generateDailyDataForWeek(startOfWeek(new Date()), comps);
        // If we're viewing the current week, refresh the chart
        if (isSameWeek(selectedDate, new Date())) setData(daily);
      } catch (e) {
        console.error('Error updating streak/chart:', e);
      }
    };
    window.addEventListener('completion-updated', handler);
    return () => window.removeEventListener('completion-updated', handler);
  }, [selectedDate]);

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);

  const streakColor =
    streak >= 7 ? 'var(--success)' :
    streak >= 3 ? 'var(--warn)' :
    'var(--muted)';

  const dailyGoal = assignedCount > 0 ? assignedCount : null; // optional goal line

  if (loading) return <div>Loading progress data...</div>;

  return (
    <div>
      <h2>Weekly Progress</h2>

      {/* Week navigator */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setSelectedDate(addWeeks(selectedDate, -1))}>Previous Week</button>
        <span style={{ margin: '0 8px' }}>
          {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
        </span>
        <button onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}>Next Week</button>
        <button
          onClick={() => setSelectedDate(new Date())}
          disabled={isSameWeek(selectedDate, new Date())}
          style={{ marginLeft: 'auto' }}
        >
          Today
        </button>
      </div>

      {/* Week title + streak */}
      <div style={{
        textAlign: 'center',
        margin: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '18px', fontWeight: '500' }}>
          Week of {format(weekStart, 'MMM dd')}–{format(weekEnd, 'MMM dd')}
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '14px',
          color: 'var(--muted)',
          padding: '4px 12px',
          backgroundColor: 'var(--bg)',
          borderRadius: 'var(--radius)',
          border: '1px solid #e5e7eb'
        }}>
          <span>🔥</span>
          <span>Streak: <strong style={{ color: streakColor }}>{streak}</strong> days</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#e0e0e0" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
          <YAxis
            allowDecimals={false}
            domain={[0, 'dataMax + 1']}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            label={{ value: 'Exercises Completed', angle: -90, position: 'insideLeft', style: { fill: 'var(--text)' } }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                return (
                  <div style={{
                    backgroundColor: 'var(--card)',
                    padding: 'var(--sp-3)',
                    border: '1px solid #e5e7eb',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow)'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>
                      {payload[0].payload.fullDate}
                    </p>
                    <p style={{ margin: 0, color: 'var(--primary)' }}>
                      Completed: <strong>{payload[0].value}</strong>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="completed"
            fill="var(--primary)"
            isAnimationActive
            animationBegin={0}
            animationDuration={300}
            animationEasing="ease-out"
            radius={[4, 4, 0, 0]}
            name="Exercises Completed"
          />
          {typeof dailyGoal === 'number' && dailyGoal > 0 && (
            <ReferenceLine
              y={dailyGoal}
              stroke="var(--success)"
              strokeDasharray="3 3"
              label={{ value: 'Daily goal', position: 'right', fill: 'var(--success)', fontSize: 12 }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px' }}>
        <a href="/my-exercises">← Back to Exercises</a>
      </div>
    </div>
  );
}
