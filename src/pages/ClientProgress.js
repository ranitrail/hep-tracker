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
  const [assignedCount, setAssignedCount] = useState(0);

  const parseDateSafe = (s) => {
    if (!s) return null;
    let d = parseISO(s); if (isValid(d)) return d;
    d = new Date(s); return isValid(d) ? d : null;
  };

  const makeWeek = (ws, comps) => {
    const we = endOfWeek(ws), arr = [];
    for (let d = new Date(ws); d <= we; d.setDate(d.getDate() + 1)) {
      const key = format(d, 'yyyy-MM-dd');
      const completed = comps?.filter(c => {
        const cd = parseDateSafe(c['Completion Date']); return cd && format(cd, 'yyyy-MM-dd') === key;
      }).length ?? 0;
      arr.push({ day: format(d, 'EEE'), date: format(d, 'dd/MM'), fullDate: format(d, 'MMM dd, yyyy'), completed });
    }
    return arr;
  };

  useEffect(() => {
    (async () => {
      try {
        const user = await auth.getCurrentUser();
        const [comps, assigns] = await Promise.all([
          exerciseCompletions.listForClient(user.email),
          assignments.listForClient(user.email)
        ]);
        setAssignedCount(assigns?.length || 0);
        setData(makeWeek(startOfWeek(selectedDate), comps));
      } catch (e) {
        console.error(e); setData([]);
      } finally { setLoading(false); }
    })();
  }, [selectedDate]);

  // refresh chart when Today page saves (only if viewing current week)
  useEffect(() => {
    const h = async () => {
      try {
        const user = await auth.getCurrentUser();
        const comps = await exerciseCompletions.listForClient(user.email);
        if (isSameWeek(selectedDate, new Date())) setData(makeWeek(startOfWeek(new Date()), comps));
      } catch (e) { console.error(e); }
    };
    window.addEventListener('completion-updated', h);
    return () => window.removeEventListener('completion-updated', h);
  }, [selectedDate]);

  const ws = startOfWeek(selectedDate), we = endOfWeek(selectedDate);
  const dailyGoal = assignedCount > 0 ? assignedCount : null;

  if (loading) {
    return (
      <div className="progress-page">
        <div className="pg-header">
          <h2>Weekly Progress</h2>
          <div className="nav-row">
            <div className="btn skeleton" style={{ width: 140 }} />
            <div className="week-title skeleton" style={{ width: 260 }} />
            <div className="btn skeleton" style={{ width: 140 }} />
          </div>
        </div>
        <div className="chart-skeleton">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="bar-skeleton" />)}
        </div>
        <style>{skeletonCss}</style>
        <style>{progressCss}</style>
      </div>
    );
  }

  return (
    <div className="progress-page">
      <div className="pg-header">
        <h2>Weekly Progress</h2>

        <div className="nav-row">
          <button className="btn" onClick={() => setSelectedDate(addWeeks(selectedDate, -1))}>Previous Week</button>
          <div className="week-title">{format(ws, 'MMM dd')} - {format(we, 'MMM dd, yyyy')}</div>
          <button className="btn" onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}>Next Week</button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={330}>
        <BarChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 56 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#e0e0e0" />
          <XAxis dataKey="day" interval={0} tick={<CustomTick />} tickMargin={14} />
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
                  <div style={{ background: 'var(--card)', padding: 'var(--sp-3)', border: '1px solid #e5e7eb', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{payload[0].payload.fullDate}</p>
                    <p style={{ margin: 0, color: 'var(--primary)' }}>Completed: <strong>{payload[0].value}</strong></p>
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
          />
          {typeof dailyGoal === 'number' && dailyGoal > 0 && (
            <ReferenceLine y={dailyGoal} stroke="var(--success)" strokeDasharray="3 3" label={{ value: 'Daily goal', position: 'right', fill: 'var(--success)', fontSize: 12 }} />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* No extra "Back to Exercises" link; tabs handle navigation */}
      <style>{progressCss}</style>
    </div>
  );
}

/* Day + Date stacked, with space from axis */
function CustomTick({ x, y, payload }) {
  const day = payload.value;
  const date = payload?.payload?.date;
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="var(--muted)" fontSize="12">
        <tspan dy="0">{day}</tspan>
        <tspan x="0" dy="14" fill="var(--muted)">{date}</tspan>
      </text>
    </g>
  );
}

/* Header/buttons + mobile wrap + overflow guard */
const progressCss = `
.progress-page{ overflow-x: hidden; }
.pg-header{ display:flex; flex-direction:column; align-items:center; gap:10px; margin-bottom:12px; }
.pg-header h2{ margin:8px 0 2px; font-size: var(--h1); font-weight:700; color: var(--text); }
.nav-row{ display:flex; align-items:center; gap:12px; margin-top:2px; flex-wrap: wrap; justify-content: center; }
.week-title{ min-width: 220px; text-align:center; font-weight:600; color: var(--text); }
.btn{ appearance:none; border: 1px solid #e5e7eb; background: #fff; color: var(--text);
      padding: 8px 14px; border-radius: 10px; font-weight:600; box-shadow: var(--shadow);
      transition: transform .06s ease, box-shadow .2s ease, background-color .2s ease, color .2s ease; }
.btn:hover{ background: rgba(79,70,229,.10); color: var(--primary); }
`;

/* Skeletons */
const skeletonCss = `
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
.skeleton{ background:#f3f4f6; background-image:linear-gradient(90deg,#f3f4f6 0,#e5e7eb 40px,#f3f4f6 80px); background-size:400px 100%; animation: shimmer 1.2s infinite linear; border-radius: var(--radius); }
.chart-skeleton{ display:grid; grid-template-columns:repeat(7,1fr); gap:14px; height:330px; align-items:end; margin-top:10px; }
.bar-skeleton{ height:60%; border-radius:6px; background:#f3f4f6; background-image:linear-gradient(90deg,#f3f4f6 0,#e5e7eb 40px,#f3f4f6 80px); background-size:400px 100%; animation: shimmer 1.2s infinite linear; }
`;
