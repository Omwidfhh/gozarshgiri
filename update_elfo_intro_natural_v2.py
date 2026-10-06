#!/usr/bin/env python3
from __future__ import annotations
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

CSS_CONTENT = r'''/* Royal Jeans — Elfo Cinematic Intro V4.5 */
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
  --zip-progress: 0;
  --zip-metal: #c0c7cf;
  --zip-metal-hi: #eef2f6;
  --zip-metal-lo: #6d747d;
  --zip-shadow: rgba(0,0,0,.42);
  --teeth-opacity: 1;
  background:
    radial-gradient(ellipse at 50% 16%, rgba(255,255,255,.10), transparent 33%),
    radial-gradient(ellipse at 50% 120%, rgba(3, 10, 19, .66), transparent 56%),
    linear-gradient(180deg, #0a1520 0%, #08111a 36%, #050d15 100%);
}
#elfoIntroV3[hidden] { display: none !important; }

#elfoIntroV3::before,
#elfoIntroV3::after {
  content: '';
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 11px;
  pointer-events: none;
  z-index: 12;
  opacity: calc(var(--teeth-opacity) * .96);
  border-radius: 2px;
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.08),
    inset 0 1px 0 rgba(255,255,255,.22),
    0 0 0 1px rgba(0,0,0,.12),
    0 2px 6px rgba(0,0,0,.18);
  background:
    linear-gradient(90deg, rgba(0,0,0,.16), transparent 15%, transparent 82%, rgba(0,0,0,.22)),
    repeating-linear-gradient(
      180deg,
      var(--zip-metal-hi) 0 4px,
      #dce2e8 4px 7px,
      var(--zip-metal-lo) 7px 8px,
      transparent 8px 14px
    );
  transform-origin: top center;
  will-change: left, right, transform, opacity, height;
}
#elfoIntroV3::before {
  left: calc(50% - var(--zip-gap) - 11px);
  transform: translateX(-1px) skewY(.5deg);
}
#elfoIntroV3::after {
  left: calc(50% + var(--zip-gap));
  transform: translateX(1px) skewY(-.5deg);
}

.elfo-v3-reveal {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: .46;
  background:
    radial-gradient(circle at 50% 24%, rgba(255, 214, 134, .20), transparent 17%),
    linear-gradient(115deg, transparent 0 25%, rgba(255,255,255,.04) 38%, transparent 54%),
    linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.28));
}

.elfo-v3-panel {
  position: absolute;
  inset: -2px;
  z-index: 5;
  background-image:
    linear-gradient(90deg, rgba(0,8,15,.12), transparent 18%, transparent 82%, rgba(0,8,15,.14)),
    linear-gradient(180deg, rgba(255,255,255,.045), transparent 18%, transparent 80%, rgba(0,0,0,.18)),
    url('/static/denim-zip-v3.png?v=3');
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  filter: saturate(1.08) contrast(1.07) brightness(.94);
  will-change: clip-path, transform, filter;
  transition: transform 1200ms cubic-bezier(.74,0,.15,1), filter 620ms ease;
}
.elfo-v3-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 12%, rgba(255,255,255,.10), transparent 33%),
    radial-gradient(ellipse at 50% 108%, rgba(0,0,0,.24), transparent 54%),
    linear-gradient(115deg, transparent 27%, rgba(255,255,255,.026) 43%, transparent 58%),
    linear-gradient(180deg, rgba(0,0,0,.06), transparent 16%, transparent 84%, rgba(0,0,0,.16));
  mix-blend-mode: screen;
}
.elfo-v3-panel::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 26px;
  pointer-events: none;
  opacity: .96;
  background:
    linear-gradient(90deg, rgba(0,0,0,.24), rgba(255,255,255,.08) 30%, rgba(255,255,255,.03) 56%, rgba(0,0,0,.16) 100%),
    linear-gradient(180deg, rgba(255,255,255,.05), transparent 16%, transparent 84%, rgba(0,0,0,.18));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), inset 0 0 14px rgba(0,0,0,.24);
}
.elfo-v3-left { clip-path: polygon(0 0, calc(50% - 5px) 0, calc(50% - 5px) 100%, 0 100%); }
.elfo-v3-right { clip-path: polygon(calc(50% + 5px) 0, 100% 0, 100% 100%, calc(50% + 5px) 100%); }
.elfo-v3-left::after { right: calc(50% - 13px); }
.elfo-v3-right::after { left: calc(50% - 13px); }
#elfoIntroV3.is-opening .elfo-v3-left {
  transform: translate3d(calc(-101% - var(--zip-gap) * .26),0,0) rotate(-1.05deg);
  filter: brightness(.72) saturate(.94);
}
#elfoIntroV3.is-opening .elfo-v3-right {
  transform: translate3d(calc(101% + var(--zip-gap) * .26),0,0) rotate(1.05deg);
  filter: brightness(.72) saturate(.94);
}

.elfo-v3-open-light {
  position: absolute;
  z-index: 4;
  top: 0;
  left: 50%;
  width: calc(var(--zip-gap) * 2 + 6px);
  height: calc(var(--zip-y) + 12px);
  transform: translateX(-50%);
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(180deg, rgba(255, 214, 142, .25), rgba(255,255,255,.10) 45%, rgba(125,204,255,.04));
  box-shadow:
    0 0 18px 4px rgba(255,203,111,.24),
    0 0 58px 14px rgba(62,168,230,.08);
  transition: opacity 180ms ease;
}
#elfoIntroV3.is-pulling .elfo-v3-open-light { opacity: 1; }

.elfo-v3-vignette {
  position: absolute;
  inset: 0;
  z-index: 9;
  pointer-events: none;
  box-shadow:
    inset 0 0 180px rgba(0,4,10,.74),
    inset 0 -90px 120px rgba(0,0,0,.28);
  transition: opacity 500ms ease;
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
  width: clamp(108px, 9vw, 154px);
  aspect-ratio: 543/724;
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
  filter: blur(6px);
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
  will-change: transform;
}
.elfo-v3-frame-window {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  filter: drop-shadow(0 8px 8px rgba(0,0,0,.38));
  will-change: filter;
}
.elfo-v3-sheet {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
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
  image-rendering: auto;
}
.elfo-v3-character.is-moving .elfo-v3-frame-window { filter: drop-shadow(0 9px 10px rgba(0,0,0,.42)); }
.elfo-v3-character.is-running .elfo-v3-frame-window { filter: drop-shadow(0 11px 12px rgba(0,0,0,.47)); }
.elfo-v3-character.is-hopping .elfo-v3-visual { animation: elfoV4Hop 650ms cubic-bezier(.18,.74,.18,1); }
.elfo-v3-character.is-hopping .elfo-v3-shadow { animation: elfoV4ShadowHop 650ms cubic-bezier(.18,.74,.18,1); }

.elfo-v3-puller {
  position: absolute;
  z-index: 35;
  width: clamp(156px, 15.7vw, 246px);
  height: auto;
  display: none;
  opacity: 0;
  pointer-events: none;
  filter: drop-shadow(0 14px 12px rgba(0,0,0,.46));
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
  animation: elfoV4HintIn .7s 1s ease forwards;
  transition: opacity 220ms ease;
}
#elfoIntroV3.is-sequencing .elfo-v3-hint { opacity: 0 !important; }

@keyframes elfoV4Hop {
  0% { transform: translateY(0) scale(1); }
  14% { transform: translateY(6px) scale(1.05,.93); }
  44% { transform: translateY(-38px) scale(.98,1.03); }
  74% { transform: translateY(-10px) scale(1.01,.99); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes elfoV4ShadowHop {
  0%,100% { transform: scaleX(1); opacity: .56; }
  46% { transform: scaleX(.58); opacity: .23; }
}
@keyframes elfoV4HintIn {
  from { opacity: 0; transform: translate(-50%,7px); }
  to { opacity: .66; transform: translate(-50%,0); }
}

@media (max-width: 700px) {
  .elfo-v3-character { width: clamp(92px,24vw,124px); }
  .elfo-v3-puller { width: clamp(142px,39vw,198px); }
  .elfo-v3-brand { top: 15px; left: 15px; font-size: 8px; }
  .elfo-v3-hint { bottom: 13px; font-size: 10px; }
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
'''


def fail(msg: str, code: int = 1) -> None:
    print(f"ERROR: {msg}")
    raise SystemExit(code)


def main() -> None:
    root = Path.cwd()
    frontend = root / 'frontend'
    if not frontend.is_dir():
        fail("این فایل را باید داخل ریشه پروژه اجرا کنی؛ پوشه frontend پیدا نشد.")

    index_path = frontend / 'index.html'
    css_path = frontend / 'elfo-intro-v3.css'
    js_path = frontend / 'elfo-intro-v3.js'
    for path in (index_path, css_path, js_path):
        if not path.exists():
            fail(f"فایل مورد نیاز پیدا نشد: {path}")

    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = root / f'_backup_elfo_intro_redesign_{stamp}'
    backup_dir.mkdir(parents=True, exist_ok=True)

    for path in (index_path, css_path, js_path):
        shutil.copy2(path, backup_dir / path.name)

    css_path.write_text(CSS_CONTENT, encoding='utf-8', newline='\n')
    js_path.write_text(JS_CONTENT, encoding='utf-8', newline='\n')

    index_text = index_path.read_text(encoding='utf-8')
    new_index = re.sub(r'(/static/elfo-intro-v3\.css\?v=)([^"\']+)', r'\g<1>5', index_text)
    new_index = re.sub(r'(/static/elfo-intro-v3\.js\?v=)([^"\']+)', r'\g<1>5', new_index)
    if new_index == index_text:
        print('WARNING: نسخه فایل‌های intro در index.html پیدا نشد؛ ولی فایل‌های CSS/JS جایگزین شدند.')
    else:
        index_path.write_text(new_index, encoding='utf-8', newline='\n')

    try:
        result = subprocess.run(['node', '--check', str(js_path)], capture_output=True, text=True)
        if result.returncode != 0:
            fail('فایل JS جدید خطای syntax دارد:\n' + result.stderr)
    except FileNotFoundError:
        print('NOTE: node روی این محیط پیدا نشد؛ چک syntax جاوااسکریپت رد شد.')

    print('DONE: انیمیشن Intro با نسخه طبیعی‌تر و طراحی جدید زیپ اعمال شد.')
    print(f'Backup: {backup_dir}')
    print('Changed files:')
    print(f'- {css_path}')
    print(f'- {js_path}')
    print(f'- {index_path}')

if __name__ == '__main__':
    main()
