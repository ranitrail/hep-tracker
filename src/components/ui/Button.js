import React from 'react';

export default function Button({ children, ...props }) {
  return (
    <button
      style={{
        padding: '8px 16px', margin: '8px 0', border: 'none', borderRadius: 4,
        background: '#007bff', color: '#fff', cursor: 'pointer'
      }}
      {...props}
    >
      {children}
    </button>
  );
}