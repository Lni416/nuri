/**
 * 결과 페이지 — AI 요약 카드 목록.
 */

import { createCard } from "../components/card.js";

const PAGE_SIZE = 8;

/**
 * @param {"feed"|"list"} layout
 */
function mountPaginatedSection(container, { title, cards, layout }) {
  const sectionTitle = document.createElement("h3");
  sectionTitle.className = "results-section-title";
  sectionTitle.textContent = `${title} (${cards.length})`;
  container.appendChild(sectionTitle);

  const grid = document.createElement("div");
  grid.className =
    layout === "feed"
      ? "results-grid results-grid--feed"
      : "results-grid results-grid--list";

  let visible = Math.min(PAGE_SIZE, cards.length);

  const appendRange = (endExclusive) => {
    const start = grid.children.length;
    for (let i = start; i < endExclusive; i++) {
      grid.appendChild(createCard(cards[i], i, { layout }));
    }
  };

  appendRange(visible);
  container.appendChild(grid);

  if (cards.length <= visible) return;

  const wrap = document.createElement("div");
  wrap.className = "results-load-more-wrap";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-secondary results-load-more";
  const remaining = () => cards.length - visible;
  btn.textContent = `더보기 (${remaining()}개 더)`;

  btn.addEventListener("click", () => {
    const next = Math.min(visible + PAGE_SIZE, cards.length);
    appendRange(next);
    visible = next;
    if (visible >= cards.length) {
      wrap.remove();
      return;
    }
    btn.textContent = `더보기 (${remaining()}개 더)`;
  });

  wrap.appendChild(btn);
  container.appendChild(wrap);
}

/**
 * @param {Object} data - SearchResponse
 * @param {Function} onBack - 뒤로가기 콜백
 */
export function createResultsPage(data, onBack) {
  const page = document.createElement("main");
  page.className = "page-content fade-in";

  const container = document.createElement("div");
  container.className = "container";

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

  if (data.cards && data.cards.length > 0) {
    const welfareCards = data.cards.filter((card) => card.category === "복지");
    const eventCards = data.cards.filter((card) => card.category === "행사");

    if (welfareCards.length > 0) {
      mountPaginatedSection(container, {
        title: "🏛️ 복지 정보",
        cards: welfareCards,
        layout: "feed",
      });
    }

    if (eventCards.length > 0) {
      mountPaginatedSection(container, {
        title: "🎪 행사·축제 정보",
        cards: eventCards,
        layout: "list",
      });
    }
  }

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

  page.querySelector("#back-btn").addEventListener("click", onBack);

  return page;
}
