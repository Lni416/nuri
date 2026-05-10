/**
 * 로딩 상태 컴포넌트.
 */

export function createLoading() {
  const container = document.createElement("div");
  container.className = "page-content fade-in";

  container.innerHTML = `
    <div class="container">
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">정보를 쉬운 말로 정리하고 있어요</p>
        <p class="loading-subtext">잠시만 기다려 주세요</p>
      </div>

      <div class="results-grid" style="margin-top: 2rem;">
        ${createSkeletonCards(3)}
      </div>
    </div>
  `;

  return container;
}

function createSkeletonCards(count) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card" style="animation-delay: ${i * 0.1}s">
        <div class="skeleton-line title"></div>
        <div class="skeleton-line long"></div>
        <div class="skeleton-line long"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line short"></div>
      </div>
    `;
  }
  return html;
}
