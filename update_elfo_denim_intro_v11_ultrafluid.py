#!/usr/bin/env python3
from __future__ import annotations
import re, shutil, subprocess
from datetime import datetime
from pathlib import Path

CSS_CONTENT = r'''/* Royal Jeans — Elfo Denim Intro V11 UltraFluid */
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
.elfo-v3-sheet,
.elfo-v11-sheet-b {
  position: absolute;
  top: 0;
  left: 0;
  width: 400%;
  max-width: none !important;
  height: 100%;
  object-fit: fill;
  transform: translate3d(0,0,0);
  transform-origin: 0 0;
  will-change: transform, opacity;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  image-rendering: auto;
}
.elfo-v11-sheet-b { opacity: 0; }
.elfo-v3-character.is-moving .elfo-v3-frame-window { filter: drop-shadow(0 9px 9px rgba(0,0,0,.42)); }
.elfo-v3-character.is-running .elfo-v3-frame-window { filter: drop-shadow(0 10px 11px rgba(0,0,0,.46)); }

/* Original puller image remains the source art, but V11 slices it into moving layers. */
.elfo-v3-puller { display: none !important; }
.elfo-v11-puller-rig {
  position: absolute;
  z-index: 36;
  width: clamp(150px, 15.4vw, 235px);
  aspect-ratio: 1 / 1;
  display: none;
  opacity: 0;
  pointer-events: none;
  transform-origin: 81.5% 8.5%;
  will-change: left, top, transform, opacity;
  filter: drop-shadow(0 14px 12px rgba(0,0,0,.44));
}
#elfoIntroV3.is-pulling .elfo-v11-puller-rig { display: block; }
.elfo-v11-puller-part {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  will-change: transform, opacity;
}
.elfo-v11-puller-top {
  clip-path: inset(0 0 38% 0);
  transform-origin: 81.5% 8.5%;
}
.elfo-v11-puller-mid {
  clip-path: inset(30% 0 24% 0);
  transform-origin: 58% 48%;
}
.elfo-v11-puller-bottom {
  clip-path: inset(60% 0 0 0);
  transform-origin: 52% 67%;
}

.elfo-v3-hint {
  position: absolute;
  z-index: 16;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  color: rgba(238,240,241,.61);
  font: 650 11px/1.4 system-ui,sans-serif;
  letter-spacing: .025em;
  text-shadow: 0 2px 9px rgba(0,0,0,.82);
  pointer-events: none;
  opacity: 0;
  animation: elfoV11HintIn .7s 1s ease forwards;
  transition: opacity 220ms ease;
}
#elfoIntroV3.is-sequencing .elfo-v3-hint { opacity: 0 !important; }
@keyframes elfoV11HintIn {
  from { opacity:0; transform:translate(-50%,7px); }
  to { opacity:.66; transform:translate(-50%,0); }
}

@media (max-width:700px) {
  .elfo-v3-character { width:clamp(92px,24vw,122px); }
  .elfo-v11-puller-rig { width:clamp(140px,38vw,188px); }
  .elfo-v3-brand { top:15px; left:15px; font-size:8px; }
  .elfo-v3-hint { bottom:12px; font-size:10px; }
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
  const sheetA = actor.querySelector('.elfo-v3-sheet');
  const shadow = actor.querySelector('.elfo-v3-shadow');
  const originalPuller = root.querySelector('#elfoV3Puller');

  document.documentElement.classList.add('elfo-intro-active');

  const sheetB = sheetA.cloneNode(true);
  sheetB.removeAttribute('id');
  sheetB.classList.add('elfo-v11-sheet-b');
  frameWindow.appendChild(sheetB);

  const pullerRig = document.createElement('div');
  pullerRig.className = 'elfo-v11-puller-rig';
  const pullerSrc = originalPuller.getAttribute('src');
  const makePart = cls => {
    const img = document.createElement('img');
    img.src = pullerSrc;
    img.alt = '';
    img.draggable = false;
    img.className = `elfo-v11-puller-part ${cls}`;
    return img;
  };
  const pullerTop = makePart('elfo-v11-puller-top');
  const pullerMid = makePart('elfo-v11-puller-mid');
  const pullerBottom = makePart('elfo-v11-puller-bottom');
  pullerRig.append(pullerBottom, pullerMid, pullerTop);
  root.appendChild(pullerRig);

  const WALK_VIRTUAL_COUNT = 500;
  const JUMP_VIRTUAL_COUNT = 200;
  const ZIP_VIRTUAL_COUNT = 500;
  const BASE_ART_FACES_LEFT = true;
  const WALK_CYCLE_DISTANCE = 96;

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
  const easeInOut = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
  const moveToward = (v, t, d) => v < t ? Math.min(v + d, t) : v > t ? Math.max(v - d, t) : t;

  function frameTransform(frame) {
    return `translate3d(${-clamp(frame|0,0,3)*25}%,0,0)`;
  }

  function buildWalkFrames() {
    const frames = new Array(WALK_VIRTUAL_COUNT);
    for (let i = 0; i < WALK_VIRTUAL_COUNT; i++) {
      const p = i / WALK_VIRTUAL_COUNT;
      const sourcePhase = p * 4;
      const frameA = Math.floor(sourcePhase) % 4;
      const frameB = (frameA + 1) % 4;
      const local = sourcePhase - Math.floor(sourcePhase);
      // Crossfade is concentrated near the middle of each source transition so limbs do not ghost for long.
      const blend = smoother(clamp((local - .28) / .44, 0, 1));
      const s1 = Math.sin(p * Math.PI * 2);
      const s2 = Math.sin(p * Math.PI * 4);
      const contact = Math.abs(s1);
      frames[i] = {
        frameA,
        frameB,
        blend,
        bob: contact * 4.7 + Math.max(0, s2) * .45,
        tilt: s1 * 1.35 + s2 * .28,
        sx: 1 + Math.max(0, -s2) * .007,
        sy: 1 - Math.max(0, -s2) * .009,
        windowY: -Math.max(0, s1) * .75,
        shadowX: 1 - contact * .12,
        shadowO: .55 - contact * .12
      };
    }
    return frames;
  }

  const JUMP_KEYS = [
    { t:0.00, frameA:0, frameB:1, blend:0.00, x:0.00, arc:0.00, rot:-2.0, sx:1.045, sy:.935, shadowX:1.08, shadowO:.55, opacity:1.00 },
    { t:0.12, frameA:1, frameB:2, blend:.25, x:0.06, arc:.22, rot:-6.5, sx:.985, sy:1.035, shadowX:.91, shadowO:.46, opacity:1.00 },
    { t:0.48, frameA:2, frameB:3, blend:.60, x:.50, arc:1.00, rot:-1.2, sx:.998, sy:1.008, shadowX:.57, shadowO:.24, opacity:1.00 },
    { t:0.78, frameA:3, frameB:2, blend:.55, x:.84, arc:.55, rot:5.2, sx:1.010, sy:.990, shadowX:.73, shadowO:.34, opacity:.98 },
    { t:1.00, frameA:2, frameB:1, blend:.35, x:1.00, arc:0.00, rot:0.0, sx:1.000, sy:1.000, shadowX:1.00, shadowO:.08, opacity:0.00 }
  ];

  function interpolateJump(raw) {
    for (let i=0; i<JUMP_KEYS.length-1; i++) {
      const a=JUMP_KEYS[i], b=JUMP_KEYS[i+1];
      if (raw >= a.t && raw <= b.t) {
        const u=smoother((raw-a.t)/(b.t-a.t || 1));
        return {
          frameA: u < .52 ? a.frameA : b.frameA,
          frameB: u < .52 ? a.frameB : b.frameB,
          blend: lerp(a.blend,b.blend,u),
          x:lerp(a.x,b.x,u), arc:lerp(a.arc,b.arc,u), rot:lerp(a.rot,b.rot,u),
          sx:lerp(a.sx,b.sx,u), sy:lerp(a.sy,b.sy,u),
          shadowX:lerp(a.shadowX,b.shadowX,u), shadowO:lerp(a.shadowO,b.shadowO,u),
          opacity:lerp(a.opacity,b.opacity,u)
        };
      }
    }
    return {...JUMP_KEYS[JUMP_KEYS.length-1]};
  }

  function buildJumpFrames() {
    const frames = new Array(JUMP_VIRTUAL_COUNT);
    for (let i=0; i<JUMP_VIRTUAL_COUNT; i++) {
      frames[i] = interpolateJump(i/(JUMP_VIRTUAL_COUNT-1));
    }
    return frames;
  }

  function buildZipFrames() {
    const frames = new Array(ZIP_VIRTUAL_COUNT);
    for (let i=0; i<ZIP_VIRTUAL_COUNT; i++) {
      const p=i/(ZIP_VIRTUAL_COUNT-1);
      const e=easeInOut(p);
      const resistance=Math.sin(p*Math.PI*6) * (1-p) * .45;
      const breathing=Math.sin(p*Math.PI*4);
      frames[i]={
        progress:e,
        gap:Math.sin(e*Math.PI/2),
        rigRot:Math.sin(p*Math.PI*2.35)*(1.05-.42*e)+resistance,
        rigScaleX:1 + Math.max(0,breathing)*.006,
        rigScaleY:1 - Math.max(0,breathing)*.005,
        topX:Math.sin(p*Math.PI*3.4)*(1.2-.5*e),
        topY:-Math.max(0,Math.sin(p*Math.PI*2.0))*1.4,
        topRot:-Math.sin(p*Math.PI*2.5)*(1.8-.7*e),
        midX:Math.sin(p*Math.PI*2.1)*.65,
        midY:Math.sin(p*Math.PI*4.1)*.55,
        midRot:Math.sin(p*Math.PI*2.4)*(1.05-.3*e),
        bottomX:-Math.sin(p*Math.PI*2.0)*1.1,
        bottomY:Math.max(0,Math.sin(p*Math.PI*3.0))*1.5,
        bottomRot:Math.sin(p*Math.PI*3.2)*(2.4-1.1*e)
      };
    }
    return frames;
  }

  const WALK_FRAMES=buildWalkFrames();
  const JUMP_FRAMES=buildJumpFrames();
  const ZIP_FRAMES=buildZipFrames();

  let state='roam';
  let x=Math.max(20,innerWidth*.10), y=0, vx=0;
  let targetX=Math.max(20,innerWidth*.76), autoDir=1;
  let pointerX=targetX, pointerSeen=false, lastPointerAt=0;
  let lastTime=performance.now(), walkDistance=0, idleClock=0;
  let sequenceToken=0, hoverHopBusy=false;

  function actorSize(){const r=actor.getBoundingClientRect();return{w:r.width||125,h:r.height||167}}
  function groundY(){const{h}=actorSize();return innerHeight-h-Math.max(14,innerHeight*.025)}
  function setFacing(dir){if(Math.abs(dir)<.001)return;const face=BASE_ART_FACES_LEFT?(dir>0?-1:1):(dir>0?1:-1);flip.style.setProperty('--elfo-face',String(face))}
  function setPos(nx,ny){x=nx;y=ny;actor.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`}

  function setSpritePair(frameA, frameB, blend) {
    sheetA.style.transform=frameTransform(frameA);
    sheetB.style.transform=frameTransform(frameB);
    const b=clamp(blend,0,1);
    sheetA.style.opacity=String(1-b);
    sheetB.style.opacity=String(b);
  }

  function applyWalkVirtualFrame(index, speed) {
    const f=WALK_FRAMES[index%WALK_VIRTUAL_COUNT];
    const run=clamp(Math.abs(speed)/230,0,1);
    setSpritePair(f.frameA,f.frameB,f.blend);
    visual.style.transform=`translateY(${-f.bob.toFixed(2)}px) rotate(${(f.tilt + Math.sign(speed)*run*.7).toFixed(2)}deg) scale(${f.sx.toFixed(4)},${f.sy.toFixed(4)})`;
    frameWindow.style.transform=`translateY(${f.windowY.toFixed(2)}px)`;
    shadow.style.transform=`scaleX(${(f.shadowX-run*.035).toFixed(4)})`;
    shadow.style.opacity=String(Math.max(.28,f.shadowO-run*.035));
  }

  function applyIdlePose(dt){
    idleClock+=dt;
    const b=Math.sin(idleClock*2.15), s=Math.sin(idleClock*1.12);
    setSpritePair(0,1,0);
    visual.style.transform=`translateY(${(-Math.max(0,b)*.95).toFixed(2)}px) rotate(${(s*.55).toFixed(2)}deg)`;
    frameWindow.style.transform='';
    shadow.style.transform=`scaleX(${(1-Math.abs(b)*.018).toFixed(4)})`;
    shadow.style.opacity=String(.54-Math.abs(b)*.018);
    actor.style.opacity='1';
  }

  function resetPose(){
    setSpritePair(0,1,0);
    visual.style.transform='';frameWindow.style.transform='';
    shadow.style.transform='scaleX(1)';shadow.style.opacity='.54';actor.style.opacity='1';
  }

  function updateRoam(now){
    const dt=Math.min(.034,Math.max(.001,(now-lastTime)/1000));lastTime=now;
    const{w}=actorSize();y=groundY();
    const pointerActive=pointerSeen&&(now-lastPointerAt<4600);
    const leftBound=Math.max(14,innerWidth*.055),rightBound=Math.max(leftBound,innerWidth-w-Math.max(14,innerWidth*.055));
    if(pointerActive)targetX=clamp(pointerX-w*.5,10,innerWidth-w-10);
    else if(Math.abs(targetX-x)<12||targetX<leftBound-1||targetX>rightBound+1){autoDir*=-1;targetX=autoDir>0?rightBound:leftBound}
    const dx=targetX-x,dead=pointerActive?6:8;let desired=0;
    if(Math.abs(dx)>dead){const max=pointerActive?225:108,min=pointerActive?70:54;desired=Math.sign(dx)*clamp(min+Math.abs(dx)*1.42,min,max)}
    const accel=Math.sign(desired)===Math.sign(vx)&&Math.abs(desired)>Math.abs(vx);
    vx=moveToward(vx,desired,(desired===0?860:(accel?540:940))*dt);
    let delta=vx*dt;if(desired!==0&&Math.sign(delta)===Math.sign(dx)&&Math.abs(delta)>Math.abs(dx)){delta=dx;vx=0}
    x=clamp(x+delta,8,innerWidth-w-8);
    const moving=Math.abs(vx)>8&&Math.abs(delta)>.05;
    actor.classList.toggle('is-moving',moving);actor.classList.toggle('is-running',moving&&Math.abs(vx)>176);
    if(moving){setFacing(vx);walkDistance+=Math.abs(delta);const idx=Math.floor(((walkDistance%WALK_CYCLE_DISTANCE)/WALK_CYCLE_DISTANCE)*WALK_VIRTUAL_COUNT);applyWalkVirtualFrame(idx,vx)}
    else applyIdlePose(dt);
    setPos(x,y);
  }

  function loop(now){if(state==='roam')updateRoam(now);requestAnimationFrame(loop)}
  function animate(ms,update,easing=t=>t){return new Promise(resolve=>{const start=performance.now();const tick=now=>{const raw=clamp((now-start)/ms,0,1);update(easing(raw),raw);raw<1?requestAnimationFrame(tick):resolve()};requestAnimationFrame(tick)})}

  function applyJumpVirtualFrame(index,sx,sy,ex,ey){
    const f=JUMP_FRAMES[clamp(index,0,JUMP_VIRTUAL_COUNT-1)];
    const raw=index/(JUMP_VIRTUAL_COUNT-1);
    const arc=Math.sin(Math.PI*raw)*Math.min(158,innerHeight*.18)*f.arc;
    x=lerp(sx,ex,easeOutQuint(f.x));
    y=lerp(sy,ey,easeOutQuint(f.x))-arc;
    setSpritePair(f.frameA,f.frameB,f.blend);
    visual.style.transform=`translateY(${(-arc*.04).toFixed(2)}px) rotate(${f.rot.toFixed(2)}deg) scale(${f.sx.toFixed(4)},${f.sy.toFixed(4)})`;
    frameWindow.style.transform=`translateY(${(-arc*.012).toFixed(2)}px)`;
    shadow.style.transform=`scaleX(${f.shadowX.toFixed(4)})`;
    shadow.style.opacity=String(f.shadowO);
    actor.style.opacity=String(f.opacity);
    setPos(x,y);
  }

  async function hoverHop(){
    if(hoverHopBusy||state!=='roam')return;hoverHopBusy=true;
    const sy=y,sx=x;
    await animate(520,(p,raw)=>{const idx=Math.min(JUMP_VIRTUAL_COUNT-1,Math.floor(raw*(JUMP_VIRTUAL_COUNT-1)));const f=JUMP_FRAMES[idx];const arc=Math.sin(Math.PI*raw)*22;setSpritePair(f.frameA,f.frameB,f.blend);visual.style.transform=`translateY(${-arc.toFixed(2)}px) rotate(${(f.rot*.28).toFixed(2)}deg) scale(${f.sx.toFixed(4)},${f.sy.toFixed(4)})`;shadow.style.transform=`scaleX(${(1-Math.sin(Math.PI*raw)*.26).toFixed(4)})`;shadow.style.opacity=String(.54-Math.sin(Math.PI*raw)*.18);setPos(sx,sy)});
    resetPose();hoverHopBusy=false;
  }

  async function walkTo(destX,speed=330){
    const startX=x,distance=destX-startX,abs=Math.abs(distance);if(abs<2)return;
    setFacing(distance);actor.classList.add('is-moving','is-running');const duration=clamp(abs/speed*1000,260,1500);let prev=startX;
    await animate(duration,p=>{const nx=lerp(startX,destX,easeInOut(p));const step=nx-prev;prev=nx;x=nx;y=groundY();walkDistance+=Math.abs(step);const idx=Math.floor(((walkDistance%WALK_CYCLE_DISTANCE)/WALK_CYCLE_DISTANCE)*WALK_VIRTUAL_COUNT);applyWalkVirtualFrame(idx,Math.sign(distance)*speed);setPos(x,y)});
    vx=0;actor.classList.remove('is-running');resetPose();
  }

  function placePullerRig(topPx){
    const rect=pullerRig.getBoundingClientRect();const pw=rect.width||200;
    pullerRig.style.left=`${innerWidth/2-pw*.815}px`;
    pullerRig.style.top=`${topPx}px`;
  }

  async function leapToZipper(token){
    const{w}=actorSize(),sx=x,sy=y,ex=innerWidth/2-w/2,ey=Math.max(8,innerHeight*.018);
    pullerRig.style.display='block';pullerRig.style.opacity='0';placePullerRig(Math.max(-8,innerHeight*.001));
    await animate(1040,(p,raw)=>{if(token!==sequenceToken)return;const idx=Math.min(JUMP_VIRTUAL_COUNT-1,Math.floor(raw*(JUMP_VIRTUAL_COUNT-1)));applyJumpVirtualFrame(idx,sx,sy,ex,ey);const cross=clamp((raw-.86)/.14,0,1);pullerRig.style.opacity=String(smoother(cross));pullerRig.style.transform=`translateY(${((1-cross)*9).toFixed(2)}px) scale(${(.98+cross*.02).toFixed(4)})`;actor.style.opacity=String((1-smoother(cross))*JUMP_FRAMES[idx].opacity)},t=>t);
    actor.style.opacity='0';
  }

  function updatePanelCut(sliderY,gapPx){const yy=Math.round(sliderY),gap=Math.round(gapPx);root.style.setProperty('--zip-y',`${yy}px`);root.style.setProperty('--zip-gap',`${gap}px`);leftPanel.style.clipPath=`polygon(0 0,calc(50% - ${gap}px) 0,50% ${yy}px,50% 100%,0 100%)`;rightPanel.style.clipPath=`polygon(calc(50% + ${gap}px) 0,100% 0,100% 100%,50% 100%,50% ${yy}px)`}

  function applyZipVirtualFrame(index,startY,endY,pw){
    const f=ZIP_FRAMES[clamp(index,0,ZIP_VIRTUAL_COUNT-1)];
    const py=lerp(startY,endY,f.progress);
    const sliderY=clamp(py+pw*.12,0,innerHeight);
    const gap=f.gap*Math.min(156,innerWidth*.108);
    placePullerRig(py);
    pullerRig.style.transform=`rotate(${f.rigRot.toFixed(3)}deg) scale(${f.rigScaleX.toFixed(4)},${f.rigScaleY.toFixed(4)})`;
    pullerTop.style.transform=`translate3d(${f.topX.toFixed(2)}px,${f.topY.toFixed(2)}px,0) rotate(${f.topRot.toFixed(3)}deg)`;
    pullerMid.style.transform=`translate3d(${f.midX.toFixed(2)}px,${f.midY.toFixed(2)}px,0) rotate(${f.midRot.toFixed(3)}deg)`;
    pullerBottom.style.transform=`translate3d(${f.bottomX.toFixed(2)}px,${f.bottomY.toFixed(2)}px,0) rotate(${f.bottomRot.toFixed(3)}deg)`;
    updatePanelCut(sliderY,gap);
  }

  async function pullZipper(token){
    root.classList.add('is-pulling');pullerRig.style.display='block';pullerRig.style.opacity='1';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const rect=pullerRig.getBoundingClientRect(),pw=rect.width||200,ph=rect.height||pw,startY=Math.max(-8,innerHeight*.001),endY=Math.max(168,innerHeight-ph*.72-24);updatePanelCut(0,0);
    await animate(2200,(p,raw)=>{if(token!==sequenceToken)return;const idx=Math.min(ZIP_VIRTUAL_COUNT-1,Math.floor(raw*(ZIP_VIRTUAL_COUNT-1)));applyZipVirtualFrame(idx,startY,endY,pw)},t=>t);
  }

  async function beginSequence(){
    if(state!=='roam')return;state='sequence';root.classList.add('is-sequencing');pointerSeen=false;vx=0;const token=++sequenceToken,{w}=actorSize();
    await walkTo(innerWidth/2-w/2,338);if(token!==sequenceToken)return;await new Promise(r=>setTimeout(r,80));
    await leapToZipper(token);if(token!==sequenceToken)return;await new Promise(r=>setTimeout(r,45));
    await pullZipper(token);if(token!==sequenceToken)return;
    root.classList.add('is-opening');pullerRig.style.transition='opacity 300ms ease,transform 520ms cubic-bezier(.2,.8,.2,1)';pullerRig.style.opacity='0';pullerRig.style.transform+=' translateY(28px)';await new Promise(r=>setTimeout(r,1080));document.documentElement.classList.remove('elfo-intro-active');root.hidden=true;state='done';
  }

  document.addEventListener('pointermove',e=>{if(state!=='roam')return;pointerSeen=true;pointerX=e.clientX;lastPointerAt=performance.now()},{passive:true});
  actor.addEventListener('pointerenter',hoverHop);actor.addEventListener('click',beginSequence);actor.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();beginSequence()}});
  addEventListener('resize',()=>{const{w}=actorSize();x=clamp(x,8,innerWidth-w-8);y=groundY();setPos(x,y)});
  requestAnimationFrame(()=>{y=groundY();setSpritePair(0,1,0);setFacing(1);setPos(x,y);requestAnimationFrame(loop)});
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
    backup_dir = root / f'_backup_elfo_intro_v11_{stamp}'
    backup_dir.mkdir(parents=True, exist_ok=True)
    for p in (index_path, css_path, js_path):
        shutil.copy2(p, backup_dir / p.name)

    css_path.write_text(CSS_CONTENT, encoding='utf-8', newline='\n')
    js_path.write_text(JS_CONTENT, encoding='utf-8', newline='\n')

    index_text = index_path.read_text(encoding='utf-8')
    new_text = re.sub(r'(/static/elfo-intro-v3\.css\?v=)([^"\']+)', r'\g<1>11', index_text)
    new_text = re.sub(r'(/static/elfo-intro-v3\.js\?v=)([^"\']+)', r'\g<1>11', new_text)
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

    print('DONE: Elfo Intro V11 UltraFluid applied.')
    print('Virtual motion states: walk=500, jump=200, zipper=500.')
    print('The zipper-pulling Elfo is now layered (top/mid/bottom) so it is not a rigid still image.')
    print(f'Backup: {backup_dir}')
    print('Only intro CSS/JS and cache version in index.html were changed.')


if __name__ == '__main__':
    main()
