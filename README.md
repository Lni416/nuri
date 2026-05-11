# 🌏 NuRI — No-barrier User-centric Realtime Intelligence

> 이용자 정보를 기반으로 지역 행사 및 맞춤형 복지·혜택 정보를 **쉬운 한국어로 요약**하여 제공하는 웹 서비스

## ✨ 주요 기능

- 🙋 **맞춤형 필터링** — 나이, 지역, 직업, 관심분야 기반 정보 수집
- 🤖 **AI 요약** — Google Gemini가 복잡한 공고문을 쉬운 말로 요약
- 📋 **카드 UI** — 한눈에 파악할 수 있는 정보 카드 레이아웃
- 👵 **접근성 우선** — 고연령층도 편하게 사용할 수 있는 큰 글씨·넓은 여백

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Vite + Vanilla JS + CSS |
| Backend | Python FastAPI |
| AI | Google Gemini API (`google-genai`) |
| 데이터 | 공공데이터포털 API |
| 지도·역지오 | 네이버 클라우드 플랫폼 Maps API (웹 JS SDK, Dynamic Map + 역지오) |

## 요구 사항

- Python 3.12 권장 (3.10+ 동작 가능)
- Node.js 18+ (프론트 빌드·개발 서버)

## 🚀 실행 방법

### 1. 환경 변수

[`backend/.env.example`](backend/.env.example)을 복사해 `backend/.env`를 만들고, API 키를 넣습니다.

```bash
cp backend/.env.example backend/.env
```

- **공공데이터포털** 인증키: [data.go.kr](https://www.data.go.kr)  
- **Gemini** API 키: [Google AI Studio](https://aistudio.google.com)  

`backend/.env`는 개인 환경에만 두고 버전 관리에 포함하지 마세요.

**지역 지도·GPS 자동 선택**(네이버 지도)을 쓰려면 [`frontend/.env.example`](frontend/.env.example)을 복사해 `frontend/.env`를 만들고 `VITE_NAVER_MAP_KEY_ID`에 NCP **웹 애플리케이션 클라이언트 ID**를 넣습니다. 자세한 등록 방법은 아래 **네이버 지도 API** 절을 참고하세요.

```bash
cp frontend/.env.example frontend/.env
```

### 2. 백엔드 (FastAPI)

터미널 하나에서:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API 문서: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. 프론트엔드 (Vite)

다른 터미널에서:

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 [http://localhost:5173](http://localhost:5173) 로 접속합니다.  
개발 모드에서는 `/api` 요청이 Vite 설정에 따라 백엔드(`localhost:8000`)로 프록시됩니다.

### 프로덕션 빌드 (선택)

```bash
cd frontend
npm run build
npm run preview
```

## 네이버 지도 API (프론트엔드)

폼에서 **지도로 지역 고르기**와 **내 위치(GPS) → 시·도·시군구 역지오**에 [네이버 지도 Open API — JavaScript SDK](https://oapi.map.naver.com/)를 사용합니다. 스크립트는 `submodules=geocoder`로 로드해 `naver.maps.Service.reverseGeocode`로 좌표를 행정구역 문자열로 바꾼 뒤, 앱의 지역 코드와 맞춥니다.

| 항목 | 내용 |
|------|------|
| 환경 변수 | `VITE_NAVER_MAP_KEY_ID` — NCP Application의 웹 클라이언트 ID (`frontend/.env`) |
| NCP 콘솔 | 해당 Application에서 **Dynamic Map**, **Geocoding**, **Reverse Geocoding(역지오)** 사용을 켜 두세요. |
| Web 서비스 URL | 브라우저에서 접속하는 **origin**과 동일하게 등록해야 합니다. 로컬은 Vite가 `5173` 포트를 고정(`strictPort`)하므로 예: `http://localhost:5173`, `http://127.0.0.1:5173`, 같은 Wi‑Fi에서 테스트 시 `http://192.168.x.x:5173` 등. |
| 관련 코드 | `frontend/src/lib/naverMapsGeocode.js` (SDK 로드·역지오 호출), `frontend/src/lib/koreaRegionFromNaver.js` (응답 파싱·지역 매칭), `frontend/src/components/naverRegionPicker.js` (지도 UI), `frontend/src/components/form.js` (피커·GPS 연동) |

키가 없으면 지도 피커와 위치 기반 자동 선택은 비활성/안내 문구만 표시됩니다.

## 📁 프로젝트 구조

```
NuRI/
├── backend/          # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── schemas.py
│   │   ├── api/v1/router.py
│   │   └── services/
│   └── requirements.txt
├── frontend/         # Vite 프론트엔드
│   ├── src/
│   │   ├── main.js
│   │   ├── styles/
│   │   ├── pages/
│   │   └── components/
│   └── index.html
└── rules.md          # Gemini 프롬프트 규칙
```
