import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateAnonUser, ANON_COOKIE } from "@/lib/anon";
import { checkDailyQuota } from "@/lib/quota";
import { saveOriginal } from "@/lib/storage";
import { processCard } from "@/lib/process";
import sharp from "sharp";

export const runtime = "nodejs";

const MIN_DIMENSION = 200; // 너무 작은 이미지 거부

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: NextRequest) {
  // 1) 익명 사용자 확보
  const cookieId = req.cookies.get(ANON_COOKIE)?.value;
  const { userId, setCookie } = await getOrCreateAnonUser(cookieId);

  // 2) 일일 쿼터
  const quota = await checkDailyQuota(userId);
  if (!quota.allowed) {
    return err("RATE_LIMITED", "하루 분석 횟수(3회)를 초과했습니다.", 429);
  }

  // 3) 폼 파싱
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("BAD_REQUEST", "잘못된 요청 형식입니다.", 400);
  }
  const file = form.get("image");
  if (!(file instanceof Blob)) {
    return err("NO_IMAGE", "이미지가 필요합니다.", 400);
  }
  const isPublic = form.get("isPublic") !== "false";
  const eventId = (form.get("eventId") as string) || null;
  const nickname = (form.get("nickname") as string) || null;

  const buf = Buffer.from(await file.arrayBuffer());

  // 4) 최소 해상도 체크
  let ext = "jpg";
  try {
    const meta = await sharp(buf).metadata();
    if (
      (meta.width ?? 0) < MIN_DIMENSION ||
      (meta.height ?? 0) < MIN_DIMENSION
    ) {
      return err("IMAGE_TOO_SMALL", "이미지 해상도가 너무 낮습니다.", 400);
    }
    ext = meta.format ?? "jpg";
  } catch {
    return err("INVALID_IMAGE", "이미지를 분석할 수 없습니다.", 400);
  }

  // 5) 닉네임 반영
  if (nickname) {
    await prisma.user.update({ where: { id: userId }, data: { nickname } });
  }

  // 6) 저장 + 카드 생성(processing)
  const path = await saveOriginal(buf, ext);
  const card = await prisma.card.create({
    data: {
      userId,
      eventId,
      originalImagePath: path,
      isPublic,
      status: "processing",
    },
  });

  // 7) 인라인 채점 (sharp 휴리스틱은 빠름 — 큐 추상화 지점)
  await processCard(card.id);

  const res = NextResponse.json(
    { cardId: card.id, status: "processing" },
    { status: 202 }
  );
  if (setCookie) {
    res.cookies.set(ANON_COOKIE, userId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
}
