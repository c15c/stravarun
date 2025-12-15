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
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0'
    },
    body: params
  });

  if (!res.ok) throw new Error(`Refresh ${res.status}`);
  const json = await res.json();
  return json.access_token as string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = await refreshToken();

    // Optional ?start=YYYY-MM-DD&end=YYYY-MM-DD
    const { start, end } = req.query as { start?: string; end?: string };

    let startDate: Date;
    let endDate: Date;
    
    if (start && end) {
      // Parse as local dates, not UTC
      const startParts = start.split('-');
      const endParts = end.split('-');
      
      startDate = new Date(
        parseInt(startParts[0]),
        parseInt(startParts[1]) - 1,
        parseInt(startParts[2]),
        0, 0, 0, 0
      );
      
      endDate = new Date(
        parseInt(endParts[0]),
        parseInt(endParts[1]) - 1,
        parseInt(endParts[2]),
        23, 59, 59, 999
      );
      } else {
      // Default: this week Monday-Sunday (local time)
      const nowLocal = new Date();
      
      const day = nowLocal.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      
      // Calculate days back to Monday
      let daysBackToMonday;
      if (day === 0) {
        // Sunday - go back 6 days to get to Monday
        daysBackToMonday = 6;
      } else {
        // Mon-Sat - go back (day - 1) days
        daysBackToMonday = day - 1;
      }
      
      startDate = new Date(
        nowLocal.getFullYear(),
        nowLocal.getMonth(),
        nowLocal.getDate() - daysBackToMonday,
        0, 0, 0, 0
      );
      
      // End date is this coming Sunday
      const daysToSunday = 7 - day;
      endDate = new Date(
        nowLocal.getFullYear(),
        nowLocal.getMonth(),
        nowLocal.getDate() + (day === 0 ? 0 : daysToSunday),
        23, 59, 59, 999
      );
    }
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    const apiRes = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=100',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!apiRes.ok) {
      throw new Error(`Strava ${apiRes.status}`);
    }

    const activities = await apiRes.json();

     // NEW - convert activity date to timestamp for comparison:
  const runsInRange = activities.filter((act: any) => {
    if (act.sport_type !== 'Run') return false;
    
    const activityDate = new Date(act.start_date_local); // Use local date!
    const activityTime = activityDate.getTime();
    
    return activityTime >= startDate.getTime() && activityTime <= endDate.getTime();
  });

    // All-time runs (from this activities window Strava returns)
    const allRuns = activities.filter((act: any) => act.sport_type === 'Run');

    // Month-to-date: from first day of this month (local) to endDate
    const nowLocal = new Date();
    const monthStart = new Date(
      nowLocal.getFullYear(),
      nowLocal.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
    const monthStartIso = monthStart.toISOString();

    const monthRuns = activities.filter((act: any) => {
    if (act.sport_type !== 'Run') return false;
    
    const activityDate = new Date(act.start_date_local);
    const activityTime = activityDate.getTime();
    
    return activityTime >= monthStart.getTime() && activityTime <= endDate.getTime();
  });

    const monthKm = monthRuns.reduce(
      (sum: number, act: any) => sum + act.distance / 1000,
      0
    );

    const totalKm = runsInRange.reduce(
      (sum: number, act: any) => sum + act.distance / 1000,
      0
    );
    const totalRuns = runsInRange.length;

    const avgSpeed =
      totalRuns > 0
        ? runsInRange.reduce(
            (sum: number, act: any) => sum + act.average_speed,
            0
          ) / totalRuns
        : 0;

    // Average pace in minutes per km, formatted mm:ss
    let avgPacePerKm = 'N/A';
    if (avgSpeed > 0) {
      const secondsPerKm = 1000 / avgSpeed;
      const minutes = Math.floor(secondsPerKm / 60);
      const seconds = Math.round(secondsPerKm % 60);
      avgPacePerKm = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Approximate calories based on your data (~80 kcal per km)
    const caloriesPerKm = 80;
    const calories = Math.round(
      runsInRange.reduce((sum: number, act: any) => {
        const km = act.distance / 1000;
        return sum + km * caloriesPerKm;
      }, 0)
    );

    const longestRunKm =
      totalRuns > 0
        ? Math.max(...runsInRange.map((act: any) => act.distance / 1000))
        : 0;

    const allKm = allRuns.reduce(
      (sum: number, act: any) => sum + act.distance / 1000,
      0
    );

    res.status(200).json({
      range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalKm: Number(totalKm.toFixed(1)),
        totalRuns,
        avgPacePerKm,
        calories,
        longestRunKm: Number(longestRunKm.toFixed(1)),
        monthKm: Number(monthKm.toFixed(1)),
        allTimeKm: Number(allKm.toFixed(1)),
        allTimeRuns: allRuns.length
      },
      activities: runsInRange
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    console.error('Strava API error:', err);
    res.status(500).json({ error: message });
  }
}
