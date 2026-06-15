import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCardRank } from "@/lib/leaderboard";
import { GRADE_TONE, ELEMENT_COLOR, type Grade, type Element, type AnalysisResult } from "@/lib/types";
import ShareButtons from "@/components/ShareButtons";
import ReportButton from "@/components/ReportButton";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "";
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? "마이TCG";

async function getCard(id: string) {
  return prisma.card.findUnique({ where: { id }, include: { user: true } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(id);
  if (!card || card.status === "deleted") return { title: BRAND };
  const title = `${card.user.nickname ?? "익명"}님의 ${card.grade} 카드 · ${BRAND}`;
  const desc = `점수 ${card.score?.toFixed(1)} · ${card.rarity} · ${card.element}`;
  const img = `${BASE}/api/cards/${id}/image`;
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, images: [img], url: `${BASE}/card/${id}` },
    twitter: { card: "summary_large_image", title, description: desc, images: [img] },
  };
}

const STAT_LABELS: { key: keyof AnalysisResult; label: string }[] = [
  { key: "sharpness", label: "선명도" },
  { key: "brightness", label: "노출/밝기" },
  { key: "resolution", label: "해상도" },
  { key: "composition", label: "구도" },
  { key: "subject", label: "피사체" },
  { key: "color", label: "색감" },
];

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card || card.status === "deleted") notFound();

  if (card.status === "processing") {
    return (
      <main className="container wrap-narrow" style={{ paddingTop: 80 }}>
        <div className="card-panel stack" style={{ textAlign: "center" }}>
          <div className="scanline" />
          <b>AI 카드 생성 중…</b>
          <a href={`/card/${id}`} className="btn ghost">새로고침</a>
        </div>
      </main>
    );
  }
  if (["hidden", "blocked", "reported"].includes(card.status)) {
    return (
      <main className="container wrap-narrow" style={{ paddingTop: 80 }}>
        <div className="card-panel muted" style={{ textAlign: "center" }}>
          현재 이 카드는 표시할 수 없습니다.
          <div style={{ marginTop: 12 }}><Link href="/" className="btn">홈으로</Link></div>
        </div>
      </main>
    );
  }

  const tone = GRADE_TONE[card.grade as Grade];
  const elColor = ELEMENT_COLOR[card.element as Element];
  const rank = card.isLeaderboardEligible ? await getCardRank(id, "weekly") : null;
  const analysis: AnalysisResult | null = card.analysisJson
    ? JSON.parse(card.analysisJson)
    : null;
  const imageUrl = `${BASE}/api/cards/${id}/image`;
  const shareUrl = `${BASE}/card/${id}`;

  return (
    <main className="container wrap-narrow" style={{ paddingTop: 32 }}>
      <Link href="/" className="muted" style={{ fontSize: 14 }}>← {BRAND}</Link>

      <div className="center" style={{ marginTop: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="AI 카드" style={{ width: "100%", maxWidth: 360, borderRadius: 16 }} />
      </div>

      <div className="card-panel stack" style={{ marginTop: 18 }}>
        <div className="row between">
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{card.user.nickname ?? "익명"}</div>
            <div className="muted" style={{ fontSize: 13 }}>{card.rarity} · {card.element}</div>
          </div>
          <span className="grade-badge" style={{ background: tone?.accent, fontSize: 22 }}>
            {card.grade}
          </span>
        </div>

        <div className="row" style={{ gap: 20 }}>
          <div><div className="muted" style={{ fontSize: 12 }}>SCORE</div><b style={{ fontSize: 22 }}>{card.score?.toFixed(1)}</b></div>
          <div><div className="muted" style={{ fontSize: 12 }}>PWR</div><b style={{ fontSize: 22, color: elColor }}>{card.pwr}</b></div>
          <div><div className="muted" style={{ fontSize: 12 }}>주간 랭킹</div><b style={{ fontSize: 22 }}>{rank ? `#${rank}` : "-"}</b></div>
        </div>

        <div>
          <div className="row between" style={{ fontSize: 14 }}>
            <span>대표 스킬 · {card.skillName}</span><b style={{ color: tone?.accent }}>{card.skillPower}</b>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>패시브 · {card.passiveName}</div>
        </div>

        {analysis && (
          <div className="statbar">
            {STAT_LABELS.map((s) => {
              const v = Math.round(Number(analysis[s.key] ?? 0));
              return (
                <div className="stat" key={s.key}>
                  <span style={{ width: 64 }} className="muted">{s.label}</span>
                  <span className="bar"><span className="fill" style={{ width: `${v}%`, display: "block" }} /></span>
                  <span style={{ width: 28, textAlign: "right" }}>{v}</span>
                </div>
              );
            })}
          </div>
        )}

        {!card.isLeaderboardEligible && (
          <div className="notice warn">
            ⚠ 중복/유사 이미지로 판단되어 리더보드 랭킹에서 제외되었습니다.
          </div>
        )}
        <div className="notice">점수·등급·능력치는 AI가 자동 산정하며 수정할 수 없습니다.</div>
      </div>

      <div style={{ marginTop: 18 }}>
        <ShareButtons cardId={id} shareUrl={shareUrl} imageUrl={imageUrl} />
      </div>

      <div className="row between" style={{ marginTop: 18 }}>
        <Link href="/create" className="btn">나도 카드 만들기</Link>
        <Link href="/leaderboard" className="btn ghost">리더보드</Link>
      </div>

      <div className="center" style={{ marginTop: 16 }}>
        <ReportButton cardId={id} />
      </div>
    </main>
  );
}
