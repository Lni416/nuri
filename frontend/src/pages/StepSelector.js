/**
 * 공통 단계별 선택 컴포넌트 (음성 / 텍스트 / 눈 응시 공통).
 * 3단계: 지역 → 나이 → 분야
 */

const STEPS = [
  {
    id: 'region',
    question: '어디에 살고 계세요?',
    hints: {
      voice: '지역을 말하거나 눌러 주세요',
      eye: '지역을 바라보면 자동으로 선택됩니다',
    },
    options: [
      { value: '서울', label: '서울', keywords: ['서울'] },
      { value: '경기', label: '경기', keywords: ['경기'] },
      { value: '인천', label: '인천', keywords: ['인천'] },
      { value: '부산', label: '부산', keywords: ['부산'] },
      { value: '대구', label: '대구', keywords: ['대구'] },
      { value: '광주', label: '광주', keywords: ['광주'] },
      { value: '대전', label: '대전', keywords: ['대전'] },
      { value: '기타', label: '기타 지역', keywords: ['기타', '그 외', '다른', '지방', '기타지역'] },
    ],
  },
  {
    id: 'age',
    question: '나이대가 어떻게 되세요?',
    hints: {
      voice: '나이대를 말하거나 눌러 주세요',
      eye: '나이대를 바라보면 자동으로 선택됩니다',
    },
    options: [
      { value: '10', label: '10대', age: 15, occupation: '학생',  keywords: ['십대', '10대', '열'] },
      { value: '20', label: '20대', age: 25, occupation: '직장인', keywords: ['이십대', '20대', '스물', '이십'] },
      { value: '30', label: '30대', age: 35, occupation: '직장인', keywords: ['삼십대', '30대', '서른', '삼십'] },
      { value: '40', label: '40대', age: 45, occupation: '직장인', keywords: ['사십대', '40대', '마흔', '사십'] },
      { value: '50', label: '50대 이상', age: 55, occupation: '은퇴',  keywords: ['오십대', '50대', '쉰', '오십', '육십', '60대', '칠십', '70대', '팔십', '이상'] },
    ],
  },
  {
    id: 'field',
    question: '관심 있는 분야가 있나요?',
    hints: {
      voice: '분야를 말하거나 눌러 주세요',
      eye: '분야를 바라보면 자동으로 선택됩니다',
    },
    options: [
      { value: 'IT',   label: 'IT / 개발',  interests: ['취업'],           keywords: ['아이티', 'IT', '개발', '컴퓨터', '소프트웨어', '프로그래밍'] },
      { value: '디자인', label: '디자인',    interests: ['취업', '문화'],    keywords: ['디자인'] },
      { value: '마케팅', label: '마케팅',    interests: ['취업'],           keywords: ['마케팅', '홍보'] },
      { value: '교육',  label: '교육',      interests: ['교육'],           keywords: ['교육', '공부', '학습', '강의'] },
      { value: '의료',  label: '의료 / 건강', interests: ['의료'],          keywords: ['의료', '의학', '건강', '병원', '의사', '간호'] },
      { value: '금융',  label: '금융',      interests: ['취업', '생활'],    keywords: ['금융', '은행', '투자', '경제', '보험'] },
      { value: '기타',  label: '기타',      interests: ['생활'],           keywords: ['기타', '다른', '그 외', '기타분야'] },
    ],
  },
];

const REGION_NAME_MAP = {
  서울: '서울특별시',
  경기: '경기도',
  인천: '인천광역시',
  부산: '부산광역시',
  대구: '대구광역시',
  광주: '광주광역시',
  대전: '대전광역시',
  기타: '경기도',
};

const DWELL_MS = 1500;

/**
 * @param {{ mode: 'voice'|'text'|'eye', onComplete: Function, gazeTracker?: object }} params
 */
export function createStepSelector({ mode, onComplete, gazeTracker = null }) {
  let currentStep = 0;
  let locked = false;
  const selections = [null, null, null];

  const el = document.createElement('div');
  el.className = 'step-selector';

  // dwell 상태
  let removeDwellListener = null;
  let dwellTarget = null;
  let dwellStart = null;
  let dwellRaf = null;

  function clearDwell() {
    if (dwellTarget) {
      dwellTarget.classList.remove('dwell-active');
      dwellTarget.style.removeProperty('--dwell');
    }
    dwellTarget = null;
    dwellStart = null;
    if (dwellRaf) { cancelAnimationFrame(dwellRaf); dwellRaf = null; }
  }

  function setupDwell() {
    if (removeDwellListener) { removeDwellListener(); removeDwellListener = null; }
    clearDwell();
    if (mode !== 'eye' || !gazeTracker) return;

    // WebGazer 오차(±80~150px)를 고려해 버튼 bounding rect 기반으로 판별
    const TOLERANCE = 32;

    removeDwellListener = gazeTracker.onGaze((x, y) => {
      if (locked) return;

      const buttons = el.querySelectorAll('.step-option');
      let btn = null;
      for (const b of buttons) {
        const r = b.getBoundingClientRect();
        if (
          x >= r.left - TOLERANCE && x <= r.right + TOLERANCE &&
          y >= r.top  - TOLERANCE && y <= r.bottom + TOLERANCE
        ) {
          btn = b;
          break;
        }
      }

      if (btn !== dwellTarget) {
        clearDwell();
        if (btn) {
          dwellTarget = btn;
          dwellStart = performance.now();
          btn.classList.add('dwell-active');
          scheduleTick();
        }
      }
    });
  }

  function scheduleTick() {
    if (dwellRaf) return;
    dwellRaf = requestAnimationFrame(tick);
  }

  function tick() {
    dwellRaf = null;
    if (!dwellTarget || !dwellStart || locked) return;

    const pct = Math.min(100, ((performance.now() - dwellStart) / DWELL_MS) * 100);
    dwellTarget.style.setProperty('--dwell', `${pct}%`);

    if (pct >= 100) {
      const value = dwellTarget.dataset.value;
      const opt = STEPS[currentStep].options.find((o) => o.value === value);
      if (opt) {
        clearDwell();
        select(opt);
      }
      return;
    }

    dwellRaf = requestAnimationFrame(tick);
  }

  function render() {
    el.innerHTML = '';

    // 진행 표시
    const progress = document.createElement('div');
    progress.className = 'step-progress';
    for (let i = 0; i < STEPS.length; i++) {
      const dot = document.createElement('span');
      dot.className = 'step-dot' + (i < currentStep ? ' done' : i === currentStep ? ' active' : '');
      progress.appendChild(dot);
      if (i < STEPS.length - 1) {
        const line = document.createElement('span');
        line.className = 'step-line' + (i < currentStep ? ' done' : '');
        progress.appendChild(line);
      }
    }
    const stepLabel = document.createElement('span');
    stepLabel.className = 'step-count';
    stepLabel.textContent = `${currentStep + 1} / ${STEPS.length}`;
    progress.appendChild(stepLabel);
    el.appendChild(progress);

    // 이전 선택 요약
    const prevSelections = selections.slice(0, currentStep).filter(Boolean);
    if (prevSelections.length > 0) {
      const summary = document.createElement('div');
      summary.className = 'step-summary';
      summary.innerHTML = prevSelections
        .map((s) => `<span class="step-chip">${s.label}</span>`)
        .join('<span class="step-chip-sep">•</span>');
      el.appendChild(summary);
    }

    // 질문
    const step = STEPS[currentStep];
    const questionEl = document.createElement('h2');
    questionEl.className = 'step-question fade-in-fast';
    questionEl.textContent = step.question;
    el.appendChild(questionEl);

    // 힌트 (음성 / 눈 모드)
    if (mode === 'voice' || mode === 'eye') {
      const hint = document.createElement('p');
      hint.className = 'step-hint';
      hint.textContent = step.hints[mode] ?? step.hints.voice;
      el.appendChild(hint);
    }

    // 선택지 그리드
    const grid = document.createElement('div');
    grid.className = 'step-grid fade-in-fast';
    step.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'step-option';
      btn.dataset.value = opt.value;
      btn.addEventListener('click', () => select(opt));

      // 눈 응시 모드용 dwell 링 레이어
      if (mode === 'eye') {
        const ring = document.createElement('span');
        ring.className = 'dwell-ring';
        btn.appendChild(ring);
      }

      const label = document.createElement('span');
      label.className = 'step-option-label';
      label.textContent = opt.label;
      btn.appendChild(label);

      grid.appendChild(btn);
    });
    el.appendChild(grid);

    // eye 모드: dwell 설정 (렌더 후 새 DOM에 연결)
    if (mode === 'eye') setupDwell();
  }

  function select(option) {
    if (locked) return;
    locked = true;
    clearDwell();

    const btn = el.querySelector(`.step-option[data-value="${option.value}"]`);
    if (btn) btn.classList.add('selected');

    selections[currentStep] = option;

    setTimeout(() => {
      locked = false;
      if (currentStep < STEPS.length - 1) {
        currentStep++;
        render();
      } else {
        onComplete(buildFormData());
      }
    }, 600);
  }

  function handleTranscript(transcript) {
    if (locked) return;
    const step = STEPS[currentStep];
    const lower = transcript.toLowerCase();
    for (const opt of step.options) {
      for (const kw of opt.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          select(opt);
          return;
        }
      }
    }
  }

  function buildFormData() {
    const [region, ageOpt, fieldOpt] = selections;
    return {
      age: ageOpt?.age ?? 30,
      region_code: region?.value ?? '기타',
      region_name: REGION_NAME_MAP[region?.value] ?? '경기도',
      occupation: ageOpt?.occupation ?? '기타',
      interests: fieldOpt?.interests ?? [],
    };
  }

  function destroy() {
    if (removeDwellListener) { removeDwellListener(); removeDwellListener = null; }
    clearDwell();
  }

  render();

  return { el, handleTranscript, destroy };
}
