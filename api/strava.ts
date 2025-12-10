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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
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
    const apiRes = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=100', {
      headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'Mozilla/5.0' }
    });

    if (!apiRes.ok) throw new Error(`Strava ${apiRes.status}`);
    const activities = await apiRes.json();

    const now = Date.now();
    const weekAgo = new Date(now - 7 * 86400000).toISOString();
    const monthAgo = new Date(now - 30 * 86400000).toISOString();

    const runsWeek = activities.filter((act: any) => act.sport_type === 'Run' && act.start_date > weekAgo);
    const runsMonth = activities.filter((act: any) => act.sport_type === 'Run' && act.start_date > monthAgo);

    const weekKm = runsWeek.reduce((sum: number, act: any) => sum + act.distance / 1000, 0);
    const monthKm = runsMonth.reduce((sum: number, act: any) => sum + act.distance / 1000, 0);
    const allKm = activities.filter((act: any) => act.sport_type === 'Run').reduce((sum: number, act: any) => sum + act.distance / 1000, 0);
    const weekPace = runsWeek.length ? (3600 / (runsWeek.reduce((s: number, a: any) => s + a.average_speed, 0) / runsWeek.length)).toFixed(2) : 'N/A';
    const weekCalories = Math.round(runsWeek.reduce((sum: number, act: any) => sum + (act.kilojoules * 0.239 || act.distance / 1000 * 90), 0));
    const totalRuns = activities.filter((act: any) => act.sport_type === 'Run').length;
    const longestWeek = runsWeek.length ? Math.max(...runsWeek.map((act: any) => act.distance / 1000)) : 0;

    res.json({
      avgPace: weekPace,
      totalKmThisWeek: weekKm.toFixed(1),
      longestRun: longestWeek.toFixed(1),
      monthKm: monthKm.toFixed(1),
      allTotalKm: allKm.toFixed(1),
      totalRunsThisWeek: runsWeek.length,
      allTotalRuns: totalRuns,
      caloriesBurned: weekCalories,
      activities: runsWeek
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    console.error('Error:', err);
    res.status(500).json({ error: message });
  }
}
