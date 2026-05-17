/**
 * WebGazer.js 로더 및 시선 추적 래퍼.
 * WebGazer은 전역 싱글턴이므로 begin/end 호출을 한 번만 하도록 관리한다.
 */

const CDN = 'https://unpkg.com/webgazer@2.1.0/dist/webgazer.js';
let loadPromise = null;

function loadWebGazer() {
  if (window.webgazer) return Promise.resolve(window.webgazer);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CDN;
    s.onload = () => {
      if (window.webgazer) resolve(window.webgazer);
      else reject(new Error('WebGazer 로드 실패'));
    };
    s.onerror = () => reject(new Error('WebGazer 스크립트를 불러올 수 없어요'));
    document.head.appendChild(s);
  });

  return loadPromise;
}

let running = false;

/**
 * WebGazer를 시작하고 시선 추적기 객체를 반환한다.
 * @returns {Promise<{onGaze: Function, pause: Function, resume: Function, stop: Function}>}
 */
export async function createGazeTracker() {
  const wg = await loadWebGazer();

  if (!running) {
    wg.showVideoPreview(true)
      .showPredictionPoints(false)
      .applyKalmanFilter(true);

    await wg.begin();
    running = true;
  }

  const listeners = new Set();

  wg.setGazeListener((data) => {
    if (!data) return;
    for (const fn of listeners) fn(data.x, data.y);
  });

  return {
    /** gaze 콜백 등록. 반환값은 제거 함수. */
    onGaze(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    pause() {
      try { wg.pause(); } catch { /* ignore */ }
    },
    resume() {
      try { wg.resume(); } catch { /* ignore */ }
    },
    stop() {
      listeners.clear();
      wg.setGazeListener(null);
      try { wg.end(); running = false; } catch { /* ignore */ }
    },
  };
}
