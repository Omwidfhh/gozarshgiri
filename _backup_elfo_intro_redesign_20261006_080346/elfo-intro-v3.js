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
  const puller = root.querySelector('#elfoV3Puller');
  const visual = actor.querySelector('.elfo-v3-visual');

  document.documentElement.classList.add('elfo-intro-active');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BASE_ART_FACES_LEFT = true;
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = t => t * t * (3 - 2 * t);
  const easeInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);

  let state = 'boot';
  let x = 0;
  let y = 0;
  let vx = 0;
  let targetX = 0;
  let autoDir = 1;
  let pointerX = innerWidth * .75;
  let pointerSeen = false;
  let lastPointerAt = 0;
  let lastTime = performance.now();
  let gaitPhase = 0;
  let lastFrame = -1;
  let lastHopAt = 0;
  let sequenceToken = 0;
  let idleSeed = Math.random() * TAU;

  function actorSize() {
    const r = actor.getBoundingClientRect();
    return { w: r.width || 132, h: r.height || 176 };
  }

  function groundY() {
    const { h } = actorSize();
    return innerHeight - h - Math.max(16, innerHeight * .027);
  }

  function setFrame(frame) {
    frame = clamp(frame | 0, 0, 3);
    if (frame === lastFrame) return;
    lastFrame = frame;
    sheet.style.transform = `translate3d(${-frame * 25}%,0,0)`;
  }

  function setFacing(dir) {
    if (Math.abs(dir) < .01) return;
    const face = BASE_ART_FACES_LEFT ? (dir > 0 ? -1 : 1) : (dir > 0 ? 1 : -1);
    flip.style.setProperty('--elfo-face', String(face));
  }

  function setPos(nx, ny) {
    x = nx;
    y = ny;
    actor.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
  }

  function setBody(bob = 0, tilt = 0, sx = 1, sy = 1) {
    visual.style.setProperty('--elfo-bob', `${bob.toFixed(2)}px`);
    visual.style.setProperty('--elfo-tilt', `${tilt.toFixed(2)}deg`);
    visual.style.setProperty('--elfo-sx', sx.toFixed(4));
    visual.style.setProperty('--elfo-sy', sy.toFixed(4));
  }

  function idlePose(now) {
    const t = now * .0019 + idleSeed;
    const breath = Math.sin(t);
    const sway = Math.sin(t * .53) * .32;
    setFrame(0);
    setBody(-.65 - breath * .55, sway, 1 + breath * .0028, 1 - breath * .0028);
    shadow.style.transform = `scaleX(${(1 + breath * .012).toFixed(3)})`;
    shadow.style.opacity = '.52';
  }

  function walkingPose(delta, speed) {
    const stride = clamp(30 - Math.abs(speed) * .018, 22, 29);
    gaitPhase = (gaitPhase + (Math.abs(delta) / stride) * TAU) % TAU;

    // Four drawn frames, but body motion interpolates every RAF so the walk no longer feels stepped.
    const phase01 = (gaitPhase / TAU + .03) % 1;
    const frame = Math.floor(phase01 * 4) % 4;
    setFrame(frame);

    const footLift = Math.abs(Math.sin(gaitPhase));
    const side = Math.sin(gaitPhase * .5);
    const speed01 = clamp(Math.abs(speed) / 245, 0, 1);
    const bob = -(.8 + footLift * (2.2 + speed01 * 1.35));
    const tilt = clamp(-speed / 245 * 1.15 + side * .22, -1.45, 1.45);
    const compress = Math.cos(gaitPhase * 2) * .0055 * speed01;
    setBody(bob, tilt, 1 - compress, 1 + compress);

    shadow.style.transform = `scaleX(${(1 - footLift * (.055 + speed01 * .035)).toFixed(3)})`;
    shadow.style.opacity = String(.54 - footLift * .055);
  }

  function setMoving(moving, running = false) {
    actor.classList.toggle('is-moving', moving);
    actor.classList.toggle('is-running', running && moving);
  }

  function hop() {
    const now = performance.now();
    if (state !== 'roam' || now - lastHopAt < 1100) return;
    lastHopAt = now;
    actor.classList.remove('is-hopping');
    void actor.offsetWidth;
    actor.classList.add('is-hopping');
    setTimeout(() => actor.classList.remove('is-hopping'), reduceMotion ? 180 : 620);
  }

  function updateRoam(now) {
    const dt = Math.min(.032, Math.max(.001, (now - lastTime) / 1000));
    lastTime = now;
    const { w } = actorSize();
    y = groundY();

    const pointerActive = pointerSeen && now - lastPointerAt < 4200;
    const leftBound = Math.max(16, innerWidth * .052);
    const rightBound = Math.max(leftBound, innerWidth - w - Math.max(16, innerWidth * .052));

    if (pointerActive) {
      targetX = clamp(pointerX - w * .5, 10, innerWidth - w - 10);
    } else if (Math.abs(targetX - x) < 15 || targetX < leftBound - 1 || targetX > rightBound + 1) {
      autoDir *= -1;
      targetX = autoDir > 0 ? rightBound : leftBound;
    }

    const dx = targetX - x;
    const deadZone = pointerActive ? 7 : 11;
    let desiredV = 0;
    if (Math.abs(dx) > deadZone) {
      const maxSpeed = pointerActive ? 228 : 96;
      const minSpeed = pointerActive ? 42 : 38;
      const distanceSpeed = Math.sqrt(Math.abs(dx)) * (pointerActive ? 14.5 : 8.6);
      desiredV = Math.sign(dx) * clamp(distanceSpeed, minSpeed, maxSpeed);
    }

    // Exponential velocity smoothing gives a small amount of inertia without floaty overshoot.
    const responsiveness = desiredV === 0 ? 10.5 : (Math.sign(desiredV) === Math.sign(vx) ? 7.6 : 12.0);
    const blend = 1 - Math.exp(-responsiveness * dt);
    vx = lerp(vx, desiredV, blend);
    if (Math.abs(vx) < 2.2 && desiredV === 0) vx = 0;

    let delta = vx * dt;
    if (desiredV !== 0 && Math.sign(delta) === Math.sign(dx) && Math.abs(delta) > Math.abs(dx)) {
      delta = dx;
      vx = 0;
    }

    x = clamp(x + delta, 8, innerWidth - w - 8);
    const moving = Math.abs(vx) > 7 && Math.abs(delta) > .02;
    setMoving(moving, Math.abs(vx) > 165);

    if (moving) {
      setFacing(vx);
      walkingPose(delta, vx);
    } else {
      idlePose(now);
    }
    setPos(x, y);
  }

  function loop(now) {
    if (state === 'roam') updateRoam(now);
    requestAnimationFrame(loop);
  }

  function animate(ms, update, easing = t => t) {
    if (reduceMotion) ms = Math.min(ms, 220);
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

  async function walkTo(destX, speed = 275) {
    const startX = x;
    const distance = destX - startX;
    const absDistance = Math.abs(distance);
    if (absDistance < 2) return;

    setFacing(distance);
    setMoving(true, speed > 190);
    const duration = clamp(absDistance / speed * 1000, 360, 1700);
    let prev = startX;

    await animate(duration, (p, raw) => {
      const nx = startX + distance * p;
      const step = nx - prev;
      prev = nx;
      const pseudoSpeed = Math.abs(step) / Math.max(.008, duration / 1000 / 60) * (raw < .12 ? .72 : 1);
      x = nx;
      y = groundY();
      walkingPose(step, Math.sign(distance) * clamp(pseudoSpeed, 70, speed));
      setPos(x, y);
    }, easeInOutCubic);

    vx = 0;
    setMoving(false);
    idlePose(performance.now());
  }

  async function enterStage() {
    state = 'entering';
    const { w } = actorSize();
    y = groundY();
    x = -w - 32;
    actor.style.opacity = '0';
    setPos(x, y);
    setFacing(1);

    await animate(280, p => {
      actor.style.opacity = String(easeOutCubic(p));
    }, t => t);

    const entryX = clamp(innerWidth * .11, 24, Math.max(24, innerWidth - w - 24));
    actor.style.opacity = '1';
    await walkTo(entryX, 155);

    targetX = clamp(innerWidth * .76, 20, innerWidth - w - 20);
    autoDir = 1;
    lastTime = performance.now();
    state = 'roam';
  }

  async function leapToZipper(token) {
    const { w } = actorSize();
    const sx = x;
    const sy = y;
    const ex = innerWidth / 2 - w / 2;
    const ey = Math.max(8, innerHeight * .018);

    // Anticipation: tiny crouch before the jump.
    await animate(190, p => {
      if (token !== sequenceToken) return;
      const e = easeOutCubic(p);
      setBody(lerp(0, 4.8, e), 0, lerp(1, 1.045, e), lerp(1, .925, e));
      shadow.style.transform = `scaleX(${lerp(1, 1.10, e)})`;
    });

    setFrame(2);
    await animate(920, (p, raw) => {
      if (token !== sequenceToken) return;
      const e = easeInOutCubic(p);
      x = lerp(sx, ex, e);
      const linearY = lerp(sy, ey, e);
      const arc = Math.sin(Math.PI * raw) * Math.min(164, innerHeight * .19);
      y = linearY - arc;
      setPos(x, y);

      const lift = Math.sin(Math.PI * raw);
      const lean = Math.sin(Math.PI * raw) * (ex >= sx ? -2.0 : 2.0);
      setBody(-lift * 2.0, lean, 1 - lift * .018, 1 + lift * .024);
      shadow.style.transform = `scaleX(${1 - lift * .56})`;
      shadow.style.opacity = String(.53 - lift * .39);
      actor.style.opacity = String(1 - Math.max(0, raw - .86) * 7.1);
    }, easeOutQuint);
  }

  function updatePanelCut(sliderY, gapPx) {
    const yy = Math.round(sliderY);
    const gap = Math.round(gapPx);
    leftPanel.style.clipPath = `polygon(0 0,calc(50% - ${gap}px) 0,50% ${yy}px,50% 100%,0 100%)`;
    rightPanel.style.clipPath = `polygon(calc(50% + ${gap}px) 0,100% 0,100% 100%,50% 100%,50% ${yy}px)`;
    root.style.setProperty('--zip-y', `${yy}px`);
    root.style.setProperty('--zip-gap', `${gap}px`);
  }

  async function pullZipper(token) {
    root.classList.add('is-pulling');
    actor.style.opacity = '0';
    puller.style.opacity = '1';
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const rect = puller.getBoundingClientRect();
    const pw = rect.width || 210;
    const ph = rect.height || pw;
    const startY = Math.max(-8, innerHeight * .001);
    const endY = Math.max(170, innerHeight - ph * .72 - 24);
    const anchorX = innerWidth / 2 - pw * .815;
    updatePanelCut(0, 0);

    await animate(2050, (p, raw) => {
      if (token !== sequenceToken) return;
      const e = easeInOutCubic(p);
      const py = lerp(startY, endY, e);
      const sliderY = clamp(py + pw * .12, 0, innerHeight);
      const gapGrowth = smoothstep(clamp((e - .05) / .95, 0, 1));
      const gap = gapGrowth * Math.min(178, innerWidth * .118);
      const micro = Math.sin(raw * Math.PI * 8) * (1 - raw) * .72;

      puller.style.left = `${anchorX}px`;
      puller.style.top = `${py}px`;
      puller.style.transform = `rotate(${micro}deg)`;
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
    await walkTo(innerWidth / 2 - w / 2, 285);
    if (token !== sequenceToken) return;

    await new Promise(r => setTimeout(r, reduceMotion ? 20 : 110));
    await leapToZipper(token);
    if (token !== sequenceToken) return;

    await new Promise(r => setTimeout(r, reduceMotion ? 10 : 55));
    await pullZipper(token);
    if (token !== sequenceToken) return;

    root.classList.add('is-opening');
    puller.style.transition = 'opacity 320ms ease, transform 620ms cubic-bezier(.16,.84,.24,1)';
    puller.style.opacity = '0';
    puller.style.transform += ' translateY(28px) scale(.95)';

    await new Promise(r => setTimeout(r, reduceMotion ? 260 : 1120));
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
    if (state === 'done') return;
    const { w } = actorSize();
    x = clamp(x, -w - 40, innerWidth - w - 8);
    y = groundY();
    setPos(x, y);
  }, { passive: true });

  requestAnimationFrame(() => {
    setFrame(0);
    setFacing(1);
    requestAnimationFrame(loop);
    enterStage();
  });
})();
