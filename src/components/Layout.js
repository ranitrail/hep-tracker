import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import Button from './ui/Button'; // keep if used elsewhere
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
      borderTop:'1px solid #e5e7eb', padding:'6px 16px', zIndex:1000, paddingBottom:'calc(6px + env(safe-area-inset-bottom))'
    }}>
      <NavLink to="/my-exercises" end style={({isActive}) => linkStyle(isActive)}>Exercises</NavLink>
      <NavLink to="/progress" style={({isActive}) => linkStyle(isActive)}>Progress</NavLink>
    </nav>
  );
}

export default function Layout({ user, children }) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize(); window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/login');
  };

  const links = user.user_type === 'client'
    ? [{ to: '/my-exercises', label: 'My Exercises' }, { to: '/progress', label: 'Progress' }]
    : [{ to: '/dashboard', label: 'Dashboard' }, { to: '/clients', label: 'Clients' }, { to: '/exercises', label: 'Library' }];

  const showSidebar = !isMobile;
  const showClientTopbar = isMobile && user?.user_type === 'client';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {showSidebar && (
        <aside className="sidebar" style={{ width: 200, padding: 20, background: '#f5f5f5' }}>
          <h3>HEP Tracker</h3>
          <nav>
            {links.map(l => (
              <NavLink key={l.to} to={l.to} style={({ isActive }) => ({
                display: 'block', margin: '8px 0', textDecoration: 'none', fontWeight: isActive ? 'bold' : 'normal'
              })}>{l.label}</NavLink>
            ))}
          </nav>
          <Button onClick={handleLogout}>Log Out</Button>
        </aside>
      )}

      <main className="page" style={{ flex: 1, padding: 20, paddingBottom: showClientTopbar ? 80 : 20, background: '#fff' }}>
        {/* Mobile client top bar with logo + logout */}
        {showClientTopbar && (
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:12, padding:'8px 4px'
          }}>
            <img src="/bridges-and-balance-logo-wide.png" alt="Bridges & Balance" style={{ height: 28 }} />
            <button className="btn" onClick={handleLogout} aria-label="Log out">Log Out</button>
          </div>
        )}

        <Card>{children}</Card>
      </main>

      <BottomNav user={user} />

      <style>{`
        @media (max-width:768px){
          .sidebar{ display:none !important; }
          .page{ padding-bottom: 80px; } /* room for bottom nav */
        }
      `}</style>
    </div>
  );
}
