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
  const puller = root.querySelector('#elfoV3Puller');

  document.documentElement.classList.add('elfo-intro-active');

  const BASE_ART_FACES_LEFT = true;
  const WALK_FRAMES = [0, 1, 2, 3];
  const FRAME_DISTANCE = 17;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
  let frameIndex = 0;
  let currentFrame = -1;
  let gaitPhase = 0;
  let idlePhase = 0;
  let lastHopAt = 0;
  let sequenceToken = 0;
  let toothPairs = [];

  function actorSize() {
    const r = actor.getBoundingClientRect();
    return { w: r.width || 125, h: r.height || 167 };
  }

  function groundY() {
    const { h } = actorSize();
    return innerHeight - h - Math.max(15, innerHeight * .024);
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

  function setMoving(moving) {
    actor.classList.toggle('is-moving', moving);
    if (!moving) {
      strideDistance = 0;
      frameIndex = 0;
      setFrame(0);
    }
  }

  function updateWalkPose(distance, speed) {
    strideDistance += Math.abs(distance);
    gaitPhase += Math.abs(distance) / (FRAME_DISTANCE * 4) * Math.PI * 2;

    while (strideDistance >= FRAME_DISTANCE) {
      strideDistance -= FRAME_DISTANCE;
      frameIndex = (frameIndex + 1) % WALK_FRAMES.length;
      setFrame(WALK_FRAMES[frameIndex]);
    }

    const intensity = clamp(Math.abs(speed) / 230, 0, 1);
    const step = Math.abs(Math.sin(gaitPhase));
    const bob = step * (1.2 + intensity * 1.7);
    visual.style.transform = `translateY(${-bob.toFixed(2)}px)`;
    shadow.style.transform = `scaleX(${(1 - step * .055).toFixed(3)})`;
    shadow.style.opacity = String(.48 - step * .055);
  }

  function updateIdle(dt) {
    idlePhase += dt;
    const breathe = Math.sin(idlePhase * 1.8);
    visual.style.transform = `translateY(${(-Math.max(0, breathe) * .45).toFixed(2)}px)`;
    shadow.style.transform = `scaleX(${(1 - Math.abs(breathe) * .012).toFixed(3)})`;
    shadow.style.opacity = '.48';
  }

  function updateRoam(now) {
    const dt = Math.min(.034, Math.max(.001, (now - lastTime) / 1000));
    lastTime = now;
    const { w } = actorSize();
    y = groundY();

    const pointerActive = pointerSeen && now - lastPointerAt < 4800;
    const leftBound = Math.max(15, innerWidth * .05);
    const rightBound = Math.max(leftBound, innerWidth - w - Math.max(15, innerWidth * .05));

    if (pointerActive) {
      targetX = clamp(pointerX - w * .5, 10, innerWidth - w - 10);
    } else if (Math.abs(targetX - x) < 10 || targetX < leftBound || targetX > rightBound) {
      autoDir *= -1;
      targetX = autoDir > 0 ? rightBound : leftBound;
    }

    const dx = targetX - x;
    const deadZone = pointerActive ? 6 : 9;
    let desiredV = 0;
    if (Math.abs(dx) > deadZone) {
      const maxSpeed = pointerActive ? 205 : 98;
      const minSpeed = pointerActive ? 62 : 48;
      desiredV = Math.sign(dx) * clamp(minSpeed + Math.abs(dx) * 1.15, minSpeed, maxSpeed);
    }

    const accel = desiredV === 0 ? 640 : 420;
    vx = moveToward(vx, desiredV, accel * dt);
    let delta = vx * dt;
    if (desiredV !== 0 && Math.sign(delta) === Math.sign(dx) && Math.abs(delta) > Math.abs(dx)) {
      delta = dx;
      vx = 0;
    }

    x = clamp(x + delta, 8, innerWidth - w - 8);
    const moving = Math.abs(vx) > 8 && Math.abs(delta) > .03;

    if (moving) {
      setFacing(vx);
      setMoving(true);
      updateWalkPose(delta, vx);
    } else {
      setMoving(false);
      updateIdle(dt);
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
      function tick(now) {
        const raw = clamp((now - start) / ms, 0, 1);
        update(easing(raw), raw);
        if (raw < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  async function walkTo(destX, speed = 270) {
    const sx = x;
    const distance = destX - sx;
    if (Math.abs(distance) < 2) return;

    setFacing(distance);
    setMoving(true);
    const duration = clamp(Math.abs(distance) / speed * 1000, 300, 1700);
    let prev = sx;

    await animate(duration, p => {
      const nx = lerp(sx, destX, smooth(p));
      const step = nx - prev;
      prev = nx;
      x = nx;
      y = groundY();
      updateWalkPose(step, Math.sign(distance) * speed);
      setPos(x, y);
    });

    vx = 0;
    setMoving(false);
    visual.style.transform = '';
    shadow.style.transform = 'scaleX(1)';
    shadow.style.opacity = '.48';
  }

  async function smallHop() {
    const now = performance.now();
    if (state !== 'roam' || now - lastHopAt < 1000) return;
    lastHopAt = now;
    const baseY = groundY();
    const height = 24;
    await animate(480, (p, raw) => {
      if (state !== 'roam') return;
      const arc = 4 * raw * (1 - raw);
      const crouch = raw < .12 ? raw / .12 * 2.5 : 0;
      y = baseY - height * arc + crouch;
      shadow.style.transform = `scaleX(${(1 - arc * .28).toFixed(3)})`;
      shadow.style.opacity = String(.48 - arc * .18);
      setPos(x, y);
    }, easeInOutCubic);
    if (state === 'roam') {
      y = baseY;
      setPos(x, y);
      shadow.style.transform = 'scaleX(1)';
      shadow.style.opacity = '.48';
    }
  }

  async function leapToZipper(token) {
    const { w } = actorSize();
    const sx = x;
    const sy = y;
    const ex = innerWidth / 2 - w / 2;
    const ey = Math.max(8, innerHeight * .018);
    const arcHeight = Math.min(155, innerHeight * .17);

    await animate(120, p => {
      if (token !== sequenceToken) return;
      visual.style.transform = `translateY(${(3 * easeOutCubic(p)).toFixed(2)}px)`;
      shadow.style.transform = `scaleX(${(1 + .045 * p).toFixed(3)})`;
    });
    if (token !== sequenceToken) return;

    setFrame(2);
    await animate(840, (p, raw) => {
      if (token !== sequenceToken) return;
      const horizontal = smooth(raw);
      x = lerp(sx, ex, horizontal);
      y = lerp(sy, ey, raw) - 4 * arcHeight * raw * (1 - raw);
      const air = 4 * raw * (1 - raw);
      shadow.style.transform = `scaleX(${(1 - air * .44).toFixed(3)})`;
      shadow.style.opacity = String(.48 - air * .30);
      if (raw > .86) actor.style.opacity = String(1 - (raw - .86) / .14);
      setPos(x, y);
    });

    visual.style.transform = '';
  }

  function buildTeeth() {
    const old = root.querySelector('.elfo-v4-teeth');
    if (old) old.remove();
    const layer = document.createElement('div');
    layer.className = 'elfo-v4-teeth';
    layer.setAttribute('aria-hidden', 'true');
    root.insertBefore(layer, root.querySelector('.elfo-v3-vignette'));

    const spacing = clamp(innerHeight / 70, 12, 19);
    const count = Math.min(92, Math.ceil(innerHeight / spacing));
    toothPairs = [];

    for (let i = 0; i < count; i++) {
      const yy = i * spacing + 2;
      const left = document.createElement('i');
      const right = document.createElement('i');
      left.className = 'elfo-v4-tooth left';
      right.className = 'elfo-v4-tooth right';
      left.style.top = `${yy}px`;
      right.style.top = `${yy + (i % 2 ? 1 : 0)}px`;
      layer.append(left, right);
      toothPairs.push({ y: yy, left, right });
    }
  }

  function updateTeeth(sliderY, topGap) {
    for (const pair of toothPairs) {
      const yPos = pair.y;
      if (yPos >= sliderY - 2 || sliderY < 8) {
        pair.left.style.opacity = '0';
        pair.right.style.opacity = '0';
        continue;
      }
      const ratio = clamp(1 - yPos / Math.max(sliderY, 1), 0, 1);
      const offset = topGap * Math.pow(ratio, .88);
      const visibility = clamp((sliderY - yPos) / 24, 0, 1);
      pair.left.style.opacity = String(.90 * visibility);
      pair.right.style.opacity = String(.90 * visibility);
      pair.left.style.transform = `translateX(${-offset.toFixed(2)}px) rotate(-1.2deg)`;
      pair.right.style.transform = `translateX(${offset.toFixed(2)}px) rotate(1.2deg)`;
    }
  }

  function updatePanelCut(sliderY, topGap) {
    const yy = clamp(sliderY, 0, innerHeight);
    const gap = Math.max(0, topGap);
    root.style.setProperty('--zip-y', `${Math.round(yy)}px`);
    root.style.setProperty('--zip-gap', `${Math.round(gap)}px`);

    leftPanel.style.clipPath = `polygon(0 0,calc(50% - ${gap.toFixed(1)}px) 0,50% ${yy.toFixed(1)}px,50% 100%,0 100%)`;
    rightPanel.style.clipPath = `polygon(calc(50% + ${gap.toFixed(1)}px) 0,100% 0,100% 100%,50% 100%,50% ${yy.toFixed(1)}px)`;
    updateTeeth(yy, gap);
  }

  async function pullZipper(token) {
    root.classList.add('is-pulling');
    actor.style.opacity = '0';
    puller.style.display = 'block';
    puller.style.opacity = '0';

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const rect = puller.getBoundingClientRect();
    const pw = rect.width || 205;
    const ph = rect.height || pw;
    const anchorRatioX = .864;
    const sliderRatioY = .13;
    const startY = -Math.max(8, ph * .015);
    const endY = Math.max(165, innerHeight - ph * .73 - 22);
    const anchorX = innerWidth / 2 - pw * anchorRatioX;
    const maxGap = Math.min(138, innerWidth * .078);

    puller.style.left = `${anchorX}px`;
    puller.style.top = `${startY}px`;
    puller.style.transform = 'rotate(-1.3deg) scale(.985)';
    updatePanelCut(0, 0);

    await animate(150, p => {
      if (token !== sequenceToken) return;
      puller.style.opacity = String(easeOutCubic(p));
      puller.style.transform = `rotate(${(-1.3 + p * 1.0).toFixed(2)}deg) scale(${(.985 + p * .015).toFixed(3)})`;
    });

    await animate(1850, (p, raw) => {
      if (token !== sequenceToken) return;
      const e = easeInOutCubic(raw);
      const py = lerp(startY, endY, e);
      const sliderY = clamp(py + ph * sliderRatioY, 0, innerHeight);
      const progress = clamp(sliderY / Math.max(endY + ph * sliderRatioY, 1), 0, 1);
      const gap = maxGap * Math.pow(progress, .72);
      const swing = -1.0 * Math.exp(-raw * 4.6) * Math.cos(raw * Math.PI * 4.2) + .18 * (1 - e);
      puller.style.left = `${anchorX}px`;
      puller.style.top = `${py}px`;
      puller.style.transform = `rotate(${swing.toFixed(2)}deg)`;
      updatePanelCut(sliderY, gap);
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

    await walkTo(innerWidth / 2 - w / 2, 280);
    if (token !== sequenceToken) return;
    await new Promise(r => setTimeout(r, 90));
    await leapToZipper(token);
    if (token !== sequenceToken) return;
    await new Promise(r => setTimeout(r, 35));
    await pullZipper(token);
    if (token !== sequenceToken) return;

    root.classList.add('is-opening');
    await animate(260, p => {
      puller.style.opacity = String(1 - p);
    }, easeOutCubic);
    await new Promise(r => setTimeout(r, 820));

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

  actor.addEventListener('pointerenter', smallHop);
  actor.addEventListener('click', beginSequence);
  actor.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      beginSequence();
    }
  });

  addEventListener('resize', () => {
    buildTeeth();
    if (state !== 'roam') return;
    const { w } = actorSize();
    x = clamp(x, 8, innerWidth - w - 8);
    y = groundY();
    setPos(x, y);
  });

  buildTeeth();
  requestAnimationFrame(() => {
    y = groundY();
    setFrame(0);
    setFacing(1);
    setPos(x, y);
    requestAnimationFrame(loop);
  });
})();
