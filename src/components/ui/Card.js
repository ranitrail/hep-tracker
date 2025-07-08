import React from 'react';

export default function Card({ children }) {
  return (
    <div style={{
      padding: 20, margin: '16px 0', borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)', background: '#fff'
    }}>  
      {children}
    </div>
  );
}