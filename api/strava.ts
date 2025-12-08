/// <reference types="@vercel/edge" />
// @ts-ignore
const DenoEnv = Deno.env;

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Use Vercel Edge environment variables
  const CLIENT_ID = DenoEnv.get('STRAVA_CLIENT_ID')!;
  const CLIENT_SECRET = DenoEnv.get('STRAVA_CLIENT_SECRET')!;
  const REFRESH_TOKEN = DenoEnv.get('STRAVA_REFRESH_TOKEN')!;

  try {
    // 1) Refresh the access token
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: REFRESH_TOKEN,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token refresh failed: ${tokenRes.status} - ${err}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2) Fetch athlete profile
    const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!athleteRes.ok) throw new Error(`Athlete fetch failed: ${athleteRes.status}`);

    const athlete = await athleteRes.json();

    // 3) Fetch lifetime and recent stats
    const statsRes = await fetch(`https://www.strava.com/api/v3/athletes/${athlete.id}/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!statsRes.ok) throw new Error(`Stats fetch failed: ${statsRes.status}`);

    const statsData = await statsRes.json();

    // 4) Fetch activities from the last 7 days
    const weekAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);

    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${weekAgo}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!activitiesRes.ok) throw new Error(`Activities fetch failed: ${activitiesRes.status}`);

    const activities = await activitiesRes.json();
    const runs = Array.isArray(activities) ? activities.filter((a) => a.type === 'Run') : [];

    // 5) Calculate metrics
    const weekDistance = (runs.reduce((s, a) => s + (a.distance || 0), 0) / 1000).toFixed(1);
    const weekRuns = runs.length;
    const calories = Math.round(runs.reduce((s, a) => s + (a.calories || 0), 0));

    const avgPaceSeconds =
      runs.length > 0
        ? runs.reduce((s, a) => s + a.moving_time / ((a.distance || 1) / 1000), 0) / runs.length
        : 0;

    const avgPaceMin = Math.floor(avgPaceSeconds / 60);
    const avgPaceSec = Math.floor(avgPaceSeconds % 60);

    const longestRun =
      runs.length > 0
        ? (Math.max(...runs.map((a) => a.distance || 0)) / 1000).toFixed(1)
        : '0.0';

    // 6) Send back JSON response
    return new Response(
      JSON.stringify({
        weekDistance,
        weekRuns,
        monthDistance: ((statsData.recent_run_totals?.distance || 0) / 1000).toFixed(1),
        totalRuns: statsData.all_run_totals?.count || 0,
        avgPace: `${avgPaceMin}:${avgPaceSec.toString().padStart(2, '0')}`,
        longestRun,
        calories,
      }),
      {
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
