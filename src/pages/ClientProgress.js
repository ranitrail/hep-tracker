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
  format, parseISO, isValid, addWeeks
} from 'date-fns';

export default function ClientProgress() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [streak, setStreak] = useState(0);

  // Helper function to calculate streak from completions
  const calculateStreak = (completions) => {
    if (!completions || completions.length === 0) return 0;
    
    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Parse dates and filter valid completions
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        let date = parseISO(dateStr);
        if (isValid(date)) return date;
        date = new Date(dateStr);
        if (isValid(date)) return date;
        return null;
      };
      
      const validCompletions = completions
        .map(c => parseDate(c['Completion Date']))
        .filter(d => d !== null)
        .map(d => format(d, 'yyyy-MM-dd'))
        .filter(dateStr => dateStr <= todayStr); // Only count up to today
      
      if (validCompletions.length === 0) return 0;
      
      // Sort dates and find consecutive days from today backwards
      const sortedDates = [...new Set(validCompletions)].sort().reverse();
      let currentStreak = 0;
      let currentDate = new Date(today);
      
      for (let i = 0; i < 365; i++) { // Limit to 1 year to prevent infinite loops
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        if (sortedDates.includes(dateStr)) {
          currentStreak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break; // Streak broken
        }
      }
      
      return currentStreak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  };

  // Update streak when completions change
  const updateStreak = (completions) => {
    const newStreak = calculateStreak(completions);
    setStreak(newStreak);
  };

  useEffect(() => {
    (async () => {
      try {
        const user = await auth.getCurrentUser();
        console.log('[ClientProgress] Current user:', user);
        
        // Get all completions
        const comps = await exerciseCompletions.listForClient(user.email);
        console.log('[DEBUG] All completions fetched:', comps);

        // Update streak with fetched completions
        updateStreak(comps);

        if (comps.length === 0) {
          // No completions yet - show empty chart for current week
          const weekStart = startOfWeek(new Date());
          const dailyData = generateDailyDataForWeek(weekStart, []);
          setData(dailyData);
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
           Generate daily data for the selected week
        ------------------------------------------------------------- */
        const dailyData = generateDailyDataForWeek(selectedDate, comps, parseDate);
        console.log('Daily chart data:', dailyData);
        setData(dailyData);
      } catch (error) {
        console.error('Error loading progress data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate]);

  // Listen for completion updates from other components
  useEffect(() => {
    const handleCompletionUpdate = () => {
      // Re-fetch completions to update streak
      exerciseCompletions.listForClient(auth.getCurrentUser()?.email || '')
        .then(comps => updateStreak(comps))
        .catch(error => console.error('Error updating streak:', error));
    };

    // Listen for custom events when completions are saved
    window.addEventListener('completion-updated', handleCompletionUpdate);
    
    return () => {
      window.removeEventListener('completion-updated', handleCompletionUpdate);
    };
  }, []);

  // Helper function to generate daily data for a week
  const generateDailyDataForWeek = (weekStart, completions, parseDate = null) => {
    const weekEnd = endOfWeek(weekStart);
    const days = [];
    
    // Generate array of all days in the week
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      const dayStr = format(d, 'yyyy-MM-dd');
      let completed = 0;
      
      if (completions.length > 0 && parseDate) {
        // Count completions for this specific day
        completed = completions.filter(c => {
          const compDate = parseDate(c['Completion Date']);
          if (!compDate) return false;
          const compDateStr = format(compDate, 'yyyy-MM-dd');
          return compDateStr === dayStr;
        }).length;
      }
      
      days.push({
        day: format(d, 'EEE'), // Mon, Tue, Wed, etc.
        date: format(d, 'MM/dd'),
        completed,
        fullDate: format(d, 'MMM dd, yyyy')
      });
    }
    
    return days;
  };

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);

  if (loading) return <div>Loading progress data...</div>;

  return (
    <div>
      <h2>Weekly Progress</h2>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setSelectedDate(addWeeks(selectedDate, -1))}>Previous Week</button>
        <span style={{ margin: '0 16px' }}>
          {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
        </span>
        <button onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}>Next Week</button>
      </div>
      
      {/* Week Title with Streak */}
      <div style={{ 
        textAlign: 'center', 
        margin: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <h3 style={{ 
          margin: 0,
          color: 'var(--text)',
          fontSize: '18px',
          fontWeight: '500'
        }}>
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
          <span>Streak: <strong style={{ color: 'var(--text)' }}>{streak}</strong> days</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          {/* Hide x-grid, keep y-grid light */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            horizontal={true}
            vertical={false}
            stroke="#e0e0e0"
          />
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
          />
          <YAxis 
            allowDecimals={false}
            domain={[0, 'dataMax + 1']} // beginAtZero equivalent
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            label={{ 
              value: 'Exercises Completed', 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: 'var(--text)' }
            }}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
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
            name="Exercises Completed"
            radius={[4, 4, 0, 0]} // Rounded top corners
          />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: '20px' }}>
        <a href="/my-exercises">← Back to Exercises</a>
      </div>
    </div>
  );
}