import React, { useState, useEffect } from 'react';
import TherapistTabs from '../components/TherapistTabs';
import { clients, assignments, exerciseCompletions } from '../services/airtable';
import { startOfWeek, endOfWeek, format, parseISO, isValid, addWeeks } from 'date-fns';

export default function PhysiotherapistDashboard() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    let date = parseISO(dateStr);
    if (isValid(date)) return date;
    date = new Date(dateStr);
    if (isValid(date)) return date;
    console.error('Invalid date:', dateStr);
    return null;
  };

  useEffect(() => {
    (async () => {
      try {
        const cl = await clients.list();
        const weekStart = startOfWeek(selectedDate);
        const weekEnd = endOfWeek(selectedDate);

        const all = await Promise.all(
          cl.map(async (client) => {
            try {
              const asg = await assignments.listForClient(client.Email);
              const comp = await exerciseCompletions.listForClient(client.Email);

              const done = comp.filter((c) => {
                const d = parseDate(c['Completion Date']);
                return d && d >= weekStart && d <= weekEnd;
              }).length;

              const totalCompleted = comp.length;
              const expectedThisWeek = asg.length * 7;
              const completionRate =
                expectedThisWeek > 0
                  ? Math.round((done / expectedThisWeek) * 100)
                  : 0;

              return {
                name: client.Name,
                email: client.Email,
                assigned: asg.length,
                completedThisWeek: done,
                totalCompleted,
                completionRate,
                status: client.Status || 'Active',
              };
            } catch (error) {
              console.error(`Error loading data for client ${client.Name}:`, error);
              return {
                name: client.Name,
                email: client.Email,
                assigned: 0,
                completedThisWeek: 0,
                totalCompleted: 0,
                completionRate: 0,
                status: client.Status || 'Active',
              };
            }
          })
        );

        all.sort((a, b) => b.completionRate - a.completionRate);
        setStats(all);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setStats([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate]);

  const ws = startOfWeek(selectedDate);
  const we = endOfWeek(selectedDate);

  if (loading) {
    return (
      <div className="container">
        <h2 style={{ textAlign: 'center' }}>Client Summary</h2>
        <TherapistTabs />
        <div className="skeleton-card big" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <style>{skeletonCss}</style>
        <style>{dashboardCss}</style>
      </div>
    );
  }

  const activeClients = stats.filter((s) => s.status === 'Active').length;
  const totalWeeklyExercises = stats.reduce((sum, s) => sum + s.completedThisWeek, 0);
  const avgCompletionRate =
    stats.length > 0
      ? Math.round(stats.reduce((sum, s) => sum + s.completionRate, 0) / stats.length)
      : 0;

  return (
    <div className="container">
      <h2 style={{ textAlign: 'center' }}>Client Summary</h2>
      <TherapistTabs />

      {/* Week Navigation */}
      <div className="pg-header">
        <div className="nav-grid">
          <div className="week-title">
            {format(ws, 'MMM dd')} - {format(we, 'MMM dd, yyyy')}
          </div>
          <button
            type="button"
            className="btn prev"
            onClick={() => setSelectedDate(addWeeks(selectedDate, -1))}
          >
            Previous Week
          </button>
          <button
            type="button"
            className="btn next"
            onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}
          >
            Next Week
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <h3 style={{ margin: '0 0 16px' }}>Week Overview</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 'var(--sp-6)',
          }}
        >
          <div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>Active Clients</p>
            <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
              {activeClients}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>Exercises This Week</p>
            <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>
              {totalWeeklyExercises}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>Avg Completion Rate</p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 24,
                fontWeight: 700,
                color:
                  avgCompletionRate > 70
                    ? 'var(--success)'
                    : avgCompletionRate > 40
                    ? 'var(--warn)'
                    : 'var(--danger)',
              }}
            >
              {avgCompletionRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Client Cards */}
      {stats.length === 0 ? (
        <div style={{ padding: 'var(--sp-4)', textAlign: 'center', color: 'var(--muted)' }}>
          No client data available.
        </div>
      ) : (
        <div>
          {stats.map((s) => (
            <div
              key={s.email}
              className="exercise-card"
              style={{
                padding: 'var(--sp-4)',
                margin: '0 0 var(--sp-2)',
                background: s.completionRate > 70 ? 'rgba(16,185,129,.08)' : 'var(--card)',
                border: `2px solid ${s.completionRate > 70 ? 'var(--success)' : '#dee2e6'}`,
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>{s.name}</h3>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
                    {s.assigned} exercises assigned
                  </p>
                </div>
                <span
                  className={`badge ${
                    s.status === 'Active' ? 'badge--active' : 'badge--inactive'
                  }`}
                >
                  {s.status}
                </span>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>Weekly Progress</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {s.completedThisWeek} / {s.assigned * 7}
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 20,
                    background: 'var(--track)',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${s.completionRate}%`,
                      height: '100%',
                      background:
                        s.completionRate > 70
                          ? 'var(--success)'
                          : s.completionRate > 40
                          ? 'var(--warn)'
                          : 'var(--danger)',
                      transition: 'width .3s',
                    }}
                  />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                  {s.completionRate}% completion rate
                </p>
              </div>

              {/* Stats Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>This Week</p>
                  <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--primary)' }}>
                    {s.completedThisWeek}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>All Time</p>
                  <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
                    {s.totalCompleted}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Completion</p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 18,
                      fontWeight: 600,
                      color:
                        s.completionRate > 70
                          ? 'var(--success)'
                          : s.completionRate > 40
                          ? 'var(--warn)'
                          : 'var(--danger)',
                    }}
                  >
                    {s.completionRate}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{dashboardCss}</style>
      <style>{skeletonCss}</style>
    </div>
  );
}

/* Header + nav grid */
const dashboardCss = `
.pg-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.nav-grid {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 560px;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    "title title"
    "prev  next";
  align-items: center;
  justify-items: stretch;
}
.nav-grid .week-title { grid-area: title; text-align: center; font-weight: 600; color: var(--text); }
.nav-grid .prev { grid-area: prev; justify-self: end; }
.nav-grid .next { grid-area: next; justify-self: start; }
@media (min-width: 768px) {
  .nav-grid {
    grid-template-columns: 1fr auto 1fr;
    grid-template-areas: "prev title next";
  }
  .nav-grid .week-title { justify-self: center; }
  .nav-grid .prev { justify-self: end; }
  .nav-grid .next { justify-self: start; }
}
`;

/* Skeletons */
const skeletonCss = `
@keyframes shimmer {
  0% { background-position: -400px 0 }
  100% { background-position: 400px 0 }
}
.skeleton {
  background: #f3f4f6;
  background-image: linear-gradient(90deg, #f3f4f6 0, #e5e7eb 40px, #f3f4f6 80px);
  background-size: 400px 100%;
  animation: shimmer 1.2s infinite linear;
  border-radius: 12px;
}
.skeleton-card { height: 72px; margin: 12px 0; }
.skeleton-card.big { height: 100px; margin-top: 8px; }
`;
