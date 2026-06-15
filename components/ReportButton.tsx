"use client";

import { useState } from "react";

export default function ReportButton({ cardId }: { cardId: string }) {
  const [done, setDone] = useState(false);

  async function report() {
    if (done) return;
    if (!confirm("이 카드를 부적절한 콘텐츠로 신고하시겠습니까?")) return;
    await fetch(`/api/cards/${cardId}/report`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "inappropriate" }),
    });
    setDone(true);
  }

  return (
    <button
      onClick={report}
      className="muted"
      style={{ background: "none", border: 0, cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
    >
      {done ? "신고 접수됨" : "🚩 신고하기"}
    </button>
  );
}
