const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const scripts = path.join(__dirname, '../themes/garden/source/js');

function fixture(t, options = {}) {
  const dom = new JSDOM(`<section class="folio-cover" data-motion-section>
    <div data-norse-drift></div>
    <svg><path data-aurora-layer="0"/><path data-aurora-layer="1"/>
      <path data-aurora-edge="0"/><path data-aurora-edge="1"/>
      <path data-aurora-veil="0"/><path data-aurora-veil="1"/>
      <g data-aurora-rays="back"></g><g data-aurora-rays="front"></g></svg>
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
  let serial = 0, now = 0, hidden = false, economy = false, scrolling = false, visible = true, observe;
  Object.defineProperty(window.document, 'hidden', { get: () => hidden });
  window.requestAnimationFrame = fn => { frames.set(++serial, fn); return serial; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.setTimeout = (fn, ms = 0) => { timers.set(++serial, { fn, at: now + ms }); return serial; };
  window.clearTimeout = id => timers.delete(id);
  if (!options.noObserver) window.IntersectionObserver = class {
    constructor(callback) { observe = callback; }
    observe() {}
  };
  if (!options.noMotion) window.GardenMotion = {
    canAnimate: () => !hidden && !reduced.matches && !root.classList.contains('garden-lite-motion'),
    isEconomy: () => economy,
    isVisible: () => visible,
    isScrolling: () => scrolling,
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
    scrolling(value) { scrolling = value; notify(); },
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
  const layer = f.cover.querySelector('[data-aurora-layer]');
  assert.match(layer.getAttribute('d'), /^M.+Z$/);
  assert.match(f.cover.querySelector('[data-aurora-veil]').getAttribute('d'), /^M.+Z$/);
  assert.ok(f.cover.querySelector('[data-aurora-rays="front"]').children.length > 0);
  assert.equal(f.loops[0].active, false);
  button.click();
  assert.equal(f.cover.classList.contains('is-norse-awake'), false);
  assert.equal(button.querySelector('[data-norse-action]').textContent, '点亮极光');
});

test('the aurora switch starts and stops drawing, including an already queued paint', t => {
  const f = fixture(t); f.visible(true);
  const loop = f.loops[0], layer = f.cover.querySelector('[data-aurora-layer]');
  const edge = f.cover.querySelector('[data-aurora-edge]');
  const veil = f.cover.querySelector('[data-aurora-veil]');
  const rays = f.cover.querySelector('[data-aurora-rays="front"]');
  const button = f.window.document.querySelector('[data-norse-awaken]');
  assert.equal(loop.active, false); assert.equal(loop.options.enabled(), false);
  loop.render(50, 50); assert.equal(layer.getAttribute('d'), null); assert.equal(edge.getAttribute('d'), null);
  assert.equal(veil.getAttribute('d'), null); assert.equal(rays.children.length, 0);
  button.click();
  const first = layer.getAttribute('d');
  const firstEdge = edge.getAttribute('d');
  const firstVeil = veil.getAttribute('d'), firstRay = rays.firstElementChild.getAttribute('d');
  const rayCount = rays.children.length;
  assert.ok(rayCount > 0);
  assert.equal(loop.options.fps, 20); assert.equal(loop.active, true);
  loop.render(50, 50); assert.notEqual(layer.getAttribute('d'), first);
  assert.notEqual(edge.getAttribute('d'), firstEdge);
  assert.notEqual(veil.getAttribute('d'), firstVeil);
  assert.notEqual(rays.firstElementChild.getAttribute('d'), firstRay);
  button.click();
  const last = layer.getAttribute('d');
  const lastEdge = edge.getAttribute('d');
  const lastVeil = veil.getAttribute('d'), lastRay = rays.firstElementChild.getAttribute('d');
  assert.equal(loop.active, false); assert.equal(loop.options.enabled(), false);
  loop.render(100, 50); assert.equal(layer.getAttribute('d'), last);
  assert.equal(edge.getAttribute('d'), lastEdge);
  assert.equal(veil.getAttribute('d'), lastVeil);
  assert.equal(rays.firstElementChild.getAttribute('d'), lastRay);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(f.cover.classList.contains('is-norse-awake'), false);
  assert.equal(button.querySelector('[data-norse-action]').textContent, '点亮极光');
  button.click(); assert.equal(loop.active, true); assert.equal(rays.children.length, rayCount);
});

test('an illuminated aurora pauses offscreen, while scrolling and in quiet or economy modes', t => {
  const f = fixture(t); f.visible(true);
  f.window.document.querySelector('[data-norse-awaken]').click();
  const loop = f.loops[0], layer = f.cover.querySelector('[data-aurora-layer]');
  f.visible(false); assert.equal(loop.active, false); assert.equal(loop.options.enabled(), false);
  f.visible(true); assert.equal(loop.active, true);
  f.scrolling(true); assert.equal(loop.active, false); assert.equal(loop.options.enabled(), false);
  f.scrolling(false); assert.equal(loop.active, true);
  f.economy(true); assert.equal(loop.active, false);
  f.economy(false); assert.equal(loop.active, true);
  f.hidden(true); assert.equal(loop.active, false);
  f.hidden(false); assert.equal(loop.active, true);
  f.reduced.matches = true; f.reduced.dispatchEvent(new f.window.Event('change'));
  assert.equal(loop.active, false); assert.equal(loop.options.enabled(), false);
  assert.equal(f.cover.classList.contains('is-norse-awake'), true);
  assert.doesNotMatch(layer.getAttribute('d'), /NaN|Infinity/);
});

test('the switch reveals a static aurora when the shared motion controller is unavailable', t => {
  const f = fixture(t, { noMotion: true, noObserver: true });
  const button = f.window.document.querySelector('[data-norse-awaken]');
  const layer = f.cover.querySelector('[data-aurora-layer]');
  assert.equal(button.hidden, false); button.click();
  assert.equal(f.cover.classList.contains('is-norse-awake'), true);
  assert.match(layer.getAttribute('d'), /^M.+Z$/);
  assert.match(f.cover.querySelector('[data-aurora-edge]').getAttribute('d'), /^M.+C/);
  const rays = [...f.cover.querySelectorAll('[data-aurora-rays] path')];
  assert.ok(rays.length > 0);
  for (const ray of rays) {
    assert.match(ray.getAttribute('d'), /^M.+Z$/);
    assert.doesNotMatch(ray.getAttribute('d'), /NaN|Infinity/);
  }
  const still = layer.getAttribute('d'); f.advance(2000);
  assert.equal(layer.getAttribute('d'), still);
  assert.equal(f.frames.size, 0); assert.equal(f.loops.length, 0);
  button.click(); assert.equal(f.cover.classList.contains('is-norse-awake'), false);
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
