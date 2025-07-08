import bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import Airtable from 'airtable';

// Configure Airtable
Airtable.configure({ apiKey: process.env.REACT_APP_AIRTABLE_API_KEY });
const base = Airtable.base(process.env.REACT_APP_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { email, password, remember } = req.body;
  
  try {
    const records = await base('Users')
      .select({ filterByFormula: `{Email}='${email}'` })
      .all();
    
    if (!records.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = records[0].fields;
    const match = await bcrypt.compare(password, user['Password Hash']);
    
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // JWT payload
    const payload = { email, user_type: user['User Type'] };
    const secret = process.env.SESSION_SECRET;
    const maxAge = remember ? 90 * 24 * 60 * 60 : 24 * 60 * 60; // seconds
    const token = sign(payload, secret, { expiresIn: maxAge });

    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}`);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}