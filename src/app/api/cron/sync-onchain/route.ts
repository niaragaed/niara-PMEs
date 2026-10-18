import "server-only";
import { NextResponse } from "next/server";
import { getEventsOnChain } from "@/lib/web3/events";

// Endpoint fired by Vercel Cron (see vercel.json) to keep the /socios on-chain cache up to date,
// without depending on someone visiting the page. Reuses the SAME incremental function the page
// already uses (getEventsOnChain) — it already respects the per-run block cap (the per-run limit
// in events.ts), so even with a large backlog (e.g. the cron was down for a while) this route
// never hits the timeout: it only advances as far as it can and, if anything is left, the next
// cron run picks up where it stopped.
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  // Without CRON_SECRET configured, refuses by default — never leaves the route open by accident.
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const events = await getEventsOnChain();
    return NextResponse.json({ ok: true, totalEventosNoCache: events.length });
  } catch (error) {
    console.error("[cron/sync-onchain] sync failed:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
