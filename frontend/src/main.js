/**
 * NuRI — 메인 애플리케이션 엔트리포인트.
 */

import "./styles/index.css";
import "./styles/onboarding.css";
import { createHeader } from "./components/header.js";
import { createFooter } from "./components/footer.js";
import { createLoading } from "./components/loading.js";
import { createHomePage } from "./pages/home.js";
import { createResultsPage } from "./pages/results.js";
import { searchInfo } from "./utils/api.js";
import { createSelectMode } from "./pages/SelectMode.js";
import { createVoiceOnboarding } from "./pages/VoiceOnboarding.js";
import { createTextOnboarding } from "./pages/TextOnboarding.js";

class NuriApp {
  constructor() {
    this.app = document.getElementById("app");
    this.init();
  }

  init() {
    // 헤더 & 푸터
    this.header = createHeader();
    this.footer = createFooter();

    // 페이지 컨테이너
    this.pageContainer = document.createElement("div");
    this.pageContainer.id = "page-container";

    this.app.appendChild(this.header);
    this.app.appendChild(this.pageContainer);
    this.app.appendChild(this.footer);

    // 네비게이션 이벤트
    window.addEventListener("navigate", (e) => {
      if (e.detail === "home") {
        this.showHome();
      }
    });

    // 초기 페이지
    this.showHome();
    this.showOnboarding();
  }

  /**
   * 페이지 교체.
   */
  setPage(pageElement) {
    this.pageContainer.innerHTML = "";
    this.pageContainer.appendChild(pageElement);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * 홈 페이지 표시.
   */
  showHome() {
    const page = createHomePage((formData) => this.handleSearch(formData));
    this.setPage(page);
  }

  /**
   * 온보딩 오버레이 표시 (초기 진입 시).
   */
  showOnboarding() {
    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';

    const close = (formData) => {
      overlay.classList.add('is-hiding');
      overlay.addEventListener('transitionend', () => {
        overlay._currentPage?._destroy?.();
        overlay.remove();
      }, { once: true });
      if (formData) this.handleSearch(formData);
    };

    const showPage = (pageEl) => {
      overlay._currentPage?._destroy?.();
      overlay._currentPage = pageEl;
      overlay.innerHTML = '';
      overlay.appendChild(pageEl);
    };

    const showSelect = () => {
      const el = createSelectMode({
        onVoice: showVoice,
        onText: showText,
        onSkip: () => close(null),
      });
      showPage(el);
    };

    const showVoice = () => {
      const el = createVoiceOnboarding({
        onComplete: (formData) => close(formData),
        onFallback: showText,
      });
      showPage(el);
    };

    const showText = () => {
      const el = createTextOnboarding({
        onComplete: (formData) => close(formData),
        onBack: showSelect,
      });
      showPage(el);
    };

    showSelect();
    document.body.appendChild(overlay);
  }

  /**
   * 검색 실행.
   */
  async handleSearch(formData) {
    // 로딩 화면
    const loading = createLoading();
    this.setPage(loading);

    try {
      const result = await searchInfo(formData);
      const resultsPage = createResultsPage(result, () => this.showHome());
      this.setPage(resultsPage);
    } catch (error) {
      console.error("검색 실패:", error);
      const errorPage = createResultsPage(
        {
          cards: [],
          total_count: 0,
          message: `⚠️ 오류가 발생했어요: ${error.message}. 잠시 후 다시 시도해 주세요.`,
        },
        () => this.showHome()
      );
      this.setPage(errorPage);
    }
  }
}

// 앱 시작
new NuriApp();
