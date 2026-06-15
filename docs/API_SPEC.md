# API_SPEC — REST API 설계 (Next.js Route Handlers)

> 기준: 모든 점수/등급/능력치/순위는 **서버 권위**. 클라이언트 제출 수치는 무시. 경로 prefix: `/api`.

## 공통

- 인증: 익명 토큰(`Authorization: Bearer <anonToken>`) 또는 소셜 세션. 관리자 엔드포인트는 별도 권한.
- 응답 에러 포맷:

```json
{ "error": { "code": "RATE_LIMITED", "message": "하루 분석 횟수를 초과했습니다." } }
```

- Rate limit 헤더: `X-RateLimit-Remaining`, `Retry-After`.

---

## 1. 카드 생성 — `POST /api/cards`

`multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| image | file | ✓ | 1컷 원본 |
| isPublic | boolean | | 기본 true |
| eventId | string | | 이벤트 랭킹 참가 시 |
| nickname | string | | 미설정 시 익명 |

응답 `202`:
```json
{ "cardId": "abc123", "status": "processing" }
```
실패: `400`(이미지 없음/저해상도), `429`(횟수 초과), `422`(부적절 의심 → 제출 불가).

---

## 2. 카드 상태/상세 — `GET /api/cards/{cardId}`

응답 `200`:
```json
{
  "cardId": "abc123",
  "status": "active",
  "score": 96.4,
  "grade": "SSS",
  "rarity": "Legendary",
  "element": "Aqua",
  "pwr": 250,
  "skillName": "Blue Impact",
  "skillPower": 100,
  "passiveName": "Crystal Focus",
  "cardImageUrl": "https://cdn/.../card_original.png",
  "shareUrl": "https://service-domain.com/card/abc123",
  "rank": 7,
  "isLeaderboardEligible": true
}
```
`status`: `processing | active | hidden | reported | blocked | deleted | rank_excluded`.
처리 중이면 `score` 등 null + `status:"processing"`. 폴링 또는 `GET /api/cards/{id}/events`(SSE)로 완료 감지.

---

## 3. 리더보드 — `GET /api/leaderboards`

쿼리: `period=daily|weekly|monthly|all_time|event`, `eventId?`, `category?`, `limit=100`, `cursor?`.

응답 `200`:
```json
{
  "period": "weekly",
  "entries": [
    { "rank": 1, "cardId": "abc", "nickname": "user123", "score": 98.7,
      "grade": "SSS+", "cardImageUrl": "...", "isPrizeCandidate": true, "isVerified": false }
  ],
  "myRank": { "rank": 42, "cardId": "...", "score": 81.2 }
}
```

---

## 4. 공유 로그 — `POST /api/share-logs`

```json
{ "cardId": "abc123", "platform": "kakao", "action": "success", "referrer": "..." }
```
`platform`: `kakao|instagram_story|instagram_feed|facebook|link|download`.
`action`: `click|success|fail|view|install`. 응답 `204`.

---

## 5. 신고 — `POST /api/cards/{cardId}/report`

```json
{ "reason": "inappropriate", "description": "optional" }
```
응답 `201`. 신고 누적 임계 초과 시 자동 `reported` 상태 전환 + 검수 큐 등록.

---

## 6. 닉네임/카드 관리 (본인)

- `PATCH /api/cards/{cardId}` — 허용 필드만: `isPublic`, `isLeaderboardEligible`, `nickname`. **점수/등급/능력치 변경 요청은 무시(서버 권위).**
- `DELETE /api/cards/{cardId}` — 본인 카드 삭제(soft delete → `deleted`).

---

## 7. 이벤트 — `GET /api/events`, `GET /api/events/{id}`

진행 중/예정 이벤트, 약관 URL(`rulesUrl`), 기간, 상품 설명 반환.

---

## 8. 관리자 — `/api/admin/**` (권한 필요)

| 메서드/경로 | 기능 |
|---|---|
| `GET /api/admin/cards?status=reported` | 카드/신고 목록 |
| `POST /api/admin/cards/{id}/hide` | 숨김 |
| `DELETE /api/admin/cards/{id}` | 삭제 |
| `POST /api/admin/cards/{id}/exclude` | 랭킹 제외(`rank_excluded`) |
| `POST /api/admin/users/{id}/ban` | 사용자 제한 |
| `POST /api/admin/events/{id}/verify` | 상품 대상자 검수 확정(`isVerified`) |
| `GET /api/admin/duplicates` | 중복/유사 이미지 검토 |

---

## 9. 카카오 공유 (클라이언트 SDK + 서버)

- 카드 상세 `/card/{id}`에 동적 OG 메타(서버 렌더). 카카오 공유는 JS SDK로 호출, 결과를 `POST /api/share-logs`로 로깅.
- 자동 메시지 발송 없음. 사용자가 공유 대상 직접 선택.

## 10. 레이트 리밋 정책 (요약)

- `POST /api/cards`: 토큰/IP/디바이스당 **하루 3회**. 이벤트 랭킹 반영 1일 1회(이벤트당 최고점 1개).
- 동일/유사 이미지 재제출: 점수 패널티 또는 랭킹 제외.
