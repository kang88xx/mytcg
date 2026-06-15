import Link from "next/link";
import TopBar from "@/components/TopBar";
import { getLeaderboard } from "@/lib/leaderboard";
import { GRADE_TONE, type Grade } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const top = await getLeaderboard("weekly", { limit: 3 });

  return (
    <>
      <TopBar />
      <main className="container">
        <section className="hero">
          <div className="eyebrow">AI TRADING CARD · LEADERBOARD</div>
          <h1>
            내 사진이 <span className="grad">AI 카드</span>가 된다
          </h1>
          <p>
            AI가 이미지 퀄리티를 분석해 점수·등급·능력치를 자동 생성합니다.
            주간 랭킹에 도전하고 이벤트 상품을 받아보세요.
          </p>
          <div className="center" style={{ marginTop: 20 }}>
            <Link href="/create" className="btn">
              ⚡ 카드 만들기
            </Link>
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>이번 주 TOP 3</h2>
            <Link href="/leaderboard" className="muted" style={{ fontSize: 14 }}>
              전체 리더보드 →
            </Link>
          </div>
          {top.length === 0 ? (
            <div className="card-panel muted">
              아직 등록된 카드가 없습니다. 첫 카드를 만들어 1위에 올라보세요!
            </div>
          ) : (
            <div className="grid-cards">
              {top.map((c) => {
                const tone = GRADE_TONE[c.grade as Grade];
                return (
                  <Link key={c.cardId} href={`/card/${c.cardId}`} className="card-panel">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/cards/${c.cardId}/image`}
                      alt=""
                      style={{ width: "100%", borderRadius: 12, display: "block" }}
                    />
                    <div className="row between" style={{ marginTop: 10 }}>
                      <span style={{ fontWeight: 700 }}>#{c.rank} {c.nickname ?? "익명"}</span>
                      <span
                        className="grade-badge"
                        style={{ background: tone?.accent ?? "#39ffd0" }}
                      >
                        {c.grade}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="card-panel" style={{ marginTop: 28 }}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>어떻게 동작하나요?</h3>
          <p className="notice" style={{ margin: 0 }}>
            ① 사진 1컷 촬영/업로드 → ② AI가 선명도·노출·구도·색감 등을 분석 →
            ③ 점수·등급·희귀도·속성·PWR·스킬을 <b>자동</b> 생성(수정 불가) →
            ④ 리더보드 등록 → ⑤ 카카오/인스타/페북 공유.
            점수와 순위는 서버에서 계산되며 사용자가 변경할 수 없습니다.
          </p>
        </section>
      </main>
    </>
  );
}
