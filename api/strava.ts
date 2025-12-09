import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await fetch('https://strava.ciscos.workers.dev');
    
    if (!response.ok) {
      throw new Error(`Strava API returned ${response.status}`);
    }
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Strava API Error:', err);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch Strava data' 
    });
  }
}
