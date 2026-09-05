const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const code = fs.readFileSync(path.join(__dirname, '../themes/garden/source/js/sanctuary.js'), 'utf8');

function fixture(t) {
  const dom = new JSDOM(`<section data-ash-sanctuary><div data-ash-landscape>
    <svg><g data-ash-layer="far"></g><g data-ash-layer="tree"></g><g data-ash-layer="near"></g></svg>
    <button data-ash-heart hidden></button></div><div data-ash-controls hidden>
    <button data-ash-awaken><span data-ash-action></span></button>
    <button data-ash-weather><span data-ash-weather-label></span></button></div>
    <span data-ash-status></span><b data-ash-count></b></section>`, { runScripts: 'outside-only' });
  const w = dom.window;
  t.after(() => w.close());
  let observer, notify, hidden = false, economy = false, serial = 0;
  const frames = new Map();
  const reduced = new w.EventTarget(); reduced.matches = false;
  w.matchMedia = q => q.includes('reduced') ? reduced : { matches: true };
  Object.defineProperty(w.document, 'hidden', {get: () => hidden});
  w.IntersectionObserver = class { constructor(fn) { observer = fn; } observe() {} };
  w.requestAnimationFrame = fn => { frames.set(++serial, fn); return serial; };
  w.cancelAnimationFrame = id => frames.delete(id);
  w.GardenMotion = { canAnimate: () => !hidden, isEconomy: () => economy, subscribe: fn => { notify = fn; } };
  w.eval(code);
  const scene = w.document.querySelector('[data-ash-landscape]');
  scene.getBoundingClientRect = () => ({left:0, top:0, width:1200, height:660});
  observer([{isIntersecting:true}]);
  return {w, scene, frames, reduced,
    get: selector => w.document.querySelector(selector),
    visible: value => observer([{isIntersecting:value}]),
    hide: value => { hidden = value; w.document.dispatchEvent(new w.Event('visibilitychange')); },
    economy: value => { economy = value; notify(); },
    move: () => scene.dispatchEvent(new w.MouseEvent('pointermove', {clientX:1000, clientY:180})),
    settle: () => { for(let i=0; i<200 && frames.size; i++) { const batch=[...frames.values()]; frames.clear(); batch.forEach(fn=>fn((i+1)*16)); } }
  };
}

test('heart and toolbar stay synchronized through rapid toggles; weather is independent', t => {
  const f = fixture(t);
  f.get('[data-ash-heart]').click();
  assert.equal(f.scene.dataset.awake, 'true');
  assert.equal(f.get('[data-ash-awaken]').getAttribute('aria-pressed'), 'true');
  assert.equal(f.get('[data-ash-count]').textContent, '9 / 9');
  f.get('[data-ash-weather]').click();
  assert.equal(f.scene.dataset.weather, 'clear');
  f.get('[data-ash-awaken]').click();
  assert.equal(f.scene.dataset.awake, 'false');
  assert.equal(f.get('[data-ash-heart]').getAttribute('aria-pressed'), 'false');
  assert.equal(f.scene.dataset.weather, 'clear');
  assert.equal(f.get('[data-ash-sanctuary]').dataset.instant, 'true');
});

test('parallax settles and cancels immediately offscreen, on hidden tabs and in economy mode', t => {
  const f = fixture(t);
  f.move(); assert.equal(f.frames.size, 1);
  f.settle(); assert.equal(f.frames.size, 0);
  assert.notEqual(f.get('[data-ash-layer]').style.transform, '');
  f.move(); f.visible(false); assert.equal(f.frames.size, 0);
  assert.equal(f.scene.dataset.paused, 'true');
  f.visible(true); f.move(); f.hide(true); assert.equal(f.frames.size, 0);
  f.hide(false); f.move(); f.economy(true); assert.equal(f.frames.size, 0);
  assert.equal(f.get('[data-ash-layer]').style.transform, '');
});

test('changing reduced-motion preference stops pending movement while controls remain usable', t => {
  const f = fixture(t);
  f.move(); f.reduced.matches = true; f.reduced.dispatchEvent(new f.w.Event('change'));
  assert.equal(f.frames.size, 0);
  assert.equal(f.scene.dataset.paused, 'true');
  f.get('[data-ash-heart]').click();
  assert.equal(f.scene.dataset.awake, 'true');
  assert.equal(f.get('[data-ash-count]').textContent, '9 / 9');
});
