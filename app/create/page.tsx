"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? "마이TCG";

type Phase = "input" | "uploading" | "analyzing";

export default function CreatePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [nickname, setNickname] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | null) {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function pollUntilActive(cardId: string) {
    for (let i = 0; i < 30; i++) {
      const r = await fetch(`/api/cards/${cardId}`);
      if (r.ok) {
        const d = await r.json();
        if (d.status === "active") return router.push(`/card/${cardId}`);
        if (["blocked", "deleted"].includes(d.status)) {
          setError("카드 생성에 실패했습니다. 다른 사진으로 다시 시도해 주세요.");
          setPhase("input");
          return;
        }
      }
      await new Promise((res) => setTimeout(res, 700));
    }
    // 타임아웃이어도 결과 페이지로 이동 (폴링 계속)
    router.push(`/card/${cardId}`);
  }

  async function submit() {
    if (!file) return;
    setError(null);
    setPhase("uploading");
    const fd = new FormData();
    fd.append("image", file);
    if (nickname) fd.append("nickname", nickname);

    const r = await fetch("/api/cards", { method: "POST", body: fd });
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setError(d?.error?.message ?? "업로드에 실패했습니다.");
      setPhase("input");
      return;
    }
    const { cardId } = await r.json();
    setPhase("analyzing");
    pollUntilActive(cardId);
  }

  if (phase !== "input") {
    return (
      <main className="container wrap-narrow" style={{ paddingTop: 80 }}>
        <div className="card-panel stack" style={{ alignItems: "center", textAlign: "center" }}>
          {preview && <img src={preview} alt="" className="preview-img" style={{ maxWidth: 260 }} />}
          <div className="scanline" />
          <div className="stack" style={{ gap: 6 }}>
            <b>{phase === "uploading" ? "이미지 업로드 중…" : "AI 카드 생성 중…"}</b>
            <span className="notice">
              이미지 퀄리티 분석 → 등급 생성 → 리더보드 점수 계산
            </span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container wrap-narrow" style={{ paddingTop: 40 }}>
      <Link href="/" className="muted" style={{ fontSize: 14 }}>← {BRAND}</Link>
      <h1 style={{ fontSize: 24, margin: "12px 0 4px" }}>카드 만들기</h1>
      <p className="notice" style={{ marginTop: 0 }}>
        사진 1컷을 촬영하거나 업로드하세요. AI가 자동으로 채점합니다.
      </p>

      <div className="stack" style={{ marginTop: 16 }}>
        {preview ? (
          <img src={preview} alt="미리보기" className="preview-img" />
        ) : (
          <div className="dropzone" onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: 40 }}>📷</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>사진 촬영 / 업로드</div>
            <div className="notice">탭하여 카메라 또는 앨범에서 선택</div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />

        {preview && (
          <button className="btn ghost block" onClick={() => fileRef.current?.click()}>
            다른 사진 선택
          </button>
        )}

        <input
          placeholder="닉네임 (선택)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{
            padding: 12, borderRadius: 12, border: "1px solid var(--ring)",
            background: "var(--panel2)", color: "var(--ink)", fontSize: 15,
          }}
          maxLength={20}
        />

        {error && <div className="warn">{error}</div>}

        <button className="btn block" onClick={submit} disabled={!file}>
          ⚡ AI 분석 시작
        </button>

        <p className="notice">
          업로드한 이미지는 분석·카드 생성을 위해 서버에 저장됩니다. 점수·등급·능력치는
          AI가 자동 산정하며 수정할 수 없습니다. 부적절한 이미지는 제출이 제한됩니다.
        </p>
      </div>
    </main>
  );
}
