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
