import httpx
import sys

API_KEY = "9f0be73c53bccaaad08490f5c15f6d1ae88369b2c17473db260929ab5c688ebb"

def test_welfare_api():
    print("=== 복지서비스 API (B554287) 테스트 ===")
    url = "http://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001"
    params = {
        "serviceKey": API_KEY,
        "callTp": "L",
        "pageNo": "1",
        "numOfRows": "10",
        "type": "json"
    }

    try:
        resp = httpx.get(url, params=params, timeout=10)
        print(f"응답 코드: {resp.status_code}")
        print(f"응답 헤더: {resp.headers}")
        print(f"응답 본문: {resp.text[:500]}")
    except Exception as e:
        print(f"호출 실패: {e}")
    print("\n")

def test_event_api():
    print("=== 행사/축제 API (TourAPI B551011) 테스트 ===")
    url = "http://apis.data.go.kr/B551011/KorService1/searchFestival1"
    params = {
        "serviceKey": API_KEY,
        "numOfRows": "5",
        "pageNo": "1",
        "MobileOS": "ETC",
        "MobileApp": "NuRI",
        "contentTypeId": "15",
        "areaCode": "1",
        "eventStartDate": "20260410",
        "listYN": "Y",
        "arrange": "C",
        "_type": "json"
    }

    try:
        resp = httpx.get(url, params=params, timeout=10)
        print(f"응답 코드: {resp.status_code}")
        print(f"응답 헤더: {resp.headers}")
        print(f"응답 본문: {resp.text[:500]}")
    except Exception as e:
        print(f"호출 실패: {e}")
    print("\n")

if __name__ == "__main__":
    print(f"사용 중인 API 키: {API_KEY}")
    test_welfare_api()
    test_event_api()
