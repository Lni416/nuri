/**
 * 결과 카드 컴포넌트.
 */

/**
 * 단일 카드 엘리먼트 생성.
 * @param {Object} card - SummaryCard 데이터
 * @param {number} index - 카드 인덱스 (애니메이션 딜레이용)
 */
export function createCard(card, index = 0) {
  const isWelfare = card.category === "복지";
  const categoryClass = isWelfare ? "welfare" : "event";
  const categoryIcon = isWelfare ? "🏛️" : "🎪";
  const categoryLabel = isWelfare ? "복지 혜택" : "행사·축제";

  const el = document.createElement("details");
  el.className = `result-card category-${isWelfare ? "welfare" : "event"} slide-up`;
  el.style.animationDelay = `${index * 0.1}s`;
  el.id = `card-${card.id}`;

  // 마크다운 스타일 요약을 HTML로 간단 변환
  const summaryHTML = formatSummary(card.summary);

  el.innerHTML = `
    <summary class="card-list-summary">
      <div class="card-list-main">
        <h3 class="card-title">${escapeHtml(card.title)}</h3>
        <span class="card-category ${categoryClass}">
          ${categoryIcon} ${categoryLabel}
        </span>
      </div>
      <span class="card-expand-text">펼쳐보기</span>
    </summary>

    <div class="card-content">
      <div class="card-summary">${summaryHTML}</div>

      <div class="card-footer">
        <span class="card-source">
          📌 ${escapeHtml(card.source_name || "공공데이터포털")}
        </span>
        <div class="card-actions">
          ${
            card.source_url
              ? `<a href="${escapeHtml(card.source_url)}" target="_blank" rel="noopener" class="card-toggle-btn">
                  🔗 여기서 더 알아볼 수 있어요
                </a>`
              : ""
          }
        </div>
      </div>
    </div>
  `;

  const expandText = el.querySelector(".card-expand-text");
  el.addEventListener("toggle", () => {
    if (expandText) {
      expandText.textContent = el.open ? "접기" : "펼쳐보기";
    }
  });

  return el;
}

/**
 * 요약 텍스트를 HTML로 변환 (간단한 마크다운 파싱).
 */
function formatSummary(text) {
  if (!text) return "<p>요약 내용이 없습니다.</p>";

  const lines = text.split(/\r?\n/);
  const html = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      return;
    }

    if (line === "---") {
      closeList();
      html.push("<hr/>");
      return;
    }

    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      closeList();
      html.push(`<h3>${formatInline(heading[1])}</h3>`);
      return;
    }

    const listItem = line.match(/^-\s+(.+)$/);
    if (listItem) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${formatInline(listItem[1])}</li>`);
      return;
    }

    closeList();
    html.push(`<p>${formatInline(line)}</p>`);
  });

  closeList();
  return html.join("");
}

function formatInline(text) {
  const escaped = escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return addGlossaryTooltips(escaped);
}

const GLOSSARY = {
  개발제한구역: "도시가 너무 넓게 퍼지는 것을 막기 위해 건축이나 개발을 제한한 지역입니다. 그린벨트라고도 합니다.",
  그린벨트: "도시 주변의 자연환경을 지키기 위해 건축이나 개발을 제한한 지역입니다.",
  기초생활수급자: "생활비가 부족해 나라에서 생계, 의료, 주거 같은 도움을 받는 분입니다.",
  차상위계층: "기초생활수급자는 아니지만 소득이 낮아 일부 복지 지원을 받을 수 있는 분입니다.",
  소득인정액: "월 소득과 재산을 함께 계산해 복지 대상인지 판단하는 금액입니다.",
  "기준 중위소득": "우리나라 가구 소득을 순서대로 세웠을 때 가운데에 있는 소득입니다. 복지 대상 기준으로 자주 씁니다.",
  주민센터: "사는 곳 가까이에 있는 행정복지센터입니다. 복지 신청과 상담을 할 수 있습니다.",
  행정복지센터: "예전의 동주민센터와 비슷한 곳입니다. 복지 신청과 상담을 할 수 있습니다.",
  읍면동: "읍, 면, 동을 함께 부르는 말입니다. 보통 가까운 주민센터를 뜻합니다.",
  중증질환: "치료가 오래 걸리거나 병원비 부담이 큰 심한 질병입니다.",
  희귀질환: "환자 수가 적어 보기 드문 질병입니다.",
  난치질환: "치료가 어렵거나 오래 관리해야 하는 질병입니다.",
  자산형성: "저축이나 지원금을 통해 목돈을 만들 수 있도록 돕는 것입니다.",
  현금지급: "물건이나 서비스가 아니라 돈으로 지원한다는 뜻입니다.",
  바우처: "정해진 곳에서 서비스나 물건을 살 수 있는 이용권입니다.",
};

function addGlossaryTooltips(html) {
  const terms = Object.keys(GLOSSARY)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const termPattern = new RegExp(`(^|[^\\w가-힣])(${terms})(?=$|[^\\w가-힣])`, "g");

  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part.startsWith("<")) return part;

      return part.replace(termPattern, (match, prefix, term) => {
        const description = GLOSSARY[term];
        return `${prefix}<button type="button" class="term-help" aria-label="${term} 설명: ${escapeHtml(description)}" data-tooltip="${escapeHtml(description)}">${term}</button>`;
      });
    })
    .join("");
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * HTML 이스케이프.
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}
