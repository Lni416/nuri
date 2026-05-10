/**
 * 네이버 지도：클릭 → 역지오코딩 → 시·도 선택 콜백
 */

import { parseNaverReverseGeocodeForForm } from "../lib/koreaRegionFromNaver.js";

const MAP_SCRIPT = "https://oapi.map.naver.com/openapi/v3/maps.js";

let scriptPromise = null;

/**
 * @param {string} keyId NCP 클라이언트 ID (웹, ncpKeyId)
 */
export function loadNaverMapsWithGeocoder(keyId) {
  if (typeof window !== "undefined" && window.naver?.maps?.Map) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.dataset.naverMaps = "1";
    s.async = true;
    s.src = `${MAP_SCRIPT}?ncpKeyId=${encodeURIComponent(keyId)}&submodules=geocoder`;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("네이버 지도 스크립트 로드에 실패했어요."));
    };
    document.head.appendChild(s);
  });

  return scriptPromise;
}

/**
 * @param {{
 *   keyId: string | undefined,
 *   regions: Array<{ code: string, name: string }>,
 *   regionCities: Record<string, string[]>,
 *   onPick: (result: { province: { code: string, name: string }, city: string }) => void,
 *   onStatus?: (message: string, tone?: "info"|"success"|"error") => void,
 * }} opts
 * @returns {Promise<{ el: HTMLElement, setSelected: (_code: string) => void, destroy: () => void }>}
 */
export async function createNaverRegionPicker(opts) {
  const { keyId, regions, regionCities, onPick, onStatus } = opts;
  const wrap = document.createElement("div");
  wrap.className = "naver-region-picker";

  const hint = document.createElement("p");
  hint.className = "form-hint naver-region-picker-hint";
  hint.textContent =
    "지도에서 거주 지역을 가리키는 곳을 눌러 주세요. 선택한 위치로 시·도가 맞춰져요.";

  const mapEl = document.createElement("div");
  mapEl.className = "naver-region-picker-map";
  mapEl.setAttribute("role", "application");
  mapEl.setAttribute("aria-label", "대한민국 지도 — 클릭하여 시·도 선택");

  wrap.appendChild(hint);
  wrap.appendChild(mapEl);

  if (!keyId || !String(keyId).trim()) {
    const note = document.createElement("p");
    note.className = "form-hint naver-region-picker-missing-key";
    note.textContent =
      "네이버 지도를 쓰려면 `.env`에 VITE_NAVER_MAP_KEY_ID 를 넣어 주세요. (NCP 콘솔 웹 클라이언트 ID · 사용 URL 등록)";
    wrap.appendChild(note);
    return {
      el: wrap,
      setSelected() {},
      destroy() {},
    };
  }

  try {
    await loadNaverMapsWithGeocoder(keyId);
  } catch (e) {
    const note = document.createElement("p");
    note.className = "form-hint locate-status";
    note.dataset.tone = "error";
    note.textContent = e instanceof Error ? e.message : "지도를 불러오지 못했어요.";
    wrap.appendChild(note);
    return {
      el: wrap,
      setSelected() {},
      destroy() {},
    };
  }

  const n = window.naver;
  const center = new n.maps.LatLng(36.34, 127.77);
  const map = new n.maps.Map(mapEl, {
    center,
    zoom: 7,
    minZoom: 6,
    maxZoom: 19,
    mapTypeControl: false,
  });

  let marker = null;
  const clickListen = n.maps.Event.addListener(map, "click", (e) => {
    const latlng = e.coord;
    if (marker) marker.setMap(null);
    marker = new n.maps.Marker({ position: latlng, map });

    onStatus?.("주소를 확인하고 있어요…", "info");

    n.maps.Service.reverseGeocode({ coords: latlng }, (status, response) => {
      if (status !== n.maps.Service.Status.OK) {
        onStatus?.(
          "이 위치의 주소를 찾지 못했어요. 다른 곳을 누르거나 목록에서 골라 주세요.",
          "error"
        );
        return;
      }
      const v2 = response?.v2;
      const parsed = parseNaverReverseGeocodeForForm(v2, regions, regionCities);
      if (!parsed) {
        onStatus?.("시·도를 알 수 없어요. 목록에서 골라 주세요.", "error");
        return;
      }
      onPick(parsed);
      const loc = parsed.city
        ? `${parsed.province.name} ${parsed.city}`
        : parsed.province.name;
      onStatus?.(`지도에서 선택: ${loc}`, "success");
    });
  });

  const destroy = () => {
    n.maps.Event.removeListener(clickListen);
    if (marker) marker.setMap(null);
    mapEl.replaceChildren();
  };

  return {
    el: wrap,
    setSelected() {},
    destroy,
  };
}
