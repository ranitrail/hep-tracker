import { verify } from 'jsonwebtoken';

export default function handler(req, res) {
  const { token } = req.cookies;
  
  if (!token) {
    return res.status(401).end();
  }
  
  try {
    const payload = verify(token, process.env.SESSION_SECRET);
    return res.status(200).json(payload);
  } catch {
    return res.status(401).end();
  }
}