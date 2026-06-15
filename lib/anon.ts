import { prisma } from "./db";

export const ANON_COOKIE = "mytcg_anon";

// 익명 식별: 쿠키의 사용자 ID로 User 확보. 없으면 생성.
export async function getOrCreateAnonUser(
  cookieId: string | undefined
): Promise<{ userId: string; setCookie: boolean }> {
  if (cookieId) {
    const existing = await prisma.user.findUnique({ where: { id: cookieId } });
    if (existing) return { userId: existing.id, setCookie: false };
  }
  const user = await prisma.user.create({ data: {} });
  return { userId: user.id, setCookie: true };
}
