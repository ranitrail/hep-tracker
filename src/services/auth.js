// src/services/auth.js

const BASE = process.env.REACT_APP_API_BASE_URL || '';

export const auth = {
  login: async ({ email, password, remember }) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember })
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  logout: async () => {
    await fetch(`${BASE}/api/auth/logout`, { 
      method: 'POST', 
      credentials: 'include' 
    });
  },

  getCurrentUser: async () => {
    const res = await fetch(`${BASE}/api/auth/me`, { 
      credentials: 'include' 
    });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  }
};