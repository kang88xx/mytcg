import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ANON_COOKIE } from "@/lib/anon";
import type { SharePlatform, ShareAction } from "@/lib/types";

export const runtime = "nodejs";

const PLATFORMS: SharePlatform[] = [
  "kakao",
  "instagram_story",
  "instagram_feed",
  "facebook",
  "link",
  "download",
];
const ACTIONS: ShareAction[] = ["click", "success", "fail", "view", "install"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { cardId, platform, action, referrer } = body;
  if (!cardId || !PLATFORMS.includes(platform) || !ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "필수 값이 누락되었습니다." } },
      { status: 400 }
    );
  }
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  await prisma.shareLog.create({
    data: {
      cardId,
      userId: req.cookies.get(ANON_COOKIE)?.value ?? null,
      platform,
      action,
      referrer: referrer ?? null,
    },
  });
  return new NextResponse(null, { status: 204 });
}
