/**
 * 눈 응시 온보딩.
 * 흐름: WebGazer 로드 → 카메라 권한 → 보정 → StepSelector (dwell 모드)
 */

import { createGazeTracker } from '../utils/gazeTracker.js';
import { createEyeCalibration } from './EyeCalibration.js';
import { createStepSelector } from './StepSelector.js';

/**
 * @param {{ onComplete: Function, onFallback: Function }} params
 * @returns {HTMLElement}
 */
export function createEyeOnboarding({ onComplete, onFallback }) {
  const el = document.createElement('div');
  el.className = 'eye-onboarding';

  let gazeTracker = null;
  const cleanups = [];

  // 초기 로딩 메시지
  const statusEl = document.createElement('p');
  statusEl.className = 'eye-status';
  statusEl.textContent = '카메라를 시작하는 중…';
  el.appendChild(statusEl);

  async function init() {
    try {
      gazeTracker = await createGazeTracker();
      showCalibration();
    } catch (err) {
      console.error('[EyeOnboarding]', err);
      statusEl.textContent = '카메라 연결에 실패했어요. 텍스트 모드로 전환합니다.';
      setTimeout(() => { destroy(); onFallback(); }, 1800);
    }
  }

  function showCalibration() {
    el.innerHTML = '';
    const cal = createEyeCalibration({
      onComplete: showSelector,
      onBack: () => { destroy(); onFallback(); },
    });
    el.appendChild(cal);
  }

  function showSelector() {
    el.innerHTML = '';

    // 시선 커서 — 현재 gaze 위치를 화면에 표시
    const cursor = document.createElement('div');
    cursor.className = 'gaze-cursor';
    document.body.appendChild(cursor);
    cleanups.push(() => cursor.remove());

    const removeCursor = gazeTracker.onGaze((x, y) => {
      cursor.style.transform = `translate(${x - 10}px, ${y - 10}px)`;
      cursor.classList.add('visible');
    });
    cleanups.push(removeCursor);

    const guide = document.createElement('p');
    guide.className = 'eye-guide';
    guide.innerHTML = '항목을 <strong>1.5초</strong> 동안 바라보면 자동으로 선택됩니다. <span class="eye-guide-dot"></span>';
    el.appendChild(guide);

    const { el: stepEl } = createStepSelector({
      mode: 'eye',
      onComplete: (formData) => { destroy(); onComplete(formData); },
      gazeTracker,
    });
    el.appendChild(stepEl);

    const recalBtn = document.createElement('button');
    recalBtn.className = 'ob-link';
    recalBtn.textContent = '보정 다시 하기';
    recalBtn.addEventListener('click', () => {
      cleanups.forEach(fn => fn());
      cleanups.length = 0;
      showCalibration();
    });
    el.appendChild(recalBtn);

    const fallbackBtn = document.createElement('button');
    fallbackBtn.className = 'ob-link';
    fallbackBtn.textContent = '직접 선택으로 전환';
    fallbackBtn.addEventListener('click', () => { destroy(); onFallback(); });
    el.appendChild(fallbackBtn);
  }

  function destroy() {
    cleanups.forEach(fn => fn());
    cleanups.length = 0;
    gazeTracker?.stop();
    gazeTracker = null;
  }

  el._destroy = destroy;
  init();
  return el;
}
