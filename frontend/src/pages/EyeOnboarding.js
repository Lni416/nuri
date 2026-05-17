/**
 * 눈 응시 온보딩.
 * 흐름: WebGazer 로드 → 카메라 권한 → 보정 → StepSelector (dwell 모드)
 *
 * ⚠️ CSS 주의: obFadeUp 애니메이션은 transform을 포함하므로,
 *   animation이 붙은 el(eye-onboarding)이 position:fixed 자식의 containing block이 된다.
 *   보정 화면 진입 시 el 자체를 position:fixed로 확장해 이 문제를 우회한다.
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

  function makeFullscreen() {
    // animation의 transform이 containing block을 만들지 않도록 el 자체를 fixed로 확장
    el.style.cssText =
      'position:fixed;inset:0;max-width:none;width:100%;height:100%;' +
      'display:block;padding:0;gap:0;animation:none;';
  }

  function resetLayout() {
    el.removeAttribute('style');
    el.style.animation = 'none'; // 재진입 시 fade 재생 방지
  }

  function showCalibration() {
    makeFullscreen();
    el.innerHTML = '';
    const cal = createEyeCalibration({
      onComplete: showSelector,
      onBack: () => { destroy(); onFallback(); },
    });
    el.appendChild(cal);
  }

  function showSelector() {
    resetLayout();
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
    guide.textContent = '항목을 1.5초 동안 바라보면 자동으로 선택됩니다.';
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
