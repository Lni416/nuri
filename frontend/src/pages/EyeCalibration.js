/**
 * 시선 보정 화면.
 * 화면 8곳의 점을 순서대로 바라보며 클릭하면 WebGazer 모델이 학습된다.
 */

// 화면 비율 좌표 (%, %)
const CAL_POINTS = [
  { x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 },
  { x: 10, y: 50 },                    { x: 90, y: 50 },
  { x: 10, y: 90 }, { x: 50, y: 90 }, { x: 90, y: 90 },
];
const CLICKS_PER_POINT = 3;

/**
 * @param {{ onComplete: Function, onBack: Function }} params
 * @returns {HTMLElement}
 */
export function createEyeCalibration({ onComplete, onBack }) {
  const el = document.createElement('div');
  el.className = 'eye-calibration';

  // 안내 패널
  const info = document.createElement('div');
  info.className = 'cal-info';
  info.innerHTML = `
    <h2 class="cal-title">시선 보정</h2>
    <p class="cal-desc">빨간 점을 바라보면서 클릭하세요. 각 점을 ${CLICKS_PER_POINT}번 클릭합니다.</p>
  `;
  el.appendChild(info);

  // 진행 바
  const barWrap = document.createElement('div');
  barWrap.className = 'cal-bar-wrap';
  const barFill = document.createElement('div');
  barFill.className = 'cal-bar-fill';
  barWrap.appendChild(barFill);
  el.appendChild(barWrap);

  // 보정 포인트
  let pointIndex = 0;
  let clickCount = 0;

  const dots = CAL_POINTS.map((pos, i) => {
    const dot = document.createElement('button');
    dot.className = 'cal-dot';
    dot.setAttribute('aria-label', `보정 점 ${i + 1}`);
    dot.style.left = `${pos.x}%`;
    dot.style.top = `${pos.y}%`;
    el.appendChild(dot);
    return dot;
  });

  function updateUI() {
    const total = CAL_POINTS.length * CLICKS_PER_POINT;
    const done = pointIndex * CLICKS_PER_POINT + clickCount;
    barFill.style.width = `${(done / total) * 100}%`;

    dots.forEach((d, i) => {
      d.className =
        i < pointIndex ? 'cal-dot done' :
        i === pointIndex ? 'cal-dot active' :
        'cal-dot';
    });
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      if (i !== pointIndex) return;

      dot.classList.add('cal-flash');
      setTimeout(() => dot.classList.remove('cal-flash'), 160);

      clickCount++;
      if (clickCount >= CLICKS_PER_POINT) {
        clickCount = 0;
        pointIndex++;
        if (pointIndex >= CAL_POINTS.length) {
          updateUI();
          setTimeout(onComplete, 300);
          return;
        }
      }
      updateUI();
    });
  });

  // 하단 버튼
  const backBtn = document.createElement('button');
  backBtn.className = 'ob-link cal-action-btn';
  backBtn.textContent = '← 입력 방식 다시 선택';
  backBtn.addEventListener('click', onBack);
  el.appendChild(backBtn);

  const skipBtn = document.createElement('button');
  skipBtn.className = 'ob-link cal-action-btn';
  skipBtn.style.marginTop = '0.4rem';
  skipBtn.textContent = '보정 건너뛰기 (정확도 낮아짐)';
  skipBtn.addEventListener('click', onComplete);
  el.appendChild(skipBtn);

  updateUI();
  return el;
}
