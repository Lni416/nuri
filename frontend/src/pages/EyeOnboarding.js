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
      setTimeout(() => {
        destroy();
        onFallback();
      }, 1800);
    }
  }

  function showCalibration() {
    el.innerHTML = '';
    const cal = createEyeCalibration({
      onComplete: showSelector,
      onBack: () => {
        destroy();
        onFallback();
      },
    });
    el.appendChild(cal);
  }

  function showSelector() {
    el.innerHTML = '';

    const guide = document.createElement('p');
    guide.className = 'eye-guide';
    guide.textContent = '항목을 1.5초 동안 바라보면 자동으로 선택됩니다.';
    el.appendChild(guide);

    const { el: stepEl } = createStepSelector({
      mode: 'eye',
      onComplete: (formData) => {
        destroy();
        onComplete(formData);
      },
      gazeTracker,
    });
    el.appendChild(stepEl);

    const fallbackBtn = document.createElement('button');
    fallbackBtn.className = 'ob-link';
    fallbackBtn.textContent = '직접 선택으로 전환';
    fallbackBtn.addEventListener('click', () => {
      destroy();
      onFallback();
    });
    el.appendChild(fallbackBtn);
  }

  function destroy() {
    gazeTracker?.stop();
    gazeTracker = null;
  }

  el._destroy = destroy;
  init();
  return el;
}
