"use client";

import { useState } from "react";

interface AdminCard {
  id: string;
  nickname: string | null;
  status: string;
  score: number | null;
  grade: string | null;
  element: string | null;
  reportCount: number;
  isLeaderboardEligible: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [cards, setCards] = useState<AdminCard[] | null>(null);
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const q = new URLSearchParams({ key });
    if (filter) q.set("status", filter);
    const r = await fetch(`/api/admin/cards?${q}`);
    if (!r.ok) { setErr("인증 실패 또는 오류"); return; }
    const d = await r.json();
    setCards(d.cards);
  }

  async function act(cardId: string, action: string) {
    await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ cardId, action }),
    });
    load();
  }

  return (
    <main className="container">
      <h1 style={{ fontSize: 22 }}>관리자 · 카드 검수</h1>
      <div className="row" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="ADMIN_KEY"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: "1px solid var(--ring)", background: "var(--panel2)", color: "var(--ink)" }}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: "1px solid var(--ring)", background: "var(--panel2)", color: "var(--ink)" }}
        >
          <option value="">전체</option>
          <option value="active">active</option>
          <option value="reported">reported</option>
          <option value="hidden">hidden</option>
          <option value="rank_excluded">rank_excluded</option>
        </select>
        <button className="btn" onClick={load}>불러오기</button>
      </div>
      {err && <div className="warn">{err}</div>}

      {cards && (
        <div className="card-panel" style={{ padding: 0, overflow: "hidden" }}>
          {cards.length === 0 && <div className="muted" style={{ padding: 20 }}>결과 없음</div>}
          {cards.map((c) => (
            <div key={c.id} className="lb-row" style={{ flexWrap: "wrap" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/cards/${c.id}/image`} alt="" className="lb-thumb" />
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700 }}>{c.nickname ?? "익명"} · {c.grade ?? "-"}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {c.status} · 신고 {c.reportCount} · {c.isLeaderboardEligible ? "랭킹반영" : "랭킹제외"}
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="tab" onClick={() => act(c.id, "hide")}>숨김</button>
                <button className="tab" onClick={() => act(c.id, "exclude")}>랭킹제외</button>
                <button className="tab" onClick={() => act(c.id, "delete")}>삭제</button>
                <button className="tab" onClick={() => act(c.id, "restore")}>복구</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="notice" style={{ marginTop: 16 }}>
        개발용 키 인증(MVP). 프로덕션은 관리자 계정/세션 기반 인증으로 교체 필요.
      </p>
    </main>
  );
}
