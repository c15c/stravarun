import type { VercelRequest, VercelResponse } from '@vercel/node';

async function refreshStravaToken(): Promise<string> {
  const clientId = process.env.STRAVA_CLIENT_ID!;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET!;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN!;

  const tokenResponse = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Refresh failed ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token as string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let accessToken = process.env.STRAVA_ACCESS_TOKEN;
    if (!accessToken) {
      accessToken = await refreshStravaToken();
    }

    const apiResponse = await fetch('https://www.strava.com/api/v3/athlete/stats', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    const text = await apiResponse.text();
    if (!apiResponse.ok) throw new Error(`API ${apiResponse.status}: ${text.substring(0, 200)}`);

    const data = JSON.parse(text);
    res.status(200).json(data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
