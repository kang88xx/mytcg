import { prisma } from "./db";
import type { LeaderboardPeriod } from "./types";
import type { Prisma } from "@prisma/client";

function periodWindow(period: LeaderboardPeriod): { gte?: Date } {
  const now = new Date();
  if (period === "daily") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return { gte: d };
  }
  if (period === "weekly") {
    const d = new Date(now);
    const day = (d.getDay() + 6) % 7; // 월요일 시작
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return { gte: d };
  }
  if (period === "monthly") {
    return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  return {}; // all_time, event
}

// 리더보드 반영 대상 카드 필터
function baseWhere(
  period: LeaderboardPeriod,
  eventId?: string
): Prisma.CardWhereInput {
  const w: Prisma.CardWhereInput = {
    status: "active",
    isPublic: true,
    isLeaderboardEligible: true,
    score: { not: null },
  };
  const win = periodWindow(period);
  if (win.gte) w.createdAt = win;
  if (period === "event" && eventId) w.eventId = eventId;
  return w;
}

export interface LeaderboardRow {
  rank: number;
  cardId: string;
  nickname: string | null;
  score: number;
  grade: string | null;
  element: string | null;
  isPrizeCandidate: boolean;
  isVerified: boolean;
}

export async function getLeaderboard(
  period: LeaderboardPeriod,
  opts: { eventId?: string; limit?: number } = {}
): Promise<LeaderboardRow[]> {
  const limit = opts.limit ?? 100;
  const cards = await prisma.card.findMany({
    where: baseWhere(period, opts.eventId),
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    take: limit,
    include: { user: true },
  });
  return cards.map((c, i) => ({
    rank: i + 1,
    cardId: c.id,
    nickname: c.user.nickname,
    score: c.score ?? 0,
    grade: c.grade,
    element: c.element,
    isPrizeCandidate: i < 10, // 상위 10 = 상품 후보 (운영자 검수 전)
    isVerified: false,
  }));
}

// 특정 카드의 현재 순위 (해당 기간 내)
export async function getCardRank(
  cardId: string,
  period: LeaderboardPeriod = "weekly",
  eventId?: string
): Promise<number | null> {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card || card.score == null || card.status !== "active") return null;
  const higher = await prisma.card.count({
    where: {
      ...baseWhere(period, eventId),
      score: { gt: card.score },
    },
  });
  return higher + 1;
}
