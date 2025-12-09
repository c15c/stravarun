import type { VercelRequest, VercelResponse } from '@vercel/node';

async function getValidAccessToken(): Promise<string> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Strava credentials in environment variables');
  }

  // Refresh the token
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const accessToken = await getValidAccessToken();
    
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
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
