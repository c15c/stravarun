export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const ACCESS_TOKEN = '56f52015388197a4f265b91f90d5272425722fcb';
  
  try {
    const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });
    
    if (!athleteRes.ok) {
      throw new Error(`Athlete fetch failed: ${athleteRes.status}`);
    }
    
    const athlete = await athleteRes.json();
    
    const statsRes = await fetch(`https://www.strava.com/api/v3/athletes/${athlete.id}/stats`, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });
    
    if (!statsRes.ok) {
      throw new Error(`Stats fetch failed: ${statsRes.status}`);
    }
    
    const statsData = await statsRes.json();
    
    const weekAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const activitiesRes = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${weekAgo}`, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });
    
    if (!activitiesRes.ok) {
      throw new Error(`Activities fetch failed: ${activitiesRes.status}`);
    }
    
    const activities = await activitiesRes.json();
    
    // Make sure activities is an array
    const activitiesArray = Array.isArray(activities) ? activities : [];
    const runs = activitiesArray.filter((a: any) => a.type === 'Run');
    
    const weekDistance = (runs.reduce((sum: number, a: any) => sum + (a.distance || 0), 0) / 1000).toFixed(1);
    const weekRuns = runs.length;
    const calories = Math.round(runs.reduce((sum: number, a: any) => sum + (a.calories || 0), 0));
    
    const avgPaceSeconds = runs.length > 0 
      ? runs.reduce((sum: number, a: any) => sum + (a.moving_time / ((a.distance || 1) / 1000)), 0) / runs.length
      : 0;
    const avgPaceMin = Math.floor(avgPaceSeconds / 60);
    const avgPaceSec = Math.floor(avgPaceSeconds % 60);
    
    const longestRun = runs.length > 0 
      ? (Math.max(...runs.map((a: any) => a.distance || 0)) / 1000).toFixed(1)
      : '0.0';
    
    return new Response(JSON.stringify({
      weekDistance,
      weekRuns,
      monthDistance: ((statsData.recent_run_totals?.distance || 0) / 1000).toFixed(1),
      totalRuns: statsData.all_run_totals?.count || 0,
      avgPace: `${avgPaceMin}:${avgPaceSec.toString().padStart(2, '0')}`,
      longestRun,
      calories
    }), {
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    return new Response
