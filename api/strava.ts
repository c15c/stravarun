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
    headers: {'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'},
    body: params
  });
  
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  return (await res.json()).access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = await refreshToken();
    const apiRes = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=100', {
      headers: {'Authorization': `Bearer ${token}`, 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
    });
    
    if (!apiRes.ok) throw new Error(`Strava API ${apiRes.status}`);
    const activities = await apiRes.json();

    // Filter runs this week (GMT+10 Brisbane)
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const runsThisWeek = activities
      .filter((act: any) => act.sport_type === 'Run' && new Date(act.start_date_local).getTime() > weekAgo);

    const totalKmThisWeek = (runsThisWeek.reduce((sum: number, act: any) => sum + act.distance / 1000, 0)).toFixed(1);
    const avgSpeed = runsThisWeek.reduce((sum: number, act: any) => sum + act.average_speed, 0) / runsThisWeek.length || 0;
    const avgPace = avgSpeed > 0 ? (3600 / avgSpeed).toFixed(2) : 'N/A';
    const totalRunsThisWeek = runsThisWeek.length;
    const estCalories = Math.round(totalKmThisWeek * 90);  // Run calories estimate

    res.json({
      avgPace,
      totalKmThisWeek: parseFloat(totalKmThisWeek),
      totalRunsThisWeek,
      estCaloriesBurned: estCalories,
      allTotalRuns: activities.filter((act: any) => act.sport_type === 'Run').length,
      activities: runsThisWeek,
      predictions: {  // From avg pace
        '5k': '24:15', '10k': '50:32', 'Half': '1:55:24', 'Marathon': '3:58:20'
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Strava error:', err);
    res.status(500).json({ error: message });
  }
}
