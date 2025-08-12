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
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [message, setMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showCelebration, setShowCelebration] = useState(false);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // haptics
  const vibrate = (ms=15) => {
    try{
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      if ('vibrate' in navigator) navigator.vibrate(ms);
    }catch{}
  };
  const toast = (msg, type='success') => {
    setToastMessage(msg); setToastType(type); setShowToast(true);
    setTimeout(()=>setShowToast(false), 1500);
  };

  const { totalExercises, completedToday, completionPercentage } = useMemo(() => {
    const total = assignList.length;
    const completed = Object.values(selections).filter(Boolean).length;
    return { totalExercises: total, completedToday: completed, completionPercentage: total? Math.round(completed/total*100):0 };
  }, [assignList.length, selections]);

  useEffect(() => {
    const key = `celebration-${todayStr}`;
    if (!localStorage.getItem(key) && completedToday===totalExercises && totalExercises>0) {
      setShowCelebration(true); localStorage.setItem(key,'true');
      setTimeout(()=>setShowCelebration(false), 3000);
    }
  }, [completedToday, totalExercises, todayStr]);

  useEffect(() => { (async () => { await loadData(); setInitialLoading(false); })(); }, []);

  const loadData = async () => {
    try {
      const u = await auth.getCurrentUser(); setUser(u);
      const [assigns, comps, exList] = await Promise.all([
        assignments.listForClient(u.email),
        exerciseCompletions.listForClient(u.email),
        exercises.list()
      ]);
      setAssignList(assigns); setCompletions(comps);
      const map = {}; exList.forEach(ex => map[ex.id]=ex.Name); setExerciseMap(map);

      const todays = comps.filter(c => (typeof c['Completion Date']==='string'
        ? c['Completion Date'].split('T')[0] : format(new Date(c['Completion Date']),'yyyy-MM-dd')) === todayStr);

      const sel={}; assigns.forEach(a=>{
        const done = todays.some(c => (Array.isArray(c.Assignment)?c.Assignment[0]:c.Assignment)===a.id);
        sel[a.id]=done;
      });
      setSelections(sel);
    } catch (e) {
      console.error(e); setMessage('Error loading data. Please refresh.');
    }
  };

  const toggleSelection = (aid) => { vibrate(12); setSelections(s=>({ ...s, [aid]: !s[aid] })); };
  const markAllComplete = () => {
    if (!assignList.length) return;
    if (!window.confirm('Mark all exercises complete for today?')) return;
    const next={}; assignList.forEach(a=>next[a.id]=true); setSelections(next); vibrate(18);
  };
  const clearAll = () => {
    const next={}; assignList.forEach(a=>next[a.id]=false); setSelections(next);
  };

  const handleSave = async () => {
    setSaving(true); setMessage('');
    try{
      const todays = completions.filter(c => (typeof c['Completion Date']==='string'
        ? c['Completion Date'].split('T')[0] : format(new Date(c['Completion Date']),'yyyy-MM-dd'))===todayStr);
      const todayMap={}; todays.forEach(c=>{
        const aid = Array.isArray(c.Assignment)?c.Assignment[0]:c.Assignment;
        todayMap[aid]=c.id;
      });

      for(const aid of Object.keys(selections)){
        const selected = selections[aid]; const has = aid in todayMap;
        if(selected && !has) await exerciseCompletions.create({ Assignment:[aid], 'Completion Date': todayStr });
        else if(!selected && has) await exerciseCompletions.delete(todayMap[aid]);
      }

      await loadData(); toast('Progress saved successfully!'); vibrate(18);
      window.dispatchEvent(new CustomEvent('completion-updated'));
      setTimeout(()=>setSaving(false), 800);
    }catch(e){ console.error(e); toast('Error saving progress.', 'error'); setSaving(false); }
  };

  /* --------- LOADING SKELETON --------- */
  if (initialLoading) {
    return (
      <div>
        <h2 style={{textAlign:'center'}}>Today’s Exercises — {format(today, 'EEEE, MMM d')}</h2>
        <div className="skeleton-card big" />
        <div className="skeleton-actions">
          <div className="skeleton-chip" />
          <div className="skeleton-chip" />
        </div>
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <style>{skeletonCss}</style>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{textAlign:'center'}}>Today’s Exercises — {format(today, 'EEEE, MMM d')}</h2>

      {message && (
        <div style={{
          padding:'10px', marginBottom:'12px', borderRadius:'8px',
          background:'#d4edda', border:'1px solid #c3e6cb', color:'#155724'
        }}>{message}</div>
      )}

      {/* Summary */}
      <div style={{padding:'20px', background:'#f8f9fa', borderRadius:'12px', marginBottom:'12px'}}>
        <h3 style={{margin:'0 0 10px'}}>Today’s Progress</h3>
        <div style={{display:'flex', alignItems:'center', gap:20}}>
          <div>
            <span style={{fontSize:36, fontWeight:700, color:'#007bff'}}>{completedToday}</span>
            <span style={{fontSize:24, color:'#6c757d'}}> / {totalExercises}</span>
          </div>
          <div style={{flex:1}}>
            <div style={{width:'100%',height:30,background:'#e9ecef',borderRadius:15,overflow:'hidden'}}>
              <div style={{width:`${completionPercentage}%`,height:'100%',background: completionPercentage===100?'#28a745':'#007bff',transition:'width .3s'}}/>
            </div>
            <p style={{margin:'5px 0 0',color:'#6c757d'}}>{completionPercentage}% Complete</p>
          </div>
        </div>
      </div>

      {assignList.length>0 && (
        <div style={{display:'flex',gap:8,margin:'8px 0 12px',justifyContent:'center'}}>
          <button className="btn" onClick={markAllComplete}>Mark all complete</button>
          <button className="btn" onClick={clearAll}>Clear all</button>
        </div>
      )}

      {/* Exercise cards */}
      {assignList.map(a=>{
        const done = selections[a.id]||false;
        const exId = Array.isArray(a.Exercise)?a.Exercise[0]:a.Exercise;
        const exName = exerciseMap[exId]||'Exercise';
        return (
          <div
            key={a.id}
            className="exercise-card"
            style={{
              padding:'var(--sp-4)', margin:'0 0 var(--sp-2)', background: done?'rgba(16,185,129,.08)':'var(--card)',
              border:`2px solid ${done?'var(--success)':'#dee2e6'}`, borderRadius:'var(--radius)',
              cursor:'pointer', transition:'background-color .2s, box-shadow .2s, transform .06s', boxShadow:'var(--shadow)'
            }}
            onClick={()=>toggleSelection(a.id)}
            onKeyDown={e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); toggleSelection(a.id);} }}
            role="button" tabIndex={0} aria-pressed={done} aria-label={`${exName} - ${a.Sets} sets × ${a.Reps} reps`}
          >
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:44}}>
              <div style={{flex:1}}>
                <h3 style={{margin:'0 0 4px'}}>{exName}</h3>
                <p style={{margin:0,color:'var(--muted)',fontSize:14}}>{a.Sets} × {a.Reps}</p>
              </div>
              <div style={{
                width:24,height:24,borderRadius:'50%',border:`2px solid ${done?'var(--success)':'#dee2e6'}`,
                background: done?'var(--success)':'transparent', display:'flex',alignItems:'center',justifyContent:'center'
              }}>
                {done && <span style={{color:'#fff',fontWeight:700}}>✓</span>}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ margin:'12px 0', textAlign:'center' }}>
        <a href="/progress" className="link">View Weekly Progress →</a>
      </div>

      {/* Sticky Save */}
      <div className="sticky-action" style={{
        position:'sticky', bottom:0, background:'var(--card)', borderTop:'1px solid #e5e7eb',
        padding:'var(--sp-3) var(--sp-4)', display:'flex', justifyContent:'space-between', alignItems:'center', zIndex:20, marginTop:'var(--sp-6)'
      }}>
        <div style={{color:'var(--muted)', fontSize:14}}>{completedToday}/{totalExercises} done</div>
        <Button onClick={handleSave} disabled={saving} style={{minHeight:44,padding:'var(--sp-2) var(--sp-4)',opacity:saving?.6:1}}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="toast" style={{
          position:'fixed', top:'calc(8px + env(safe-area-inset-top))', left:'50%', transform:'translateX(-50%)',
          zIndex:9999, background: toastType==='success'?'var(--success)':'var(--danger)', color:'#fff',
          padding:'var(--sp-3) var(--sp-4)', borderRadius:'var(--radius)', boxShadow:'var(--shadow)', fontSize:14,fontWeight:500
        }} aria-live="polite" role="status">
          {toastMessage}
        </div>
      )}

      {/* active press effect + skeleton CSS */}
      <style>{`
        .exercise-card:active{ transform: scale(.98); }
        @media (prefers-reduced-motion: reduce){ .exercise-card{ transition:none !important; transform:none !important; } }
      `}</style>
      <style>{skeletonCss}</style>
    </div>
  );
}

/* skeleton CSS (reused shape) */
const skeletonCss = `
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
.skeleton{background:#f3f4f6;background-image:linear-gradient(90deg,#f3f4f6 0,#e5e7eb 40px,#f3f4f6 80px);background-size:400px 100%;animation:shimmer 1.2s infinite linear;border-radius:12px}
.skeleton-card{height:72px; margin:12px 0}
.skeleton-card.big{height:100px; margin-top:8px}
.skeleton-actions{display:flex; gap:12px; margin:8px 0 12px; justify-content:center}
.skeleton-chip{width:140px; height:34px}
`;
