# TECH_SPEC — 기술 설계

> 스택 결정: **Next.js 풀스택 웹 우선** (모바일 앱은 추후 RN/Expo 래핑). 근거: 브리핑의 핵심(공유 랜딩/OG/카카오 공유)이 전부 웹이며 즉시 배포·체험이 가능.

## 1. 아키텍처 개요

```text
                  ┌────────────────────────────────────────┐
   브라우저 ◀────▶│  Next.js (App Router) on Vercel         │
   (PWA/모바일웹) │  - 화면(촬영/결과/리더보드/상세/admin)   │
                  │  - Route Handlers (REST API)            │
                  │  - 서버 렌더 OG/공유 이미지(@vercel/og)  │
                  └───────┬─────────────┬──────────┬────────┘
                          │             │          │
                   ┌──────▼───┐  ┌──────▼─────┐ ┌──▼────────┐
                   │ Postgres │  │ Redis      │ │ S3 호환    │
                   │ (영속)   │  │ (랭킹 ZSET)│ │ 스토리지   │
                   └──────────┘  └────────────┘ └───────────┘
                          ▲
                   ┌──────┴──────────────┐
                   │ Scoring Worker(큐)  │  ← AI 분석/점수/렌더 비동기
                   │ Queue: BullMQ        │
                   └──────────────────────┘
```

- **프론트+API 통합**: Next.js App Router. UI는 RSC + Client Components, API는 Route Handlers(`/app/api/**`).
- **비동기 처리**: 업로드 후 `processing` 상태 반환 → 워커가 분석/점수/렌더 수행 → 클라이언트는 폴링 또는 SSE로 `active` 감지. (30초 SLA 내)
- **점수·랭킹은 서버 전용.** 클라이언트는 결과만 표시.

## 2. 기술 스택

| 레이어 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js (App Router, TS) | 풀스택 |
| 런타임 | Node.js 24 (Fluid Compute) | Vercel Functions |
| DB | PostgreSQL | Prisma ORM |
| 캐시/랭킹 | Redis (Sorted Set) | Upstash 등 마켓플레이스 |
| 스토리지 | S3 호환 + CDN | 원본/카드/공유 이미지 |
| 큐 | BullMQ (Redis 기반) | 분석·렌더 비동기 |
| 카드 렌더 | `@vercel/og`(Satori) 또는 node-canvas | 서버 렌더(신뢰성) |
| 이미지 분석(MVP) | `sharp` + OpenCV 통계 기반 | 인터페이스 분리, ML 교체 가능 |
| 인증 | 익명 토큰 + 소셜(카카오) 선택 | MVP는 익명 우선 |
| 배포 | Vercel | 프리뷰/프로덕션 |

## 3. 점수화 파이프라인 (서버)

```text
upload → 원본 저장(S3) → imageHash(SHA-256) + perceptualHash(pHash)
      → 중복/유사 검사 → 품질 분석 → 점수(100) → 등급/희귀도/속성
      → PWR/스킬/패시브 → 카드 렌더(원본+공유 5종) → 리더보드 등록
```

### 3.1 Scoring 인터페이스 (교체 가능 핵심)

```ts
interface ImageScorer {
  analyze(buf: Buffer): Promise<AnalysisResult>; // 항목별 0~100 + 메타
}
// MVP: HeuristicScorer (sharp/OpenCV 통계)
// 후속: MLScorer (외부 모델/비전 API) — 동일 인터페이스로 드롭인 교체
```

- MVP 휴리스틱 예: 선명도=라플라시안 분산, 노출=히스토그램 평균/클리핑, 해상도=픽셀수 임계, 구도=피사체 중앙성(간이 saliency), 색감=채도/대비.
- 항목 가중치·패널티·등급 매핑은 **서버 설정값**으로 버전 관리(`scoringVersion`).

### 3.2 패널티

동일 이미지 재업로드 −30/랭킹제외 · 저해상도 −20 · 과암 −10 · 피사체없음 −15 · 부적절 점수중단·제출불가 · 워터마크/스크린샷 의심 −10/검수.

## 4. 카드 렌더링

- **최종(리더보드 반영) 카드 = 서버 렌더.** 미리보기는 클라이언트 가능.
- 산출물: `card_original.png`, `card_square.png(1080²)`, `card_story.png(1080×1920)`, `card_feed.png(1080×1350)`, `card_og.png(1200×630)`.
- 모든 공유 이미지에 서비스 로고/워터마크 + "나도 만들기" URL 삽입.
- 레이아웃·금지요소는 [`DESIGN_GUIDE.md`](./DESIGN_GUIDE.md)/[`IP_RISK_GUIDE.md`](./IP_RISK_GUIDE.md) 준수.

## 5. 부정행위 방지 / 신뢰성

- `imageHash`(정확 중복) + `perceptualHash`(유사) 저장·비교.
- 계정/디바이스/IP당 제출 제한: 무료 분석 **하루 3회**, 이벤트 랭킹 반영 하루 1회(이벤트당 최고점 1개).
- Rate limiting (IP+토큰), 이상 제출 탐지, 관리자 검수 큐, `rank_excluded` 상태.
- 점수는 서버에서만 계산·서명. 응답 변조 방지 위해 카드 수치는 서버 재조회로 확정.

## 6. 공유 / 바이럴

- 카드 상세 `/card/{id}`는 **서버 렌더 + 동적 OG 메타**(카카오/페북 미리보기).
- 카카오: JS SDK 공유, 공유 성공/실패 콜백 로깅(가능시 완료 기준). 자동 발송 금지.
- 인스타: 앱 이동 후 사용자 직접 게시(스토리/피드 버튼 분리). 공유 횟수는 **상품 랭킹 미반영**(바이럴 분석용).
- 페북: Share Dialog + OG 메타. 클릭 로그.
- `ShareLog`에 platform/action(click/success/fail/view/install) 기록.

## 7. 환경 변수 (초안)

```text
DATABASE_URL, REDIS_URL, S3_ENDPOINT/BUCKET/KEY/SECRET, CDN_BASE_URL,
KAKAO_JS_KEY, KAKAO_REST_KEY, NEXT_PUBLIC_BASE_URL,
SCORING_VERSION, ADMIN_BASIC_AUTH (MVP 관리자 보호), ANON_TOKEN_SECRET
```

## 8. 비기능 요구

- 카드 생성 P95 ≤ 30초. 리더보드 조회 P95 ≤ 300ms(Redis ZSET).
- 이미지 저장·CDN 권한 분리, 서명 URL. 개인정보 처리방침 연동([`PRD §3`], 정책 문서).
- 로깅/관측: 공유 퍼널, 분석 큐 지연, 실패율.

## 9. 모바일 전환 경로 (후속)

웹 MVP의 API/렌더/리더보드를 그대로 두고, RN/Expo로 카메라·네이티브 공유만 래핑. 카드 상세/관리자/공유 랜딩은 웹 유지.
