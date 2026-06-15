import { prisma } from "./db";

export const DAILY_LIMIT = 3;

// 하루 무료 분석 횟수 제한 (docs/TECH_SPEC §5)
export async function checkDailyQuota(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const count = await prisma.card.count({
    where: {
      userId,
      createdAt: { gte: start },
      status: { not: "deleted" },
    },
  });
  const remaining = Math.max(0, DAILY_LIMIT - count);
  return { allowed: count < DAILY_LIMIT, remaining };
}
