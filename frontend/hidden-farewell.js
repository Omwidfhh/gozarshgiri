(() => {
  'use strict';
  if (window.__royalFarewellInstalled) return;
  window.__royalFarewellInstalled = true;

  const LOGO_SELECTOR = '.brand-logo, .brand-logo img, img[alt*=\"Royal Jeans\"], img[src*=\"royal-jeans-logo\"]';

  const unlock = document.createElement('div');
  unlock.id = 'farewellUnlock';
  unlock.hidden = true;
  unlock.innerHTML = `
    <button class="farewell-unlock-close" type="button" aria-label="بستن">×</button>
    <div class="farewell-unlock-card" role="dialog" aria-modal="true" aria-labelledby="farewellUnlockTitle">
      <div class="farewell-unlock-mark" aria-hidden="true"></div>
      <h2 class="farewell-unlock-title" id="farewellUnlockTitle">بخش خصوصی</h2>
      <p class="farewell-unlock-subtitle">کد دسترسی را وارد کنید</p>
      <form id="farewellUnlockForm" autocomplete="off">
        <div class="farewell-code-wrap">
          <input id="farewellCodeInput" name="code" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8" aria-label="کد دسترسی">
          <button id="farewellUnlockButton" type="submit">ورود</button>
        </div>
      </form>
    </div>`;

  const deniedToast = document.createElement('div');
  deniedToast.id = 'farewellDeniedToast';
  deniedToast.setAttribute('role', 'status');
  deniedToast.setAttribute('aria-live', 'polite');
  deniedToast.textContent = 'دسترسی ندارید';

  const scene = document.createElement('section');
  scene.id = 'farewellScene';
  scene.hidden = true;
  scene.setAttribute('aria-label', 'پیام خداحافظی');
  scene.innerHTML = `
    <div class="farewell-stars" aria-hidden="true"></div>
    <button class="farewell-scene-close" type="button" aria-label="بستن">×</button>
    <div class="farewell-scene-inner">
      <div class="farewell-scene-kicker">ROYAL JEANS · PRIVATE NOTE</div>
      <div class="farewell-scene-rule" aria-hidden="true"></div>
      <h2 id="farewellTitle"></h2>
      <p id="farewellMessage"></p>
      <div id="farewellSignature"></div>
      <div class="farewell-scene-date" id="farewellDate"></div>
    </div>`;

  document.body.append(unlock, deniedToast, scene);

  const form = unlock.querySelector('#farewellUnlockForm');
  const input = unlock.querySelector('#farewellCodeInput');
  const button = unlock.querySelector('#farewellUnlockButton');
  const unlockClose = unlock.querySelector('.farewell-unlock-close');
  const sceneClose = scene.querySelector('.farewell-scene-close');
  let taps = [];
  let busy = false;
  let deniedTimer = 0;

  function openUnlock() {
    unlock.hidden = false;
    input.value = '';
    requestAnimationFrame(() => input.focus());
  }
  function closeUnlock() {
    unlock.hidden = true;
    input.value = '';
  }
  function showDenied() {
    clearTimeout(deniedTimer);
    deniedToast.classList.remove('is-visible');
    void deniedToast.offsetWidth;
    deniedToast.classList.add('is-visible');
    deniedTimer = setTimeout(() => deniedToast.classList.remove('is-visible'), 1900);
  }
  function closeScene() {
    scene.hidden = true;
    document.documentElement.style.overflow = '';
  }
  function makeStars() {
    const box = scene.querySelector('.farewell-stars');
    if (box.childElementCount) return;
    for (let i = 0; i < 34; i += 1) {
      const star = document.createElement('i');
      star.className = 'farewell-star';
      star.style.left = `${5 + ((i * 37) % 90)}%`;
      star.style.top = `${7 + ((i * 53) % 84)}%`;
      star.style.setProperty('--dur', `${2.8 + (i % 7) * .45}s`);
      star.style.setProperty('--delay', `${-(i % 9) * .31}s`);
      star.style.transform = `scale(${.65 + (i % 4) * .22})`;
      box.appendChild(star);
    }
  }
  function openScene(payload) {
    closeUnlock();
    scene.querySelector('#farewellTitle').textContent = payload.title || '';
    scene.querySelector('#farewellMessage').textContent = payload.message || '';
    scene.querySelector('#farewellSignature').textContent = payload.signature || '';
    scene.querySelector('#farewellDate').textContent = payload.date || '';
    makeStars();
    scene.hidden = false;
    document.documentElement.style.overflow = 'hidden';
  }

  function isLogoInteraction(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path) {
      if (node && node.nodeType === 1 && typeof node.matches === 'function' && node.matches(LOGO_SELECTOR)) return true;
    }
    const target = event.target;
    return !!(target && target.nodeType === 1 && (target.matches(LOGO_SELECTOR) || target.closest?.('.brand-logo')));
  }

  function registerSecretTap() {
    const now = performance.now();
    taps.push(now);
    taps = taps.filter(t => now - t <= 4200);
    if (taps.length >= 5) {
      taps = [];
      openUnlock();
    }
  }

  document.querySelectorAll('.brand-logo, .brand-logo img').forEach(node => {
    node.style.cursor = 'pointer';
  });

  document.addEventListener('click', event => {
    if (!isLogoInteraction(event)) return;
    registerSecretTap();
  }, true);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const code = input.value.trim();
    if (!code) return;
    busy = true;
    button.disabled = true;
    try {
      const data = new FormData();
      data.append('code', code);
      const response = await fetch('/farewell/unlock', { method: 'POST', body: data });
      if (!response.ok) throw new Error('denied');
      const payload = await response.json();
      if (!payload || payload.ok !== true) throw new Error('denied');
      openScene(payload);
    } catch (_) {
      closeUnlock();
      showDenied();
    } finally {
      busy = false;
      button.disabled = false;
    }
  });

  unlockClose.addEventListener('click', closeUnlock);
  sceneClose.addEventListener('click', closeScene);
  unlock.addEventListener('click', event => {
    if (event.target === unlock) closeUnlock();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!unlock.hidden) closeUnlock();
    else if (!scene.hidden) closeScene();
  });
})();
