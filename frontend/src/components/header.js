/**
 * 헤더 컴포넌트.
 */

export function createHeader() {
  const header = document.createElement("header");
  header.className = "app-header";
  header.id = "app-header";

  header.innerHTML = `
    <div class="container">
      <div class="header-logo" id="header-home-link">
        <span class="logo-icon">🌏</span>
        <span class="logo-text">NuRI</span>
      </div>
      <span class="header-subtitle">맞춤 복지·행사 정보</span>
    </div>
  `;

  // 스크롤 시 그림자 효과
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        header.classList.toggle("scrolled", window.scrollY > 10);
        ticking = false;
      });
      ticking = true;
    }
  });

  // 로고 클릭 → 홈으로
  header.querySelector("#header-home-link").addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: "home" }));
  });

  return header;
}
