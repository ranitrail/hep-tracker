import React from 'react';
import { NavLink } from 'react-router-dom';

export default function TherapistTabs() {
  const linkStyle = ({ isActive }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    borderRadius: 9999,
    border: '1px solid #e5e7eb',
    textDecoration: 'none',
    fontWeight: 600,
    color: isActive ? 'var(--primary)' : 'var(--text)',
    background: isActive ? 'rgba(79,70,229,.10)' : 'transparent',
    boxShadow: isActive ? 'var(--shadow)' : 'none',
    lineHeight: 1
  });

  return (
    <nav className="tabs" role="tablist" aria-label="Therapist navigation">
      <NavLink to="/dashboard" end style={linkStyle} role="tab">Progress</NavLink>
      <NavLink to="/clients" style={linkStyle} role="tab">Clients</NavLink>
      <NavLink to="/exercises" style={linkStyle} role="tab">Exercises</NavLink>
    </nav>
  );
}
