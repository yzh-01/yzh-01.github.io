const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync(path.join(__dirname,'../themes/garden/source/js/sanctuary.js'),'utf8');

function fixture(t,{reduced=false,fine=true,visible=true,noObserver=false,noMotion=false,noGeometry=false}={}) {
  const realmMarkup=Array.from({length:9},(_,index)=>`<button type="button" data-root-realm="${index}" aria-pressed="false" data-realm-name="九界 ${index}" data-realm-rune="符文 ${index}" data-realm-story="第 ${index} 界的故事。">九界 ${index}</button>`).join('');
  const hotspotMarkup=Array.from({length:9},(_,index)=>`<button type="button" data-root-sigil-button="${index}" aria-pressed="false"></button>`).join('');
  const threads=Array.from({length:9},(_,index)=>`<path data-root-thread="${index}"></path><circle data-root-sigil="${index}"></circle>`).join('');
  const dom=new JSDOM(`<section data-root-sanctuary data-awake="false">
    <div data-root-clearing><svg class="ash-root-art" aria-hidden="true">${threads}</svg><button type="button" data-root-awaken disabled aria-pressed="false" aria-label="唤醒印记">印记</button><div data-root-hotspots hidden>${hotspotMarkup}</div><div data-root-echo-field aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
    <p data-root-hint>静态印记</p>
    <div data-root-controls hidden><button type="button" data-root-echo>ECHO</button><button type="button" data-root-still aria-pressed="false"><span data-root-still-label>DRIFT</span></button></div>
    <div data-root-reading hidden><span data-root-label></span><h3 data-root-title></h3><p data-root-story></p>${realmMarkup}</div>
    <p data-root-status role="status" aria-live="polite"></p>
  </section>`,{url:'https://garden.test/',runScripts:'outside-only'});
  const w=dom.window;t.after(()=>w.close());
  Object.defineProperty(w,'innerHeight',{value:900,configurable:true});
  let hidden=false;
  Object.defineProperty(w.document,'hidden',{get:()=>hidden,configurable:true});
  const media=new Map();
  w.matchMedia=query=>{
    if(!media.has(query)) {
      const listeners=new Set();
      media.set(query,{matches:query.includes('reduced-motion')?reduced:fine,
        addEventListener:(name,callback)=>listeners.add(callback),removeEventListener:(name,callback)=>listeners.delete(callback),
        change(value){this.matches=value;listeners.forEach(callback=>callback({matches:value}));}});
    }
    return media.get(query);
  };
  const root=w.document.querySelector('[data-root-sanctuary]');
  const stage=root.querySelector('[data-root-clearing]');
  stage.getBoundingClientRect=()=>({left:100,top:visible?100:1000,width:1000,height:600,right:1100,bottom:visible?700:1600});
  const positions=Array.from({length:9},(_,index)=>({x:70+index*100,y:200+index*10}));
  if(!noGeometry) [...root.querySelectorAll('[data-root-sigil]')].forEach(sigil=>{
    sigil.getScreenCTM=()=>{const rect=stage.getBoundingClientRect(),point=positions[Number(sigil.dataset.rootSigil)];return {e:rect.left+point.x,f:rect.top+point.y};};
  });
  const resizeObservers=[];
  w.ResizeObserver=class {constructor(callback){this.callback=callback;resizeObservers.push(this);}observe(target){this.target=target;}};
  const observers=[];
  if(!noObserver) w.IntersectionObserver=class {
    constructor(callback){this.callback=callback;observers.push(this);}
    observe(target){this.target=target;}
  };
  const motionState={allowed:true,economy:false};
  const subscribers=[];
  if(!noMotion) w.GardenMotion={canAnimate:()=>motionState.allowed,isEconomy:()=>motionState.economy,subscribe:callback=>subscribers.push(callback)};
  const frames=new Map();let nextFrame=0,requested=0,cancelled=0;
  w.requestAnimationFrame=callback=>{requested++;frames.set(++nextFrame,callback);return nextFrame;};
  w.cancelAnimationFrame=id=>{if(frames.delete(id))cancelled++;};
  const timers=new Map();let nextTimer=0;
  w.setTimeout=(callback,delay)=>{timers.set(++nextTimer,{callback,delay});return nextTimer;};
  w.clearTimeout=id=>timers.delete(id);
  const mutations=[];
  const NativeMutationObserver=w.MutationObserver;
  w.MutationObserver=class extends NativeMutationObserver {
    observe(target,options){mutations.push({attributes:options.attributes,attributeFilter:Array.from(options.attributeFilter||[])});super.observe(target,options);}
  };
  w.eval(code);
  const awaken=root.querySelector('[data-root-awaken]');
  return {w,root,stage,awaken,mutations,query:selector=>root.querySelector(selector),
    get requested(){return requested;},get cancelled(){return cancelled;},get pending(){return frames.size;},get timers(){return [...timers.values()];},
    realm:index=>root.querySelector(`[data-root-realm="${index}"]`),
    sigilButton:index=>root.querySelector(`[data-root-sigil-button="${index}"]`),
    place(index,x,y){positions[index]={x,y};resizeObservers.forEach(observer=>observer.callback([{target:observer.target}]));},
    expire(){const queued=[...timers.values()];timers.clear();queued.forEach(timer=>timer.callback());},
    pointer:(x,y)=>stage.dispatchEvent(new w.MouseEvent('pointermove',{clientX:x,clientY:y,bubbles:true})),
    leave:()=>stage.dispatchEvent(new w.MouseEvent('pointerleave')),
    flush(){const queued=[...frames.values()];frames.clear();queued.forEach(callback=>callback(100));},
    visible(value){visible=value;observers.forEach(observer=>observer.callback([{target:observer.target,isIntersecting:value}]));},
    hidden(value){hidden=value;w.document.dispatchEvent(new w.Event('visibilitychange'));},
    reduced:value=>media.get('(prefers-reduced-motion: reduce)').change(value),
    fine:value=>media.get('(hover: hover) and (pointer: fine)').change(value),
    motion(value){Object.assign(motionState,value);subscribers.forEach(callback=>callback());},
    transition:name=>w.dispatchEvent(new w.PageTransitionEvent(name,{persisted:true})),
    escape:()=>w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',cancelable:true}))};
}
function selectedRealms(f) {return [...f.root.querySelectorAll('[data-root-realm][aria-pressed="true"]')].map(button=>button.dataset.rootRealm);}
function selectedThreads(f) {return [...f.root.querySelectorAll('[data-root-thread].is-selected')].map(thread=>thread.dataset.rootThread);}
function selectedSigils(f) {return [...f.root.querySelectorAll('[data-root-sigil].is-selected')].map(sigil=>sigil.dataset.rootSigil);}

test('initial enhancement enables the native sigil button without starting motion or revealing stories',t=>{
  const f=fixture(t);
  assert.equal(f.root.dataset.ready,'true');assert.equal(f.awaken.disabled,false);
  assert.equal(f.root.dataset.awake,'false');assert.equal(f.root.dataset.motion,'paused');
  assert.equal(f.awaken.getAttribute('aria-pressed'),'false');assert.equal(f.awaken.getAttribute('aria-label'),'唤醒印记');
  assert.equal(f.query('[data-root-reading]').hidden,true);
  assert.equal(f.query('[data-root-hint]').textContent,'TOUCH THE SIGN · FOLLOW THE LIGHT');
  assert.equal(f.query('[data-root-status]').textContent,'余光收起，九界静候下一次相逢。');
  assert.deepEqual(selectedRealms(f),[]);assert.deepEqual(selectedSigils(f),[]);assert.equal(f.requested,0);
});
test('a sigil click reveals the first realm and exposes its readable story',t=>{
  const f=fixture(t);f.awaken.click();
  assert.equal(f.root.dataset.awake,'true');assert.equal(f.root.dataset.motion,'running');
  assert.equal(f.awaken.getAttribute('aria-pressed'),'true');assert.equal(f.awaken.getAttribute('aria-label'),'收起余光');
  assert.equal(f.query('[data-root-reading]').hidden,false);
  assert.equal(f.query('[data-root-label]').textContent,'符文 0 / 九界 0');
  assert.equal(f.query('[data-root-title]').textContent,'九界 0');
  assert.equal(f.query('[data-root-story]').textContent,'第 0 界的故事。');
  assert.equal(f.query('[data-root-hint]').textContent,'TRACE A RUNE · TOUCH AGAIN TO REST');
  assert.match(f.query('[data-root-status]').textContent,/九界 0.*第 0 界/);
  assert.deepEqual(selectedRealms(f),['0']);assert.deepEqual(selectedThreads(f),['0']);assert.deepEqual(selectedSigils(f),['0']);assert.equal(f.requested,0);
});
test('realm selection updates the story and leaves one selected button, thread and sigil',t=>{
  const f=fixture(t);f.awaken.click();
  for(const index of [4,8,3]) {
    f.realm(index).click();
    assert.deepEqual(selectedRealms(f),[String(index)]);assert.deepEqual(selectedThreads(f),[String(index)]);assert.deepEqual(selectedSigils(f),[String(index)]);
    assert.equal(f.query('[data-root-title]').textContent,`九界 ${index}`);
    assert.equal(f.query('[data-root-story]').textContent,`第 ${index} 界的故事。`);
  }
  f.realm(3).dataset.realmStory='<img src="missing" onerror="alert(1)">';f.realm(3).click();
  assert.equal(f.query('[data-root-story]').textContent,'<img src="missing" onerror="alert(1)">');
  assert.equal(f.query('[data-root-story]').children.length,0);
});
test('sleeping and waking preserve the chosen story and prevent dormant realm changes',t=>{
  const f=fixture(t);f.awaken.click();f.realm(6).click();f.awaken.click();
  assert.equal(f.root.dataset.awake,'false');assert.equal(f.root.dataset.motion,'paused');
  assert.equal(f.query('[data-root-reading]').hidden,true);
  assert.equal(f.awaken.getAttribute('aria-label'),'唤醒印记');
  assert.equal(f.query('[data-root-hint]').textContent,'TOUCH THE SIGN · FOLLOW THE LIGHT');
  assert.equal(f.query('[data-root-status]').textContent,'余光收起，九界静候下一次相逢。');
  f.realm(1).click();assert.deepEqual(selectedRealms(f),['6']);
  f.awaken.click();assert.deepEqual(selectedRealms(f),['6']);assert.deepEqual(selectedThreads(f),['6']);assert.deepEqual(selectedSigils(f),['6']);
  assert.equal(f.query('[data-root-story]').textContent,'第 6 界的故事。');
  assert.equal(f.query('[data-root-reading]').hidden,false);
});
test('Escape closes the afterglow, cancels pending light and retains the current realm',t=>{
  const f=fixture(t);f.awaken.click();f.realm(2).click();f.pointer(900,300);assert.equal(f.pending,1);
  const nativeButton=f.w.document.activeElement;f.escape();
  assert.equal(f.root.dataset.awake,'false');assert.equal(f.query('[data-root-reading]').hidden,true);
  assert.equal(f.pending,0);assert.equal(f.stage.style.getPropertyValue('--root-light-x'),'50%');
  assert.deepEqual(selectedRealms(f),['2']);assert.equal(f.w.document.activeElement,nativeButton);
});
test('Escape returns focus from a hidden realm button to the sigil button',t=>{
  const f=fixture(t);f.awaken.click();f.realm(4).click();f.realm(4).focus();
  assert.equal(f.w.document.activeElement,f.realm(4));f.escape();
  assert.equal(f.query('[data-root-reading]').hidden,true);
  assert.equal(f.w.document.activeElement,f.awaken);assert.deepEqual(selectedRealms(f),['4']);
});
test('pointer input coalesces to one frame and never schedules a continuous loop',t=>{
  const f=fixture(t);f.pointer(600,400);assert.equal(f.requested,0);
  f.awaken.click();f.pointer(400,250);f.pointer(800,460);f.pointer(700,400);
  assert.equal(f.requested,1);assert.equal(f.pending,1);f.flush();
  assert.equal(f.stage.style.getPropertyValue('--root-light-x'),'60.00%');
  assert.equal(f.stage.style.getPropertyValue('--root-light-y'),'50.00%');
  assert.equal(f.pending,0);assert.equal(f.requested,1);
});
test('the light stays within the clearing and leaving resets it without another frame',t=>{
  const f=fixture(t);f.awaken.click();f.pointer(-200,-300);f.flush();
  assert.equal(f.stage.style.getPropertyValue('--root-light-x'),'10.00%');assert.equal(f.stage.style.getPropertyValue('--root-light-y'),'10.00%');
  f.pointer(1600,1200);f.flush();
  assert.equal(f.stage.style.getPropertyValue('--root-light-x'),'90.00%');assert.equal(f.stage.style.getPropertyValue('--root-light-y'),'90.00%');
  f.pointer(700,400);const requested=f.requested;f.leave();
  assert.equal(f.pending,0);assert.equal(f.requested,requested);
  assert.equal(f.stage.style.getPropertyValue('--root-light-x'),'50%');assert.equal(f.stage.style.getPropertyValue('--root-light-y'),'52%');
});
test('offscreen clearing pauses animation and discards pending pointer updates',t=>{
  const f=fixture(t);f.awaken.click();f.pointer(700,400);f.visible(false);
  assert.equal(f.root.dataset.motion,'paused');assert.equal(f.pending,0);assert.equal(f.cancelled,1);
  f.pointer(800,500);assert.equal(f.requested,1);f.visible(true);
  assert.equal(f.root.dataset.motion,'running');assert.equal(f.root.dataset.awake,'true');
  assert.equal(f.requested,1);f.pointer(800,500);assert.equal(f.pending,1);
});
test('a hidden document pauses light while preserving the active story for return',t=>{
  const f=fixture(t);f.awaken.click();f.realm(5).click();f.pointer(700,400);f.hidden(true);
  assert.equal(f.root.dataset.motion,'paused');assert.equal(f.pending,0);f.pointer(900,300);assert.equal(f.requested,1);
  f.hidden(false);assert.equal(f.root.dataset.motion,'running');assert.deepEqual(selectedRealms(f),['5']);assert.equal(f.pending,0);
});
test('reduced motion keeps all button interactions usable without scheduling pointer light',t=>{
  const f=fixture(t,{reduced:true});f.awaken.click();f.realm(7).click();f.pointer(700,400);
  assert.equal(f.root.dataset.motion,'paused');assert.deepEqual(selectedRealms(f),['7']);assert.equal(f.requested,0);
  f.reduced(false);assert.equal(f.root.dataset.motion,'running');f.pointer(800,300);assert.equal(f.pending,1);
  f.reduced(true);assert.equal(f.root.dataset.motion,'paused');assert.equal(f.pending,0);
});
test('quiet and economy policies cancel queued light and keep deliberate awakening available',t=>{
  const f=fixture(t);f.awaken.click();f.pointer(700,400);f.motion({economy:true});
  assert.equal(f.root.dataset.motion,'paused');assert.equal(f.pending,0);f.realm(8).click();assert.deepEqual(selectedRealms(f),['8']);
  f.pointer(800,500);assert.equal(f.requested,1);f.motion({economy:false,allowed:false});assert.equal(f.root.dataset.motion,'paused');
  f.motion({allowed:true});assert.equal(f.root.dataset.motion,'running');f.pointer(700,400);assert.equal(f.pending,1);
  f.w.document.documentElement.classList.add('garden-lite-motion');f.motion({});
  assert.equal(f.root.dataset.motion,'paused');assert.equal(f.pending,0);
});
test('coarse pointers use the native controls without light scheduling',t=>{
  const f=fixture(t,{fine:false});f.awaken.click();f.realm(4).click();f.pointer(700,400);
  assert.equal(f.root.dataset.motion,'running');assert.deepEqual(selectedRealms(f),['4']);assert.equal(f.requested,0);
  f.fine(true);f.pointer(700,400);assert.equal(f.pending,1);f.fine(false);
  assert.equal(f.pending,0);assert.equal(f.stage.style.getPropertyValue('--root-light-x'),'50%');
});
test('page transitions cancel queued light and resume policy without changing the story',t=>{
  const f=fixture(t);f.awaken.click();f.realm(3).click();f.pointer(700,400);f.transition('pagehide');
  assert.equal(f.pending,0);assert.equal(f.root.dataset.motion,'paused');f.pointer(800,500);assert.equal(f.requested,1);
  f.transition('pageshow');assert.equal(f.root.dataset.motion,'running');assert.deepEqual(selectedRealms(f),['3']);assert.equal(f.pending,0);
});
test('without shared motion the quiet class is observed, and theme changes do not schedule light',async t=>{
  const f=fixture(t,{noMotion:true});f.awaken.click();f.pointer(700,400);f.flush();
  assert.deepEqual(f.mutations,[{attributes:true,attributeFilter:['class']}]);
  f.w.document.documentElement.dataset.resolvedTheme='light';await new Promise(setImmediate);
  assert.equal(f.requested,1);assert.equal(f.pending,0);assert.equal(f.root.dataset.motion,'running');
  f.w.document.documentElement.classList.add('garden-lite-motion');await new Promise(setImmediate);
  assert.equal(f.root.dataset.motion,'paused');f.pointer(800,500);assert.equal(f.requested,1);
});
test('the shared motion path adds no theme observer, and browsers without viewport observation keep controls usable',async t=>{
  const f=fixture(t,{noObserver:true});f.awaken.click();f.realm(1).click();
  assert.equal(f.root.dataset.motion,'running');assert.deepEqual(selectedRealms(f),['1']);assert.deepEqual(f.mutations,[]);
  f.w.document.documentElement.dataset.resolvedTheme='light';await new Promise(setImmediate);
  assert.equal(f.requested,0);assert.equal(f.pending,0);assert.equal(f.root.dataset.awake,'true');
});
test('screen-positioned sigils choose the same realm and pressed state as the reading controls',t=>{
  const f=fixture(t);
  assert.equal(f.query('[data-root-hotspots]').hidden,true);assert.equal(f.query('[data-root-controls]').hidden,true);
  f.awaken.click();
  assert.equal(f.query('[data-root-hotspots]').hidden,false);assert.equal(f.query('[data-root-controls]').hidden,false);
  assert.equal(f.sigilButton(4).hidden,false);assert.equal(f.sigilButton(4).style.left,'470px');assert.equal(f.sigilButton(4).style.top,'240px');
  f.sigilButton(4).click();
  assert.deepEqual(selectedRealms(f),['4']);assert.deepEqual(selectedThreads(f),['4']);assert.deepEqual(selectedSigils(f),['4']);
  assert.equal(f.sigilButton(4).getAttribute('aria-pressed'),'true');assert.equal(f.sigilButton(0).getAttribute('aria-pressed'),'false');
  f.realm(7).click();
  assert.equal(f.sigilButton(4).getAttribute('aria-pressed'),'false');assert.equal(f.sigilButton(7).getAttribute('aria-pressed'),'true');
  f.awaken.click();assert.equal(f.query('[data-root-hotspots]').hidden,true);assert.equal(f.query('[data-root-controls]').hidden,true);
});
test('hover and focus preview a light without changing the selected realm or story',t=>{
  const f=fixture(t);f.awaken.click();f.realm(2).click();
  f.sigilButton(5).dispatchEvent(new f.w.MouseEvent('pointerenter'));
  assert.equal(f.query('[data-root-thread="5"]').classList.contains('is-pointed'),true);assert.equal(f.query('[data-root-sigil="5"]').classList.contains('is-pointed'),true);
  assert.deepEqual(selectedRealms(f),['2']);assert.equal(f.query('[data-root-title]').textContent,'九界 2');
  f.sigilButton(5).dispatchEvent(new f.w.MouseEvent('pointerleave'));
  assert.equal(f.root.querySelectorAll('[data-root-thread].is-pointed').length,0);
  f.realm(8).focus();assert.equal(f.query('[data-root-thread="8"]').classList.contains('is-pointed'),true);
  f.realm(8).blur();assert.equal(f.root.querySelectorAll('.is-pointed').length,0);assert.deepEqual(selectedRealms(f),['2']);
});
test('resizing hides clipped sigil targets and moves their focus to the matching reading control',t=>{
  const f=fixture(t);f.awaken.click();f.sigilButton(6).focus();
  f.place(6,995,260);assert.equal(f.sigilButton(6).hidden,true);assert.equal(f.w.document.activeElement,f.realm(6));
  f.place(6,700,599);assert.equal(f.sigilButton(6).hidden,true);
  f.place(6,700,300);assert.equal(f.sigilButton(6).hidden,false);assert.equal(f.sigilButton(6).style.left,'700px');
  assert.equal(f.requested,0);
});
test('missing SVG screen geometry leaves realm controls usable and hides unpositioned sigil buttons',t=>{
  const f=fixture(t,{noGeometry:true});f.awaken.click();f.realm(3).click();
  assert.equal([...f.root.querySelectorAll('[data-root-sigil-button]')].every(button=>button.hidden),true);
  assert.deepEqual(selectedRealms(f),['3']);assert.equal(f.query('[data-root-reading]').hidden,false);assert.equal(f.requested,0);
});
test('still mode freezes queued pointer light and echo while realm reading remains available',t=>{
  const f=fixture(t);f.awaken.click();f.query('[data-root-echo]').click();f.pointer(900,450);
  assert.equal(f.root.dataset.echo,'true');assert.equal(f.timers.length,1);assert.equal(f.pending,1);
  f.query('[data-root-still]').click();
  assert.equal(f.root.dataset.still,'true');assert.equal(f.root.dataset.motion,'paused');assert.equal(f.root.dataset.echo,'false');assert.equal(f.timers.length,0);assert.equal(f.pending,0);
  assert.equal(f.query('[data-root-still]').getAttribute('aria-pressed'),'true');assert.equal(f.query('[data-root-still]').getAttribute('aria-label'),'恢复动态');assert.equal(f.query('[data-root-still-label]').textContent,'STILL');
  assert.equal(f.query('[data-root-echo]').disabled,true);f.sigilButton(5).click();assert.deepEqual(selectedRealms(f),['5']);
  f.query('[data-root-still]').click();assert.equal(f.root.dataset.motion,'running');assert.equal(f.query('[data-root-still-label]').textContent,'DRIFT');assert.equal(f.query('[data-root-still]').getAttribute('aria-label'),'静止光幕');assert.equal(f.query('[data-root-echo]').disabled,false);assert.equal(f.pending,0);
});
test('one-shot echo restarts without adding nodes or changing the selected realm',t=>{
  const f=fixture(t);f.awaken.click();f.realm(6).click();const nodes=f.root.querySelectorAll('*').length;
  f.query('[data-root-echo]').click();assert.equal(f.root.dataset.echo,'true');assert.equal(f.timers.length,1);assert.equal(f.timers[0].delay,1900);
  assert.equal(f.stage.style.getPropertyValue('--root-echo-x'),'50.00%');assert.equal(f.stage.style.getPropertyValue('--root-echo-y'),'52.00%');
  f.stage.dispatchEvent(new f.w.MouseEvent('click',{clientX:850,clientY:280,bubbles:true}));
  assert.equal(f.stage.style.getPropertyValue('--root-echo-x'),'75.00%');assert.equal(f.stage.style.getPropertyValue('--root-echo-y'),'30.00%');assert.equal(f.timers.length,1);assert.equal(f.requested,0);
  assert.deepEqual(selectedRealms(f),['6']);assert.equal(f.root.querySelectorAll('*').length,nodes);assert.equal(f.root.dataset.awake,'true');
  f.expire();assert.equal(f.root.dataset.echo,'false');assert.equal(f.timers.length,0);
});
test('native control clicks do not emit accidental stage echoes',t=>{
  const f=fixture(t);f.awaken.click();assert.equal(f.root.dataset.echo,'false');assert.equal(f.timers.length,0);
  f.sigilButton(4).click();assert.equal(f.root.dataset.echo,'false');assert.equal(f.timers.length,0);assert.deepEqual(selectedRealms(f),['4']);
});
test('paused and reduced policies suppress and clear echoes across lifecycle changes',t=>{
  const f=fixture(t);f.stage.click();assert.equal(f.root.dataset.echo,'false');assert.equal(f.timers.length,0);
  f.awaken.click();f.query('[data-root-echo]').click();f.visible(false);assert.equal(f.root.dataset.echo,'false');assert.equal(f.timers.length,0);
  f.stage.click();assert.equal(f.timers.length,0);f.visible(true);f.query('[data-root-echo]').click();f.reduced(true);assert.equal(f.root.dataset.echo,'false');assert.equal(f.timers.length,0);
  f.stage.click();assert.equal(f.timers.length,0);f.reduced(false);f.query('[data-root-echo]').click();f.hidden(true);assert.equal(f.root.dataset.echo,'false');assert.equal(f.timers.length,0);
  f.hidden(false);f.query('[data-root-echo]').click();f.transition('pagehide');assert.equal(f.root.dataset.echo,'false');assert.equal(f.timers.length,0);f.transition('pageshow');assert.equal(f.root.dataset.motion,'running');assert.equal(f.timers.length,0);
});
test('Escape restores focus from either extra control group and removes previews and pulses',t=>{
  const f=fixture(t);
  for(const button of [f.sigilButton(7),f.query('[data-root-echo]'),f.query('[data-root-still]')]) {
    f.awaken.click();f.query('[data-root-echo]').click();button.focus();f.escape();
    assert.equal(f.w.document.activeElement,f.awaken);assert.equal(f.query('[data-root-controls]').hidden,true);assert.equal(f.query('[data-root-hotspots]').hidden,true);assert.equal(f.root.querySelectorAll('.is-pointed').length,0);assert.equal(f.root.dataset.echo,'false');assert.equal(f.timers.length,0);
  }
});
test('pointer parallax is coalesced with the existing light frame and reset by motion policy',t=>{
  const f=fixture(t);f.awaken.click();f.pointer(1100,700);f.flush();
  assert.equal(f.stage.style.getPropertyValue('--root-sway-x'),'12.00px');assert.equal(f.stage.style.getPropertyValue('--root-sway-y'),'6.00px');assert.equal(f.requested,1);assert.equal(f.pending,0);
  f.visible(false);assert.equal(f.stage.style.getPropertyValue('--root-sway-x'),'0px');assert.equal(f.stage.style.getPropertyValue('--root-sway-y'),'0px');
});
