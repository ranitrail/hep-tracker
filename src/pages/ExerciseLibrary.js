import React, { useState, useEffect } from 'react';
import { exercises } from '../services/airtable';

export default function ExerciseLibrary() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await exercises.list();
        if (mounted) setList(data);
      } catch (e) {
        console.error('Error loading exercises:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      toast('Please enter an exercise name');
      return;
    }

    setSaving(true);
    try {
      const rec = await exercises.create({
        Name: name.trim(),
        Description: desc.trim()
      });
      setList(prev => [...prev, { id: rec.id, Name: name.trim(), Description: desc.trim() }]);
      setName('');
      setDesc('');
      toast('Exercise added successfully!');
    } catch (error) {
      console.error('Error adding exercise:', error);
      toast('Error adding exercise');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <h2 style={{ textAlign: 'center' }}>Exercise Library</h2>
        <div className="skeleton-card big" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <style>{skeletonCss}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, textAlign: 'center', flex: 1 }}>Exercise Library</h2>
        <a className="btn" href="/dashboard" style={{ marginLeft: 12, whiteSpace: 'nowrap' }}>
          ← Back to Client Summary
        </a>
      </div>

      {/* Add New Exercise Card */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <h3 style={{ margin: '0 0 var(--sp-4)' }}>Add New Exercise</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Exercise Name *
            </label>
            <input
              className="input"
              type="text"
              placeholder="e.g., Squats, Lunges, Shoulder Press"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAdd()}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Description (optional)
            </label>
            <textarea
              className="textarea"
              placeholder="Describe the exercise, muscles targeted, or special instructions"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
            />
          </div>

          <button
            type="button"
            className="btn"
            onClick={handleAdd}
            disabled={saving || !name.trim()}
            style={{ alignSelf: 'flex-start' }}
          >
            {saving ? 'Adding...' : 'Add Exercise'}
          </button>
        </div>
      </div>

      {/* Exercises List Header */}
      <div className="card" style={{ marginBottom: '12px' }}>
        <h3 style={{ margin: '0 0 10px' }}>
          All Exercises ({list.length})
        </h3>
      </div>

      {/* Exercises List */}
      {list.length === 0 ? (
        <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--muted)', background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid #e5e7eb' }}>
          No exercises yet. Add your first exercise above!
        </div>
      ) : (
        <div>
          {list.map(exercise => (
            <div
              key={exercise.id}
              className="exercise-card"
              style={{ padding: 'var(--sp-4)', margin: '0 0 var(--sp-2)', background: 'var(--card)', border: '2px solid #dee2e6', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}
            >
              <h3 style={{ margin: '0 0 4px', color: 'var(--text)' }}>
                {exercise.Name}
              </h3>
              {exercise.Description && (
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
                  {exercise.Description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(8px + env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: toastMessage.includes('Error') ? 'var(--danger)' : 'var(--success)',
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
  height: 180px;
  margin-top: 8px;
}
`;
