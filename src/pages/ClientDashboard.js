// src/pages/ClientDashboard.js
import React, { useState, useEffect } from 'react';
import { auth } from '../services/auth';
import { assignments, exerciseCompletions, exercises } from '../services/airtable';
import { startOfWeek, endOfWeek, format, addWeeks, parseISO, isValid } from 'date-fns';
import Button from '../components/ui/Button';

export default function ClientDashboard() {
  const [user, setUser] = useState(null);
  const [assignList, setAssignList] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [exerciseMap, setExerciseMap] = useState({});
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Store today's date in ISO format
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await auth.getCurrentUser();
      setUser(u);
      console.log('[ClientDashboard] Current user:', u);
      // Load all data in parallel
      const [assigns, comps, exList] = await Promise.all([
        assignments.listForClient(u.email),
        exerciseCompletions.listForClient(u.email),
        exercises.list()
      ]);
      console.log('[ClientDashboard] Assignments:', assigns);
      console.log('[ClientDashboard] Completions:', comps);
      console.log('[ClientDashboard] Exercises:', exList);
      setAssignList(assigns);
      setCompletions(comps);
      console.log('[DEBUG] Assignments:', assigns);
      console.log('[DEBUG] Completions:', comps);

      // Build exercise name lookup
      const map = {};
      exList.forEach(ex => (map[ex.id] = ex.Name));
      setExerciseMap(map);

      // Find today's completions
      const todayCompletions = comps.filter(c => {
        const compDate = c['Completion Date'];
        // Handle both ISO format and potential date object
        const dateStr = typeof compDate === 'string' 
          ? compDate.split('T')[0] 
          : format(new Date(compDate), 'yyyy-MM-dd');
        return dateStr === todayStr;
      });

      // Build selection state based on today's completions
      const sel = {};
      assigns.forEach(a => {
        // Check if this assignment was completed today
        const completedToday = todayCompletions.some(c => {
          const assignmentId = Array.isArray(c.Assignment) ? c.Assignment[0] : c.Assignment;
          return assignmentId === a.id;
        });
        sel[a.id] = completedToday;
      });
      setSelections(sel);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please refresh the page.');
    }
  };

  const toggleSelection = (aid) => {
    setSelections(s => ({ ...s, [aid]: !s[aid] }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      // Get today's completions to manage updates
      const todayCompletions = completions.filter(c => {
        const compDate = c['Completion Date'];
        const dateStr = typeof compDate === 'string' 
          ? compDate.split('T')[0] 
          : format(new Date(compDate), 'yyyy-MM-dd');
        return dateStr === todayStr;
      });

      // Create a map of assignment ID to completion record ID for today
      const todayCompMap = {};
      todayCompletions.forEach(c => {
        const aid = Array.isArray(c.Assignment) ? c.Assignment[0] : c.Assignment;
        todayCompMap[aid] = c.id;
      });

      // Process each assignment
      for (const aid of Object.keys(selections)) {
        const isSelected = selections[aid];
        const hasCompletionToday = aid in todayCompMap;

        if (isSelected && !hasCompletionToday) {
          // Create new completion
          await exerciseCompletions.create({
            Assignment: [aid],
            'Completion Date': todayStr
          });
        } else if (!isSelected && hasCompletionToday) {
          // Delete existing completion
          await exerciseCompletions.delete(todayCompMap[aid]);
        }
      }

      // Reload data to ensure UI is in sync
      await loadData();
      setMessage('Progress saved successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      setMessage('Error saving progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate completion stats
  const totalExercises = assignList.length;
  const completedToday = Object.values(selections).filter(v => v).length;
  const completionPercentage = totalExercises > 0 
    ? Math.round((completedToday / totalExercises) * 100) 
    : 0;

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    let date = parseISO(dateStr);
    if (isValid(date)) return date;
    date = new Date(dateStr);
    if (isValid(date)) return date;
    return null;
  };
  // Find completions for the selected week
  const weekCompletions = completions.filter(c => {
    const d = parseDate(c['Completion Date']);
    return d && d >= weekStart && d <= weekEnd;
  });
  console.log('[DEBUG] Filtering for week:', weekStart, weekEnd);
  completions.forEach(c => {
    const d = parseDate(c['Completion Date']);
    const assignmentId = Array.isArray(c.Assignment) ? c.Assignment[0] : c.Assignment;
    console.log('[DEBUG] Completion:', c, 'Parsed date:', d, 'In week:', d && d >= weekStart && d <= weekEnd, 'Assignment ID:', assignmentId);
  });
  console.log('[DEBUG] Client assignments:', assignList.map(a => a.id));
  // Build selection state based on this week's completions
  useEffect(() => {
    const sel = {};
    assignList.forEach(a => {
      const completedThisWeek = weekCompletions.some(c => {
        const assignmentId = Array.isArray(c.Assignment) ? c.Assignment[0] : c.Assignment;
        return assignmentId === a.id;
      });
      sel[a.id] = completedThisWeek;
    });
    setSelections(sel);
    // eslint-disable-next-line
  }, [assignList, completions, selectedDate]);

  return (
    <div>
      <h2>Today's Exercises - {format(selectedDate, 'EEEE, MMMM d')}</h2>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setSelectedDate(addWeeks(selectedDate, -1))}>Previous Week</button>
        <span style={{ margin: '0 16px' }}>
          {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
        </span>
        <button onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}>Next Week</button>
      </div>
      
      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
          color: message.includes('Error') ? '#721c24' : '#155724',
          border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`
        }}>
          {message}
        </div>
      )}

      <div style={{
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Today's Progress</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#007bff' }}>
              {completedToday}
            </span>
            <span style={{ fontSize: '24px', color: '#6c757d' }}>
              {' '}/ {totalExercises}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              width: '100%',
              height: '30px',
              backgroundColor: '#e9ecef',
              borderRadius: '15px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${completionPercentage}%`,
                height: '100%',
                backgroundColor: completionPercentage === 100 ? '#28a745' : '#007bff',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
              {completionPercentage}% Complete
            </p>
          </div>
        </div>
      </div>

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
                    backgroundColor: done 
                      ? 'rgba(16, 185, 129, 0.08)' 
                      : 'var(--card)',
                    border: `2px solid ${done ? 'var(--success)' : '#dee2e6'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s, box-shadow 0.2s',
                    boxShadow: 'var(--shadow)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => toggleSelection(a.id)}
                  onKeyDown={(e) => {
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
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    minHeight: '44px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        margin: '0 0 var(--sp-1) 0', 
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'var(--text)'
                      }}>
                        {exName}
                      </h3>
                      <p style={{ 
                        margin: 0, 
                        color: 'var(--muted)', 
                        fontSize: '14px'
                      }}>
                        {a.Sets} × {a.Reps}
                      </p>
                    </div>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: done ? 'var(--success)' : 'transparent',
                      border: `2px solid ${done ? 'var(--success)' : '#dee2e6'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {done && (
                        <span style={{ 
                          color: 'white', 
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}>
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button 
              onClick={handleSave} 
              disabled={loading}
              style={{
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Saving...' : 'Save Progress'}
            </Button>
            <a href="/progress" style={{ marginLeft: '16px' }}>
              View Weekly Progress →
            </a>
          </div>
        </>
      )}
    </div>
  );
}