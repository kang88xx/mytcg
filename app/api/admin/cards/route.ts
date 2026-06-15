import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function authed(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  return !!key && key === process.env.ADMIN_KEY;
}

// 카드/신고 목록
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const cards = await prisma.card.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true, _count: { select: { reports: true } } },
  });
  return NextResponse.json({
    cards: cards.map((c) => ({
      id: c.id,
      nickname: c.user.nickname,
      status: c.status,
      score: c.score,
      grade: c.grade,
      element: c.element,
      reportCount: c.reportCount,
      isLeaderboardEligible: c.isLeaderboardEligible,
      createdAt: c.createdAt,
    })),
  });
}

// 관리자 액션: hide | delete | exclude | restore
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  const { cardId, action } = await req.json().catch(() => ({}));
  if (!cardId || !action)
    return NextResponse.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });

  const map: Record<string, Record<string, unknown>> = {
    hide: { status: "hidden" },
    delete: { status: "deleted" },
    exclude: { status: "rank_excluded", isLeaderboardEligible: false },
    restore: { status: "active", isLeaderboardEligible: true },
  };
  const data = map[action];
  if (!data) return NextResponse.json({ error: { code: "BAD_ACTION" } }, { status: 400 });

  await prisma.card.update({ where: { id: cardId }, data });
  return NextResponse.json({ ok: true });
}
