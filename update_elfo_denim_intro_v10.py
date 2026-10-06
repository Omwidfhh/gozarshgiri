#!/usr/bin/env python3
from __future__ import annotations
import re, shutil, subprocess
from datetime import datetime
from pathlib import Path

CSS_CONTENT = r'''/* Royal Jeans — Elfo Denim Intro V10 (original assets, 15-step walk, 5-step jump) */
html.elfo-intro-active,
html.elfo-intro-active body { overflow: hidden !important; }

#elfoIntroV3 {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  overflow: hidden;
  direction: ltr;
  user-select: none;
  touch-action: none;
  isolation: isolate;
  --zip-y: 0px;
  --zip-gap: 0px;
  background: #06101a;
}
#elfoIntroV3[hidden] { display: none !important; }

.elfo-v3-reveal {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 26%, rgba(255,214,150,.18), transparent 24%),
    linear-gradient(180deg, #07121d 0%, #091727 48%, #06101a 100%);
}

.elfo-v3-panel {
  position: absolute;
  inset: -2px;
  z-index: 5;
  background-image: url('/static/denim-zip-v3.png?v=3');
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  filter: saturate(1.03) contrast(1.035) brightness(.96);
  will-change: clip-path, transform, filter;
  transition:
    transform 1100ms cubic-bezier(.72,.01,.18,1),
    filter 600ms ease;
}
.elfo-v3-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 4%, rgba(255,255,255,.09), transparent 32%),
    radial-gradient(ellipse at 50% 108%, rgba(0,0,0,.22), transparent 50%),
    linear-gradient(115deg, transparent 25%, rgba(255,255,255,.018) 43%, transparent 61%);
  mix-blend-mode: screen;
}

.elfo-v3-left  { clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%); }
.elfo-v3-right { clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%); }

#elfoIntroV3.is-opening .elfo-v3-left {
  transform: translate3d(-104%, 0, 0) rotate(-.42deg);
  filter: brightness(.78) saturate(.98);
}
#elfoIntroV3.is-opening .elfo-v3-right {
  transform: translate3d(104%, 0, 0) rotate(.42deg);
  filter: brightness(.78) saturate(.98);
}

.elfo-v3-open-light {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 4;
  width: calc(var(--zip-gap) * 2 + 4px);
  height: calc(var(--zip-y) + 10px);
  transform: translateX(-50%);
  opacity: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255,224,166,.26), rgba(255,255,255,.09) 38%, rgba(85,168,227,.03));
  box-shadow:
    0 0 18px rgba(255,213,135,.18),
    0 0 50px rgba(82,163,222,.08);
  transition: opacity 180ms ease;
}
#elfoIntroV3.is-pulling .elfo-v3-open-light { opacity: 1; }

.elfo-v3-vignette {
  position: absolute;
  inset: 0;
  z-index: 9;
  pointer-events: none;
  box-shadow:
    inset 0 0 170px rgba(0,4,10,.72),
    inset 0 -84px 120px rgba(0,0,0,.24);
  transition: opacity 420ms ease;
}
#elfoIntroV3.is-opening .elfo-v3-vignette { opacity: 0; }

.elfo-v3-brand {
  position: absolute;
  top: 22px;
  left: 25px;
  z-index: 14;
  color: rgba(232,226,201,.60);
  font: 800 9px/1.2 system-ui, sans-serif;
  letter-spacing: .25em;
  text-shadow: 0 2px 8px rgba(0,0,0,.8);
  pointer-events: none;
}
.elfo-v3-brand::before {
  content: '';
  display: inline-block;
  width: 21px;
  height: 1px;
  margin-right: 8px;
  vertical-align: middle;
  background: rgba(224,181,91,.58);
}

.elfo-v3-character {
  position: absolute;
  z-index: 30;
  width: clamp(104px, 9vw, 150px);
  aspect-ratio: 543 / 724;
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  will-change: transform, opacity;
}
.elfo-v3-character:focus-visible {
  outline: 2px solid rgba(235,193,99,.95);
  outline-offset: 7px;
  border-radius: 16px;
}

.elfo-v3-shadow {
  position: absolute;
  z-index: 0;
  left: 13%;
  right: 13%;
  bottom: -1.2%;
  height: 6.5%;
  border-radius: 50%;
  background: rgba(0,0,0,.52);
  filter: blur(5px);
  transform-origin: center;
  will-change: transform, opacity;
  pointer-events: none;
}
.elfo-v3-flip {
  position: absolute;
  inset: 0;
  z-index: 2;
  transform: scaleX(var(--elfo-face,1));
  transform-origin: 50% 88%;
  will-change: transform;
}
.elfo-v3-visual {
  position: absolute;
  inset: 0;
  transform-origin: 50% 92%;
  will-change: transform, opacity;
}
.elfo-v3-frame-window {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  filter: drop-shadow(0 8px 8px rgba(0,0,0,.38));
  will-change: transform, filter;
}
.elfo-v3-sheet {
  position: absolute;
  top: 0;
  left: 0;
  width: 400%;
  max-width: none !important;
  height: 100%;
  object-fit: fill;
  transform: translate3d(0,0,0);
  transform-origin: 0 0;
  will-change: transform;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}
.elfo-v3-character.is-moving .elfo-v3-frame-window { filter: drop-shadow(0 9px 9px rgba(0,0,0,.42)); }
.elfo-v3-character.is-running .elfo-v3-frame-window { filter: drop-shadow(0 10px 11px rgba(0,0,0,.46)); }

.elfo-v3-puller {
  position: absolute;
  z-index: 36;
  width: clamp(150px, 15.4vw, 235px);
  height: auto;
  display: none;
  opacity: 0;
  pointer-events: none;
  filter: drop-shadow(0 14px 12px rgba(0,0,0,.44));
  transform-origin: 81.5% 8.5%;
  will-change: left, top, transform, opacity;
}
#elfoIntroV3.is-pulling .elfo-v3-puller { display: block; }

.elfo-v3-hint {
  position: absolute;
  z-index: 16;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  color: rgba(238,240,241,.61);
  font: 650 11px/1.4 system-ui, sans-serif;
  letter-spacing: .025em;
  text-shadow: 0 2px 9px rgba(0,0,0,.82);
  pointer-events: none;
  opacity: 0;
  animation: elfoV10HintIn .7s 1s ease forwards;
  transition: opacity 220ms ease;
}
#elfoIntroV3.is-sequencing .elfo-v3-hint { opacity: 0 !important; }

@keyframes elfoV10HintIn {
  from { opacity: 0; transform: translate(-50%,7px); }
  to   { opacity: .66; transform: translate(-50%,0); }
}

@media (max-width: 700px) {
  .elfo-v3-character { width: clamp(92px, 24vw, 122px); }
  .elfo-v3-puller { width: clamp(140px, 38vw, 188px); }
  .elfo-v3-brand { top: 15px; left: 15px; font-size: 8px; }
  .elfo-v3-hint { bottom: 12px; font-size: 10px; }
}
'''

JS_CONTENT = r'''(() => {
  'use strict';

  const root = document.getElementById('elfoIntroV3');
  if (!root) return;

  const leftPanel = root.querySelector('.elfo-v3-left');
  const rightPanel = root.querySelector('.elfo-v3-right');
  const actor = root.querySelector('#elfoV3Character');
  const flip = actor.querySelector('.elfo-v3-flip');
  const visual = actor.querySelector('.elfo-v3-visual');
  const frameWindow = actor.querySelector('.elfo-v3-frame-window');
  const sheet = actor.querySelector('.elfo-v3-sheet');
  const shadow = actor.querySelector('.elfo-v3-shadow');
  const puller = root.querySelector('#elfoV3Puller');

  document.documentElement.classList.add('elfo-intro-active');

  const BASE_ART_FACES_LEFT = true;
  const STEP_DISTANCE = 52;
  const WALK_POSES = [
    { frame: 0, bob: 0.0, tilt: -1.4, sx: 1.00, sy: 1.00, shadow: 1.00, shadowO: .54 },
    { frame: 0, bob: 1.1, tilt: -1.1, sx: .997, sy: 1.003, shadow: .975, shadowO: .50 },
    { frame: 1, bob: 2.0, tilt: -.6, sx: .995, sy: 1.007, shadow: .95, shadowO: .47 },
    { frame: 1, bob: 3.0, tilt: -.2, sx: .995, sy: 1.008, shadow: .92, shadowO: .44 },
    { frame: 2, bob: 4.2, tilt: .4, sx: .996, sy: 1.006, shadow: .88, shadowO: .40 },
    { frame: 2, bob: 5.0, tilt: 1.0, sx: .999, sy: 1.002, shadow: .86, shadowO: .38 },
    { frame: 3, bob: 5.6, tilt: 1.6, sx: 1.002, sy: .998, shadow: .84, shadowO: .36 },
    { frame: 3, bob: 5.0, tilt: 1.2, sx: 1.004, sy: .996, shadow: .86, shadowO: .38 },
    { frame: 2, bob: 4.1, tilt: .5, sx: 1.002, sy: .998, shadow: .89, shadowO: .40 },
    { frame: 2, bob: 3.2, tilt: -.1, sx: 1.000, sy: 1.000, shadow: .92, shadowO: .43 },
    { frame: 1, bob: 2.4, tilt: -.7, sx: .998, sy: 1.002, shadow: .95, shadowO: .46 },
    { frame: 1, bob: 1.6, tilt: -1.2, sx: .998, sy: 1.002, shadow: .97, shadowO: .49 },
    { frame: 0, bob: 1.0, tilt: -1.6, sx: .999, sy: 1.001, shadow: .99, shadowO: .52 },
    { frame: 0, bob: 0.4, tilt: -1.5, sx: 1.000, sy: 1.000, shadow: 1.00, shadowO: .54 },
    { frame: 0, bob: 0.0, tilt: -1.4, sx: 1.000, sy: 1.000, shadow: 1.00, shadowO: .54 }
  ];
  const JUMP_POSES = [
    { t: 0.00, frame: 1, tx: 0.00, ty: 0.00, rot: -4.0, sx: 1.05, sy: .93, shadow: 1.08, shadowO: .55, opacity: 1 },
    { t: 0.18, frame: 2, tx: 0.10, ty: -0.18, rot: -8.5, sx: .98, sy: 1.03, shadow: .84, shadowO: .43, opacity: 1 },
    { t: 0.46, frame: 3, tx: 0.46, ty: -1.00, rot: -1.0, sx: 1.00, sy: 1.00, shadow: .58, shadowO: .26, opacity: 1 },
    { t: 0.74, frame: 2, tx: 0.80, ty: -0.56, rot: 6.2, sx: 1.01, sy: .99, shadow: .73, shadowO: .33, opacity: .98 },
    { t: 1.00, frame: 1, tx: 1.00, ty: 0.00, rot: 0.0, sx: 1.00, sy: 1.00, shadow: 1.00, shadowO: .08, opacity: 0 }
  ];

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
  let walkDistance = 0;
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
    setFrame(0);
    visual.style.transform = '';
    frameWindow.style.transform = '';
    shadow.style.transform = 'scaleX(1)';
    shadow.style.opacity = '.54';
    actor.style.opacity = '1';
  }

  function sampleWalkPose(progress) {
    const count = WALK_POSES.length;
    const scaled = progress * count;
    const idx = Math.floor(scaled) % count;
    const next = (idx + 1) % count;
    const t = scaled - Math.floor(scaled);
    const a = WALK_POSES[idx];
    const b = WALK_POSES[next];
    return {
      frame: a.frame,
      bob: lerp(a.bob, b.bob, t),
      tilt: lerp(a.tilt, b.tilt, t),
      sx: lerp(a.sx, b.sx, t),
      sy: lerp(a.sy, b.sy, t),
      shadow: lerp(a.shadow, b.shadow, t),
      shadowO: lerp(a.shadowO, b.shadowO, t)
    };
  }

  function applyWalkPose(speed, delta) {
    walkDistance += Math.abs(delta);
    const progress = (walkDistance % STEP_DISTANCE) / STEP_DISTANCE;
    const pose = sampleWalkPose(progress);
    const runFactor = clamp(Math.abs(speed) / 230, 0, 1);
    setFrame(pose.frame);
    visual.style.transform = `translateY(${-pose.bob.toFixed(2)}px) rotate(${(pose.tilt + runFactor * .9 * Math.sign(speed)).toFixed(2)}deg) scale(${pose.sx.toFixed(3)},${pose.sy.toFixed(3)})`;
    frameWindow.style.transform = `translateY(${(-pose.bob * .18).toFixed(2)}px)`;
    shadow.style.transform = `scaleX(${(pose.shadow - runFactor * .04).toFixed(3)})`;
    shadow.style.opacity = String(Math.max(.28, pose.shadowO - runFactor * .04));
  }

  function applyIdlePose(dt) {
    idleClock += dt;
    const breathe = Math.sin(idleClock * 2.2);
    const sway = Math.sin(idleClock * 1.15);
    visual.style.transform = `translateY(${(-Math.max(0, breathe) * 1.0).toFixed(2)}px) rotate(${(sway * .6).toFixed(2)}deg)`;
    frameWindow.style.transform = '';
    setFrame(0);
    shadow.style.transform = `scaleX(${(1 - Math.abs(breathe) * .02).toFixed(3)})`;
    shadow.style.opacity = String(.53 - Math.abs(breathe) * .02);
  }

  function sampleJumpPose(raw) {
    for (let i = 0; i < JUMP_POSES.length - 1; i++) {
      const a = JUMP_POSES[i];
      const b = JUMP_POSES[i + 1];
      if (raw >= a.t && raw <= b.t) {
        const t = (raw - a.t) / (b.t - a.t || 1);
        const s = smooth(t);
        return {
          frame: t < .5 ? a.frame : b.frame,
          tx: lerp(a.tx, b.tx, s),
          ty: lerp(a.ty, b.ty, s),
          rot: lerp(a.rot, b.rot, s),
          sx: lerp(a.sx, b.sx, s),
          sy: lerp(a.sy, b.sy, s),
          shadow: lerp(a.shadow, b.shadow, s),
          shadowO: lerp(a.shadowO, b.shadowO, s),
          opacity: lerp(a.opacity, b.opacity, s)
        };
      }
    }
    const last = JUMP_POSES[JUMP_POSES.length - 1];
    return last;
  }

  function updateRoam(now) {
    const dt = Math.min(.034, Math.max(.001, (now - lastTime) / 1000));
    lastTime = now;
    const { w } = actorSize();
    y = groundY();

    const pointerActive = pointerSeen && (now - lastPointerAt < 4600);
    const leftBound = Math.max(14, innerWidth * .055);
    const rightBound = Math.max(leftBound, innerWidth - w - Math.max(14, innerWidth * .055));

    if (pointerActive) targetX = clamp(pointerX - w * .5, 10, innerWidth - w - 10);
    else if (Math.abs(targetX - x) < 12 || targetX < leftBound - 1 || targetX > rightBound + 1) {
      autoDir *= -1;
      targetX = autoDir > 0 ? rightBound : leftBound;
    }

    const dx = targetX - x;
    const deadZone = pointerActive ? 6 : 8;
    let desiredV = 0;
    if (Math.abs(dx) > deadZone) {
      const maxSpeed = pointerActive ? 225 : 108;
      const minSpeed = pointerActive ? 70 : 54;
      desiredV = Math.sign(dx) * clamp(minSpeed + Math.abs(dx) * 1.42, minSpeed, maxSpeed);
    }

    const accelerating = Math.sign(desiredV) === Math.sign(vx) && Math.abs(desiredV) > Math.abs(vx);
    vx = moveToward(vx, desiredV, (desiredV === 0 ? 860 : (accelerating ? 540 : 940)) * dt);

    let delta = vx * dt;
    if (desiredV !== 0 && Math.sign(delta) === Math.sign(dx) && Math.abs(delta) > Math.abs(dx)) {
      delta = dx;
      vx = 0;
    }

    x = clamp(x + delta, 8, innerWidth - w - 8);
    const moving = Math.abs(vx) > 8 && Math.abs(delta) > .05;

    actor.classList.toggle('is-moving', moving);
    actor.classList.toggle('is-running', moving && Math.abs(vx) > 176);
    if (moving) {
      setFacing(vx);
      applyWalkPose(vx, delta);
    } else {
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

  async function hoverHop() {
    if (hoverHopBusy || state !== 'roam') return;
    hoverHopBusy = true;
    const startY = y;
    await animate(440, (p, raw) => {
      const arc = Math.sin(Math.PI * raw) * 18;
      const pose = sampleJumpPose(Math.min(.8, raw * .8));
      setFrame(pose.frame);
      visual.style.transform = `translateY(${-arc.toFixed(2)}px) rotate(${(pose.rot * .35).toFixed(2)}deg) scale(${pose.sx.toFixed(3)},${pose.sy.toFixed(3)})`;
      shadow.style.transform = `scaleX(${(1 - Math.sin(Math.PI * raw) * .26).toFixed(3)})`;
      shadow.style.opacity = String(.54 - Math.sin(Math.PI * raw) * .18);
      setPos(x, startY);
    });
    resetPose();
    hoverHopBusy = false;
  }

  async function walkTo(destX, speed = 316) {
    const startX = x;
    const distance = destX - startX;
    const absDistance = Math.abs(distance);
    if (absDistance < 2) return;
    setFacing(distance);
    actor.classList.add('is-moving', 'is-running');
    const duration = clamp(absDistance / speed * 1000, 260, 1500);
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
    actor.classList.remove('is-running');
    resetPose();
  }

  async function leapToZipper(token) {
    const { w } = actorSize();
    const sx = x;
    const sy = y;
    const ex = innerWidth / 2 - w / 2;
    const ey = Math.max(8, innerHeight * .018);
    await animate(980, (p, raw) => {
      if (token !== sequenceToken) return;
      const pose = sampleJumpPose(raw);
      const e = easeOutQuint(p);
      const arc = Math.sin(Math.PI * raw) * Math.min(154, innerHeight * .18);
      x = lerp(sx, ex, e);
      y = lerp(sy, ey, e) - arc;
      setFrame(pose.frame);
      visual.style.transform = `translateY(${(-arc * .055 - pose.ty * 6).toFixed(2)}px) rotate(${pose.rot.toFixed(2)}deg) scale(${pose.sx.toFixed(3)},${pose.sy.toFixed(3)})`;
      frameWindow.style.transform = `translateY(${(-arc * .015).toFixed(2)}px)`;
      shadow.style.transform = `scaleX(${pose.shadow.toFixed(3)})`;
      shadow.style.opacity = String(pose.shadowO);
      actor.style.opacity = String(pose.opacity);
      setPos(x, y);
    });
  }

  function updatePanelCut(sliderY, gapPx) {
    const yy = Math.round(sliderY);
    const gap = Math.round(gapPx);
    root.style.setProperty('--zip-y', `${yy}px`);
    root.style.setProperty('--zip-gap', `${gap}px`);
    leftPanel.style.clipPath = `polygon(0 0, calc(50% - ${gap}px) 0, 50% ${yy}px, 50% 100%, 0 100%)`;
    rightPanel.style.clipPath = `polygon(calc(50% + ${gap}px) 0, 100% 0, 100% 100%, 50% 100%, 50% ${yy}px)`;
  }

  async function pullZipper(token) {
    root.classList.add('is-pulling');
    puller.style.opacity = '0';
    puller.style.display = 'block';
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const rect = puller.getBoundingClientRect();
    const pw = rect.width || 200;
    const ph = rect.height || pw;
    const startY = Math.max(-8, innerHeight * .001);
    const endY = Math.max(168, innerHeight - ph * .72 - 24);
    const anchorX = innerWidth / 2 - pw * .815;

    updatePanelCut(0, 0);

    await animate(1900, (p, raw) => {
      if (token !== sequenceToken) return;
      const e = easeInOut(p);
      const py = lerp(startY, endY, e);
      const sliderY = clamp(py + pw * .12, 0, innerHeight);
      const gap = Math.sin(e * Math.PI / 2) * Math.min(156, innerWidth * .108);
      const sway = Math.sin(raw * Math.PI * 2.2) * (1.1 - e * .5);
      puller.style.left = `${anchorX}px`;
      puller.style.top = `${py}px`;
      puller.style.opacity = String(Math.min(1, p * 8));
      puller.style.transform = `rotate(${sway.toFixed(2)}deg)`;
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

    await walkTo(innerWidth / 2 - w / 2, 332);
    if (token !== sequenceToken) return;
    await new Promise(r => setTimeout(r, 90));
    await leapToZipper(token);
    if (token !== sequenceToken) return;
    await new Promise(r => setTimeout(r, 60));
    await pullZipper(token);
    if (token !== sequenceToken) return;

    root.classList.add('is-opening');
    puller.style.transition = 'opacity 300ms ease, transform 520ms cubic-bezier(.2,.8,.2,1)';
    puller.style.opacity = '0';
    puller.style.transform += ' translateY(28px)';
    await new Promise(r => setTimeout(r, 1080));
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
'''


def fail(msg: str, code: int = 1):
    print(f'ERROR: {msg}')
    raise SystemExit(code)


def main():
    root = Path.cwd()
    frontend = root / 'frontend'
    if not frontend.is_dir():
        fail('این فایل را باید داخل ریشه پروژه اجرا کنی؛ پوشه frontend پیدا نشد.')

    index_path = frontend / 'index.html'
    css_path = frontend / 'elfo-intro-v3.css'
    js_path = frontend / 'elfo-intro-v3.js'
    for p in (index_path, css_path, js_path):
        if not p.exists():
            fail(f'فایل مورد نیاز پیدا نشد: {p}')

    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = root / f'_backup_elfo_intro_v10_{stamp}'
    backup_dir.mkdir(parents=True, exist_ok=True)
    for p in (index_path, css_path, js_path):
        shutil.copy2(p, backup_dir / p.name)

    css_path.write_text(CSS_CONTENT, encoding='utf-8', newline='\n')
    js_path.write_text(JS_CONTENT, encoding='utf-8', newline='\n')

    index_text = index_path.read_text(encoding='utf-8')
    new_text = re.sub(r'(/static/elfo-intro-v3\.css\?v=)([^"\']+)', r'\g<1>10', index_text)
    new_text = re.sub(r'(/static/elfo-intro-v3\.js\?v=)([^"\']+)', r'\g<1>10', new_text)
    if new_text != index_text:
        index_path.write_text(new_text, encoding='utf-8', newline='\n')
    else:
        print('WARNING: نسخه intro در index.html پیدا نشد؛ فایل‌های CSS/JS جایگزین شدند.')

    try:
        result = subprocess.run(['node', '--check', str(js_path)], capture_output=True, text=True)
        if result.returncode != 0:
            fail('فایل JS جدید خطای syntax دارد:\n' + result.stderr)
    except FileNotFoundError:
        print('NOTE: node در این محیط پیدا نشد؛ چک syntax جاوااسکریپت انجام نشد.')

    print('DONE: Elfo intro V10 applied.')
    print('Walk cycle: 15-step logical animation using original Elfo sprite.')
    print('Jump cycle: 5-step logical animation for leap to zipper.')
    print(f'Backup: {backup_dir}')
    print('Changed files:')
    print(f'- {css_path}')
    print(f'- {js_path}')
    print(f'- {index_path}')
    print('Only intro files changed. No report or tool logic was touched.')


if __name__ == '__main__':
    main()
