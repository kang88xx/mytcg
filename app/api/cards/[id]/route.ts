import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCardRank } from "@/lib/leaderboard";
import { ANON_COOKIE } from "@/lib/anon";

export const runtime = "nodejs";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!card || card.status === "deleted") {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "카드를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  const rank =
    card.status === "active" ? await getCardRank(card.id, "weekly") : null;

  return NextResponse.json({
    cardId: card.id,
    status: card.status,
    nickname: card.user.nickname,
    score: card.score,
    grade: card.grade,
    rarity: card.rarity,
    element: card.element,
    pwr: card.pwr,
    skillName: card.skillName,
    skillPower: card.skillPower,
    passiveName: card.passiveName,
    frame: card.frame,
    cardImageUrl: `${BASE}/api/cards/${card.id}/image`,
    shareUrl: `${BASE}/card/${card.id}`,
    rank,
    isLeaderboardEligible: card.isLeaderboardEligible,
    isPublic: card.isPublic,
  });
}

// 허용 필드만 수정 — 점수/등급/능력치는 절대 변경 불가 (서버 권위)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieId = req.cookies.get(ANON_COOKIE)?.value;
  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  if (card.userId !== cookieId)
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.isPublic === "boolean") data.isPublic = body.isPublic;
  if (typeof body.isLeaderboardEligible === "boolean")
    data.isLeaderboardEligible = body.isLeaderboardEligible;
  if (typeof body.nickname === "string") {
    await prisma.user.update({ where: { id: card.userId }, data: { nickname: body.nickname } });
  }
  if (Object.keys(data).length) {
    await prisma.card.update({ where: { id }, data });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieId = req.cookies.get(ANON_COOKIE)?.value;
  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  if (card.userId !== cookieId)
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  await prisma.card.update({ where: { id }, data: { status: "deleted" } });
  return NextResponse.json({ ok: true });
}
