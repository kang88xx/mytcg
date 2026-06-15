import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/leaderboard";
import type { LeaderboardPeriod } from "@/lib/types";

export const runtime = "nodejs";

const VALID: LeaderboardPeriod[] = ["daily", "weekly", "monthly", "all_time", "event"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const period = (sp.get("period") ?? "weekly") as LeaderboardPeriod;
  if (!VALID.includes(period)) {
    return NextResponse.json(
      { error: { code: "BAD_PERIOD", message: "잘못된 기간입니다." } },
      { status: 400 }
    );
  }
  const eventId = sp.get("eventId") ?? undefined;
  const limit = Math.min(100, Number(sp.get("limit") ?? 100));
  const entries = await getLeaderboard(period, { eventId, limit });
  return NextResponse.json({ period, entries });
}
