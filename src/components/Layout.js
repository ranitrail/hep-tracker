// src/components/Layout.js
import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import Button from './ui/Button';
import Card from './ui/Card';

// Bottom nav shown only on client routes (mobile)
function BottomNav({ user }) {
  const location = useLocation();
  const isClient = user?.user_type === 'client';
  const clientRoutes = ['/my-exercises', '/progress', '/client']; // tweak if needed
  const isClientRoute = clientRoutes.some(p => location.pathname.startsWith(p));
  const height = 56;

  if (!isClient || !isClientRoute) return null;

  const navStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height,
    display: 'flex',
    gap: 8,
    background: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    padding: '6px 16px',
    zIndex: 1000,
    paddingBottom: 'calc(6px + env(safe-area-inset-bottom))'
  };
  const linkStyle = (isActive) => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    textDecoration: 'none',
    fontWeight: 600,
    color: isActive ? '#4F46E5' : '#111827',
    background: isActive ? 'rgba(79,70,229,0.10)' : 'transparent'
  });

  return (
    <nav aria-label="Primary" className="bottom-nav" style={navStyle}>
      <NavLink to="/my-exercises" end style={({ isActive }) => linkStyle(isActive)}>
        Home
      </NavLink>
      <NavLink to="/progress" style={({ isActive }) => linkStyle(isActive)}>
        Progress
      </NavLink>
    </nav>
  );
}

export default function Layout({ user, children }) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/login');
  };

  const links = user.user_type === 'client'
    ? [
        { to: '/my-exercises', label: 'My Exercises' },
        { to: '/progress', label: 'Progress' }
      ]
    : [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/clients', label: 'Clients' },
        { to: '/exercises', label: 'Library' }
      ];

  // Sidebar hidden on mobile; add bottom padding so content/sticky bar isn’t covered
  const showSidebar = !isMobile;
  const mainPaddingBottom = isMobile && user?.user_type === 'client' ? 80 : 20;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {showSidebar && (
        <aside className="sidebar" style={{ width: 200, padding: 20, background: '#f5f5f5' }}>
          <h3>HEP Tracker</h3>
          <nav>
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                style={({ isActive }) => ({
                  display: 'block',
                  margin: '8px 0',
                  textDecoration: 'none',
                  fontWeight: isActive ? 'bold' : 'normal'
                })}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <Button onClick={handleLogout}>Log Out</Button>
        </aside>
      )}

      <main className="page" style={{ flex: 1, padding: 20, paddingBottom: mainPaddingBottom, background: '#fff' }}>
        <Card>{children}</Card>
      </main>

      {/* Mobile bottom nav for client routes */}
      <BottomNav user={user} />

      {/* Small CSS helpers so nothing is obscured on mobile */}
      <style>{`
        @media (max-width:768px){
          .sidebar { display: none !important; }
          .page { padding-bottom: 80px; } /* room for bottom nav */
          .sticky-action { bottom: 56px !important; } /* keep sticky Save bar above nav */
        }
      `}</style>
    </div>
  );
}
