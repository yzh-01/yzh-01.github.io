const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const scripts = path.join(__dirname, '../themes/garden/source/js');

function fixture(t, options = {}) {
  const dom = new JSDOM(`<section class="folio-cover" data-motion-section>
    <div data-norse-drift></div>
    <svg><path data-aurora-layer="0"/><path data-aurora-layer="1"/></svg>
    <button data-norse-awaken hidden aria-pressed="false"><span data-norse-action></span></button>
    <aside data-home-quote-card><blockquote data-home-quote></blockquote>
      <strong data-home-quote-author></strong><cite data-home-quote-work></cite>
      <button data-home-quote-next></button><div data-home-quote-pool hidden>
        <span data-quote-author="一" data-quote-work="甲">第一句</span>
        <span data-quote-author="二" data-quote-work="乙">第二句</span>
      </div></aside></section>`, { url: 'https://garden.test/', runScripts: 'outside-only' });
  const { window } = dom;
  t.after(() => window.close());
  const root = window.document.documentElement;
  const cover = window.document.querySelector('.folio-cover');
  const reduced = new window.EventTarget();
  reduced.matches = !!options.reduced;
  const fine = new window.EventTarget(); fine.matches = true;
  window.matchMedia = query => query.includes('reduced-motion') ? reduced : fine;
  const frames = new Map(), timers = new Map(), subscribers = [], loops = [];
  let serial = 0, now = 0, hidden = false, economy = false, visible = true, observe;
  Object.defineProperty(window.document, 'hidden', { get: () => hidden });
  window.requestAnimationFrame = fn => { frames.set(++serial, fn); return serial; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.setTimeout = (fn, ms = 0) => { timers.set(++serial, { fn, at: now + ms }); return serial; };
  window.clearTimeout = id => timers.delete(id);
  if (!options.noObserver) window.IntersectionObserver = class {
    constructor(callback) { observe = callback; }
    observe() {}
  };
  window.GardenMotion = {
    canAnimate: () => !hidden && !reduced.matches && !root.classList.contains('garden-lite-motion'),
    isEconomy: () => economy,
    isVisible: () => visible,
    isScrolling: () => false,
    subscribe: fn => subscribers.push(fn),
    createLoop(render, options) {
      const loop = { render, options, active: false }; loops.push(loop);
      return { start() { loop.active = true; }, stop() { loop.active = false; } };
    }
  };
  cover.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 800 });
  if (options.boot) root.classList.add('garden-booting');
  const notify = () => subscribers.forEach(fn => fn());
  window.eval(fs.readFileSync(path.join(scripts, 'norse-omen.js'), 'utf8'));
  function advance(ms) {
    const end = now + ms;
    for (; now < end; now += 16) {
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
      const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now));
    }
  }
  return {
    window, root, cover, reduced, notify, advance, frames, timers, loops,
    visible(value) { visible = value; if (observe) observe([{ isIntersecting: value }]); notify(); },
    hidden(value) { hidden = value; window.document.dispatchEvent(new window.Event('visibilitychange')); notify(); },
    economy(value) { economy = value; notify(); },
    move() { cover.dispatchEvent(new window.MouseEvent('pointermove', { clientX: 900, clientY: 100 })); },
    loadQuotes() {
      const source = fs.readFileSync(path.join(scripts, 'site.js'), 'utf8');
      const quoteSetup = source.slice(source.indexOf('  function setupHomeQuoteFragment()'), source.indexOf('  function setupHomeWindow()'));
      window.eval(`(function(){ var motion = window.GardenMotion;
        function gardenMotionIsLite() { return !motion.canAnimate(); }
        ${quoteSetup}\nsetupHomeQuoteFragment(); })();`);
      advance(32);
    }
  };
}

test('cover entrance waits for boot to finish, and is only played once', t => {
  const f = fixture(t, { boot: true }); f.visible(true);
  assert.equal(f.cover.classList.contains('is-cover-entered'), false);
  f.root.classList.remove('garden-booting'); f.notify();
  assert.equal(f.cover.classList.contains('is-cover-entered'), true);
  f.cover.classList.remove('is-cover-entered'); f.visible(false); f.visible(true);
  assert.equal(f.cover.classList.contains('is-cover-entered'), false);
});

test('pointer drift settles without an idle loop, and resets when leaving the cover', t => {
  const f = fixture(t); f.visible(true); f.move(); f.advance(1600);
  assert.ok(parseFloat(f.cover.style.getPropertyValue('--cover-drift-x')) > 3);
  assert.equal(f.frames.size, 0);
  f.cover.dispatchEvent(new f.window.Event('pointerleave')); f.advance(1600);
  assert.ok(Math.abs(parseFloat(f.cover.style.getPropertyValue('--cover-drift-x'))) < .03);
  assert.equal(f.frames.size, 0);
});

test('quiet and economy stop pending motion but awakening remains usable', t => {
  const f = fixture(t); f.visible(true); f.move(); f.advance(50); f.economy(true);
  assert.equal(f.frames.size, 0); assert.equal(f.cover.style.getPropertyValue('--cover-drift-x'), '');
  assert.equal(f.cover.dataset.norsePaused, 'true');
  f.economy(false); f.move(); f.root.classList.add('garden-lite-motion'); f.notify();
  assert.equal(f.frames.size, 0);
  const button = f.window.document.querySelector('[data-norse-awaken]'); button.click();
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(f.cover.classList.contains('is-norse-awake'), true);
});

test('offscreen, hidden tabs and page cache pause the cover and allow return', t => {
  const f = fixture(t); f.visible(true); f.move(); f.visible(false);
  assert.equal(f.frames.size, 0);
  f.visible(true); f.move(); f.hidden(true); assert.equal(f.frames.size, 0);
  f.hidden(false); f.window.dispatchEvent(new f.window.Event('pagehide'));
  f.move(); assert.equal(f.frames.size, 0); assert.equal(f.cover.dataset.norsePaused, 'true');
  f.window.dispatchEvent(new f.window.Event('pageshow')); f.move(); assert.equal(f.frames.size, 1);
});

test('reduced motion and missing viewport observation still expose manual controls', t => {
  const f = fixture(t, { reduced: true, noObserver: true }); f.move();
  assert.equal(f.frames.size, 0); assert.equal(f.cover.classList.contains('is-cover-entered'), false);
  const button = f.window.document.querySelector('[data-norse-awaken]');
  assert.equal(button.hidden, false); button.click();
  assert.equal(button.getAttribute('aria-pressed'), 'true');
});

test('aurora uses the shared clock, stops offscreen and remains still in reduced motion', t => {
  const f = fixture(t); f.visible(true);
  const loop = f.loops[0], layer = f.cover.querySelector('[data-aurora-layer]');
  const first = layer.getAttribute('d');
  assert.equal(loop.options.fps, 20); assert.equal(loop.active, true);
  loop.render(50, 50); assert.notEqual(layer.getAttribute('d'), first);
  f.visible(false); assert.equal(loop.active, false); assert.equal(loop.options.enabled(), false);
  f.visible(true); assert.equal(loop.active, true);
  f.reduced.matches = true; f.reduced.dispatchEvent(new f.window.Event('change'));
  assert.equal(loop.active, false); assert.equal(loop.options.enabled(), false);
  assert.doesNotMatch(layer.getAttribute('d'), /NaN|Infinity/);
});

test('quotes stop rotating in quiet mode or while being read, and next remains available', t => {
  const f = fixture(t, { reduced: true }); f.loadQuotes();
  const card = f.window.document.querySelector('[data-home-quote-card]');
  const quote = card.querySelector('[data-home-quote]');
  const first = quote.textContent; f.advance(22000); assert.equal(quote.textContent, first);
  card.querySelector('button').click(); f.advance(32); assert.notEqual(quote.textContent, first);
  f.reduced.matches = false; card.matches = () => true; f.notify();
  const reading = quote.textContent; f.advance(22000); assert.equal(quote.textContent, reading);
  card.matches = () => false; f.notify(); f.advance(11000); assert.notEqual(quote.textContent, reading);
});
