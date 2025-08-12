import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import Card from './ui/Card';

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

export default function Layout({ user, children }) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
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

  const showSidebar = !isMobile; // keep the sidebar on desktop
  const showClientTopbar = isClient; // <— show for client on BOTH mobile & desktop

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
          {/* Avoid duplicate logout for clients — it’s in the top bar now */}
          {!isClient && (
            <button className="btn" onClick={handleLogout}>Log Out</button>
          )}
        </aside>
      )}

      <main
        className="page"
        style={{
          flex: 1,
          padding: 20,
          paddingBottom: isClient && isMobile ? 80 : 20, // space for bottom nav on mobile
          background: '#fff'
        }}
      >
        {/* Client top bar with bigger logo + Log Out on ALL screen sizes */}
        {showClientTopbar && (
          <div className="brandbar" style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom: 16, gap: 12
          }}>
            <img
              src="/brand-logo.png"
              alt="Bridges & Balance"
              className="brand-logo"
              style={{ height: 40, width: 'auto', objectFit: 'contain' }}
            />
            <button className="btn" onClick={handleLogout} aria-label="Log out">Log Out</button>
          </div>
        )}

        <Card>{children}</Card>
      </main>

      <BottomNav user={user} />

      <style>{`
        /* make logo bigger on desktop */
        @media (min-width: 768px){
          .brand-logo{ height: 56px !important; }
        }
        @media (max-width: 768px){
          .sidebar{ display:none !important; }
          .page{ padding-bottom: 80px; } /* room for bottom nav */
        }
      `}</style>
    </div>
  );
}
