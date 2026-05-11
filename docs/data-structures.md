# NuRI 데이터 구조

API 계약, 백엔드 내부 가공 형식, 외부 공공 API·AI 응답 형식을 한곳에 정리했습니다. 실제 필드명은 코드와 동일하게 적었습니다.

---

## 흐름 한눈에

```
[프론트 폼] SearchRequest (JSON)
    → POST /api/v1/search
        → [복지 API] 원본 항목 → format_welfare_for_summary → 요약용 dict
        → [행사 API] 원본 항목 → format_events_for_summary → 요약용 dict
        → (선택) 관심사 키워드 필터, 건수 상한
        → [Gemini] items_for_summary JSON → 응답 { summaries: [{ id, summary }, ...] }
        → 내부 결과 list[dict] 조합
    → SearchResponse { cards[], total_count, message }
[프론트] 카드 UI (SummaryCard 필드 사용)
```

---

## 1. REST API

### `GET /api/v1/health`

응답 예:

```json
{ "status": "ok", "service": "NuRI API" }
```

### `POST /api/v1/search`

**요청 본문** — Pydantic `SearchRequest` (`backend/app/schemas.py`)

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `age` | int | 0–120 | 나이 |
| `region_code` | string | 필수 | 시·도 식별에 쓰는 짧은 코드. 프론트는 `REGIONS[].code` 값(예: `"서울"`, `"경기"`)을 보냄 |
| `region_name` | string | 선택, 기본 `""` | 표시·로그용. 시·군·구까지 있으면 `"경기도 수원시"` 형태 |
| `occupation` | string | 기본 `"기타"` | 직업 구분(복지 API 조회에 사용) |
| `interests` | string[] | 기본 `[]` | 관심 분야. 비어 있으면 복지/행사 상한만 따로 적용, 있으면 키워드 필터 후 최대 32건 |

**응답 본문** — `SearchResponse`

| 필드 | 타입 | 설명 |
|------|------|------|
| `cards` | `SummaryCard[]` | 결과 카드 목록 |
| `total_count` | int | `cards` 길이 |
| `message` | string | 사용자 안내 문구 |

**`SummaryCard`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 항목 고유 ID (복지 `servId`, 행사 `contentid` 등) |
| `title` | string | 제목 |
| `category` | string | `"복지"` 또는 `"행사"` |
| `summary` | string | 요약 본문. Gemini 사용 시 마크다운 규칙(`rules.md`)에 맞춘 텍스트; 키 없으면 원문 텍스트 |
| `original_text` | string | 현재 라우터는 빈 문자열로 둠 (스키마만 존재) |
| `source_url` | string | 출처 URL |
| `source_name` | string | 출처 기관명 |
| `apply_deadline` | string | 스키마상 신청 기한 필드. **현재 빌드에서는 채우지 않음** (항상 `""`) |

구현 참고: `backend/app/api/v1/router.py`, `backend/app/schemas.py`.

---

## 2. 프론트엔드 — 폼에서 나가는 객체

`frontend/src/components/form.js` 제출 시 콜백으로 넘기는 객체는 API 본문과 동일한 키를 씁니다.

- `age`: 숫자
- `region_code`: `provinceSelect`의 값 → `REGIONS[].code` (짧은 이름)
- `region_name`: 시·도 표시명 + (선택) 시·군·구 이름
- `occupation`: `OCCUPATIONS` 중 선택 value
- `interests`: 체크된 관심사 value 배열 (`INTERESTS`와 `gemini_search.INTEREST_KEYWORDS` 키가 대응)

**정적 목록 (프론트 전용)**  
- `REGIONS`, `REGION_CITIES`: `form.js` 상단. 행사 API의 시·도 코드 해석(`events.AREA_CODE_MAP`)과 같은 축을 쓰도록 맞춰져 있음.  
- `OCCUPATIONS`, `INTERESTS`: 같은 파일.

요청 전송: `frontend/src/utils/api.js` → `fetch("/api/v1/search", { method: "POST", body: JSON.stringify(params) })`.

---

## 3. 백엔드 내부 — “요약용 항목” dict

`search_and_summarize`가 다운스트림까지 넘기는 각 항목은 대략 다음 형태입니다 (`category`는 파이프라인에서 붙임).

| 키 | 설명 |
|----|------|
| `id` | 복지·행사 공통 식별자 |
| `title` | 제목 |
| `raw_text` | 라벨:값 줄이 이어진 원문용 텍스트 (Gemini 입력·폴백 요약에 사용) |
| `source_name` | 출처 표시명 |
| `source_url` | 링크 |
| `category` | `"복지"` \| `"행사"` |

**Gemini에만 넘기는 축소본** (`items_for_summary`): `id`, `title`, `raw_text` 만 JSON 배열로 직렬화 (`gemini_search.py`).

---

## 4. 공공데이터포털 — 복지 (한국사회보장정보원)

클라이언트: `backend/app/services/welfare.py`  
엔드포인트 베이스: `NationalWelfareInformationsV001`

- 목록 `callTp=L` 응답은 XML 또는 JSON으로 올 수 있음. XML이면 `servList` 노드별로 필드가 dict로 올라감.
- `format_welfare_for_summary`가 쓰는 **주요 원본 필드**와 `raw_text` 라벨 매핑:

| API 쪽 키(들) | raw_text 라벨 |
|----------------|---------------|
| `servNm`, `wlfareInfoNm`, `servDgst` | 제목 후보 |
| `servDgst` | 서비스 요약 |
| `intrsThemaArray` | 관심 주제 |
| `trgterDtlCn` | 지원 대상 |
| `slctCritCn` | 선정 기준 |
| `alwServCn` | 지원 내용 |
| `aplyMtdCn` | 신청 방법 |
| `servDtlLink` | 상세 링크 |
| `lifeNmArray` | 생애주기 |
| `trgterIndvdlNmArray` | 대상 특성 |
| `jurMnofNm` | 소관 부처 |
| `jurOrgNm` | 담당 기관 |
| `bizChrDeptNm` | 담당 부서 (`source_name` 기본값에도 사용) |
| `rprsCtadr` | 대표 문의처 |
| `inqNum` | 문의 전화 |

출력 id: `servId`.

---

## 5. 공공데이터포털 — 행사·축제 (한국관광공사 KorService2)

클라이언트: `backend/app/services/events.py`  
`searchFestival2` JSON 응답의 `response.body.items.item` (단일이면 dict, 복수면 list).

`format_events_for_summary` 매핑:

| API 키 | raw_text 라벨 |
|--------|----------------|
| `title` | 행사명 (제목으로도 사용) |
| `addr1` | 장소 |
| `addr2` | 상세주소 |
| `tel` | 연락처 |
| `eventstartdate` | 시작일 (YYYYMMDD) |
| `eventenddate` | 종료일 |
| `overview` | 개요 |
| `sponsor1` | 주최 |
| `sponsor2` | 주관 |
| `subevent` | 부대행사 |
| `usetimefestival` | 이용시간 |
| `playtime` | 공연시간 |
| `program` | 프로그램 |

출력 id: `contentid`.  
`source_url`: VisitKorea 상세 URL 템플릿으로 조합.

지역: `region_code`(이름 또는 숫자) → 내부 `AREA_CODE_MAP` → TourAPI `areaCode`.

---

## 6. Gemini 요약 계약

- **System:** `SUMMARY_SYSTEM_PROMPT_TEMPLATE` + 루트 `rules.md` 중 `[원문 데이터]:` 앞부분 (`gemini_search._load_summary_rules`).
- **User 콘텐츠:** “아래 N건…” + `items_for_summary` JSON 문자열.
- **모델 설정:** `response_mime_type: application/json`, `temperature: 0.2` 등 (`_request_gemini_summaries`).

**모델이 반환해야 하는 JSON 형태 (개념)**

```json
{
  "summaries": [
    { "id": "<원본과 동일 id>", "summary": "<마크다운 요약>" }
  ]
}
```

파싱 후 `id` → `summary` 맵으로 바꿔 각 항목에 합침. 실패 시 `_build_basic_summary`로 `raw_text`에서 필드를 뽀개 짧은 마크다운 생성.

`GEMINI_API_KEY`가 없으면 Gemini를 호출하지 않고, 요약용 항목의 `raw_text`를 그대로 `summary`로 돌려줌.

---

## 7. 건수·필터 상수 (백엔드)

`backend/app/services/gemini_search.py`:

| 상수 | 값 | 의미 |
|------|-----|------|
| `MAX_ITEMS_FOR_SUMMARY` | 32 | 관심사 필터 적용 시 상한 |
| `WELFARE_CAP` | 24 | 관심사 없을 때 복지 최대 건수 |
| `EVENT_CAP` | 8 | 관심사 없을 때 행사 최대 건수 |

관심사 필터: `INTEREST_KEYWORDS`로 확장된 키워드가 `title` + `raw_text`에 부분 문자열로 포함되는 항목만 남김.

---

## 8. 관련 파일 목록

| 역할 | 경로 |
|------|------|
| API 스키마 | `backend/app/schemas.py` |
| 검색 라우트 | `backend/app/api/v1/router.py` |
| 수집·요약 오케스트레이션 | `backend/app/services/gemini_search.py` |
| 복지 API | `backend/app/services/welfare.py` |
| 행사 API | `backend/app/services/events.py` |
| 요약 규칙(프롬프트) | `rules.md` |
| 프론트 API 클라이언트 | `frontend/src/utils/api.js` |
| 폼·지역·관심사 데이터 | `frontend/src/components/form.js` |
| 카드 UI | `frontend/src/components/card.js` |

---

## 9. 변경 시 주의

- **스키마** (`SearchRequest`, `SummaryCard`, Gemini JSON) 중 하나를 바꾸면 프론트 `createCard` / `openCardModal`·백엔드 라우터·`gemini_search`를 함께 맞출 것.
- `region_code`는 스키마 설명이 “지역 코드”여도 **현재 프론트는 짧은 시·도 이름**을 보냄. TourAPI 숫자 코드와 혼동하지 말 것.
- `apply_deadline`을 실제로 채우려면 수집 단계에서 필드를 넣고 `router`에서 `SummaryCard` 생성 시 전달해야 함.
