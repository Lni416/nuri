/**
 * 입력 방식 선택 화면 — 음성 / 눈 응시 / 직접 입력 / 건너뛰기.
 */

import { isSpeechSupported } from '../utils/speechRecognition.js';

/**
 * @param {{ onVoice: Function, onEye: Function, onText: Function, onSkip: Function }} params
 * @returns {HTMLElement}
 */
export function createSelectMode({ onVoice, onEye, onText, onSkip }) {
  const el = document.createElement('div');
  el.className = 'select-mode';

  const inner = document.createElement('div');
  inner.className = 'select-mode-inner';

  inner.innerHTML = `
    <div class="sm-icon">✨</div>
    <h1 class="sm-title">어떻게 알려드릴까요?</h1>
    <p class="sm-desc">원하는 방식으로 간편하게 정보를 찾아드릴게요.</p>
    <div class="sm-buttons"></div>
    <button class="ob-link sm-skip">기존 폼으로 직접 입력하기</button>
  `;

  const btnsWrap = inner.querySelector('.sm-buttons');

  if (isSpeechSupported()) {
    const voiceBtn = document.createElement('button');
    voiceBtn.className = 'sm-btn sm-btn--voice';
    voiceBtn.innerHTML = `
      <span class="sm-btn-icon">🎤</span>
      <span class="sm-btn-label">음성으로 말하기</span>
      <span class="sm-btn-sub">말하면 자동으로 선택돼요</span>
    `;
    voiceBtn.addEventListener('click', onVoice);
    btnsWrap.appendChild(voiceBtn);
  }

  const eyeBtn = document.createElement('button');
  eyeBtn.className = 'sm-btn sm-btn--eye';
  eyeBtn.innerHTML = `
    <span class="sm-btn-icon">👁️</span>
    <span class="sm-btn-label">눈으로 선택하기</span>
    <span class="sm-btn-sub">바라보면 자동으로 선택돼요</span>
  `;
  eyeBtn.addEventListener('click', onEye);
  btnsWrap.appendChild(eyeBtn);

  const textBtn = document.createElement('button');
  textBtn.className = 'sm-btn sm-btn--text';
  textBtn.innerHTML = `
    <span class="sm-btn-icon">👆</span>
    <span class="sm-btn-label">직접 입력하기</span>
    <span class="sm-btn-sub">항목을 눌러서 선택해요</span>
  `;
  textBtn.addEventListener('click', onText);
  btnsWrap.appendChild(textBtn);

  inner.querySelector('.sm-skip').addEventListener('click', onSkip);

  el.appendChild(inner);
  return el;
}
