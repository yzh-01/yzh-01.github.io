const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
// Replace only the import transport; the lifecycle and error handling run as shipped.
const code=fs.readFileSync(path.join(__dirname,'../themes/garden/source/js/sanctuary.js'),'utf8')
  .replace('import(scene.dataset.worldModule)','window.importWorld(scene.dataset.worldModule)');
function fixture(t,{fail=false,throwOnCreate=false,noObserver=false}={}) {
  const dom=new JSDOM(`<section data-ash-sanctuary>
    <div data-ash-exhibit data-exploring="false">
      <div data-ash-landscape data-model-state="idle" data-world-module="/js/sanctuary-world.js?v=test"><img class="ash-model-poster" alt="世界树的静态微缩景观"><canvas data-ash-canvas aria-hidden="true" tabindex="-1"></canvas></div>
      <div data-ash-controls hidden>
        <b data-ash-mode-label></b><span data-ash-mode-help></span>
        <button data-ash-explore aria-pressed="false"><span data-ash-explore-label>探索模型</span></button>
        <button data-ash-action="zoom-in">+</button><output data-ash-zoom>100%</output><button data-ash-action="zoom-out">−</button>
        <button data-ash-action="reset">复位</button><button data-ash-action="next">下一界</button><button data-ash-action="rain" aria-pressed="true">细雨</button>
      </div>
      <span data-ash-discovery-label></span><strong data-ash-discovery-title></strong><p data-ash-discovery-body></p><span data-ash-count hidden>寻访 0 / 9</span>
    </div><p data-ash-status></p>
  </section>`,{url:'https://garden.test',runScripts:'outside-only'});
  const w=dom.window;t.after(()=>w.close());
  let resolve,reject,creates=0,destroys=0,callbacks;
  const imports=[],states=[],observers=[],commands=[];
  const deferred=new Promise((yes,no)=>{resolve=yes;reject=no;});
  w.importWorld=src=>{imports.push(src);return deferred;};
  if(!noObserver) w.IntersectionObserver=class {
    constructor(fn,options){this.fn=fn;this.options=options;this.disconnected=false;observers.push(this);}
    observe(){} disconnect(){this.disconnected=true;}
  };
  const model={setActive:value=>{states.push(value);if(!value)callbacks?.onExplore(false);},destroy:()=>destroys++,
    setExploring:value=>{commands.push(['explore',value]);callbacks.onExplore(value);},
    zoomBy:factor=>{commands.push(['zoom',factor]);callbacks.onViewChange(Math.round(factor*100));},
    reset:()=>{commands.push(['reset']);callbacks.onViewChange(100);callbacks.onExplore(false);},
    nextRealm:()=>commands.push(['next']),setRain:value=>{commands.push(['rain',value]);callbacks.onWeather(value);}};
  const module={createSanctuary:(host,options)=>{
    creates++;if(throwOnCreate)throw new Error('WebGL unavailable');callbacks=options;options.onReady();return model;
  }};
  w.eval(code);
  const scene=w.document.querySelector('[data-ash-landscape]');
  return {w,scene,states,imports,observers,commands,query:selector=>w.document.querySelector(selector),
    near:()=>observers[0].fn([{isIntersecting:true}]),
    visible:value=>observers[1].fn([{isIntersecting:value}]),
    finish:async()=>{if(fail)reject(new Error('offline'));else resolve(module);await new Promise(yes=>setImmediate(yes));},
    get creates(){return creates;},get destroys(){return destroys;},get callbacks(){return callbacks;},
    transition:(name,persisted)=>w.dispatchEvent(new w.PageTransitionEvent(name,{persisted}))};
}

test('first screen keeps the optional renderer unloaded and the static poster accessible',t=>{
  const f=fixture(t);assert.equal(f.imports.length,0);assert.equal(f.creates,0);
  assert.equal(f.scene.dataset.modelState,'idle');assert.equal(f.scene.querySelector('canvas').tabIndex,-1);
  assert.ok(f.scene.querySelector('img').alt.includes('世界树'));
  assert.equal(f.query('[data-ash-controls]').hidden,true);
  assert.equal(f.query('[data-ash-count]').hidden,true);
});
test('preloading and entering the viewport share one import; leaving stops and returning resumes',async t=>{
  const f=fixture(t);f.near();f.visible(true);await f.finish();
  assert.equal(f.imports.length,1);assert.equal(f.creates,1);assert.equal(f.scene.dataset.modelState,'ready');
  assert.equal(f.scene.querySelector('canvas').tabIndex,0);assert.equal(f.scene.querySelector('canvas').hasAttribute('aria-hidden'),false);
  assert.equal(f.query('[data-ash-controls]').hidden,false);assert.equal(f.scene.querySelector('img').getAttribute('aria-hidden'),'true');
  assert.equal(f.query('[data-ash-count]').hidden,false);
  f.visible(false);f.visible(true);assert.deepEqual(f.states,[true,false,true]);assert.equal(f.imports.length,1);
});
test('a failed module request preserves the poster and removes unusable keyboard targets',async t=>{
  const f=fixture(t,{fail:true});f.visible(true);await f.finish();
  assert.equal(f.creates,0);assert.equal(f.scene.dataset.modelState,'fallback');
  assert.equal(f.scene.querySelector('canvas').tabIndex,-1);assert.ok(f.scene.querySelector('img'));
  assert.equal(f.query('[data-ash-controls]').hidden,true);assert.equal(f.scene.querySelector('img').hasAttribute('aria-hidden'),false);
  assert.equal(f.query('[data-ash-count]').hidden,true);
  f.visible(false);f.visible(true);assert.equal(f.imports.length,1);
});
test('an unavailable WebGL context falls back without breaking the rest of the page',async t=>{
  const f=fixture(t,{throwOnCreate:true});f.visible(true);await f.finish();
  assert.equal(f.scene.dataset.modelState,'fallback');assert.match(f.w.document.querySelector('[data-ash-status]').textContent,/静态/);
});
test('context restoration restores focus access, and awakening announces the new state',async t=>{
  const f=fixture(t);f.visible(true);await f.finish();
  f.callbacks.onFallback();assert.equal(f.scene.dataset.modelState,'fallback');
  assert.equal(f.query('[data-ash-controls]').hidden,true);
  f.callbacks.onReady();assert.equal(f.scene.dataset.modelState,'ready');assert.equal(f.scene.querySelector('canvas').tabIndex,0);
  assert.equal(f.query('[data-ash-controls]').hidden,false);
  f.callbacks.onAwake(true);assert.match(f.w.document.querySelector('[data-ash-status]').textContent,/已点亮/);
});
test('back-forward cache pauses and resumes the retained model, while final navigation disposes it',async t=>{
  const f=fixture(t);f.visible(true);await f.finish();
  f.transition('pagehide',true);assert.equal(f.states.at(-1),false);assert.equal(f.destroys,0);
  f.transition('pageshow',true);assert.equal(f.states.at(-1),true);
  f.transition('pagehide',false);assert.equal(f.destroys,1);assert.ok(f.observers.every(o=>o.disconnected));
});
test('a navigation during loading does not mount an abandoned renderer',async t=>{
  const f=fixture(t);f.near();f.transition('pagehide',false);await f.finish();assert.equal(f.creates,0);
});
test('browsers without IntersectionObserver still mount and pause the scene during navigation',async t=>{
  const f=fixture(t,{noObserver:true});await f.finish();assert.equal(f.scene.dataset.modelState,'ready');assert.deepEqual(f.states,[true]);
  f.transition('pagehide',true);assert.equal(f.states.at(-1),false);assert.equal(f.destroys,0);
  f.transition('pageshow',true);assert.equal(f.states.at(-1),true);
  f.transition('pagehide',false);assert.equal(f.destroys,1);
});

test('exploration explicitly changes the border state and wheel guidance, with several ways to return to page browsing',async t=>{
  const f=fixture(t);f.visible(true);await f.finish();
  const button=f.query('[data-ash-explore]'),exhibit=f.query('[data-ash-exhibit]');
  assert.match(f.query('[data-ash-mode-label]').textContent,/滚轮浏览页面/);
  button.click();assert.equal(exhibit.dataset.exploring,'true');assert.equal(button.getAttribute('aria-pressed'),'true');
  assert.match(f.query('[data-ash-mode-label]').textContent,/模型内滚轮缩放/);
  f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(exhibit.dataset.exploring,'false');
  button.click();exhibit.dispatchEvent(new f.w.MouseEvent('pointerleave'));assert.equal(exhibit.dataset.exploring,'false');
  button.click();f.w.document.body.dispatchEvent(new f.w.MouseEvent('pointerdown',{bubbles:true}));assert.equal(exhibit.dataset.exploring,'false');
  button.click();f.visible(false);assert.equal(exhibit.dataset.exploring,'false');
  assert.equal(button.getAttribute('aria-pressed'),'false');
});

test('view controls delegate to the model and report scale; reset releases exploration',async t=>{
  const f=fixture(t);f.visible(true);await f.finish();
  f.query('[data-ash-action="zoom-in"]').click();assert.deepEqual(f.commands.at(-1),['zoom',1.15]);assert.equal(f.query('[data-ash-zoom]').value,'115%');
  f.query('[data-ash-action="zoom-out"]').click();assert.deepEqual(f.commands.at(-1),['zoom',1/1.15]);
  f.query('[data-ash-explore]').click();f.query('[data-ash-action="reset"]').click();
  assert.equal(f.query('[data-ash-zoom]').value,'100%');assert.equal(f.query('[data-ash-exhibit]').dataset.exploring,'false');
  f.query('[data-ash-action="next"]').click();assert.deepEqual(f.commands.at(-1),['next']);
});

test('discoveries show individual stories and cumulative progress, with matching screen-reader feedback',async t=>{
  const f=fixture(t);f.visible(true);await f.finish();
  f.callbacks.onRealm({label:'ÁSGARÐR',name:'阿斯加德',story:'神明的居所。',visited:1,total:9});
  assert.equal(f.query('[data-ash-discovery-title]').textContent,'阿斯加德');assert.equal(f.query('[data-ash-count]').textContent,'寻访 1 / 9');
  assert.match(f.query('[data-ash-status]').textContent,/阿斯加德.*1 \/ 9/);
  f.callbacks.onRealm({label:'HELHEIMR',name:'赫尔海姆',story:'长夜深处的归所。',visited:9,total:9});
  assert.match(f.query('[data-ash-status]').textContent,/九界已相连/);
});

test('weather and miniature details provide feedback, and context restoration preserves the latest story',async t=>{
  const f=fixture(t);f.visible(true);await f.finish();
  const rain=f.query('[data-ash-action="rain"]');rain.click();assert.deepEqual(f.commands.at(-1),['rain',false]);assert.equal(rain.getAttribute('aria-pressed'),'false');
  rain.click();assert.deepEqual(f.commands.at(-1),['rain',true]);assert.equal(rain.getAttribute('aria-pressed'),'true');
  f.callbacks.onInteract({label:'URÐARBRUNNR',title:'乌尔德之泉',story:'泉水接住一段回声。'});
  assert.match(f.query('[data-ash-status]').textContent,/乌尔德之泉/);
  f.query('[data-ash-explore]').click();f.callbacks.onFallback();assert.equal(f.query('[data-ash-exhibit]').dataset.exploring,'false');
  f.callbacks.onReady();assert.equal(f.query('[data-ash-discovery-title]').textContent,'乌尔德之泉');
});
