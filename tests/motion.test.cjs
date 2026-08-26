const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const jsDir = path.join(__dirname, '../themes/garden/source/js');
const settle = async () => { for (let i = 0; i < 3; i++) await new Promise(setImmediate); };

function fixture(t, options = {}) {
  const dom = new JSDOM(`<section class="folio-cover" data-motion-section></section>
    <section data-folio-outro data-motion-section></section>
    <canvas data-kinetic-veil></canvas><canvas data-garden-particles></canvas>
    <button data-performance-choice="auto"></button><button data-performance-choice="full"></button>
    <button data-performance-choice="economy"></button><p data-performance-status></p>`,
  { url: 'https://garden.test/', runScripts: 'outside-only' });
  const { window } = dom;
  t.after(() => window.close());
  let time = 0, serial = 0, hidden = false, nextDisplay = 0, rafCalls = 0;
  const timers = new Map(), frames = new Map(), observers = [];
  const reduced = new window.EventTarget();
  reduced.matches = false;
  window.matchMedia = () => reduced;
  Object.defineProperty(window.document, 'hidden', { get: () => hidden });
  Object.defineProperty(window.performance, 'now', { value: () => time });
  window.setTimeout = (fn, delay = 0) => { const id = ++serial; timers.set(id, { fn, at: time + delay }); return id; };
  window.clearTimeout = id => timers.delete(id);
  window.requestAnimationFrame = fn => { const id = ++serial; frames.set(id, fn); return id; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
  };
  const cover = window.document.querySelector('.folio-cover');
  const outro = window.document.querySelector('[data-folio-outro]');
  cover.getBoundingClientRect = () => ({ top: 0, bottom: 800 });
  outro.getBoundingClientRect = () => ({ top: 3000, bottom: 4000 });
  const battery = new window.EventTarget();
  battery.charging = options.charging !== false;
  if (options.battery !== 'missing') window.navigator.getBattery = () => options.battery === 'denied' ? Promise.reject(new Error('denied')) : Promise.resolve(battery);
  if (options.mode) window.localStorage.setItem('garden-performance', options.mode);
  window.eval(fs.readFileSync(path.join(jsDir, 'motion.js'), 'utf8'));
  return {
    window, reduced, battery, cover, outro, motion: window.GardenMotion,
    choose(mode) { window.document.querySelector(`[data-performance-choice="${mode}"]`).click(); },
    visible(element, value) { observers[0].callback([{ target: element, isIntersecting: value }]); },
    hide(value) { hidden = value; window.document.dispatchEvent(new window.Event('visibilitychange')); },
    pending() { return timers.size + frames.size; },
    calls() { return rafCalls; },
    advance(ms, refreshRate = 144) {
      const end = time + ms;
      for (; time < end; time += 1) {
        for (const [id, timer] of [...timers]) if (timer.at <= time) { timers.delete(id); timer.fn(); }
        if (time >= nextDisplay) {
          nextDisplay = time + 1000 / refreshRate;
          const callbacks = [...frames.values()]; frames.clear();
          for (const callback of callbacks) { rafCalls += 1; callback(time); }
        }
      }
    }
  };
}

test('automatic policy reacts to charging changes without overriding an explicit choice', async t => {
  const f = fixture(t, { charging: false });
  await settle();
  assert.equal(f.motion.isEconomy(), true);
  assert.match(f.window.document.querySelector('[data-performance-status]').textContent, /电池供电/);
  f.battery.charging = true;
  f.battery.dispatchEvent(new f.window.Event('chargingchange'));
  assert.equal(f.motion.isEconomy(), false);
  f.choose('full');
  f.battery.charging = false;
  f.battery.dispatchEvent(new f.window.Event('chargingchange'));
  assert.equal(f.motion.isEconomy(), false);
  f.choose('auto');
  assert.equal(f.motion.isEconomy(), true);
});

test('missing or denied battery API still permits manual economy mode', async t => {
  for (const battery of ['missing', 'denied']) {
    const f = fixture(t, { battery });
    await settle();
    assert.equal(f.motion.isEconomy(), false);
    f.choose('economy');
    assert.equal(f.motion.isEconomy(), true);
    assert.equal(f.window.localStorage.getItem('garden-performance'), 'economy');
  }
});

test('24fps scenes do not poll at 144Hz; offscreen and hidden loops leave no scheduled work', t => {
  const f = fixture(t);
  let draws = 0, maxDelta = 0;
  const loop = f.motion.createLoop((now, delta) => { draws += 1; maxDelta = Math.max(maxDelta, delta); },
    { fps: 24, enabled: () => f.motion.isVisible(f.cover) });
  loop.start();
  f.advance(1000);
  assert.ok(draws >= 20 && draws <= 25, `draws: ${draws}`);
  assert.ok(f.calls() < 40, `RAF callbacks: ${f.calls()}`);
  f.visible(f.cover, false);
  const paused = draws;
  f.advance(1000);
  assert.equal(draws, paused);
  assert.equal(f.pending(), 0);
  f.visible(f.cover, true);
  f.hide(true);
  f.advance(5000);
  assert.equal(draws, paused);
  assert.equal(f.pending(), 0);
  f.hide(false);
  f.advance(1000);
  assert.ok(draws > paused);
  assert.ok(maxDelta <= 100, 'background time must not cause a simulation jump');
});

test('one-shot pointer tasks coalesce requests, settle, and honor reduced motion even in full mode', t => {
  const f = fixture(t);
  let frames = 0;
  const task = f.motion.createLoop(() => { frames += 1; }, { continuous: false, fps: 30 });
  for (let i = 0; i < 100; i++) task.start();
  f.advance(1000);
  assert.equal(frames, 1);
  assert.equal(f.pending(), 0);
  f.reduced.matches = true;
  f.reduced.dispatchEvent(new f.window.Event('change'));
  f.choose('full');
  task.start();
  f.advance(1000);
  assert.equal(frames, 1);
  assert.equal(f.pending(), 0);
});

test('economy scroll pause resumes after scrolling stops', t => {
  const f = fixture(t, { mode: 'economy' });
  let draws = 0;
  f.motion.createLoop(() => { draws += 1; }, { fps: 12, enabled: () => !f.motion.isScrolling() }).start();
  f.advance(100);
  f.window.dispatchEvent(new f.window.Event('scroll'));
  const before = draws;
  f.advance(130);
  assert.equal(draws, before);
  f.advance(200);
  assert.ok(draws > before);
});

test('quiet mode immediately stops existing loops and cannot be overridden by full quality', async t => {
  const f = fixture(t);
  let draws = 0;
  f.motion.createLoop(() => { draws += 1; }).start();
  f.advance(100);
  const before = draws;
  f.window.document.documentElement.classList.add('garden-lite-motion');
  await settle();
  f.choose('full');
  f.advance(1000);
  assert.equal(draws, before);
  assert.equal(f.pending(), 0);
});

test('actual canvas code stops hidden particle painting and lowers veil resolution on economy', async t => {
  const f = fixture(t, { mode: 'full' });
  const paints = new Map();
  f.window.HTMLCanvasElement.prototype.getContext = function () {
    const canvas = this;
    paints.set(canvas, 0);
    return new Proxy({
      clearRect() { paints.set(canvas, paints.get(canvas) + 1); },
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; }
    }, { get: (target, key) => target[key] || (() => {}) });
  };
  const site = fs.readFileSync(path.join(jsDir, 'site.js'), 'utf8');
  const extract = (start, end) => site.slice(site.indexOf('  function ' + start), site.indexOf('  function ' + end));
  f.window.eval(`var motion = window.GardenMotion; function gardenMotionIsLite() { return false; }
    ${extract('setupKineticVeil()', 'setupFieldMotion()')}
    ${extract('setupGardenParticles()', 'setupGardenPet()')}
    setupKineticVeil(); setupGardenParticles();`);
  await settle();
  const veil = f.window.document.querySelector('[data-kinetic-veil]');
  const particles = f.window.document.querySelector('[data-garden-particles]');
  f.advance(1000);
  assert.ok(paints.get(particles) > 10);
  f.visible(f.cover, false);
  f.visible(f.outro, true);
  const stopped = [...paints.values()];
  f.advance(1000);
  assert.deepEqual([...paints.values()], stopped);
  assert.equal(f.pending(), 0);
  f.choose('economy');
  f.visible(f.outro, false);
  f.visible(f.cover, true);
  const particleCount = paints.get(particles);
  const veilCount = paints.get(veil);
  f.advance(1000);
  assert.equal(paints.get(particles), particleCount);
  assert.equal(particles.hidden, true);
  assert.equal(veil.width, f.window.innerWidth);
  assert.ok(paints.get(veil) - veilCount >= 10 && paints.get(veil) - veilCount <= 13);
});
