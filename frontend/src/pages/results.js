/**
 * 결과 페이지 — AI 요약 카드 목록.
 */

import { createCard } from "../components/card.js";

/**
 * @param {Object} data - SearchResponse
 * @param {Function} onBack - 뒤로가기 콜백
 */
export function createResultsPage(data, onBack) {
  const page = document.createElement("main");
  page.className = "page-content fade-in";

  const container = document.createElement("div");
  container.className = "container";

  // 결과 헤더
  const header = document.createElement("div");
  header.className = "results-header";

  if (data.cards && data.cards.length > 0) {
    header.innerHTML = `
      <h2>🎉 맞춤 정보를 찾았어요!</h2>
      <p class="results-count">${data.message || `총 ${data.total_count}건`}</p>
    `;
  } else {
    header.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>조건에 맞는 정보를 찾지 못했어요</h3>
        <p>${data.message || "검색 조건을 바꿔서 다시 시도해 보세요."}</p>
      </div>
    `;
  }
  container.appendChild(header);

  // 카드 그리드
  if (data.cards && data.cards.length > 0) {
    const welfareCards = data.cards.filter((card) => card.category === "복지");
    const eventCards = data.cards.filter((card) => card.category === "행사");

    const sections = [
      { title: "🏛️ 복지 정보", cards: welfareCards },
      { title: "🎪 행사·축제 정보", cards: eventCards },
    ].filter((section) => section.cards.length > 0);

    sections.forEach((section) => {
      const sectionTitle = document.createElement("h3");
      sectionTitle.className = "results-section-title";
      sectionTitle.textContent = `${section.title} (${section.cards.length})`;
      container.appendChild(sectionTitle);

      const grid = document.createElement("div");
      grid.className = "results-grid";
      section.cards.forEach((card, index) => {
        grid.appendChild(createCard(card, index));
      });
      container.appendChild(grid);
    });
  }

  // 다시 검색 버튼
  const backSection = document.createElement("div");
  backSection.style.cssText =
    "text-align: center; margin-top: 3rem; padding-bottom: 1rem;";
  backSection.innerHTML = `
    <button class="btn btn-secondary" id="back-btn" style="padding: 1rem 2.5rem;">
      ← 다시 검색하기
    </button>
  `;
  container.appendChild(backSection);

  page.appendChild(container);

  // 버튼 이벤트
  page.querySelector("#back-btn").addEventListener("click", onBack);

  return page;
}
