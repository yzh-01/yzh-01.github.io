const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
// Replace only the import transport; the lifecycle and error handling run as shipped.
const code=fs.readFileSync(path.join(__dirname,'../themes/garden/source/js/sanctuary.js'),'utf8')
  .replace('import(scene.dataset.worldModule)','window.importWorld(scene.dataset.worldModule)');
function fixture(t,{fail=false,throwOnCreate=false,noObserver=false}={}) {
  const dom=new JSDOM(`<section data-ash-sanctuary><div data-ash-landscape data-model-state="idle" data-world-module="/js/sanctuary-world.js?v=test"><img alt="世界树的静态微缩景观"><canvas data-ash-canvas aria-hidden="true" tabindex="-1"></canvas></div><p data-ash-status></p></section>`,{url:'https://garden.test',runScripts:'outside-only'});
  const w=dom.window;t.after(()=>w.close());
  let resolve,reject,creates=0,destroys=0,callbacks;
  const imports=[],states=[],observers=[];
  const deferred=new Promise((yes,no)=>{resolve=yes;reject=no;});
  w.importWorld=src=>{imports.push(src);return deferred;};
  if(!noObserver) w.IntersectionObserver=class {
    constructor(fn,options){this.fn=fn;this.options=options;this.disconnected=false;observers.push(this);}
    observe(){} disconnect(){this.disconnected=true;}
  };
  const model={setActive:value=>states.push(value),destroy:()=>destroys++};
  const module={createSanctuary:(host,options)=>{
    creates++;if(throwOnCreate)throw new Error('WebGL unavailable');callbacks=options;options.onReady();return model;
  }};
  w.eval(code);
  const scene=w.document.querySelector('[data-ash-landscape]');
  return {w,scene,states,imports,observers,
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
});
test('preloading and entering the viewport share one import; leaving stops and returning resumes',async t=>{
  const f=fixture(t);f.near();f.visible(true);await f.finish();
  assert.equal(f.imports.length,1);assert.equal(f.creates,1);assert.equal(f.scene.dataset.modelState,'ready');
  assert.equal(f.scene.querySelector('canvas').tabIndex,0);assert.equal(f.scene.querySelector('canvas').hasAttribute('aria-hidden'),false);
  f.visible(false);f.visible(true);assert.deepEqual(f.states,[true,false,true]);assert.equal(f.imports.length,1);
});
test('a failed module request preserves the poster and removes unusable keyboard targets',async t=>{
  const f=fixture(t,{fail:true});f.visible(true);await f.finish();
  assert.equal(f.creates,0);assert.equal(f.scene.dataset.modelState,'fallback');
  assert.equal(f.scene.querySelector('canvas').tabIndex,-1);assert.ok(f.scene.querySelector('img'));
  f.visible(false);f.visible(true);assert.equal(f.imports.length,1);
});
test('an unavailable WebGL context falls back without breaking the rest of the page',async t=>{
  const f=fixture(t,{throwOnCreate:true});f.visible(true);await f.finish();
  assert.equal(f.scene.dataset.modelState,'fallback');assert.match(f.w.document.querySelector('[data-ash-status]').textContent,/静态/);
});
test('context restoration restores focus access, and awakening announces the new state',async t=>{
  const f=fixture(t);f.visible(true);await f.finish();
  f.callbacks.onFallback();assert.equal(f.scene.dataset.modelState,'fallback');
  f.callbacks.onReady();assert.equal(f.scene.dataset.modelState,'ready');assert.equal(f.scene.querySelector('canvas').tabIndex,0);
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
