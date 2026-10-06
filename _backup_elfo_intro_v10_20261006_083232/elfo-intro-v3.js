(() => {
  'use strict';

  const root = document.getElementById('elfoIntroV3');
  if (!root) return;

  const leftPanel = root.querySelector('.elfo-v3-left');
  const rightPanel = root.querySelector('.elfo-v3-right');
  const actor = root.querySelector('#elfoV3Character');
  const flip = actor.querySelector('.elfo-v3-flip');
  const visual = actor.querySelector('.elfo-v3-visual');
  const sheet = actor.querySelector('.elfo-v3-sheet');
  const shadow = actor.querySelector('.elfo-v3-shadow');
  const puller = root.querySelector('#elfoV3Puller');

  document.documentElement.classList.add('elfo-intro-active');

  const FRAMES = [0, 1, 2, 3];
  const FRAME_DISTANCE = 17.5;
  const BASE_ART_FACES_LEFT = true;

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
  const moveToward = (v, t, d) => v < t ? Math.min(v + d, t) : v > t ? Math.max(v - d, t) : t;

  let state = 'roam';
  let x = Math.max(20, innerWidth * .10);
  let y = 0;
  let vx = 0;
  let targetX = Math.max(20, innerWidth * .76);
  let autoDir = 1;
  let pointerX = targetX;
  let pointerSeen = false;
  let lastPointerAt = 0;
  let lastTime = performance.now();
  let strideDistance = 0;
  let walkFrame = 0;
  let currentFrame = -1;
  let idleClock = 0;
  let sequenceToken = 0;
  let hoverHopBusy = false;

  function actorSize() {
    const r = actor.getBoundingClientRect();
    return { w: r.width || 125, h: r.height || 167 };
  }

  function groundY() {
    const { h } = actorSize();
    return innerHeight - h - Math.max(14, innerHeight * .025);
  }

  function setFrame(frame) {
    frame = clamp(frame | 0, 0, 3);
    if (frame === currentFrame) return;
    currentFrame = frame;
    sheet.style.transform = `translate3d(${-frame * 25}%,0,0)`;
  }

  function setFacing(dir) {
    if (Math.abs(dir) < .001) return;
    const face = BASE_ART_FACES_LEFT ? (dir > 0 ? -1 : 1) : (dir > 0 ? 1 : -1);
    flip.style.setProperty('--elfo-face', String(face));
  }

  function setPos(nx, ny) {
    x = nx;
    y = ny;
    actor.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
  }

  function resetPose() {
    strideDistance = 0;
    walkFrame = 0;
    setFrame(0);
    visual.style.transform = '';
    shadow.style.transform = 'scaleX(1)';
    shadow.style.opacity = '.50';
  }

  function advanceWalk(distance, speed) {
    strideDistance += Math.abs(distance);
    while (strideDistance >= FRAME_DISTANCE) {
      strideDistance -= FRAME_DISTANCE;
      walkFrame = (walkFrame + 1) % FRAMES.length;
      setFrame(FRAMES[walkFrame]);
    }

    const speedN = clamp(Math.abs(speed) / 225, 0, 1);
    const phase = (walkFrame + strideDistance / FRAME_DISTANCE) / FRAMES.length * Math.PI * 2;
    const bob = Math.abs(Math.sin(phase)) * (1.8 + speedN * 1.7);
    const lean = clamp(speed / 225, -1, 1) * 1.15;

    visual.style.transform = `translateY(${-bob.toFixed(2)}px) rotate(${lean.toFixed(2)}deg)`;
    shadow.style.transform = `scaleX(${(1 - Math.abs(Math.sin(phase)) * .08 - speedN * .03).toFixed(3)})`;
    shadow.style.opacity = String(.50 - Math.abs(Math.sin(phase)) * .08 - speedN * .03);
  }

  function idlePose(dt) {
    idleClock += dt;
    setFrame(0);
    const breath = Math.sin(idleClock * 1.8);
    visual.style.transform = `translateY(${(-Math.max(0, breath) * .75).toFixed(2)}px)`;
    shadow.style.transform = `scaleX(${(1 - Math.abs(breath) * .015).toFixed(3)})`;
    shadow.style.opacity = String(.50 - Math.abs(breath) * .012);
  }

  function updateRoam(now) {
    const dt = Math.min(.034, Math.max(.001, (now - lastTime) / 1000));
    lastTime = now;

    const { w } = actorSize();
    y = groundY();

    const pointerActive = pointerSeen && now - lastPointerAt < 4800;
    const leftBound = Math.max(14, innerWidth * .055);
    const rightBound = Math.max(leftBound, innerWidth - w - Math.max(14, innerWidth * .055));

    if (pointerActive) {
      targetX = clamp(pointerX - w * .5, 10, innerWidth - w - 10);
    } else if (Math.abs(targetX - x) < 12 || targetX < leftBound || targetX > rightBound) {
      autoDir *= -1;
      targetX = autoDir > 0 ? rightBound : leftBound;
    }

    const dx = targetX - x;
    const deadZone = pointerActive ? 5.5 : 8;
    let desiredV = 0;

    if (Math.abs(dx) > deadZone) {
      const maxSpeed = pointerActive ? 220 : 102;
      const minSpeed = pointerActive ? 70 : 54;
      desiredV = Math.sign(dx) * clamp(minSpeed + Math.abs(dx) * 1.38, minSpeed, maxSpeed);
    }

    const accelerating = Math.sign(desiredV) === Math.sign(vx) && Math.abs(desiredV) > Math.abs(vx);
    vx = moveToward(vx, desiredV, (desiredV === 0 ? 830 : (accelerating ? 530 : 930)) * dt);

    let delta = vx * dt;
    if (desiredV !== 0 && Math.sign(delta) === Math.sign(dx) && Math.abs(delta) > Math.abs(dx)) {
      delta = dx;
      vx = 0;
    }

    x = clamp(x + delta, 8, innerWidth - w - 8);
    const moving = Math.abs(vx) > 7 && Math.abs(delta) > .04;

    if (moving) {
      setFacing(vx);
      advanceWalk(delta, vx);
    } else {
      strideDistance = 0;
      walkFrame = 0;
      idlePose(dt);
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

  async function hoverHop() {
    if (state !== 'roam' || hoverHopBusy) return;
    hoverHopBusy = true;
    const baseY = groundY();
    const start = performance.now();
    const duration = 430;

    await new Promise(resolve => {
      const tick = now => {
        const p = clamp((now - start) / duration, 0, 1);
        const arc = Math.sin(Math.PI * p);
        setPos(x, baseY - arc * 16);
        shadow.style.transform = `scaleX(${(1 - arc * .24).toFixed(3)})`;
        shadow.style.opacity = String(.50 - arc * .22);
        if (p < 1 && state === 'roam') requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    hoverHopBusy = false;
  }

  async function walkTo(destX, speed = 315) {
    const startX = x;
    const distance = destX - startX;
    const absDistance = Math.abs(distance);
    if (absDistance < 2) return;

    setFacing(distance);
    const duration = clamp(absDistance / speed * 1000, 300, 1450);
    let prev = startX;

    await animate(duration, p => {
      const e = smooth(p);
      const nx = lerp(startX, destX, e);
      const step = nx - prev;
      prev = nx;
      x = nx;
      y = groundY();
      advanceWalk(step, Math.sign(distance) * speed);
      setPos(x, y);
    });

    vx = 0;
    resetPose();
  }

  function pullerGeometry() {
    const rect = puller.getBoundingClientRect();
    const pw = rect.width || 200;
    const ph = rect.height || pw;
    const anchorX = innerWidth / 2 - pw * .815;
    const startY = Math.max(-8, innerHeight * .004);
    return { pw, ph, anchorX, startY };
  }

  async function leapAndGrab(token) {
    const { w } = actorSize();
    const sx = x;
    const sy = y;
    const ex = innerWidth / 2 - w / 2;
    const ey = Math.max(10, innerHeight * .018);

    root.classList.add('is-sequencing');
    puller.style.opacity = '0';
    const g = pullerGeometry();
    puller.style.left = `${g.anchorX}px`;
    puller.style.top = `${g.startY}px`;
    puller.style.transform = 'rotate(0deg)';

    await animate(135, p => {
      if (token !== sequenceToken) return;
      const e = easeOutCubic(p);
      visual.style.transform = `translateY(${(4.5 * e).toFixed(2)}px) scale(${(1 + .018 * e).toFixed(3)},${(1 - .035 * e).toFixed(3)})`;
      shadow.style.transform = `scaleX(${(1 + .055 * e).toFixed(3)})`;
    });

    await animate(900, (p, raw) => {
      if (token !== sequenceToken) return;
      const e = easeOutQuint(p);
      x = lerp(sx, ex, e);
      const linearY = lerp(sy, ey, e);
      const arc = Math.sin(Math.PI * raw) * Math.min(150, innerHeight * .175);
      y = linearY - arc;
      setPos(x, y);

      const lift = Math.sin(Math.PI * raw);
      visual.style.transform = `translateY(${(-lift * 2.4).toFixed(2)}px) rotate(${(lift * 2.2).toFixed(2)}deg)`;
      shadow.style.transform = `scaleX(${(1 - lift * .48).toFixed(3)})`;
      shadow.style.opacity = String(.50 - lift * .34);

      const morph = clamp((raw - .70) / .22, 0, 1);
      actor.style.opacity = String(1 - morph);
      puller.style.opacity = String(morph);
    });

    actor.style.opacity = '0';
    puller.style.opacity = '1';
  }

  function updatePanels(sliderY, gapPx) {
    const yy = Math.round(sliderY);
    const gap = Math.round(gapPx);
    root.style.setProperty('--zip-y', `${yy}px`);
    root.style.setProperty('--zip-gap', `${gap}px`);

    leftPanel.style.clipPath = `polygon(0 0, calc(50% - ${gap}px) 0, 50% ${yy}px, 50% 100%, 0 100%)`;
    rightPanel.style.clipPath = `polygon(calc(50% + ${gap}px) 0, 100% 0, 100% 100%, 50% 100%, 50% ${yy}px)`;
  }

  async function pullZipper(token) {
    root.classList.add('is-pulling');
    const { pw, ph, anchorX, startY } = pullerGeometry();
    const endY = Math.max(170, innerHeight - ph * .72 - 22);
    const maxGap = Math.min(250, innerWidth * .105);

    updatePanels(0, 0);

    await animate(1960, (p, raw) => {
      if (token !== sequenceToken) return;

      // Slight initial resistance, then a steady pull, then a soft finish.
      const e = smooth(p);
      const py = lerp(startY, endY, e);
      const sliderY = clamp(py + pw * .115, 0, innerHeight);
      const gap = maxGap * Math.pow(e, .82);
      const settle = Math.sin(raw * Math.PI) * .65;

      puller.style.left = `${anchorX}px`;
      puller.style.top = `${py}px`;
      puller.style.transform = `rotate(${(-1.0 + e * 1.4 + settle * .25).toFixed(2)}deg)`;
      updatePanels(sliderY, gap);
    });
  }

  async function beginSequence() {
    if (state !== 'roam') return;
    state = 'sequence';
    pointerSeen = false;
    vx = 0;
    const token = ++sequenceToken;
    const { w } = actorSize();

    await walkTo(innerWidth / 2 - w / 2, 325);
    if (token !== sequenceToken) return;

    await new Promise(r => setTimeout(r, 90));
    await leapAndGrab(token);
    if (token !== sequenceToken) return;

    await new Promise(r => setTimeout(r, 65));
    await pullZipper(token);
    if (token !== sequenceToken) return;

    root.classList.add('is-opening');
    puller.style.transition = 'opacity 300ms ease, transform 520ms cubic-bezier(.2,.8,.2,1)';
    puller.style.opacity = '0';
    puller.style.transform += ' translateY(24px)';

    await new Promise(r => setTimeout(r, 1100));
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

  actor.addEventListener('pointerenter', hoverHop);
  actor.addEventListener('click', beginSequence);
  actor.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      beginSequence();
    }
  });

  addEventListener('resize', () => {
    if (state !== 'roam') return;
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
