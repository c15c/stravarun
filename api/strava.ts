import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    // Replace with real values once linked to Strava API
    const data = {
      weekDistance: 34.2,
      weekRuns: 4,
      avgPace: "5:27",
      longestRun: 12.3,
      monthDistance: 82.4,
      totalRuns: 412,
      calories: 3560
    };

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
