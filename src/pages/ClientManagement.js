import React, { useState, useEffect, useMemo } from 'react';
import { clients, exercises, assignments } from '../services/airtable';

export default function ClientManagement() {
  const [clientList, setClientList] = useState([]);
  const [exerciseList, setExerciseList] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');     // client record id
  const [selectedEx, setSelectedEx] = useState('');             // exercise record id
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [clientAssignments, setClientAssignments] = useState([]); // assignments for the selected client only

  // convenience lookup
  const selectedClientInfo = useMemo(
    () => clientList.find(c => c.id === selectedClient),
    [clientList, selectedClient]
  );

  const toast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  // Load clients & exercises (no assignments.list() call!)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cls, exs] = await Promise.all([
          clients.list(),       // known-good in your project
          exercises.list(),     // known-good in your project
        ]);

        if (!mounted) return;

        // normalize in case the wrapper returns Airtable raw records
        const normClients = (cls ?? []).map(r => ({
          id: r?.id ?? r?.recordId ?? r?.fields?.id ?? r?.fields?.['Record ID'] ?? r?.Email, // fallback
          Name: r?.Name ?? r?.fields?.Name ?? '',
          Email: r?.Email ?? r?.fields?.Email ?? '',
        }));
        const normExercises = (exs ?? []).map(r => ({
          id: r?.id ?? r?.recordId ?? r?.fields?.id ?? r?.fields?.['Record ID'],
          Name: r?.Name ?? r?.fields?.Name ?? '',
          Description: r?.Description ?? r?.fields?.Description ?? '',
        }));

        setClientList(normClients);
        setExerciseList(normExercises);
      } catch (e) {
        console.error('Error loading clients/exercises:', e);
        toast('Error loading data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // When a client is selected, fetch THAT client's assignments via listForClient(email)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedClient) {
        setClientAssignments([]);
        return;
      }
      const email = selectedClientInfo?.Email;
      if (!email || typeof assignments?.listForClient !== 'function') {
        setClientAssignments([]);
        return;
      }
      try {
        const asgs = await assignments.listForClient(email);
        if (!mounted) return;
        setClientAssignments(asgs ?? []);
      } catch (e) {
        console.error('Error loading assignments for client:', e);
        if (mounted) setClientAssignments([]);
      }
    })();
    return () => { mounted = false; };
  }, [selectedClient, selectedClientInfo]);

  const handleAssign = async () => {
    if (!selectedClient || !selectedEx) {
      toast('Please select both a client and an exercise');
      return;
    }
    const email = selectedClientInfo?.Email;
    if (!email) {
      toast('Selected client is missing an email');
      return;
    }

    setSaving(true);
    try {
      await assignments.create({
        Client: [selectedClient],   // linked field expects record id array
        Exercise: [selectedEx],
        Sets: sets,
        Reps: reps
      });

      toast('Exercise assigned successfully!');
      setSelectedEx('');
      setSets(3);
      setReps(10);

      // Refresh just this client's assignments
      if (typeof assignments?.listForClient === 'function') {
        const asgs = await assignments.listForClient(email);
        setClientAssignments(asgs ?? []);
      }
    } catch (error) {
      console.error('Error assigning exercise:', error);
      toast('Error assigning exercise');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <h2 style={{ textAlign: 'center' }}>Assign Exercises</h2>
        <div className="skeleton-card big" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <style>{skeletonCss}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, textAlign: 'center', flex: 1 }}>Assign Exercises</h2>
        <a className="btn" href="/dashboard" style={{ marginLeft: 12, whiteSpace: 'nowrap' }}>
          ← Back to Client Summary
        </a>
      </div>

      {/* Assignment Form */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <h3 style={{ margin: '0 0 var(--sp-4)' }}>New Assignment</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {/* Client Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Select Client *
            </label>
            <select
              className="select"
              aria-label="Select client"
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
            >
              <option value="">-- Select a client --</option>
              {clientList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.Name} ({c.Email})
                </option>
              ))}
            </select>
          </div>

          {/* Exercise Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Select Exercise *
            </label>
            <select
              className="select"
              aria-label="Select exercise"
              value={selectedEx}
              onChange={e => setSelectedEx(e.target.value)}
            >
              <option value="">-- Select an exercise --</option>
              {exerciseList.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.Name}
                </option>
              ))}
            </select>
          </div>

          {/* Sets and Reps */}
          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Sets
              </label>
              <input
                className="input"
                type="number"
                value={sets}
                min={1}
                onChange={e => setSets(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Reps
              </label>
              <input
                className="input"
                type="number"
                value={reps}
                min={1}
                onChange={e => setReps(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn"
            onClick={handleAssign}
            disabled={saving || !selectedClient || !selectedEx}
            style={{ alignSelf: 'flex-start' }}
          >
            {saving ? 'Assigning...' : 'Assign Exercise'}
          </button>
        </div>
      </div>

      {/* Selected Client's Current Assignments */}
      {selectedClient && selectedClientInfo && (
        <div>
          <div className="card" style={{ marginBottom: '12px' }}>
            <h3 style={{ margin: '0 0 10px' }}>
              Current Assignments for {selectedClientInfo.Name}
            </h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
              {clientAssignments.length} exercise{clientAssignments.length !== 1 ? 's' : ''} assigned
            </p>
          </div>

          {clientAssignments.length === 0 ? (
            <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--muted)', background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid #e5e7eb' }}>
              No exercises assigned yet. Assign one above!
            </div>
          ) : (
            <div>
              {clientAssignments.map(assignment => {
                // In case Airtable links come as objects/ids
                const exIdRaw = Array.isArray(assignment.Exercise) ? assignment.Exercise[0] : assignment.Exercise;
                const exId = exIdRaw?.id ?? exIdRaw;
                const exercise = exerciseList.find(ex => ex.id === exId);

                return (
                  <div key={assignment.id} className="exercise-card" style={{ padding: 'var(--sp-4)', margin: '0 0 var(--sp-2)', background: 'var(--card)', border: '2px solid #dee2e6', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
                    <h3 style={{ margin: '0 0 4px' }}>
                      {exercise ? exercise.Name : 'Unknown Exercise'}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
                      {assignment.Sets} sets × {assignment.Reps} reps
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Overview */}
      <div className="card" style={{ marginTop: 'var(--sp-6)' }}>
        <h3 style={{ margin: '0 0 16px' }}>Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--sp-6)' }}>
          <div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>Total Clients</p>
            <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
              {clientList.length}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>Total Exercises</p>
            <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>
              {exerciseList.length}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>Active Assignments (selected client)</p>
            <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, color: 'var(--warn)' }}>
              {clientAssignments.length}
            </p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(8px + env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: toastMessage.includes('Error') || toastMessage.includes('select') ? 'var(--danger)' : 'var(--success)',
            color: '#fff',
            padding: 'var(--sp-3) var(--sp-4)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            fontSize: 14,
            fontWeight: 500
          }}
          aria-live="polite"
          role="status"
        >
          {toastMessage}
        </div>
      )}
      <style>{skeletonCss}</style>
    </div>
  );
}

/* Skeleton styles - matching ClientDashboard */
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
.skeleton-card {
  height: 72px;
  margin: 12px 0;
}
.skeleton-card.big {
  height: 200px;
  margin-top: 8px;
}
`;
