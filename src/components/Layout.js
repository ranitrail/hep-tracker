import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import Card from './ui/Card';
import HelpModal from './HelpModal';

function BottomNav({ user }) {
  const location = useLocation();
  const isClient = user?.user_type === 'client';
  const clientRoutes = ['/my-exercises', '/progress'];
  const isClientRoute = clientRoutes.some(p => location.pathname.startsWith(p));
  const linkStyle = (isActive) => ({
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 44, borderRadius: 10, textDecoration: 'none', fontWeight: 600,
    color: isActive ? '#4F46E5' : '#111827',
    background: isActive ? 'rgba(79,70,229,0.10)' : 'transparent'
  });
  if (!isClient || !isClientRoute) return null;
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Primary" style={{
      position:'fixed', bottom:0, left:0, right:0, height:56, display:'flex', gap:8, background:'#fff',
      borderTop:'1px solid #e5e7eb', padding:'6px 16px', zIndex:1000,
      paddingBottom:'calc(6px + env(safe-area-inset-bottom))'
    }}>
      <NavLink to="/my-exercises" end style={({ isActive }) => linkStyle(isActive)}>Exercises</NavLink>
      <NavLink to="/progress" style={({ isActive }) => linkStyle(isActive)}>Progress</NavLink>
    </nav>
  );
}

function QuestionIcon(props){
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 17a1 1 0 100 2 1 1 0 000-2zm.02-12a5.01 5.01 0 00-5.02 5 .75.75 0 001.5 0 3.5 3.5 0 116.58 1.5c-.33.5-.82.86-1.36 1.2-.65.42-1.33.85-1.68 1.66-.18.42-.03.91.39 1.1.42.18.91.03 1.1-.39.16-.37.62-.65 1.16-1.0.69-.45 1.54-1.01 2.02-1.98A5 5 0 0012.02 5z" fill="currentColor"/>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity=".25"/>
    </svg>
  );
}

export default function Layout({ user, children }) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const isClient = user?.user_type === 'client';

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize(); window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/login');
  };

  const links = isClient
    ? [{ to: '/my-exercises', label: 'My Exercises' }, { to: '/progress', label: 'Progress' }]
    : [{ to: '/dashboard', label: 'Dashboard' }, { to: '/clients', label: 'Clients' }, { to: '/exercises', label: 'Library' }];

  const showSidebar = !isMobile;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {showSidebar && (
        <aside className="sidebar" style={{ width: 200, padding: 20, background: '#f5f5f5' }}>
          <h3>HEP Tracker</h3>
          <nav>
            {links.map(l => (
              <NavLink key={l.to} to={l.to} style={({ isActive }) => ({
                display: 'block', margin: '8px 0', textDecoration: 'none',
                fontWeight: isActive ? 'bold' : 'normal'
              })}>{l.label}</NavLink>
            ))}
          </nav>

          {/* Help + Logout in sidebar (therapist sees both here) */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={() => setHelpOpen(true)} aria-label="Open help">
              <QuestionIcon style={{ marginRight: 6 }} /> Help
            </button>
            {!isClient && <button className="btn" onClick={handleLogout}>Log Out</button>}
          </div>
        </aside>
      )}

      <main
        className="page"
        style={{
          flex: 1,
          padding: 20,
          paddingBottom: isClient && isMobile ? 80 : 20,
          background: '#fff'
        }}
      >
        {/* Top brand bar for ALL users on mobile, and for clients on desktop */}
        <div className="brandbar" style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom: 16, gap: 12
        }}>
          <img src="/brand-logo.png" alt="Bridges & Balance" className="brand-logo" style={{ height: 40, width: 'auto' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setHelpOpen(true)} aria-label="Help">
              <QuestionIcon style={{ marginRight: 6 }} /> Help
            </button>
            <button className="btn" onClick={handleLogout} aria-label="Log out">Log Out</button>
          </div>
        </div>

        <Card>{children}</Card>
      </main>

      <BottomNav user={user} />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <style>{`
        @media (min-width: 768px){
          .brand-logo{ height: 56px !important; }
        }
        @media (max-width:768px){
          .sidebar{ display:none !important; }
          .page{ padding-bottom: 80px; } /* bottom nav room */
        }
      `}</style>
    </div>
  );
}
