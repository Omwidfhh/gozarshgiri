(() => {
  'use strict';

  const root = document.getElementById('elfoIntroV3');
  if (!root) return;

  const leftPanel = root.querySelector('.elfo-v3-left');
  const rightPanel = root.querySelector('.elfo-v3-right');
  const actor = root.querySelector('#elfoV3Character');
  const flip = actor.querySelector('.elfo-v3-flip');
  const sheet = actor.querySelector('.elfo-v3-sheet');
  const shadow = actor.querySelector('.elfo-v3-shadow');
  const visual = actor.querySelector('.elfo-v3-visual');
  const frameWindow = actor.querySelector('.elfo-v3-frame-window');
  const puller = root.querySelector('#elfoV3Puller');
  document.documentElement.classList.add('elfo-intro-active');

  const FRAME_SEQUENCE = [0, 1, 2, 3, 2, 1];
  const BASE_ART_FACES_LEFT = true;
  const STEP_LENGTH = 15.5;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
  const moveToward = (v, t, d) => v < t ? Math.min(v + d, t) : v > t ? Math.max(v - d, t) : t;

  let state = 'roam';
  let x = Math.max(18, innerWidth * 0.1);
  let y = 0;
  let vx = 0;
  let targetX = Math.max(18, innerWidth * 0.76);
  let autoDir = 1;
  let pointerX = targetX;
  let pointerSeen = false;
  let lastPointerAt = 0;
  let lastTime = performance.now();
  let walkPhase = 0;
  let currentFrame = -1;
  let lastHopAt = 0;
  let sequenceToken = 0;
  let idleClock = 0;

  function actorSize() {
    const r = actor.getBoundingClientRect();
    return { w: r.width || 128, h: r.height || 171 };
  }

  function groundY() {
    const { h } = actorSize();
    return innerHeight - h - Math.max(16, innerHeight * 0.026);
  }

  function setFrame(frame) {
    frame = clamp(frame | 0, 0, 3);
    if (frame === currentFrame) return;
    currentFrame = frame;
    sheet.style.transform = `translate3d(${-frame * 25}%,0,0)`;
  }

  function setFacing(dir) {
    if (Math.abs(dir) < 0.001) return;
    const face = BASE_ART_FACES_LEFT ? (dir > 0 ? -1 : 1) : (dir > 0 ? 1 : -1);
    flip.style.setProperty('--elfo-face', String(face));
  }

  function setPos(nx, ny) {
    x = nx;
    y = ny;
    actor.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
  }

  function stopPose() {
    setFrame(0);
    visual.style.transform = '';
    frameWindow.style.transform = '';
    shadow.style.transform = 'scaleX(1)';
    shadow.style.opacity = '.56';
  }

  function setMoving(moving, running = false) {
    actor.classList.toggle('is-moving', moving);
    actor.classList.toggle('is-running', running && moving);
    if (!moving) stopPose();
  }

  function applyLocomotionPose(speed, delta) {
    const norm = clamp(Math.abs(speed) / 250, 0, 1);
    walkPhase += Math.abs(delta) / STEP_LENGTH * Math.PI * 2;
    const cycle = walkPhase;
    const lift = Math.max(0, Math.sin(cycle));
    const bob = Math.abs(Math.sin(cycle)) * (3.2 + norm * 3.8);
    const roll = Math.sin(cycle) * (1.8 + norm * 1.8);
    const lean = clamp(speed / 250, -1, 1) * (2.2 + norm * 3.2);
    const squashX = 1 + Math.max(0, -Math.sin(cycle)) * (0.012 + norm * 0.018);
    const squashY = 1 - Math.max(0, -Math.sin(cycle)) * (0.022 + norm * 0.026);
    const frameIdx = FRAME_SEQUENCE[Math.floor((walkPhase / (Math.PI * 2)) * FRAME_SEQUENCE.length) % FRAME_SEQUENCE.length];
    setFrame(frameIdx);
    visual.style.transform = `translateY(${-bob.toFixed(2)}px) rotate(${(roll + lean * 0.36).toFixed(2)}deg) scale(${squashX.toFixed(3)},${squashY.toFixed(3)})`;
    frameWindow.style.transform = `translateY(${(-lift * 1.4).toFixed(2)}px)`;
    shadow.style.transform = `scaleX(${(1 - 0.12 * lift - norm * 0.04).toFixed(3)}) scaleY(${(1 - norm * 0.06).toFixed(3)})`;
    shadow.style.opacity = String(0.57 - lift * 0.12 - norm * 0.05);
  }

  function applyIdlePose(dt) {
    idleClock += dt;
    const breathe = Math.sin(idleClock * 2.1) * 1.8;
    const sway = Math.sin(idleClock * 1.27) * 0.9;
    visual.style.transform = `translateY(${(-Math.max(0, breathe) * 0.32).toFixed(2)}px) rotate(${sway.toFixed(2)}deg) scale(${(1 + Math.sin(idleClock * 2.1) * 0.006).toFixed(3)},${(1 - Math.sin(idleClock * 2.1) * 0.008).toFixed(3)})`;
    shadow.style.transform = `scaleX(${(1 - Math.abs(Math.sin(idleClock * 2.1)) * 0.025).toFixed(3)})`;
    shadow.style.opacity = String(0.55 - Math.abs(Math.sin(idleClock * 2.1)) * 0.03);
    setFrame(0);
  }

  function hop() {
    const now = performance.now();
    if (state !== 'roam' || now - lastHopAt < 1000) return;
    lastHopAt = now;
    actor.classList.remove('is-hopping');
    void actor.offsetWidth;
    actor.classList.add('is-hopping');
    setTimeout(() => actor.classList.remove('is-hopping'), 670);
  }

  function updateRoam(now) {
    const dt = Math.min(0.034, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    const { w } = actorSize();
    y = groundY();

    const pointerActive = pointerSeen && (now - lastPointerAt < 5200);
    const leftBound = Math.max(16, innerWidth * 0.05);
    const rightBound = Math.max(leftBound, innerWidth - w - Math.max(16, innerWidth * 0.05));

    if (pointerActive) {
      targetX = clamp(pointerX - w * 0.5, 10, innerWidth - w - 10);
    } else if (Math.abs(targetX - x) < 14 || targetX < leftBound - 1 || targetX > rightBound + 1) {
      autoDir *= -1;
      targetX = autoDir > 0 ? rightBound : leftBound;
    }

    const dx = targetX - x;
    const deadZone = pointerActive ? 5 : 8;
    let desiredV = 0;
    if (Math.abs(dx) > deadZone) {
      const maxSpeed = pointerActive ? 230 : 112;
      const minSpeed = pointerActive ? 74 : 55;
      desiredV = Math.sign(dx) * clamp(minSpeed + Math.abs(dx) * 1.48, minSpeed, maxSpeed);
    }

    const accelerating = Math.sign(desiredV) === Math.sign(vx) && Math.abs(desiredV) > Math.abs(vx);
    vx = moveToward(vx, desiredV, (desiredV === 0 ? 840 : (accelerating ? 540 : 960)) * dt);

    let delta = vx * dt;
    if (desiredV !== 0 && Math.sign(delta) === Math.sign(dx) && Math.abs(delta) > Math.abs(dx)) {
      delta = dx;
      vx = 0;
    }

    x = clamp(x + delta, 8, innerWidth - w - 8);
    const moving = Math.abs(vx) > 7 && Math.abs(delta) > 0.04;

    if (moving) {
      setFacing(vx);
      setMoving(true, Math.abs(vx) > 175);
      applyLocomotionPose(vx, delta);
    } else {
      setMoving(false);
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
        if (raw < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  async function walkTo(destX, speed = 300) {
    const startX = x;
    const distance = destX - startX;
    const absDistance = Math.abs(distance);
    if (absDistance < 2) return;

    setFacing(distance);
    actor.classList.add('is-moving', 'is-running');
    const duration = clamp(absDistance / speed * 1000, 320, 1650);
    let prev = startX;

    await animate(duration, p => {
      const eased = easeInOut(p);
      const nx = startX + distance * eased;
      const step = nx - prev;
      prev = nx;
      x = nx;
      y = groundY();
      applyLocomotionPose(Math.sign(distance) * speed, step);
      setPos(x, y);
    }, t => t);

    vx = 0;
    setMoving(false);
  }

  async function anticipation(token) {
    if (token !== sequenceToken) return;
    await animate(170, p => {
      if (token !== sequenceToken) return;
      const t = easeOutCubic(p);
      visual.style.transform = `translateY(${(6 * t).toFixed(2)}px) scale(${(1 + 0.05 * t).toFixed(3)},${(1 - 0.08 * t).toFixed(3)}) rotate(${(-2.2 * t).toFixed(2)}deg)`;
      shadow.style.transform = `scaleX(${(1 + 0.09 * t).toFixed(3)})`;
    });
  }

  async function leapToZipper(token) {
    const { w } = actorSize();
    const startX = x;
    const startY = y;
    const endX = innerWidth / 2 - w / 2;
    const endY = Math.max(12, innerHeight * 0.026);

    await anticipation(token);
    if (token !== sequenceToken) return;
    setFrame(2);

    await animate(960, (p, raw) => {
      if (token !== sequenceToken) return;
      const e = easeOutQuint(p);
      x = lerp(startX, endX, e);
      const linearY = lerp(startY, endY, e);
      const arc = Math.sin(raw * Math.PI) * Math.min(170, innerHeight * 0.195);
      y = linearY - arc;
      const stretch = Math.sin(raw * Math.PI) * 0.05;
      visual.style.transform = `translateY(${(-stretch * 16).toFixed(2)}px) scale(${(1 - stretch * 0.35).toFixed(3)},${(1 + stretch * 0.52).toFixed(3)}) rotate(${(Math.sin(raw * Math.PI) * 5.8).toFixed(2)}deg)`;
      frameWindow.style.transform = `translateY(${(-stretch * 4).toFixed(2)}px)`;
      shadow.style.transform = `scaleX(${(1 - Math.sin(raw * Math.PI) * 0.48).toFixed(3)})`;
      shadow.style.opacity = String(0.56 - Math.sin(raw * Math.PI) * 0.36);
      actor.style.opacity = String(1 - Math.max(0, raw - 0.87) * 7.5);
      setPos(x, y);
    }, t => t);

    visual.style.transform = '';
    frameWindow.style.transform = '';
  }

  function updatePanelCut(sliderY, gapPx) {
    const yy = Math.round(sliderY);
    const gap = Math.round(gapPx);
    root.style.setProperty('--zip-y', `${yy}px`);
    root.style.setProperty('--zip-gap', `${gap}px`);
    root.style.setProperty('--zip-progress', `${clamp(yy / Math.max(innerHeight, 1), 0, 1)}`);

    leftPanel.style.clipPath = `polygon(0 0, calc(50% - ${Math.max(6, gap)}px) 0, 50% ${yy}px, 50% 100%, 0 100%)`;
    rightPanel.style.clipPath = `polygon(calc(50% + ${Math.max(6, gap)}px) 0, 100% 0, 100% 100%, 50% 100%, 50% ${yy}px)`;
  }

  async function pullZipper(token) {
    root.classList.add('is-pulling');
    actor.style.opacity = '0';
    puller.style.opacity = '1';

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const rect = puller.getBoundingClientRect();
    const pw = rect.width || 204;
    const ph = rect.height || pw;
    const startY = Math.max(-4, innerHeight * 0.004);
    const endY = Math.max(176, innerHeight - ph * 0.70 - 18);
    const anchorX = innerWidth / 2 - pw * 0.815;

    updatePanelCut(0, 0);
    root.style.setProperty('--teeth-opacity', '1');

    await animate(2050, (p, raw) => {
      if (token !== sequenceToken) return;
      const e = easeInOut(p);
      const py = lerp(startY, endY, e);
      const sliderY = clamp(py + pw * 0.11, 0, innerHeight);
      const gap = Math.sin(e * Math.PI / 2) * Math.min(185, innerWidth * 0.128);
      const swing = Math.sin(raw * Math.PI * 7) * (1.6 - e * 0.8);
      const drag = Math.sin(raw * Math.PI) * 8;
      puller.style.left = `${anchorX}px`;
      puller.style.top = `${py}px`;
      puller.style.transform = `rotate(${swing.toFixed(2)}deg) translateY(${drag.toFixed(2)}px)`;
      updatePanelCut(sliderY, gap);
      root.style.setProperty('--teeth-opacity', String(1 - e * 0.18));
    }, t => t);
  }

  async function beginSequence() {
    if (state !== 'roam') return;
    state = 'sequence';
    root.classList.add('is-sequencing');
    pointerSeen = false;
    vx = 0;
    const token = ++sequenceToken;
    const { w } = actorSize();

    await walkTo(innerWidth / 2 - w / 2, 342);
    if (token !== sequenceToken) return;
    await new Promise(r => setTimeout(r, 110));
    await leapToZipper(token);
    if (token !== sequenceToken) return;
    await new Promise(r => setTimeout(r, 70));
    await pullZipper(token);
    if (token !== sequenceToken) return;

    root.classList.add('is-opening');
    puller.style.transition = 'opacity 320ms ease, transform 620ms cubic-bezier(.2,.8,.2,1)';
    puller.style.opacity = '0';
    puller.style.transform += ' translateY(34px) scale(.95)';
    await new Promise(r => setTimeout(r, 1120));
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
    setFrame(0);
    setFacing(1);
    setPos(x, y);
    requestAnimationFrame(loop);
  });
})();
