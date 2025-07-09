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
                  style={{
                    padding: '15px',
                    marginBottom: '10px',
                    backgroundColor: done ? '#e7f3ff' : '#f8f9fa',
                    border: `2px solid ${done ? '#007bff' : '#dee2e6'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => toggleSelection(a.id)}
                >
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={done}
                      readOnly
                      style={{
                        width: '20px',
                        height: '20px',
                        marginRight: '15px',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '18px' }}>{exName}</strong>
                      <div style={{ color: '#6c757d', marginTop: '5px' }}>
                        {a.Sets} sets × {a.Reps} reps
                      </div>
                    </div>
                    {done && (
                      <span style={{ color: '#28a745', fontSize: '24px' }}>✓</span>
                    )}
                  </label>
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