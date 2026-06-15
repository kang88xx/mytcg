# DATABASE_SCHEMA — 데이터 모델 (PostgreSQL + Redis)

> 점수·랭킹 신뢰성을 위해 서버 중심. 영속은 Postgres, 실시간 랭킹은 Redis Sorted Set.

## 1. ERD 요약

```text
User 1───* Card *───1 Event
            │
            ├──1 ImageAnalysis
            ├──* LeaderboardEntry *──1 Event
            ├──* ShareLog
            └──* Report
```

## 2. 테이블

### User
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| nickname | text | 공개명 |
| email / socialId | text null | 소셜 식별(선택) |
| profileImageUrl | text null | |
| isBanned | bool | 기본 false |
| createdAt / updatedAt | timestamptz | |

### Card
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| userId | uuid FK | |
| eventId | uuid FK null | |
| originalImageUrl | text | 원본(S3) |
| cardImageUrl | text | 렌더 결과 |
| shareSquareImageUrl / shareStoryImageUrl / shareFeedImageUrl / shareOgImageUrl | text | 공유 5종 |
| score | numeric(5,2) | **서버 계산** |
| grade | text | SSS+ … C |
| rarity | text | Mythic … Common |
| element | text | Aqua/Flame/… |
| pwr | int | 60~260 |
| skillName | text | |
| skillPower | int | |
| passiveName | text | |
| analysisJson | jsonb | 분석 원시값 |
| imageHash | text idx | SHA-256 (정확 중복) |
| perceptualHash | text idx | pHash (유사) |
| scoringVersion | text | 채점 버전 |
| status | text | 아래 enum |
| isPublic | bool | |
| isLeaderboardEligible | bool | |
| createdAt / updatedAt | timestamptz | |

`status`: `processing | active | hidden | reported | blocked | deleted | rank_excluded`.
인덱스: `(eventId, score desc)`, `(status)`, `imageHash`, `perceptualHash`, `(userId, createdAt)`.

### ImageAnalysis
| 컬럼 | 타입 |
|---|---|
| id uuid PK / cardId uuid FK |  |
| sharpnessScore / brightnessScore / resolutionScore / compositionScore / subjectScore / colorScore | numeric |
| finalScore | numeric(5,2) |
| detectedSubjectType | text (person/animal/object/landscape/…) |
| dominantColors | jsonb |
| penaltyReasons | jsonb (배열) |
| createdAt | timestamptz |

> 개인 신원 식별값은 저장하지 않는다(브리핑 §4.2). 얼굴=피사체 카테고리로만 취급.

### LeaderboardEntry
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id uuid PK | | |
| cardId / userId / eventId | uuid FK | |
| score | numeric(5,2) | 스냅샷 |
| rank | int | 확정 순위 |
| periodType | text | `daily|weekly|monthly|all_time|event` |
| periodStartAt / periodEndAt | timestamptz | |
| isPrizeCandidate | bool | 상품 후보 |
| isVerified | bool | 운영자 검수 확정 |
| createdAt | timestamptz | |

제약: **계정당 이벤트 대표 카드 1개**만 상품 랭킹 반영(유니크 `(userId, eventId, periodType)` where prize). 동일 유저 다수 카드 중 최고점 1개만 표시.

### Event
| 컬럼 | 타입 |
|---|---|
| id uuid PK / title / description |  |
| startAt / endAt | timestamptz |
| prizeDescription | text |
| rulesUrl | text |
| status | text (draft/active/ended) |
| createdAt / updatedAt | timestamptz |

### ShareLog
| 컬럼 | 타입 |
|---|---|
| id uuid PK / cardId / userId |  |
| platform | text (`kakao|instagram_story|instagram_feed|facebook|link|download`) |
| action | text (`click|success|fail|view|install`) |
| referrer | text null |
| createdAt | timestamptz |

> 상품 랭킹 미반영. 바이럴 퍼널 분석용. 인덱스 `(cardId, platform)`.

### Report
| 컬럼 | 타입 |
|---|---|
| id uuid PK / cardId / reporterUserId |  |
| reason | text |
| description | text null |
| status | text (open/reviewing/resolved/dismissed) |
| reviewedBy / reviewedAt | uuid / timestamptz null |
| createdAt | timestamptz |

## 3. Redis (실시간 랭킹)

```text
ZSET lb:weekly:{eventId}   member=cardId  score=finalScore   (TTL = 이벤트 종료)
ZSET lb:daily:{yyyymmdd}   member=cardId  score=finalScore
ZSET lb:monthly:{yyyymm}   member=cardId  score=finalScore
ZSET lb:all_time           member=cardId  score=finalScore (누적 최고)
```
- 등록 시 `ZADD`, 순위 조회 `ZREVRANK`/`ZREVRANGE`. 동점 처리: 점수 동일 시 `createdAt` 빠른 순(정밀 score에 미세 타임 가중 또는 보조 정렬).
- 부정/제외 카드는 `ZREM`. 확정 순위는 이벤트 종료 시 Postgres `LeaderboardEntry`로 스냅샷.

## 4. 중복/부정 방지 데이터

- `imageHash` 정확 일치 → 재업로드 감지(−30/제외).
- `perceptualHash` 해밍거리 임계 → 유사 이미지 감지.
- 제출 카운트: Redis 카운터 `quota:{userId|ip}:{yyyymmdd}` TTL 24h, 한도 3.
