export const config = {
  runtime: "edge",
};

export default async function handler() {
  const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
  const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
  const REFRESH_TOKEN = Deno.env.get("STRAVA_REFRESH_TOKEN")!;

  try {
    // Refresh access token
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

    // Get athlete profile
    const athleteRes = await fetch("https://www.strava.com/api/v3/athlete", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!athleteRes.ok) throw new Error("Athlete fetch failed");
    const athlete = await athleteRes.json();

    // Fetch last 7 days activities
    const weekAgo = Math.floor(Date.now() / 1000 - 7 * 24 * 60 * 60);
    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${weekAgo}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!activitiesRes.ok) throw new Error("Activities fetch failed");
    const activities = await activitiesRes.json();

    const runs = Array.isArray(activities)
      ? activities.filter((a: any) => a.type === "Run")
      : [];

    const weekDistance = (runs.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000).toFixed(1);
    const weekRuns = runs.length;

    return new Response(
      JSON.stringify({ weekDistance, weekRuns }),
      {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
