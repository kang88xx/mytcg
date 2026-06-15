import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ANON_COOKIE } from "@/lib/anon";

export const runtime = "nodejs";

const REPORT_THRESHOLD = 3; // 누적 신고 시 자동 검수 전환

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = body.reason ?? "inappropriate";

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card || card.status === "deleted") {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  await prisma.report.create({
    data: {
      cardId: id,
      reporterUserId: req.cookies.get(ANON_COOKIE)?.value ?? null,
      reason,
      description: body.description ?? null,
    },
  });

  const newCount = card.reportCount + 1;
  await prisma.card.update({
    where: { id },
    data: {
      reportCount: newCount,
      // 임계 초과 시 자동 reported (리더보드 노출 차단)
      status: newCount >= REPORT_THRESHOLD && card.status === "active" ? "reported" : card.status,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
