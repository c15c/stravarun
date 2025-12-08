// api/strava.ts

export const config = {
  runtime: "edge", // Tells Vercel to use the Edge runtime
};

export default async function handler(request: Request) {
  return new Response(
    JSON.stringify({ status: "ok", message: "Strava endpoint working" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
