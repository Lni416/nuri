"""공공데이터 API 연결 확인 (로컬). 환경변수 DATA_GO_KR_API_KEY 필요."""

import os
import sys

import httpx


def _key() -> str:
    key = (os.environ.get("DATA_GO_KR_API_KEY") or "").strip()
    if not key:
        print("DATA_GO_KR_API_KEY 환경변수를 설정하세요.", file=sys.stderr)
        sys.exit(1)
    return key


def test_welfare_api() -> None:
    print("=== 복지서비스 API (B554287) 테스트 ===")
    url = "http://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001"
    params = {
        "serviceKey": _key(),
        "callTp": "L",
        "pageNo": "1",
        "numOfRows": "10",
        "type": "json",
    }

    try:
        resp = httpx.get(url, params=params, timeout=10)
        print(f"응답 코드: {resp.status_code}")
        print(f"응답 본문 앞부분: {resp.text[:500]}")
    except Exception as e:
        print(f"호출 실패: {e}")
    print()


def test_event_api() -> None:
    print("=== 행사/축제 API (TourAPI B551011) 테스트 ===")
    url = "http://apis.data.go.kr/B551011/KorService1/searchFestival1"
    params = {
        "serviceKey": _key(),
        "numOfRows": "5",
        "pageNo": "1",
        "MobileOS": "ETC",
        "MobileApp": "NuRI",
        "contentTypeId": "15",
        "areaCode": "1",
        "eventStartDate": "20260410",
        "listYN": "Y",
        "arrange": "C",
        "_type": "json",
    }

    try:
        resp = httpx.get(url, params=params, timeout=10)
        print(f"응답 코드: {resp.status_code}")
        print(f"응답 본문 앞부분: {resp.text[:500]}")
    except Exception as e:
        print(f"호출 실패: {e}")
    print()


if __name__ == "__main__":
    test_welfare_api()
    test_event_api()
