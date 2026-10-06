(() => {
  'use strict';

  const root = document.getElementById('elfoIntroV3');
  if (!root) return;

  const leftPanel = root.querySelector('.elfo-v3-left');
  const rightPanel = root.querySelector('.elfo-v3-right');
  const actor = root.querySelector('#elfoV3Character');
  const flip = actor.querySelector('.elfo-v3-flip');
  const visual = actor.querySelector('.elfo-v3-visual');
  const shadow = actor.querySelector('.elfo-v3-shadow');
  document.documentElement.classList.add('elfo-intro-active');

  visual.innerHTML = `
    <svg class="elfo-v4-svg" viewBox="0 0 180 240" aria-hidden="true">
      <g data-part="legBack" class="leg leg-back">
        <rect x="64" y="148" width="20" height="62" rx="10" fill="#2f5879"></rect>
        <rect x="58" y="202" width="30" height="14" rx="7" fill="#5a372a"></rect>
      </g>
      <g data-part="legFront" class="leg leg-front">
        <rect x="96" y="148" width="20" height="62" rx="10" fill="#356384"></rect>
        <rect x="92" y="202" width="32" height="14" rx="7" fill="#684032"></rect>
      </g>
      <g data-part="armBack" class="arm arm-back">
        <rect x="42" y="92" width="18" height="64" rx="9" fill="#e2c0a5"></rect>
        <circle cx="51" cy="153" r="10" fill="#e2c0a5"></circle>
      </g>
      <g data-part="body" class="body">
        <rect x="44" y="62" width="92" height="104" rx="34" fill="#3f78a3"></rect>
        <rect x="50" y="68" width="80" height="92" rx="30" fill="#4b89b7"></rect>
        <rect x="62" y="100" width="24" height="20" rx="6" fill="#2f678d" opacity=".92"></rect>
        <rect x="95" y="100" width="24" height="20" rx="6" fill="#2f678d" opacity=".92"></rect>
        <path d="M70 62 C78 42, 102 42, 110 62" stroke="#f0d0ae" stroke-width="12" fill="none" stroke-linecap="round"></path>
        <rect x="74" y="126" width="32" height="10" rx="5" fill="#305c7d" opacity=".68"></rect>
      </g>
      <g data-part="head" class="head">
        <circle cx="90" cy="44" r="31" fill="#f0d0ae"></circle>
        <path d="M60 45 C70 18, 110 12, 122 44 C117 24, 98 14, 76 18 C66 20, 60 30, 60 45Z" fill="#4d3428"></path>
        <circle cx="79" cy="46" r="3.2" fill="#1d1d1d"></circle>
        <circle cx="101" cy="46" r="3.2" fill="#1d1d1d"></circle>
        <path d="M82 58 Q90 63 98 58" stroke="#87574a" stroke-width="3.2" fill="none" stroke-linecap="round"></path>
      </g>
      <g data-part="armFront" class="arm arm-front">
        <rect x="120" y="92" width="18" height="64" rx="9" fill="#e7c8ae"></rect>
        <circle cx="129" cy="153" r="10" fill="#e7c8ae"></circle>
      </g>
    </svg>
  `;

  const svg = visual.querySelector('.elfo-v4-svg');
  const part = name => svg.querySelector(`[data-part="${name}"]`);
  const body = part('body');
  const head = part('head');
  const armBack = part('armBack');
  const armFront = part('armFront');
  const legBack = part('legBack');
  const legFront = part('legFront');

  const slider = document.createElement('div');
  slider.className = 'elfo-v4-slider';
  root.appendChild(slider);

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
  const moveToward = (v, t, d) => v < t ? Math.min(v + d, t) : v > t ? Math.max(v - d, t) : t;

  let state = 'roam';
  let x = Math.max(24, innerWidth * 0.1);
  let y = 0;
  let vx = 0;
  let targetX = Math.max(24, innerWidth * 0.74);
  let autoDir = 1;
  let pointerX = targetX;
  let pointerSeen = false;
  let lastPointerAt = 0;
  let lastTime = performance.now();
  let walkPhase = 0;
  let idleClock = 0;
  let sequenceToken = 0;
  let lastHopAt = 0;

  function actorSize() {
    const r = actor.getBoundingClientRect();
    return { w: r.width || 130, h: r.height || 174 };
  }

  function groundY() {
    const { h } = actorSize();
    return innerHeight - h - Math.max(18, innerHeight * 0.03);
  }

  function setFacing(dir) {
    if (Math.abs(dir) < 0.001) return;
    flip.style.setProperty('--elfo-face', String(dir > 0 ? 1 : -1));
  }

  function setPos(nx, ny) {
    x = nx;
    y = ny;
    actor.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  }

  function resetPose() {
    visual.style.transform = '';
    body.style.transform = '';
    head.style.transform = '';
    armBack.style.transform = '';
    armFront.style.transform = '';
    legBack.style.transform = '';
    legFront.style.transform = '';
    shadow.style.transform = 'scaleX(1)';
    shadow.style.opacity = '.42';
  }

  function applyWalkPose(speed, delta) {
    walkPhase += Math.abs(delta) * 0.19;
    const c = walkPhase;
    const step = Math.sin(c);
    const norm = clamp(Math.abs(speed) / 220, 0, 1);
    const bob = Math.abs(step) * (2.6 + norm * 2.6);
    const lean = clamp(speed / 240, -1, 1) * (2 + norm * 2.3);
    const armSwing = step * (18 + norm * 6);
    const legSwing = step * (22 + norm * 8);

    visual.style.transform = `translateY(${-bob.toFixed(2)}px)`;
    body.style.transform = `rotate(${lean.toFixed(2)}deg)`;
    head.style.transform = `translateY(${(-bob * 0.22).toFixed(2)}px) rotate(${(-lean * 0.35).toFixed(2)}deg)`;
    armFront.style.transform = `rotate(${(-armSwing).toFixed(2)}deg)`;
    armBack.style.transform = `rotate(${(armSwing * 0.86).toFixed(2)}deg)`;
    legFront.style.transform = `rotate(${(legSwing).toFixed(2)}deg)`;
    legBack.style.transform = `rotate(${(-legSwing * 0.9).toFixed(2)}deg)`;
    shadow.style.transform = `scaleX(${(1 - Math.abs(step) * 0.1 - norm * 0.05).toFixed(3)})`;
    shadow.style.opacity = String(0.43 - Math.abs(step) * 0.08 - norm * 0.04);
  }

  function applyIdlePose(dt) {
    idleClock += dt;
    const breathe = Math.sin(idleClock * 2.1);
    const sway = Math.sin(idleClock * 1.1);
    visual.style.transform = `translateY(${(-Math.max(0, breathe) * 1.2).toFixed(2)}px)`;
    body.style.transform = `rotate(${(sway * 1.4).toFixed(2)}deg)`;
    head.style.transform = `translateY(${(-Math.max(0, breathe) * 0.3).toFixed(2)}px) rotate(${(-sway * 0.7).toFixed(2)}deg)`;
    armFront.style.transform = `rotate(${(-sway * 3).toFixed(2)}deg)`;
    armBack.style.transform = `rotate(${(sway * 2.4).toFixed(2)}deg)`;
    legFront.style.transform = `rotate(0deg)`;
    legBack.style.transform = `rotate(0deg)`;
    shadow.style.transform = `scaleX(${(1 - Math.abs(breathe) * 0.03).toFixed(3)})`;
    shadow.style.opacity = String(0.42 - Math.abs(breathe) * 0.02);
  }

  function hop() {
    const now = performance.now();
    if (state !== 'roam' || now - lastHopAt < 1100) return;
    lastHopAt = now;
    const start = performance.now();
    const dur = 480;
    const tick = t => {
      const p = clamp((t - start) / dur, 0, 1);
      const arc = Math.sin(Math.PI * p);
      visual.style.transform = `translateY(${(-arc * 16).toFixed(2)}px)`;
      body.style.transform = `rotate(${(-arc * 4).toFixed(2)}deg)`;
      head.style.transform = `translateY(${(-arc * 2).toFixed(2)}px)`;
      shadow.style.transform = `scaleX(${(1 - arc * 0.24).toFixed(3)})`;
      shadow.style.opacity = String(0.42 - arc * 0.18);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function updateRoam(now) {
    const dt = Math.min(0.034, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    const { w } = actorSize();
    y = groundY();

    const pointerActive = pointerSeen && now - lastPointerAt < 4600;
    const leftBound = Math.max(18, innerWidth * 0.05);
    const rightBound = Math.max(leftBound, innerWidth - w - Math.max(18, innerWidth * 0.05));

    if (pointerActive) {
      targetX = clamp(pointerX - w * 0.5, 10, innerWidth - w - 10);
    } else if (Math.abs(targetX - x) < 12 || targetX < leftBound || targetX > rightBound) {
      autoDir *= -1;
      targetX = autoDir > 0 ? rightBound : leftBound;
    }

    const dx = targetX - x;
    const deadZone = pointerActive ? 6 : 8;
    let desiredV = 0;
    if (Math.abs(dx) > deadZone) {
      const maxSpeed = pointerActive ? 215 : 104;
      const minSpeed = pointerActive ? 68 : 50;
      desiredV = Math.sign(dx) * clamp(minSpeed + Math.abs(dx) * 1.35, minSpeed, maxSpeed);
    }

    const accelerating = Math.sign(desiredV) === Math.sign(vx) && Math.abs(desiredV) > Math.abs(vx);
    vx = moveToward(vx, desiredV, (desiredV === 0 ? 860 : (accelerating ? 520 : 900)) * dt);

    let delta = vx * dt;
    if (desiredV !== 0 && Math.sign(delta) === Math.sign(dx) && Math.abs(delta) > Math.abs(dx)) {
      delta = dx;
      vx = 0;
    }

    x = clamp(x + delta, 8, innerWidth - w - 8);
    const moving = Math.abs(vx) > 8 && Math.abs(delta) > 0.05;

    if (moving) {
      setFacing(vx);
      applyWalkPose(vx, delta);
    } else {
      resetPose();
      applyIdlePose(dt);
    }

    setPos(x, y);
  }

  function loop(now) {
    if (state === 'roam') updateRoam(now);
    requestAnimationFrame(loop);
  }

  function animate(ms, update, easing = t => t) {
    return new Promise(resolve => {
      const start = performance.now();
      const tick = now => {
        const raw = clamp((now - start) / ms, 0, 1);
        update(easing(raw), raw);
        raw < 1 ? requestAnimationFrame(tick) : resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  async function walkTo(destX, speed = 290) {
    const startX = x;
    const distance = destX - startX;
    const absDistance = Math.abs(distance);
    if (absDistance < 2) return;
    setFacing(distance);
    const duration = clamp(absDistance / speed * 1000, 260, 1400);
    let prev = startX;
    await animate(duration, p => {
      const nx = lerp(startX, destX, easeInOut(p));
      const step = nx - prev;
      prev = nx;
      x = nx;
      y = groundY();
      applyWalkPose(Math.sign(distance) * speed, step);
      setPos(x, y);
    });
    vx = 0;
    resetPose();
  }

  async function leapToTop(token) {
    const { w } = actorSize();
    const sx = x;
    const sy = y;
    const ex = innerWidth / 2 - w / 2;
    const ey = Math.max(16, innerHeight * 0.03);

    await animate(160, p => {
      if (token !== sequenceToken) return;
      const t = easeOutCubic(p);
      visual.style.transform = `translateY(${(6 * t).toFixed(2)}px)`;
      body.style.transform = `scale(${(1 + 0.04 * t).toFixed(3)}, ${(1 - 0.08 * t).toFixed(3)})`;
      shadow.style.transform = `scaleX(${(1 + 0.08 * t).toFixed(3)})`;
    });

    await animate(900, (p, raw) => {
      if (token !== sequenceToken) return;
      const e = easeOutQuint(p);
      x = lerp(sx, ex, e);
      const linearY = lerp(sy, ey, e);
      const arc = Math.sin(raw * Math.PI) * Math.min(160, innerHeight * 0.18);
      y = linearY - arc;
      const tilt = Math.sin(raw * Math.PI) * 5;
      visual.style.transform = `translateY(${(-arc * 0.06).toFixed(2)}px)`;
      body.style.transform = `rotate(${tilt.toFixed(2)}deg)`;
      head.style.transform = `rotate(${(-tilt * 0.4).toFixed(2)}deg)`;
      shadow.style.transform = `scaleX(${(1 - Math.sin(raw * Math.PI) * 0.42).toFixed(3)})`;
      shadow.style.opacity = String(0.42 - Math.sin(raw * Math.PI) * 0.28);
      actor.style.opacity = String(1 - Math.max(0, raw - 0.88) * 8.5);
      setPos(x, y);
    });
  }

  function updateSeam(sliderY, split) {
    const yy = Math.round(sliderY);
    const sp = Math.round(split);
    root.style.setProperty('--zip-y', `${yy}px`);
    root.style.setProperty('--split', `${sp}px`);
    leftPanel.style.clipPath = `polygon(0 0, calc(50% - ${Math.max(4, sp)}px) 0, 50% ${yy}px, 50% 100%, 0 100%)`;
    rightPanel.style.clipPath = `polygon(calc(50% + ${Math.max(4, sp)}px) 0, 100% 0, 100% 100%, 50% 100%, 50% ${yy}px)`;
  }

  async function pullOpen(token) {
    root.classList.add('is-pulling');
    slider.style.opacity = '1';
    const sliderHeight = 74;
    const startY = -4;
    const endY = innerHeight - sliderHeight - 18;
    await animate(1850, (p, raw) => {
      if (token !== sequenceToken) return;
      const e = easeInOut(p);
      const yPos = lerp(startY, endY, e);
      const split = Math.sin(e * Math.PI / 2) * Math.min(148, innerWidth * 0.11);
      slider.style.top = `${yPos}px`;
      slider.style.transform = `rotate(${(Math.sin(raw * Math.PI * 4) * (1.2 - e * 0.7)).toFixed(2)}deg)`;
      updateSeam(yPos + 26, split);
    });
  }

  async function beginSequence() {
    if (state !== 'roam') return;
    state = 'sequence';
    root.classList.add('is-sequencing');
    pointerSeen = false;
    vx = 0;
    const token = ++sequenceToken;
    const { w } = actorSize();

    await walkTo(innerWidth / 2 - w / 2, 310);
    if (token !== sequenceToken) return;
    await new Promise(r => setTimeout(r, 80));
    await leapToTop(token);
    if (token !== sequenceToken) return;
    actor.style.opacity = '0';
    await new Promise(r => setTimeout(r, 60));
    await pullOpen(token);
    if (token !== sequenceToken) return;

    root.classList.add('is-opening');
    slider.style.transition = 'opacity 280ms ease, transform 500ms cubic-bezier(.2,.8,.2,1)';
    slider.style.opacity = '0';
    slider.style.transform += ' translateY(24px)';
    await new Promise(r => setTimeout(r, 1040));
    document.documentElement.classList.remove('elfo-intro-active');
    root.hidden = true;
    state = 'done';
  }

  document.addEventListener('pointermove', e => {
    if (state !== 'roam') return;
    pointerSeen = true;
    pointerX = e.clientX;
    lastPointerAt = performance.now();
  }, { passive: true });

  actor.addEventListener('pointerenter', hop);
  actor.addEventListener('click', beginSequence);
  actor.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      beginSequence();
    }
  });

  addEventListener('resize', () => {
    const { w } = actorSize();
    x = clamp(x, 8, innerWidth - w - 8);
    y = groundY();
    setPos(x, y);
  });

  requestAnimationFrame(() => {
    y = groundY();
    setFacing(1);
    setPos(x, y);
    requestAnimationFrame(loop);
  });
})();
