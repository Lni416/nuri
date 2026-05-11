/**
 * 네이버 지도 reverseGeocode 응답(v2)에서 시·도·시군구 추출 후 TourAPI용 code와 맞춤.
 */

/**
 * @param {unknown} v2 - naver.maps.Service.reverseGeocode response.v2
 * @returns {{ sido: string|null, sigungu: string|null }}
 */
export function extractNaverSidoSigungu(v2) {
  const results = v2?.results;
  if (!Array.isArray(results) || results.length === 0) {
    return { sido: null, sigungu: null };
  }
  /** roadaddr 등 첫 항목에 행정구역이 없을 수 있음 — legalcode/admcode 항목 탐색 */
  for (const r of results) {
    const sido = r?.region?.area1?.name?.trim() || null;
    if (sido) {
      const sigungu = r?.region?.area2?.name?.trim() || null;
      return { sido, sigungu };
    }
  }
  return { sido: null, sigungu: null };
}

/** 네이버 시·도 표기 → 우리 regions[].code (특별자치 등 별칭 포함) */
const SIDO_NAME_OVERRIDES = new Map([
  ["전북특별자치도", "전북"],
  ["강원특별자치도", "강원"],
  ["제주특별자치도", "제주"],
]);

/**
 * @param {string|null} sidoName
 * @param {Array<{ code: string, name: string }>} regions
 * @returns {{ code: string, name: string } | null}
 */
export function matchProvinceFromNaverSido(sidoName, regions) {
  if (!sidoName) return null;

  const overrideCode = SIDO_NAME_OVERRIDES.get(sidoName);
  if (overrideCode) {
    const r = regions.find((x) => x.code === overrideCode);
    if (r) return r;
  }

  const exact = regions.find((r) => r.name === sidoName);
  if (exact) return exact;

  const norm = sidoName.replace(/\s/g, "");
  for (const r of regions) {
    const rn = r.name.replace(/\s/g, "");
    if (norm === rn || norm.startsWith(rn) || rn.startsWith(norm)) return r;
  }

  for (const r of regions) {
    const short = r.name.replace(/특별시|광역시|특별자치시|특별자치도|도/g, "");
    if (short.length >= 2 && norm.includes(short)) return r;
  }

  return null;
}

/**
 * @param {string|null} sigungu
 * @param {string} provinceCode
 * @param {Record<string, string[]>} regionCities
 * @returns {string}
 */
export function matchCityFromNaverSigungu(sigungu, provinceCode, regionCities) {
  if (!sigungu) return "";
  const cities = regionCities[provinceCode] || [];
  const found = cities.find(
    (c) => sigungu === c || sigungu.includes(c) || c.includes(sigungu)
  );
  return found || "";
}

/**
 * @param {unknown} v2
 * @param {Array<{ code: string, name: string }>} regions
 * @param {Record<string, string[]>} regionCities
 * @returns {{ province: { code: string, name: string }, city: string } | null}
 */
export function parseNaverReverseGeocodeForForm(v2, regions, regionCities) {
  const { sido, sigungu } = extractNaverSidoSigungu(v2);
  const province = matchProvinceFromNaverSido(sido, regions);
  if (!province) return null;
  const city = matchCityFromNaverSigungu(sigungu, province.code, regionCities);
  return { province, city };
}

/**
 * SDK reverseGeocode 콜백 response 전체 파싱(v2 우선, 없으면 레거시 result.items).
 * @param {unknown} response
 */
export function parseNaverReverseGeocodeResponse(response, regions, regionCities) {
  const v2 = response?.v2;
  if (v2) {
    const fromV2 = parseNaverReverseGeocodeForForm(v2, regions, regionCities);
    if (fromV2) return fromV2;
  }

  const items = response?.result?.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      const d = item?.addrdetail;
      const sidoRaw = d?.sido;
      if (typeof sidoRaw !== "string" || !sidoRaw.trim()) continue;
      const sido = sidoRaw.trim();
      const sigunguRaw = d?.sigugun;
      const sigungu = typeof sigunguRaw === "string" ? sigunguRaw.trim() : "";
      const province = matchProvinceFromNaverSido(sido, regions);
      if (!province) continue;
      const city = matchCityFromNaverSigungu(sigungu || null, province.code, regionCities);
      return { province, city };
    }
  }

  return null;
}
