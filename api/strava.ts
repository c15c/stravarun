import type { VercelRequest, VercelResponse } from '@vercel/node';

async function refreshToken(): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: process.env.STRAVA_REFRESH_TOKEN!
  });
  
  const res = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0'},
    body: params
  });
  
  if (!res.ok) throw new Error(`Refresh ${res.status}`);
  return (await res.json()).access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = await refreshToken();
    const apiRes = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
      headers: {'Authorization': `Bearer ${token}`, 'User-Agent': 'Mozilla/5.0'}
    });
    
    const data = await apiRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({error: e.message});
  }
}
