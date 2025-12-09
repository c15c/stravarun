export const config = {
  runtime: "edge",
};

export default async function handler() {
  const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
  const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
  const REFRESH_TOKEN = Deno.env.get("STRAVA_REFRESH_TOKEN")!;

  try {
    // 1. Refresh token
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: REFRESH_TOKEN,
      }),
    });

    if (!tokenRes.ok) throw new Error("Token refresh failed");
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Athlete
    const athleteRes = await fetch("https://www.strava.com/api/v3/athlete", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!athleteRes.ok) throw new Error("Athlete fetch failed");
    const athlete = await athleteRes.json();

    // 3. Stats (month + total)
    const statsRes = await fetch(
      `https://www.strava.com/api/v3/athletes/${athlete.id}/stats`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!statsRes.ok) throw new Error("Stats fetch failed");
    const stats = await statsRes.json();

    // 4. Activities (week)
    const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${weekAgo}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!activitiesRes.ok) throw new Error("Activities fetch failed");
    const activities = await activitiesRes.json();

    const runs = activities.filter((a: any) => a.type === "Run");

    // Weekly distance km
    const weekDistance = (runs.reduce((s, r) => s + (r.distance || 0), 0) / 1000).toFixed(1);

    // Calories burned
    const calories = Math.round(
      runs.reduce((s, r) => s + (r.calories || 0), 0)
    );

    // Avg pace (min/km)
    let avgPace = "0:00";
    if (runs.length > 0) {
      const secPerKmTotal = runs.reduce(
        (sum, r) => sum + r.moving_time / ((r.distance || 1) / 1000),
        0
      );
      const secPerKmAvg = secPerKmTotal / runs.length;
      const min = Math.floor(secPerKmAvg / 60);
      const sec = Math.floor(secPerKmAvg % 60)
        .toString()
        .padStart(2, "0");
      avgPace = `${min}:${sec}`;
    }

    // Longest run km
    const longestRun = runs.length
      ? (Math.max(...runs.map((r: any) => r.distance || 0)) / 1000).toFixed(1)
      : "0";

    // Month distance
    const monthDistance = ((stats.recent_run_totals?.distance || 0) / 1000).toFixed(1);

    return new Response(
      JSON.stringify({
        weekDistance,
        weekRuns: runs.length,
        calories,
        avgPace,
        longestRun,
        monthDistance,
        totalRuns: stats.all_run_totals?.count || 0,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}
