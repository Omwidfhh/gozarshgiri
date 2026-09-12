(() => {
  'use strict';
  const root=document.getElementById('elfoIntroV3'); if(!root)return;
  const leftPanel=root.querySelector('.elfo-v3-left');
  const rightPanel=root.querySelector('.elfo-v3-right');
  const actor=root.querySelector('#elfoV3Character');
  const flip=actor.querySelector('.elfo-v3-flip');
  const sheet=actor.querySelector('.elfo-v3-sheet');
  const shadow=actor.querySelector('.elfo-v3-shadow');
  const puller=root.querySelector('#elfoV3Puller');
  const visual=actor.querySelector('.elfo-v3-visual');
  document.documentElement.classList.add('elfo-intro-active');

  const WALK_FRAMES=[0,1,2,3];
  const FRAME_DISTANCE=13.5;
  const BASE_ART_FACES_LEFT=true;
  let state='roam',x=Math.max(20,innerWidth*.11),y=0,vx=0,targetX=Math.max(20,innerWidth*.78),autoDir=1;
  let pointerX=targetX,pointerSeen=false,lastPointerAt=0,lastTime=performance.now(),strideDistance=0,walkIndex=0,currentFrame=-1,lastHopAt=0,sequenceToken=0;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const moveToward=(v,t,d)=>v<t?Math.min(v+d,t):v>t?Math.max(v-d,t):t;
  const easeInOut=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  const easeOutCubic=t=>1-Math.pow(1-t,3);

  function actorSize(){const r=actor.getBoundingClientRect();return{w:r.width||125,h:r.height||167}}
  function groundY(){const{h}=actorSize();return innerHeight-h-Math.max(14,innerHeight*.025)}
  function setFrame(frame){frame=clamp(frame|0,0,3);if(frame===currentFrame)return;currentFrame=frame;sheet.style.transform=`translate3d(${-frame*25}%,0,0)`}
  function setFacing(dir){if(Math.abs(dir)<.001)return;const face=BASE_ART_FACES_LEFT?(dir>0?-1:1):(dir>0?1:-1);flip.style.setProperty('--elfo-face',String(face))}
  function setPos(nx,ny){x=nx;y=ny;actor.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`}
  function stopPose(){strideDistance=0;walkIndex=0;setFrame(0);shadow.style.transform='scaleX(1)';shadow.style.opacity='.56'}
  function setMoving(moving,running=false){actor.classList.toggle('is-moving',moving);actor.classList.toggle('is-running',running&&moving);if(!moving)stopPose()}
  function advanceWalk(distance,speed){strideDistance+=Math.abs(distance);while(strideDistance>=FRAME_DISTANCE){strideDistance-=FRAME_DISTANCE;walkIndex=(walkIndex+1)%WALK_FRAMES.length;setFrame(WALK_FRAMES[walkIndex])}const intensity=clamp(Math.abs(speed)/240,0,1);shadow.style.transform=`scaleX(${(1-intensity*.10).toFixed(3)})`;shadow.style.opacity=String(.56-intensity*.08)}
  function hop(){const now=performance.now();if(state!=='roam'||now-lastHopAt<950)return;lastHopAt=now;actor.classList.remove('is-hopping');void actor.offsetWidth;actor.classList.add('is-hopping');setTimeout(()=>actor.classList.remove('is-hopping'),590)}

  function updateRoam(now){
    const dt=Math.min(.034,Math.max(.001,(now-lastTime)/1000));lastTime=now;
    const{w}=actorSize();y=groundY();
    const pointerActive=pointerSeen&&(now-lastPointerAt<4600);
    const leftBound=Math.max(14,innerWidth*.055),rightBound=Math.max(leftBound,innerWidth-w-Math.max(14,innerWidth*.055));
    if(pointerActive) targetX=clamp(pointerX-w*.5,10,innerWidth-w-10);
    else if(Math.abs(targetX-x)<12||targetX<leftBound-1||targetX>rightBound+1){autoDir*=-1;targetX=autoDir>0?rightBound:leftBound}
    const dx=targetX-x,deadZone=pointerActive?5.5:8;let desiredV=0;
    if(Math.abs(dx)>deadZone){const maxSpeed=pointerActive?235:105,minSpeed=pointerActive?72:58;desiredV=Math.sign(dx)*clamp(minSpeed+Math.abs(dx)*1.45,minSpeed,maxSpeed)}
    const accelerating=Math.sign(desiredV)===Math.sign(vx)&&Math.abs(desiredV)>Math.abs(vx);
    vx=moveToward(vx,desiredV,(desiredV===0?920:(accelerating?620:1050))*dt);
    let delta=vx*dt;if(desiredV!==0&&Math.sign(delta)===Math.sign(dx)&&Math.abs(delta)>Math.abs(dx)){delta=dx;vx=0}
    x=clamp(x+delta,8,innerWidth-w-8);
    const moving=Math.abs(vx)>9&&Math.abs(delta)>.05;
    if(moving){setFacing(vx);setMoving(true,Math.abs(vx)>180);advanceWalk(delta,vx)}else setMoving(false);
    setPos(x,y);
  }
  function loop(now){if(state==='roam')updateRoam(now);requestAnimationFrame(loop)}
  function animate(ms,update,easing=t=>t){return new Promise(resolve=>{const start=performance.now();const tick=now=>{const raw=clamp((now-start)/ms,0,1);update(easing(raw),raw);raw<1?requestAnimationFrame(tick):resolve()};requestAnimationFrame(tick)})}

  async function walkTo(destX,speed=300){
    const startX=x,distance=destX-startX,absDistance=Math.abs(distance);if(absDistance<2)return;
    setFacing(distance);actor.classList.add('is-moving','is-running');const duration=clamp(absDistance/speed*1000,260,1450);let prev=startX;
    await animate(duration,p=>{const nx=startX+distance*p,step=nx-prev;prev=nx;x=nx;y=groundY();advanceWalk(step,Math.sign(distance)*speed);setPos(x,y)},t=>t);
    vx=0;setMoving(false);
  }
  async function leapToZipper(token){
    const{w}=actorSize(),sx=x,sy=y,ex=innerWidth/2-w/2,ey=Math.max(8,innerHeight*.018);
    await animate(145,p=>{if(token!==sequenceToken)return;visual.style.transform=`translateY(${5*p}px) scale(${1+.045*p},${1-.07*p})`},easeOutCubic);
    visual.style.transform='';setFrame(2);
    await animate(900,(p,raw)=>{if(token!==sequenceToken)return;const e=easeInOut(p);x=sx+(ex-sx)*e;const linearY=sy+(ey-sy)*e,arc=Math.sin(Math.PI*raw)*Math.min(150,innerHeight*.18);y=linearY-arc;setPos(x,y);const lift=Math.sin(Math.PI*raw);shadow.style.transform=`scaleX(${1-lift*.52})`;shadow.style.opacity=String(.56-lift*.38);actor.style.opacity=String(1-Math.max(0,raw-.84)*6.2)},easeOutCubic);
  }
  function updatePanelCut(sliderY,gapPx){const yy=Math.round(sliderY),gap=Math.round(gapPx);leftPanel.style.clipPath=`polygon(0 0,calc(50% - ${gap}px) 0,50% ${yy}px,50% 100%,0 100%)`;rightPanel.style.clipPath=`polygon(calc(50% + ${gap}px) 0,100% 0,100% 100%,50% 100%,50% ${yy}px)`;root.style.setProperty('--zip-y',`${yy}px`)}
  async function pullZipper(token){
    root.classList.add('is-pulling');actor.style.opacity='0';puller.style.opacity='1';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const rect=puller.getBoundingClientRect(),pw=rect.width||200,ph=rect.height||pw,startY=Math.max(-6,innerHeight*.002),endY=Math.max(170,innerHeight-ph*.72-22),anchorX=innerWidth/2-pw*.815;
    updatePanelCut(0,0);
    await animate(1875,(p,raw)=>{if(token!==sequenceToken)return;const e=easeInOut(p),py=startY+(endY-startY)*e,sliderY=clamp(py+pw*.12,0,innerHeight),gap=Math.sin(e*Math.PI/2)*Math.min(168,innerWidth*.115);puller.style.left=`${anchorX}px`;puller.style.top=`${py}px`;puller.style.transform=`rotate(${Math.sin(raw*Math.PI*6)*1.15}deg)`;updatePanelCut(sliderY,gap)},t=>t);
  }
  async function beginSequence(){
    if(state!=='roam')return;state='sequence';root.classList.add('is-sequencing');pointerSeen=false;vx=0;const token=++sequenceToken,{w}=actorSize();
    await walkTo(innerWidth/2-w/2,335);if(token!==sequenceToken)return;await new Promise(r=>setTimeout(r,90));await leapToZipper(token);if(token!==sequenceToken)return;await new Promise(r=>setTimeout(r,60));await pullZipper(token);if(token!==sequenceToken)return;
    root.classList.add('is-opening');puller.style.transition='opacity 300ms ease,transform 520ms cubic-bezier(.2,.8,.2,1)';puller.style.opacity='0';puller.style.transform+=' translateY(30px) scale(.94)';await new Promise(r=>setTimeout(r,1080));document.documentElement.classList.remove('elfo-intro-active');root.hidden=true;state='done';
  }

  document.addEventListener('pointermove',e=>{if(state!=='roam')return;pointerSeen=true;pointerX=e.clientX;lastPointerAt=performance.now()},{passive:true});
  actor.addEventListener('pointerenter',hop);actor.addEventListener('click',beginSequence);actor.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();beginSequence()}});
  addEventListener('resize',()=>{if(state!=='roam')return;const{w}=actorSize();x=clamp(x,8,innerWidth-w-8);y=groundY();setPos(x,y)});
  requestAnimationFrame(()=>{y=groundY();setFrame(0);setFacing(1);setPos(x,y);requestAnimationFrame(loop)});
})();

