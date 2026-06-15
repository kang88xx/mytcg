import Link from "next/link";
import TopBar from "@/components/TopBar";
import { getLeaderboard } from "@/lib/leaderboard";
import { GRADE_TONE, type Grade, type LeaderboardPeriod } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS: { key: LeaderboardPeriod; label: string }[] = [
  { key: "daily", label: "일간" },
  { key: "weekly", label: "주간 이벤트" },
  { key: "monthly", label: "월간" },
  { key: "all_time", label: "명예의 전당" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period = (TABS.find((t) => t.key === sp.period)?.key ?? "weekly") as LeaderboardPeriod;
  const rows = await getLeaderboard(period, { limit: 100 });

  return (
    <>
      <TopBar />
      <main className="container">
        <h1 style={{ fontSize: 22 }}>리더보드</h1>
        <div className="tabs">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/leaderboard?period=${t.key}`}
              className={`tab ${t.key === period ? "active" : ""}`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {period === "weekly" && (
          <p className="notice" style={{ marginTop: 0 }}>
            상위 10위는 상품 후보입니다(운영자 검수 후 확정). 순위는 서버 점수 기준이며
            공유 수와 무관합니다. 본 이벤트는 Apple/Google/Meta/Kakao와 무관합니다.
          </p>
        )}

        <div className="card-panel" style={{ padding: 0, overflow: "hidden" }}>
          {rows.length === 0 ? (
            <div className="muted" style={{ padding: 24, textAlign: "center" }}>
              아직 등록된 카드가 없습니다.
            </div>
          ) : (
            rows.map((r) => {
              const tone = GRADE_TONE[r.grade as Grade];
              return (
                <Link key={r.cardId} href={`/card/${r.cardId}`} className="lb-row">
                  <span className="lb-rank">{r.rank}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/cards/${r.cardId}/image`} alt="" className="lb-thumb" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>
                      {r.nickname ?? "익명"}
                      {r.isPrizeCandidate && period === "weekly" && (
                        <span style={{ color: "var(--accent)", fontSize: 12, marginLeft: 8 }}>상품 후보</span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>{r.element} · SCORE {r.score.toFixed(1)}</div>
                  </div>
                  <span className="grade-badge" style={{ background: tone?.accent }}>{r.grade}</span>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
