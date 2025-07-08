import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../services/auth';
import Button from './ui/Button';
import Card from './ui/Card';

export default function Layout({ user, children }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/login');
  };

  const links = user.user_type === 'client' ? [
    { to: '/my-exercises', label: "My Exercises" },
    { to: '/progress', label: "Progress" }
  ] : [
    { to: '/dashboard', label: "Dashboard" },
    { to: '/clients', label: "Clients" },
    { to: '/exercises', label: "Library" }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 200, padding: 20, background: '#f5f5f5' }}>
        <h3>HEP Tracker</h3>
        <nav>
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              style={({ isActive }) => ({
                display: 'block', margin: '8px 0', textDecoration: 'none',
                fontWeight: isActive ? 'bold' : 'normal'
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <Button onClick={handleLogout}>Log Out</Button>
      </aside>
      <main style={{ flex: 1, padding: 20, background: '#fff' }}>
        <Card>{children}</Card>
      </main>
    </div>
  );
}