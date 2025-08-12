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

  // ---------- helpers ----------
  const parseDateSafe = (dateStr) => {
    if (!dateStr) return null;
    let d = parseISO(dateStr);
    if (isValid(d)) return d;
    d = new Date(dateStr);
    if (isValid(d)) return d;
    return null;
  };

  const calculateStreak = (comps) => {
    if (!comps || comps.length === 0) return 0;
    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      const valid = comps
        .map(c => parseDateSafe(c['Completion Date']))
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
        } else break;
      }
      return current;
    } catch (e) {
      console.error('Error calculating streak:', e);
      return 0;
    }
  };

  const updateStreak = (comps) => setStreak(calculateStreak(comps));

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
        date: format(d, 'dd/MM'), // 10/08 etc.
        completed,
        fullDate: format(d, 'MMM dd, yyyy')
      });
    }
    return days;
  };

  // ---------- data loads ----------
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

  // refresh streak/chart after Today page saves
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
        if (isSameWeek(selectedDate, new Date())) {
          const daily = generateDailyDataForWeek(startOfWeek(new Date()), comps);
          setData(daily);
        }
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
  const dailyGoal = assignedCount > 0 ? assignedCount : null;

  // ---------- skeleton while loading ----------
  if (loading) {
    return (
      <div>
        <div className="pg-header">
          <h2>Weekly Progress</h2>
          <div className="streak-chip skeleton" style={{ width: 140, height: 28 }} />
          <div className="nav-row">
            <div className="btn skeleton" style={{ width: 120 }} />
            <div className="week-title skeleton" style={{ width: 220 }} />
            <div className="btn skeleton" style={{ width: 120 }} />
          </div>
        </div>
        <div className="chart-skeleton">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bar-skeleton" />
          ))}
        </div>

        <style>{skeletonCss}</style>
        <style>{progressCss}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Centered header stack */}
      <div className="pg-header">
        <h2>Weekly Progress</h2>

        <div className="streak-chip" style={{ color: 'var(--muted)' }}>
          <span role="img" aria-label="streak">🔥</span>
          <span>Streak:&nbsp;<strong style={{ color: streakColor }}>{streak}</strong>&nbsp;days</span>
        </div>

        <div className="nav-row">
          <button className="btn" onClick={() => setSelectedDate(addWeeks(selectedDate, -1))}>
            Previous Week
          </button>
          <div className="week-title">
            {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
          </div>
          <button className="btn" onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}>
            Next Week
          </button>
        </div>
      </div>

      {/* Chart with 2-line X ticks */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#e0e0e0" />
          <XAxis dataKey="day" tick={<CustomTick />} />
          <YAxis
            allowDecimals={false}
            domain={[0, 'dataMax + 1']}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            label={{ value: 'Completed', angle: -90, position: 'insideLeft', style: { fill: 'var(--text)' } }}
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

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <a href="/my-exercises" className="link">← Back to Exercises</a>
      </div>

      {/* local CSS for header/buttons */}
      <style>{progressCss}</style>
    </div>
  );
}

/** Custom two-line X-axis tick: Day on top, date under */
function CustomTick({ x, y, payload }) {
  const day = payload.value;
  const date = payload?.payload?.date;
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="var(--muted)" fontSize="12">
        <tspan dy="0">{day}</tspan>
        <tspan x={0} dy="14" fill="var(--muted)">{date}</tspan>
      </text>
    </g>
  );
}

/** Pretty header/buttons + layout */
const progressCss = `
.pg-header{
  display:flex; flex-direction:column; align-items:center; gap:10px; margin-bottom:12px;
}
.pg-header h2{
  margin: 8px 0 2px; font-size: 22px; font-weight: 700; color: var(--text);
}
.streak-chip{
  display:flex; align-items:center; gap:8px;
  padding: 6px 12px; border:1px solid #e5e7eb; border-radius: var(--radius);
  background: var(--bg);
}
.nav-row{
  display:flex; align-items:center; gap:12px; margin-top: 2px;
}
.week-title{
  min-width: 240px; text-align:center; font-weight:600; color: var(--text);
}
.btn{
  appearance:none; border: 1px solid #e5e7eb; background: #fff; color: var(--text);
  padding: 8px 14px; border-radius: 10px; font-weight:600; box-shadow: var(--shadow);
  transition: transform .06s ease, box-shadow .2s ease, background-color .2s ease;
}
.btn:hover{ transform: translateY(-1px); }
.btn:active{ transform: translateY(0); }
.link{ color: var(--primary); text-decoration: none; font-weight: 600; }
.link:hover{ text-decoration: underline; }
`;

/** Simple skeleton styles */
const skeletonCss = `
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.skeleton{
  background: #f3f4f6;
  background-image: linear-gradient(90deg, #f3f4f6 0px, #e5e7eb 40px, #f3f4f6 80px);
  background-size: 400px 100%;
  animation: shimmer 1.2s infinite linear;
  border-radius: var(--radius);
}
.chart-skeleton{
  display:grid; grid-template-columns: repeat(7, 1fr); gap: 14px; height: 320px; align-items: end;
  margin-top: 10px;
}
.bar-skeleton{
  height: 60%; border-radius: 6px;
  background: #f3f4f6;
  background-image: linear-gradient(90deg, #f3f4f6 0px, #e5e7eb 40px, #f3f4f6 80px);
  background-size: 400px 100%;
  animation: shimmer 1.2s infinite linear;
}
`;
