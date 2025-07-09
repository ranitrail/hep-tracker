// src/pages/PhysiotherapistDashboard.js
import React, { useState, useEffect } from 'react';
import { clients, assignments, exerciseCompletions } from '../services/airtable';
import { format, startOfWeek, endOfWeek, parseISO, isValid } from 'date-fns';

export default function PhysiotherapistDashboard() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekRange, setWeekRange] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const cl = await clients.list();
        const weekStart = startOfWeek(new Date());
        const weekEnd = endOfWeek(new Date());
        
        // Set the week range for display
        setWeekRange(`${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`);

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

        const all = await Promise.all(cl.map(async client => {
          try {
            console.log('[PhysioDashboard] Fetching for client:', client.Email);
            // Get assignments for this client
            const asg = await assignments.listForClient(client.Email);
            // Get completions for this client
            const comp = await exerciseCompletions.listForClient(client.Email);
            console.log(`[PhysioDashboard] Assignments for ${client.Email}:`, asg);
            console.log(`[PhysioDashboard] Completions for ${client.Email}:`, comp);
            
            // Count completions for this week
            const done = comp.filter(c => {
              const d = parseDate(c['Completion Date']);
              return d && d >= weekStart && d <= weekEnd;
            }).length;
            
            // Count total completions (all time)
            const totalCompleted = comp.length;
            
            // Calculate completion rate for this week
            // If they have assignments, we can calculate expected completions (7 days * assignments)
            const expectedThisWeek = asg.length * 7;
            const completionRate = expectedThisWeek > 0 
              ? Math.round((done / expectedThisWeek) * 100) 
              : 0;
            
            return { 
              name: client.Name, 
              email: client.Email,
              assigned: asg.length, 
              completedThisWeek: done,
              totalCompleted,
              completionRate,
              status: client.Status || 'Active'
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
              status: client.Status || 'Active'
            };
          }
        }));
        
        // Sort by completion rate (highest first)
        all.sort((a, b) => b.completionRate - a.completionRate);
        
        setStats(all);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setStats([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Loading dashboard data...</div>;

  return (
    <div>
      <h2>Client Summary</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>Week of {weekRange}</p>
      
      {stats.length === 0 ? (
        <p>No client data available.</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Client</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Assigned Exercises</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Completed This Week</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Weekly Completion Rate</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Total Completed</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.email} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{s.name}</td>
                  <td style={{ textAlign: 'center', padding: '8px' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '4px',
                      backgroundColor: s.status === 'Active' ? '#d4edda' : '#f8d7da',
                      color: s.status === 'Active' ? '#155724' : '#721c24',
                      fontSize: '12px'
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px' }}>{s.assigned}</td>
                  <td style={{ textAlign: 'center', padding: '8px' }}>
                    <strong>{s.completedThisWeek}</strong>
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <div style={{ 
                        width: '100px', 
                        height: '20px', 
                        backgroundColor: '#e0e0e0',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        marginRight: '8px'
                      }}>
                        <div style={{ 
                          width: `${s.completionRate}%`, 
                          height: '100%', 
                          backgroundColor: s.completionRate > 70 ? '#4caf50' : 
                                         s.completionRate > 40 ? '#ff9800' : '#f44336',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <span>{s.completionRate}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px' }}>{s.totalCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <h3>Summary Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div>
                <p style={{ margin: 0, color: '#666' }}>Total Active Clients</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                  {stats.filter(s => s.status === 'Active').length}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#666' }}>Exercises Completed This Week</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                  {stats.reduce((sum, s) => sum + s.completedThisWeek, 0)}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#666' }}>Average Completion Rate</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                  {Math.round(stats.reduce((sum, s) => sum + s.completionRate, 0) / stats.length)}%
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <a href="/clients" style={{ marginRight: '16px' }}>Manage Clients</a>
        <a href="/exercises">Exercise Library</a>
      </div>
    </div>
  );
}