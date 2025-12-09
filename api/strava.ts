import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const accessToken = process.env.STRAVA_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('STRAVA_ACCESS_TOKEN not configured');
    }

    // Get athlete stats from Strava API
    const response = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=30',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Strava API returned ${response.status}`);
    }
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Strava API Error:', err);
    return res.status(500).json({ 
      status: 'error', 
      message: err instanceof Error ? err.message : 'Failed to fetch Strava data'
    });
  }
}
