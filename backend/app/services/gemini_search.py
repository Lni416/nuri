"""공공데이터포털 기반 복지·행사 수집 + Gemini 요약 통합 서비스."""

import asyncio
import json
import logging
from pathlib import Path

from google import genai
from google.genai import errors, types

from app.config import get_settings
from app.services.events import fetch_events, format_events_for_summary
from app.services.welfare import fetch_welfare_list, format_welfare_for_summary

logger = logging.getLogger(__name__)

_RULES_PATH = Path(__file__).resolve().parents[3] / "rules.md"
MAX_ITEMS_FOR_SUMMARY = 32
WELFARE_CAP = 24
EVENT_CAP = 8
GEMINI_RETRY_DELAYS_SECONDS = (1.0, 2.0)
TRANSIENT_GEMINI_ERROR_CODES = {429, 500, 502, 503, 504}

INTEREST_KEYWORDS: dict[str, list[str]] = {
    "의료": ["의료", "건강", "신체건강", "정신건강", "진료", "치료", "질환", "환자", "의료비", "검사", "재활", "요양"],
    "주거": ["주거", "임대", "주택", "전세", "월세", "거주", "생활안정"],
    "교육": ["교육", "장학", "학습", "학교", "대학", "훈련", "보육"],
    "취업": ["취업", "창업", "일자리", "고용", "직업", "훈련", "자립"],
    "문화": ["문화", "여가", "문화·여가", "예술", "체육", "관광", "행사", "축제"],
    "육아": ["육아", "임신", "출산", "보육", "아동", "아이돌봄", "영유아", "가족"],
    "생활": ["생활", "생활지원", "생계", "돌봄", "보호", "안전", "위기", "서민금융"],
    "법률": ["법률", "권익", "상담", "피해", "보호", "인권", "분쟁"],
}


def _load_summary_rules() -> str:
    """rules.md에서 요약 규칙 부분만 로드."""
    try:
        content = _RULES_PATH.read_text(encoding="utf-8")
        marker = "[원문 데이터]:"
        idx = content.find(marker)
        if idx != -1:
            return content[:idx].strip()
        return content.strip()
    except FileNotFoundError:
        return ""


def _model_candidates(primary_model: str, fallback_models: list[str]) -> list[str]:
    """중복을 제거한 Gemini 모델 후보 목록."""
    models = []
    for model in [primary_model, *fallback_models]:
        model = model.strip()
        if model and model not in models:
            models.append(model)
    return models


def _build_basic_summary(item: dict) -> str:
    """Gemini 장애 시 원문 덤프 대신 보여줄 최소 구조화 요약."""
    fields = {}
    for line in item.get("raw_text", "").splitlines():
        label, separator, value = line.partition(":")
        if separator and value.strip():
            fields[label.strip()] = value.strip()

    overview = fields.get("서비스 요약") or fields.get("개요") or item.get("title", "정보")
    target = fields.get("지원 대상") or fields.get("대상 특성")
    benefit = fields.get("지원 내용")
    apply_method = fields.get("신청 방법")
    contact = fields.get("문의 전화") or fields.get("대표 문의처")

    sections = ["### 한눈에 보기", f"- {overview}"]
    if target:
        sections.extend(["", "### 누가 받을 수 있나요?", f"- {target}"])
    if benefit:
        sections.extend(["", "### 어떤 도움을 받을 수 있나요?", f"- {benefit}"])
    if apply_method:
        sections.extend(["", "### 어떻게 신청하나요?", f"- {apply_method}"])
    if contact:
        sections.extend(["", "### 문의", f"- {contact}"])

    return "\n".join(sections)


async def _request_gemini_summaries(
    client: genai.Client,
    models: list[str],
    summary_prompt: str,
    summary_system: str,
) -> dict[str, str]:
    """Gemini 요약 요청. 일시 장애는 재시도하고 모델 후보를 순차 사용한다."""
    last_error: Exception | None = None

    for model in models:
        for attempt in range(len(GEMINI_RETRY_DELAYS_SECONDS) + 1):
            try:
                logger.info("2단계: Gemini 요약 요청 model=%s attempt=%d", model, attempt + 1)
                summary_response = client.models.generate_content(
                    model=model,
                    contents=summary_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=summary_system,
                        temperature=0.2,
                        max_output_tokens=16384,
                        response_mime_type="application/json",
                    ),
                )

                summary_json_text = summary_response.text or ""
                summary_data = json.loads(summary_json_text)
                summaries = {
                    s["id"]: s["summary"]
                    for s in summary_data.get("summaries", [])
                    if s.get("id") and s.get("summary")
                }

                if summaries:
                    logger.info("2단계 완료: model=%s, %d건 요약 생성", model, len(summaries))
                    return summaries

                last_error = ValueError("Gemini 응답에 summaries가 없습니다.")
                logger.warning("Gemini 응답에 summaries가 없습니다. model=%s", model)
                break

            except json.JSONDecodeError as e:
                last_error = e
                logger.warning("Gemini JSON 파싱 실패: model=%s, error=%s", model, e)
                if attempt >= len(GEMINI_RETRY_DELAYS_SECONDS):
                    break

            except errors.APIError as e:
                last_error = e
                if e.code not in TRANSIENT_GEMINI_ERROR_CODES:
                    logger.error("Gemini API 오류: model=%s, code=%s, status=%s", model, e.code, e.status)
                    break

                logger.warning(
                    "Gemini 일시 장애: model=%s, code=%s, status=%s, attempt=%d",
                    model,
                    e.code,
                    e.status,
                    attempt + 1,
                )
                if attempt >= len(GEMINI_RETRY_DELAYS_SECONDS):
                    break

            except Exception as e:
                last_error = e
                logger.error("Gemini 요약 실패: model=%s, error=%s", model, e)
                break

            await asyncio.sleep(GEMINI_RETRY_DELAYS_SECONDS[attempt])

    if last_error:
        logger.error("모든 Gemini 요약 시도 실패: %s", last_error)
    return {}


SUMMARY_SYSTEM_PROMPT_TEMPLATE = """당신은 복잡하고 어려운 공공기관의 복지 혜택 및 행사 공고문을 누구나 쉽게 이해할 수 있도록 요약해 주는 친절한 AI 비서 '누리'입니다.

{rules}

아래에 주어지는 여러 복지/행사 항목을 각각 요약 규칙에 따라 요약하세요.

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.

```json
{{
  "summaries": [
    {{
      "id": "원본 항목의 id",
      "summary": "요약된 마크다운 텍스트"
    }}
  ]
}}
```"""


def _apply_interest_filter(items: list[dict], interests: list[str]) -> list[dict]:
    """관심사가 있으면 제목/원문 텍스트 기준으로 우선 필터링."""
    if not interests:
        return items

    keywords = []
    for interest in interests:
        normalized = interest.strip()
        if not normalized:
            continue
        keywords.extend(INTEREST_KEYWORDS.get(normalized, [normalized]))

    lowered_keywords = [keyword.lower() for keyword in keywords if keyword.strip()]
    if not lowered_keywords:
        return items

    matched = []
    for item in items:
        haystack = f"{item.get('title', '')}\n{item.get('raw_text', '')}".lower()
        if any(keyword in haystack for keyword in lowered_keywords):
            matched.append(item)

    return matched


async def search_and_summarize(
    age: int,
    region_name: str,
    occupation: str,
    interests: list[str],
) -> list[dict]:
    """
    공공데이터포털 API로 맞춤형 복지·행사 정보를 수집하고 Gemini로 요약합니다.
    """
    settings = get_settings()
    # ── 1단계: 공공데이터포털 API 수집 ──
    welfare_items = await fetch_welfare_list(age=age, occupation=occupation, num_of_rows=60)
    event_items = await fetch_events(region_code=region_name, num_of_rows=20)

    formatted_welfare = format_welfare_for_summary(welfare_items)
    formatted_events = format_events_for_summary(event_items)

    all_tagged: list[dict] = [
        {**w, "category": "복지"} for w in formatted_welfare
    ] + [
        {**e, "category": "행사"} for e in formatted_events
    ]

    if interests:
        items = _apply_interest_filter(all_tagged, interests)[:MAX_ITEMS_FOR_SUMMARY]
    else:
        welfare_rows = [{**w, "category": "복지"} for w in formatted_welfare[:WELFARE_CAP]]
        event_rows = [{**e, "category": "행사"} for e in formatted_events[:EVENT_CAP]]
        items = welfare_rows + event_rows

    if not items:
        logger.warning("공공데이터포털에서 수집된 항목이 없습니다.")
        return []

    logger.info(
        "1단계 완료: 복지 %d건 / 행사 %d건 수집",
        len(formatted_welfare),
        len(formatted_events),
    )

    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY가 없어 원문을 요약 없이 반환합니다.")
        return [
            {
                "id": item.get("id", ""),
                "title": item.get("title", "정보"),
                "category": item.get("category", "복지"),
                "summary": item.get("raw_text", ""),
                "raw_text": item.get("raw_text", ""),
                "source_name": item.get("source_name", ""),
                "source_url": item.get("source_url", ""),
            }
            for item in items
        ]

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    models = _model_candidates(settings.GEMINI_MODEL, settings.GEMINI_FALLBACK_MODELS)

    # ── 2단계: 시니어 친화적 요약 ──
    rules_text = _load_summary_rules()
    summary_system = SUMMARY_SYSTEM_PROMPT_TEMPLATE.format(rules=rules_text)

    items_for_summary = [
        {
            "id": item.get("id", ""),
            "title": item.get("title", ""),
            "raw_text": item.get("raw_text", ""),
        }
        for item in items
    ]

    summary_prompt = f"""아래 {len(items_for_summary)}건의 복지/행사 항목을 각각 요약해 주세요.

{json.dumps(items_for_summary, ensure_ascii=False, indent=2)}"""

    summaries = await _request_gemini_summaries(
        client=client,
        models=models,
        summary_prompt=summary_prompt,
        summary_system=summary_system,
    )

    # ── 결과 조합 ──
    results = []
    for item in items:
        item_id = item.get("id", "")
        results.append({
            "id": item_id,
            "title": item.get("title", "정보"),
            "category": item.get("category", "복지"),
            "summary": summaries.get(item_id) or _build_basic_summary(item),
            "raw_text": item.get("raw_text", ""),
            "source_name": item.get("source_name", ""),
            "source_url": item.get("source_url", ""),
        })

    return results
