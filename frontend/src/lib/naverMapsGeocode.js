/**
 * 네이버 지도 JS SDK(submodules=geocoder) 로드 및 역지오 → 행정구역 파싱 공통.
 */

import { parseNaverReverseGeocodeResponse } from "./koreaRegionFromNaver.js";

const MAP_SCRIPT = "https://oapi.map.naver.com/openapi/v3/maps.js";
const GEOCODER_WAIT_MS = 6000;
const GEOCODER_POLL_MS = 40;

let scriptPromise = null;

function waitForReverseGeocodeReady() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + GEOCODER_WAIT_MS;
    const tick = () => {
      if (typeof window.naver?.maps?.Service?.reverseGeocode === "function") {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(
          new Error("Geocoder 서브모듈을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")
        );
        return;
      }
      setTimeout(tick, GEOCODER_POLL_MS);
    };
    tick();
  });
}

/**
 * 스크립트 한 번 주입 후 로드·전역 초기화 확인
 * @param {"ncpKeyId"|"ncpClientId"} param
 */
function injectMapsScriptOnce(param, keyId) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.dataset.naverMaps = "1";
    s.async = true;
    s.src = `${MAP_SCRIPT}?${param}=${encodeURIComponent(keyId)}&submodules=geocoder`;
    s.onload = () => {
      if (window.naver?.maps?.Map) {
        resolve();
        return;
      }
      s.remove();
      reject(new Error("NO_MAP"));
    };
    s.onerror = () => {
      s.remove();
      reject(new Error("NETWORK"));
    };
    document.head.appendChild(s);
  });
}

/**
 * @param {string} keyId NCP 웹 클라이언트 ID
 */
export function loadNaverMapsWithGeocoder(keyId) {
  const id = String(keyId ?? "").trim();
  if (typeof window !== "undefined" && window.naver?.maps?.Map) {
    return waitForReverseGeocodeReady();
  }
  if (scriptPromise) return scriptPromise;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  scriptPromise = injectMapsScriptOnce("ncpKeyId", id)
    .catch((e) => {
      if (e instanceof Error && e.message === "NETWORK") {
        return injectMapsScriptOnce("ncpClientId", id);
      }
      if (e instanceof Error && e.message === "NO_MAP") {
        try {
          delete window.naver;
        } catch {
          window.naver = undefined;
        }
        return injectMapsScriptOnce("ncpClientId", id);
      }
      throw e;
    })
    .then(() => waitForReverseGeocodeReady())
    .catch((e) => {
      scriptPromise = null;
      if (e instanceof Error && e.message.startsWith("Geocoder")) {
        throw e;
      }
      if (e instanceof Error && e.message === "NO_MAP") {
        throw new Error(
          `네이버 지도 인증에 실패했어요. NCP에서 아래를 다시 확인해 주세요.\n① Web 서비스 URL = 주소창과 동일 (http·IP·:5173 포트 포함)\n② 이 화면 origin: ${origin}\n③ Dynamic Map + Geocoding·역지오코딩 사용 모두 켜기\n④ .env의 ID가 방금 수정한 Application 것과 같은지\n⑤ 저장 후 2~5분 뒤 시크릿 창에서 새로고침`
        );
      }
      throw new Error(
        `네이버 지도 스크립트를 받아오지 못했어요. 네트워크·광고 차단을 확인하고, NCP Web 서비스 URL에 등록: ${origin}\nncpKeyId용 ID인지(또는 구형 ncpClientId ID인지) Application 유형도 확인하세요.`
      );
    });

  return scriptPromise;
}

/** transport 레벨 status(200 등) */
export function isMapsServiceTransportOk(n, status) {
  const okConst = n?.maps?.Service?.Status?.OK;
  if (okConst !== undefined && status === okConst) return true;
  return status === 200 || status === "OK" || status === "ok";
}

function reverseGeocodeOrders(n) {
  const OT = n?.maps?.Service?.OrderType;
  if (OT?.LEGAL_CODE && OT?.ADM_CODE) return `${OT.LEGAL_CODE},${OT.ADM_CODE}`;
  return "legalcode,admcode";
}

/** WGS84 위경도 → reverseGeocode용 "경도,위도" 문자열 */
export function reverseGeocodeCoordString(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lng},${lat}`;
}

/**
 * 지도 클릭 등 LatLng 객체 → coords 문자열
 * @param {unknown} coord
 */
export function reverseGeocodeCoordsFromMapClick(coord) {
  if (coord == null) return null;
  if (typeof coord.lat === "function" && typeof coord.lng === "function") {
    const lat = coord.lat();
    const lng = coord.lng();
    if (Number.isFinite(lat) && Number.isFinite(lng)) return `${lng},${lat}`;
    return null;
  }
  const lat = typeof coord.lat === "number" ? coord.lat : coord.y;
  const lng = typeof coord.lng === "number" ? coord.lng : coord.x;
  if (Number.isFinite(lat) && Number.isFinite(lng)) return `${lng},${lat}`;
  return null;
}

/**
 * @returns {Promise<{ parsed: { province: { code: string, name: string }, city: string } | null, transportOk: boolean }>}
 */
export function reverseGeocodeServiceToRegion(n, coordStr, regions, regionCities) {
  return new Promise((resolve) => {
    n.maps.Service.reverseGeocode(
      { coords: coordStr, orders: reverseGeocodeOrders(n) },
      (status, response) => {
        const parsed = parseNaverReverseGeocodeResponse(response, regions, regionCities);
        resolve({
          parsed,
          transportOk: isMapsServiceTransportOk(n, status),
        });
      }
    );
  });
}
