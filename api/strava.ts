import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const accessToken = process.env.STRAVA_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('No STRAVA_ACCESS_TOKEN env var');
      return res.status(500).json({ error: 'STRAVA_ACCESS_TOKEN missing' });
    }

    const apiResponse = await fetch('https://www.strava.com/api/v3/athlete/stats', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    const text = await apiResponse.text();
    console.log('Strava status:', apiResponse.status, 'preview:', text.substring(0, 200));

    if (!apiResponse.ok) {
      console.error('Strava error body:', text);
      return res.status(apiResponse.status).json({ error: `Strava ${apiResponse.status}`, body: text.substring(0, 300) });
    }

    const data = JSON.parse(text);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Full Vercel error:', err);
    return res.status(500).json({ error: err.message });
  }
}
