// src/pages/ClientDashboard.js
import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { auth } from '../services/auth';
import { assignments, exerciseCompletions, exercises } from '../services/airtable';
import Button from '../components/ui/Button';

export default function ClientDashboard() {
  const [user, setUser] = useState(null);
  const [assignList, setAssignList] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [exerciseMap, setExerciseMap] = useState({});
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showCelebration, setShowCelebration] = useState(false);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // ---- Utilities ----
  const vibrate = (ms = 15) => {
    // Subtle haptics on supported devices; respects reduced motion
    try {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      if ('vibrate' in navigator) navigator.vibrate(ms);
    } catch (_) {}
  };

  const displayToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  // Progress numbers
  const { totalExercises, completedToday, completionPercentage } = useMemo(() => {
    const total = assignList.length;
    const completed = Object.values(selections).filter(Boolean).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalExercises: total, completedToday: completed, completionPercentage: pct };
  }, [assignList.length, selections]);

  // Show “Great job!” once per day
  useEffect(() => {
    const key = `celebration-${todayStr}`;
    const already = localStorage.getItem(key);
    if (!already && completedToday === totalExercises && totalExercises > 0) {
      setShowCelebration(true);
      localStorage.setItem(key, 'true');
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [completedToday, totalExercises, todayStr]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const u = await auth.getCurrentUser();
      setUser(u);

      const [assigns, comps, exList] = await Promise.all([
        assignments.listForClient(u.email),
        exerciseCompletions.listForClient(u.email),
        exercises.list()
      ]);

      setAssignList(assigns);
      setCompletions(comps);

      // Exercise name lookup
      const map = {};
      exList.forEach(ex => (map[ex.id] = ex.Name));
      setExerciseMap(map);

      // Build selection state from **today’s** completions
      const todays = comps.filter(c => {
        const compDate = c['Completion Date'];
        const dateStr = typeof compDate === 'string'
          ? compDate.split('T')[0]
          : format(new Date(compDate), 'yyyy-MM-dd');
        return dateStr === todayStr;
      });

      const sel = {};
      assigns.forEach(a => {
        const doneToday = todays.some(c => {
          const aid = Array.isArray(c.Assignment) ? c.Assignment[0] : c.Assignment;
          return aid === a.id;
        });
        sel[a.id] = doneToday;
      });
      setSelections(sel);
    } catch (err) {
      console.error('Error loading data:', err);
      setMessage('Error loading data. Please refresh the page.');
    }
  };

  const toggleSelection = (aid) => {
    vibrate(12);
    setSelections(s => ({ ...s, [aid]: !s[aid] }));
  };

  const markAllComplete = () => {
    if (!assignList.length) return;
    if (!window.confirm('Mark all exercises complete for today?')) return;
    const next = {};
    assignList.forEach(a => (next[a.id] = true));
    setSelections(next);
    vibrate(18);
  };

  const clearAll = () => {
    if (!assignList.length) return;
    const next = Object.fromEntries(assignList.map(a => [a.id, false]));
    setSelections(next);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Completions that are already saved for today
      const todays = completions.filter(c => {
        const compDate = c['Completion Date'];
        const dateStr = typeof compDate === 'string'
          ? compDate.split('T')[0]
          : format(new Date(compDate), 'yyyy-MM-dd');
        return dateStr === todayStr;
      });

      const todayCompMap = {};
      todays.forEach(c => {
        const aid = Array.isArray(c.Assignment) ? c.Assignment[0] : c.Assignment;
        todayCompMap[aid] = c.id;
      });

      // Create/delete for each assignment
      for (const aid of Object.keys(selections)) {
        const isSelected = selections[aid];
        const hasToday = aid in todayCompMap;

        if (isSelected && !hasToday) {
          await exerciseCompletions.create({ Assignment: [aid], 'Completion Date': todayStr });
        } else if (!isSelected && hasToday) {
          await exerciseCompletions.delete(todayCompMap[aid]);
        }
      }

      await loadData();
      displayToast('Progress saved successfully!', 'success');
      vibrate(18);

      // notify progress screen to update streak
      window.dispatchEvent(new CustomEvent('completion-updated'));

      setTimeout(() => setLoading(false), 1000);
    } catch (err) {
      console.error('Error saving:', err);
      displayToast('Error saving progress. Please try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Today’s Exercises — {format(today, 'EEEE, MMM d')}</h2>

      {/* message box (errors, etc.) */}
      {message && (
        <div
          style={{
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '4px',
            backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
            color: message.includes('Error') ? '#721c24' : '#155724',
            border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`
          }}
        >
          {message}
        </div>
      )}

      {/* Today summary */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '12px'
        }}
      >
        <h3 style={{ margin: '0 0 10px 0' }}>Today’s Progress</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#007bff' }}>
              {completedToday}
            </span>
            <span style={{ fontSize: '24px', color: '#6c757d' }}> / {totalExercises}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                width: '100%',
                height: '30px',
                backgroundColor: '#e9ecef',
                borderRadius: '15px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${completionPercentage}%`,
                  height: '100%',
                  backgroundColor: completionPercentage === 100 ? '#28a745' : '#007bff',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
              {completionPercentage}% Complete
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      {assignList.length > 0 && (
        <div style={{ display: 'flex', gap: 8, margin: '8px 0 12px' }}>
          <button onClick={markAllComplete}>Mark all complete</button>
          <button onClick={clearAll}>Clear all</button>
        </div>
      )}

      {/* Exercise cards */}
      {assignList.length === 0 ? (
        <p>No exercises assigned yet. Please contact your physiotherapist.</p>
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            {assignList.map(a => {
              const done = selections[a.id] || false;
              const exId = Array.isArray(a.Exercise) ? a.Exercise[0] : a.Exercise;
              const exName = exerciseMap[exId] || 'Exercise';

              return (
                <div
                  key={a.id}
                  className="exercise-card"
                  style={{
                    width: '100%',
                    padding: 'var(--sp-4)',
                    marginBottom: 'var(--sp-2)',
                    backgroundColor: done ? 'rgba(16, 185, 129, 0.08)' : 'var(--card)',
                    border: `2px solid ${done ? 'var(--success)' : '#dee2e6'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s, box-shadow 0.2s, transform .06s',
                    boxShadow: 'var(--shadow)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => toggleSelection(a.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSelection(a.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={done}
                  aria-label={`${exName} - ${a.Sets} sets × ${a.Reps} reps`}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '44px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          margin: '0 0 var(--sp-1) 0',
                          fontSize: '18px',
                          fontWeight: '600',
                          color: 'var(--text)'
                        }}
                      >
                        {exName}
                      </h3>
                      <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
                        {a.Sets} × {a.Reps}
                      </p>
                    </div>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: done ? 'var(--success)' : 'transparent',
                        border: `2px solid ${done ? 'var(--success)' : '#dee2e6'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {done && (
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Link to weekly view ONLY (no second Save button here) */}
          <div style={{ marginBottom: '12px' }}>
            <a href="/progress">View Weekly Progress →</a>
          </div>
        </>
      )}

      {/* Sticky Save bar (single primary action) */}
      <div
        className="sticky-action"
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--card)',
          borderTop: '1px solid #e5e7eb',
          padding: 'var(--sp-3) var(--sp-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 20,
          marginTop: 'var(--sp-6)'
        }}
      >
        <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
          {completedToday}/{totalExercises} done
        </div>
        <Button
          onClick={handleSave}
          disabled={loading}
          style={{
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            minHeight: '44px',
            padding: 'var(--sp-2) var(--sp-4)'
          }}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Top toast */}
      {showToast && (
        <div
          className="toast"
          style={{
            position: 'fixed',
            top: 'calc(8px + env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: toastType === 'success' ? 'var(--success)' : 'var(--danger)',
            color: 'white',
            padding: 'var(--sp-3) var(--sp-4)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '90vw',
            textAlign: 'center'
          }}
          aria-live="polite"
          role="status"
        >
          {toastMessage}
        </div>
      )}

      {/* Celebration */}
      {showCelebration && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(60px + env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9998,
            background: 'var(--success)',
            color: 'white',
            padding: 'var(--sp-3) var(--sp-4)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            fontSize: '16px',
            fontWeight: '600',
            textAlign: 'center',
            maxWidth: '90vw'
          }}
          aria-live="polite"
          role="status"
        >
          Great job! 🎉 All exercises complete.
        </div>
      )}

      {/* Local CSS for card animation + reduced motion */}
      <style>{`
        .exercise-card:active { transform: scale(.98); }
        @media (prefers-reduced-motion: reduce) {
          .exercise-card { transition: none !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
}
