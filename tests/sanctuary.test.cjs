const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync(path.join(__dirname,'../themes/garden/source/js/sanctuary.js'),'utf8');

function fixture(t,{reduced=false,fine=true,visible=true,noObserver=false,noMotion=false,noGeometry=false}={}) {
  const realmMarkup=Array.from({length:9},(_,index)=>`<button type="button" data-root-realm="${index}" aria-pressed="false" data-realm-name="九界 ${index}" data-realm-rune="符文 ${index}" data-realm-mark="ᛟ" data-realm-story="第 ${index} 界的故事。">九界 ${index}</button>`).join('');
  const hotspotMarkup=Array.from({length:9},(_,index)=>`<button type="button" data-root-sigil-button="${index}" aria-pressed="false"></button>`).join('');
  const threads=Array.from({length:9},(_,index)=>`<path data-root-thread="${index}" d="M600 224C540 230 490 300 ${160+index*100} 320"></path><circle data-root-sigil="${index}"></circle>`).join('');
  const atmosphere=`<g class="ash-sky-curtain"><path d="M72 70C232 46 379 110 560 93S894 50 1136 90L1136 207C904 174 799 242 573 220S230 176 72 194Z"/></g>
    <g class="ash-sky-rays"><path opacity=".5" d="M200 40C180 100 225 160 212 220L195 222Z"/></g>
    <g class="ash-sky-mist"><path d="M55 218C253 203 414 244 603 231L603 267Z"/></g>
    <circle data-root-mote cx="400" cy="240"/>`;
  const dom=new JSDOM(`<section data-root-sanctuary data-awake="false">
    <div data-root-clearing><svg class="ash-root-art" aria-hidden="true">${atmosphere}${threads}<g data-root-echo-wave></g><g data-root-echo-trails></g></svg><button type="button" data-root-awaken disabled aria-pressed="false" aria-label="唤醒印记">印记</button><div data-root-hotspots hidden>${hotspotMarkup}</div><div data-root-echo-field aria-hidden="true"><b></b><div data-root-echo-answer><span data-root-echo-mark></span><span data-root-echo-name></span></div></div></div>
    <p data-root-hint>静态印记</p>
    <div data-root-controls hidden><button type="button" data-root-echo><span data-root-echo-action>ECHO</span><small data-root-echo-prompt>CALL A WORLD</small></button><button type="button" data-root-still aria-pressed="false"><span data-root-still-label>DRIFT</span></button></div>
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
  const loops=[];let now=0;
  if(!noMotion) w.GardenMotion={canAnimate:()=>motionState.allowed,isEconomy:()=>motionState.economy,subscribe:callback=>subscribers.push(callback),
    createLoop(render,options){const loop={render,options,active:false};loops.push(loop);return {start(){loop.active=true;},stop(){loop.active=false;}};}};
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
    get requested(){return requested;},get cancelled(){return cancelled;},get pending(){return frames.size+loops.filter(loop=>loop.active).length;},get fps(){return loops[0].options.fps();},get timers(){return [...timers.values()];},
    realm:index=>root.querySelector(`[data-root-realm="${index}"]`),
    sigilButton:index=>root.querySelector(`[data-root-sigil-button="${index}"]`),
    place(index,x,y){positions[index]={x,y};resizeObservers.forEach(observer=>observer.callback([{target:observer.target}]));},
    expire(){const queued=[...timers.values()];timers.clear();queued.forEach(timer=>timer.callback());},
    pointer:(x,y)=>stage.dispatchEvent(new w.MouseEvent('pointermove',{clientX:x,clientY:y,bubbles:true})),
    leave:()=>stage.dispatchEvent(new w.MouseEvent('pointerleave')),
    advance(ms=100){for(let elapsed=0;elapsed<ms;elapsed+=50){now+=50;loops.forEach(loop=>{if(loop.active&&loop.options.enabled())loop.render(now,50);});const queued=[...frames.values()];frames.clear();queued.forEach(callback=>callback(now));}},
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

function pose(f) {
  return [...f.root.querySelectorAll('.ash-root-art path,[data-root-mote],[data-root-echo-field]>*,[data-root-echo-wave]')]
    .map(node=>[node.getAttribute('d'),node.getAttribute('opacity'),node.getAttribute('cx'),node.getAttribute('cy'),node.getAttribute('style'),node.getAttribute('transform')])
    .concat([f.stage.getAttribute('style')]);
}
function coordinates(f) {return f.query('.ash-sky-curtain path').getAttribute('d').match(/-?\d*\.?\d+/g).map(Number);}
function light(f) {return parseFloat(f.stage.style.getPropertyValue('--root-light-x'));}

test('enhancement enables the inscription without starting motion or exposing dormant controls',t=>{
  const f=fixture(t),before=pose(f);f.advance(1000);
  assert.equal(f.root.dataset.ready,'true');assert.equal(f.awaken.disabled,false);
  assert.equal(f.root.dataset.awake,'false');assert.equal(f.root.dataset.motion,'paused');assert.equal(f.pending,0);
  assert.equal(f.query('[data-root-reading]').hidden,true);assert.equal(f.query('[data-root-controls]').hidden,true);
  assert.equal(f.query('[data-root-hint]').textContent,'TOUCH THE SIGN · FOLLOW THE LIGHT');
  assert.deepEqual(selectedRealms(f),[]);assert.deepEqual(pose(f),before);
});
test('awakening reveals one readable realm; selecting all nine updates matching sigils and threads',t=>{
  const f=fixture(t);f.awaken.click();
  assert.equal(f.root.dataset.awake,'true');assert.equal(f.root.dataset.motion,'running');assert.equal(f.pending,1);
  assert.equal(f.awaken.getAttribute('aria-pressed'),'true');assert.equal(f.query('[data-root-reading]').hidden,false);
  assert.deepEqual(selectedRealms(f),['0']);
  for(let index=0;index<9;index++){
    f.realm(index).click();
    assert.deepEqual(selectedRealms(f),[String(index)]);assert.deepEqual(selectedThreads(f),[String(index)]);assert.deepEqual(selectedSigils(f),[String(index)]);
    assert.equal(f.sigilButton(index).getAttribute('aria-pressed'),'true');
    assert.match(f.query('[data-root-label]').textContent,new RegExp(`^符文 ${index} · [IVX]+ / IX REMEMBERED$`));assert.equal(f.root.dataset.remembered,String(index+1));
    assert.equal(f.query('[data-root-title]').textContent,`九界 ${index}`);assert.equal(f.query('[data-root-story]').textContent,`第 ${index} 界的故事。`);
  }
  f.realm(3).dataset.realmStory='<img src="missing" onerror="alert(1)">';f.realm(3).click();
  assert.equal(f.query('[data-root-story]').textContent,'<img src="missing" onerror="alert(1)">');assert.equal(f.query('[data-root-story]').children.length,0);
});
test('DRIFT visibly deforms the curtain without pointer input instead of translating a rigid layer',t=>{
  const f=fixture(t);f.awaken.click();const before=coordinates(f);f.advance(2000);const after=coordinates(f);
  const changes=after.map((value,index)=>value-before[index]);
  assert.ok(changes.some(delta=>Math.abs(delta)>10),'No visible movement over two seconds');
  const vertical=changes.filter((_,index)=>index%2===1);
  assert.ok(Math.max(...vertical)-Math.min(...vertical)>10,'All points translate together');
  assert.ok(after.every(Number.isFinite));assert.notEqual(f.query('[data-root-mote]').getAttribute('cx'),'400');
  assert.notEqual(f.query('[data-root-thread="0"]').style.strokeDashoffset,'');
  assert.equal(f.requested,0,'Effect bypasses the shared scheduler');assert.equal(f.pending,1);
});
test('STILL holds the complete current pose and resumes from it without a time jump',t=>{
  const f=fixture(t);f.awaken.click();f.advance(1600);f.query('[data-root-echo]').click();f.advance(700);
  f.query('[data-root-still]').click();const held=pose(f),before=coordinates(f);
  assert.equal(f.pending,0);assert.equal(f.root.dataset.motion,'paused');assert.equal(f.root.dataset.still,'true');
  assert.equal(f.query('[data-root-still]').getAttribute('aria-pressed'),'true');assert.equal(f.query('[data-root-echo]').getAttribute('aria-disabled'),'true');
  assert.match(f.query('[data-root-still]').getAttribute('aria-label'),/恢复/);assert.match(f.query('[data-root-hint]').textContent,/A MOMENT HELD/);
  f.pointer(950,300);f.advance(60000);assert.deepEqual(pose(f),held);assert.equal(f.root.dataset.echo,'true');
  f.sigilButton(5).click();assert.deepEqual(selectedRealms(f),['5']);
  f.query('[data-root-still]').click();assert.deepEqual(coordinates(f),before);f.advance(50);
  const after=coordinates(f);assert.ok(after.some((value,index)=>value!==before[index]));
  assert.ok(after.every((value,index)=>Math.abs(value-before[index])<2),'Resuming jumps to wall-clock time');
  assert.equal(f.root.dataset.motion,'running');assert.equal(f.root.dataset.still,'false');assert.match(f.query('[data-root-hint]').textContent,/LIGHT IN MOTION/);
  f.advance(4000);assert.equal(f.root.dataset.echo,'false');
});
test('pointer light eases toward the latest target and returns gradually on leave',t=>{
  const f=fixture(t);f.awaken.click();f.advance(100);assert.equal(light(f),50);
  f.pointer(400,250);f.pointer(800,460);f.pointer(1100,700);assert.equal(light(f),50);
  f.advance(100);const first=light(f);assert.ok(first>50&&first<65,'Pointer snaps to its target');
  f.advance(1000);assert.ok(light(f)>first&&light(f)<90);
  const before=light(f);f.leave();assert.equal(light(f),before);f.advance(100);
  assert.ok(light(f)<before&&light(f)>50,'Leaving snaps to the center');
  f.pointer(-200,-300);f.advance(8000);assert.ok(light(f)>=10&&light(f)<11);
  f.pointer(1600,1200);f.advance(8000);assert.ok(light(f)<=90&&light(f)>89);assert.equal(f.pending,1);assert.equal(f.requested,0);
});
test('offscreen, hidden and page-cache states suspend the clock and preserve the story and pose',t=>{
  const f=fixture(t);f.awaken.click();f.realm(5).click();f.advance(1000);
  for(const [pause,resume] of [[()=>f.visible(false),()=>f.visible(true)],[()=>f.hidden(true),()=>f.hidden(false)],[()=>f.transition('pagehide'),()=>f.transition('pageshow')]]){
    pause();const held=pose(f);assert.equal(f.root.dataset.motion,'paused');assert.equal(f.pending,0);
    f.pointer(900,300);f.advance(6000);assert.deepEqual(pose(f),held);
    resume();assert.equal(f.root.dataset.motion,'running');assert.deepEqual(pose(f),held);assert.deepEqual(selectedRealms(f),['5']);
    f.advance(50);assert.notDeepEqual(pose(f),held);
  }
});
test('economy retains genuine drift at a lower frame rate and STILL also works there',t=>{
  const f=fixture(t);f.awaken.click();const full=f.fps;f.motion({economy:true});
  assert.ok(f.fps<full&&f.fps>=15);assert.equal(f.root.dataset.motion,'running');assert.equal(f.root.dataset.still,'false');
  const before=pose(f);f.advance(1000);assert.notDeepEqual(pose(f),before);
  f.query('[data-root-still]').click();const held=pose(f);f.advance(1000);assert.deepEqual(pose(f),held);
  f.motion({economy:false});assert.equal(f.root.dataset.motion,'paused');assert.equal(f.fps,full);
});
test('reduced motion reports STILL honestly and keeps stories available without scheduling animation',t=>{
  const f=fixture(t,{reduced:true});f.awaken.click();f.realm(7).click();const before=pose(f);f.pointer(700,400);f.advance(2000);
  assert.equal(f.root.dataset.motion,'paused');assert.equal(f.root.dataset.still,'true');assert.equal(f.pending,0);assert.deepEqual(pose(f),before);
  assert.equal(f.query('[data-root-still]').disabled,true);assert.equal(f.query('[data-root-still]').getAttribute('aria-pressed'),'true');
  assert.match(f.query('[data-root-still]').getAttribute('aria-label'),/减弱动态/);assert.equal(f.query('[data-root-echo]').disabled,false);assert.deepEqual(selectedRealms(f),['7']);
  f.reduced(false);assert.equal(f.root.dataset.motion,'running');assert.equal(f.query('[data-root-still]').disabled,false);
  f.query('[data-root-still]').click();f.reduced(true);f.reduced(false);assert.equal(f.root.dataset.motion,'paused','System changes discard a deliberate pause');
});
test('quiet and global performance restrictions stop all frames and update the visible control state',t=>{
  const f=fixture(t);f.awaken.click();f.advance(300);f.motion({allowed:false});const held=pose(f);
  assert.equal(f.root.dataset.motion,'paused');assert.equal(f.root.dataset.still,'true');assert.equal(f.pending,0);f.advance(1000);assert.deepEqual(pose(f),held);
  f.motion({allowed:true});assert.equal(f.root.dataset.motion,'running');assert.equal(f.root.dataset.still,'false');
  f.w.document.documentElement.classList.add('garden-lite-motion');f.motion({});assert.equal(f.root.dataset.motion,'paused');assert.equal(f.query('[data-root-still]').disabled,true);
  f.realm(8).click();assert.deepEqual(selectedRealms(f),['8']);
});
test('coarse pointers keep the animated atmosphere and native controls without mouse parallax',t=>{
  const f=fixture(t,{fine:false});f.awaken.click();f.realm(4).click();f.pointer(900,400);f.advance(500);
  assert.equal(light(f),50);assert.equal(f.root.dataset.motion,'running');assert.deepEqual(selectedRealms(f),['4']);
  f.query('[data-root-echo]').click();f.advance(500);assert.equal(f.root.dataset.echo,'true');
  f.fine(true);f.pointer(900,400);f.advance(200);assert.ok(light(f)>50);f.fine(false);const before=light(f);f.advance(200);assert.ok(light(f)<before);
});
test('closing rests the clock, clears echoes and preserves the chosen story for reopening',t=>{
  const f=fixture(t);f.awaken.click();f.realm(6).click();f.advance(600);f.query('[data-root-echo]').click();f.awaken.click();
  assert.equal(f.root.dataset.awake,'false');assert.equal(f.pending,0);assert.equal(f.root.dataset.echo,'false');
  assert.equal(f.query('[data-root-reading]').hidden,true);f.realm(1).click();assert.deepEqual(selectedRealms(f),['6']);
  const held=pose(f);f.advance(3000);assert.deepEqual(pose(f),held);
  f.awaken.click();assert.deepEqual(selectedRealms(f),['6']);assert.equal(f.query('[data-root-story]').textContent,'第 6 界的故事。');
});
test('Escape restores focus from hidden control groups and stops all effect work',t=>{
  const f=fixture(t);
  for(const button of [f.realm(4),f.sigilButton(7),f.query('[data-root-echo]'),f.query('[data-root-still]')]){
    f.awaken.click();f.query('[data-root-echo]').click();button.focus();f.escape();
    assert.equal(f.w.document.activeElement,f.awaken);assert.equal(f.query('[data-root-reading]').hidden,true);
    assert.equal(f.query('[data-root-controls]').hidden,true);assert.equal(f.query('[data-root-hotspots]').hidden,true);
    assert.equal(f.root.querySelectorAll('.is-pointed').length,0);assert.equal(f.root.dataset.echo,'false');assert.equal(f.pending,0);
  }
});
test('field sigils are aligned, select the same realm, and hover previews leave the story intact',t=>{
  const f=fixture(t);f.awaken.click();assert.equal(f.query('[data-root-hotspots]').hidden,false);
  assert.equal(f.sigilButton(4).style.left,'470px');assert.equal(f.sigilButton(4).style.top,'240px');f.sigilButton(4).click();
  assert.deepEqual(selectedRealms(f),['4']);assert.deepEqual(selectedThreads(f),['4']);assert.deepEqual(selectedSigils(f),['4']);
  f.sigilButton(5).dispatchEvent(new f.w.MouseEvent('pointerenter'));assert.equal(f.query('[data-root-thread="5"]').classList.contains('is-pointed'),true);
  assert.deepEqual(selectedRealms(f),['4']);assert.equal(f.query('[data-root-title]').textContent,'九界 4');
  f.sigilButton(5).dispatchEvent(new f.w.MouseEvent('pointerleave'));assert.equal(f.root.querySelectorAll('.is-pointed').length,0);
  f.realm(8).focus();assert.equal(f.query('[data-root-sigil="8"]').classList.contains('is-pointed'),true);f.realm(8).blur();assert.equal(f.root.querySelectorAll('.is-pointed').length,0);
});
test('resize hides clipped sigil targets and restores their focus to the corresponding reading control',t=>{
  const f=fixture(t);f.awaken.click();f.sigilButton(6).focus();f.place(6,995,260);
  assert.equal(f.sigilButton(6).hidden,true);assert.equal(f.w.document.activeElement,f.realm(6));
  f.place(6,700,599);assert.equal(f.sigilButton(6).hidden,true);f.place(6,700,300);assert.equal(f.sigilButton(6).hidden,false);assert.equal(f.sigilButton(6).style.left,'700px');
});
test('missing SVG geometry and viewport observation leave the native realm controls usable',t=>{
  const f=fixture(t,{noGeometry:true,noObserver:true});f.awaken.click();f.realm(3).click();
  assert.equal([...f.root.querySelectorAll('[data-root-sigil-button]')].every(button=>button.hidden),true);
  assert.deepEqual(selectedRealms(f),['3']);assert.equal(f.query('[data-root-reading]').hidden,false);assert.equal(f.root.dataset.motion,'running');
});
test('ECHO draws a call and a return before revealing an unseen world and its progress',t=>{
  const f=fixture(t);f.awaken.click();f.query('[data-root-echo]').click();
  assert.equal(f.root.dataset.echoPhase,'calling');assert.equal(f.query('[data-root-echo]').getAttribute('aria-busy'),'true');
  assert.equal(f.query('[data-root-echo-action]').textContent,'CALLING');assert.deepEqual(selectedRealms(f),['0']);
  f.advance(550);
  assert.ok(parseFloat(f.query('[data-root-echo-field] b').style.opacity)>.5,'Call is too faint');
  assert.ok([...f.root.querySelectorAll('.ash-echo-trail')].some(path=>parseFloat(path.style.opacity)>.3),'No visible light routes');
  f.advance(300);assert.ok(f.root.querySelectorAll('[data-root-sigil].is-echoing').length>0);
  f.advance(500);assert.equal(f.query('.ash-echo-trail.is-returning').getAttribute('d'),f.query('[data-root-thread="1"]').getAttribute('d'));
  f.advance(450);assert.deepEqual(selectedRealms(f),['1']);assert.equal(f.root.dataset.echoPhase,'answered');
  assert.equal(f.root.dataset.remembered,'2');assert.equal(f.query('[data-root-echo-name]').textContent,'符文 1');assert.equal(f.query('[data-root-echo-mark]').textContent,'ᛟ');
  assert.equal(f.query('[data-root-label]').textContent,'符文 1 · II / IX REMEMBERED');assert.match(f.query('[data-root-status]').textContent,/回声来自九界 1/);
  assert.equal(f.query('[data-root-echo]').disabled,false);f.advance(2500);assert.equal(f.root.dataset.echo,'false');
  assert.deepEqual(selectedRealms(f),['1']);assert.equal(f.realm(0).classList.contains('is-remembered'),true);assert.equal(f.realm(1).classList.contains('is-remembered'),true);
});
test('repeat calls discover every unseen world, then revisit without adding nodes or timers',t=>{
  const f=fixture(t);f.awaken.click();const nodes=f.root.querySelectorAll('*').length,heard=new Set(['0']);
  for(let i=0;i<8;i++){
    f.query('[data-root-echo]').click();f.advance(2000);const selected=selectedRealms(f)[0];
    assert.equal(heard.has(selected),false,'An already read world was repeated');heard.add(selected);
    assert.equal(f.root.querySelectorAll('*').length,nodes);assert.equal(f.timers.length,0);
  }
  assert.equal(heard.size,9);assert.equal(f.root.dataset.remembered,'9');assert.equal(f.query('[data-root-echo-prompt]').textContent,'REVISIT THE NINE');
  const last=selectedRealms(f)[0];f.query('[data-root-echo]').click();f.advance(2000);assert.notEqual(selectedRealms(f)[0],last);assert.equal(f.root.dataset.remembered,'9');
});
test('rapid repeated calls do not starve the answer and explicit selection cancels a pending response',t=>{
  const f=fixture(t);f.awaken.click();f.query('[data-root-echo]').focus();f.query('[data-root-echo]').click();f.advance(500);
  assert.equal(f.w.document.activeElement,f.query('[data-root-echo]'));assert.equal(f.query('[data-root-echo]').disabled,false);
  for(let i=0;i<10;i++)f.query('[data-root-echo]').click();
  f.advance(1300);assert.deepEqual(selectedRealms(f),['1']);
  f.query('[data-root-echo]').click();f.advance(700);f.sigilButton(6).click();f.advance(5000);
  assert.deepEqual(selectedRealms(f),['6']);assert.equal(f.root.dataset.echo,'false');assert.equal(f.query('[data-root-echo]').getAttribute('aria-busy'),'false');assert.equal(f.root.querySelectorAll('.is-echoing,.is-answering').length,0);
});
test('STILL and reduced motion retain discovery with immediate results and no effect frames',t=>{
  for(const reduced of [false,true]){
    const f=fixture(t,{reduced});f.awaken.click();if(!reduced)f.query('[data-root-still]').click();
    const before=coordinates(f);f.query('[data-root-echo]').click();f.advance(4000);
    assert.deepEqual(selectedRealms(f),['1']);assert.equal(f.root.dataset.remembered,'2');assert.equal(f.root.dataset.echo,'false');
    assert.equal(f.pending,0);assert.deepEqual(coordinates(f),before);assert.equal(f.query('[data-root-echo]').disabled,false);
  }
});
test('a paused call resumes its pending answer, while closing cancels without marking an unseen world',t=>{
  const f=fixture(t);f.awaken.click();f.query('[data-root-echo]').click();f.advance(600);f.query('[data-root-still]').click();
  const held=pose(f);f.advance(10000);assert.deepEqual(pose(f),held);assert.deepEqual(selectedRealms(f),['0']);
  assert.equal(f.query('[data-root-echo-action]').textContent,'HELD');f.query('[data-root-still]').click();f.advance(1200);assert.deepEqual(selectedRealms(f),['1']);
  f.query('[data-root-echo]').click();f.advance(300);f.awaken.click();f.advance(10000);f.awaken.click();
  assert.deepEqual(selectedRealms(f),['1']);assert.equal(f.root.dataset.remembered,'2');assert.equal(f.root.dataset.echo,'false');
});
test('native control clicks do not emit stage echoes and restrictions clear any active echo',t=>{
  const f=fixture(t);f.stage.click();assert.equal(f.root.dataset.echo,'false');f.awaken.click();f.sigilButton(4).click();assert.equal(f.root.dataset.echo,'false');
  f.query('[data-root-echo]').click();f.advance(400);f.reduced(true);assert.equal(f.root.dataset.echo,'false');
  f.stage.click();assert.equal(f.root.dataset.echo,'false');assert.equal(f.pending,0);
});
test('fallback scheduling uses one loop, freezes exactly, and observes quiet policy without a theme observer',async t=>{
  const f=fixture(t,{noMotion:true});f.awaken.click();f.advance(1000);assert.equal(f.pending,1);
  assert.deepEqual(f.mutations,[{attributes:true,attributeFilter:['class']}]);
  f.w.document.documentElement.dataset.resolvedTheme='light';await new Promise(setImmediate);assert.equal(f.pending,1);
  f.query('[data-root-still]').click();const held=pose(f);f.advance(2000);assert.deepEqual(pose(f),held);assert.equal(f.pending,0);
  f.query('[data-root-still]').click();assert.equal(f.pending,1);f.advance(50);assert.notDeepEqual(pose(f),held);
  f.w.document.documentElement.classList.add('garden-lite-motion');await new Promise(setImmediate);assert.equal(f.pending,0);assert.equal(f.root.dataset.still,'true');
});
