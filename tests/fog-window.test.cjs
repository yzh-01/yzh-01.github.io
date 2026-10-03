const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const site = fs.readFileSync(path.join(__dirname, '../themes/garden/source/js/site.js'), 'utf8');
const homeWindow = site.slice(site.indexOf('  function setupHomeWindow()'), site.indexOf('  function setupHeroFog()'));

function fixture(t, options = {}) {
  const dom = new JSDOM(`<section data-home-window>
    <svg data-home-lens><defs><mask><g data-window-wipes></g></mask></defs>
      <g data-window-mist></g></svg></section>`, {
    url: 'https://garden.test/', runScripts: 'outside-only'
  });
  const { window } = dom;
  t.after(() => window.close());
  const root = window.document.documentElement;
  const photo = window.document.querySelector('[data-home-window]');
  const lens = photo.querySelector('[data-home-lens]');
  const wipes = lens.querySelector('[data-window-wipes]');
  const mist = lens.querySelector('[data-window-mist]');
  const reduced = new window.EventTarget(); reduced.matches = false;
  const fine = new window.EventTarget(); fine.matches = options.fine !== false;
  window.matchMedia = query => query.includes('reduced-motion') ? reduced : fine;
  const frames = new Map(), timers = new Map(), subscribers = [];
  let serial = 0, now = 0, hidden = false, economy = false, visible = true, draws = 0;
  Object.defineProperty(window.document, 'hidden', { get: () => hidden });
  Object.defineProperty(window.performance, 'now', { value: () => now });
  window.requestAnimationFrame = fn => { frames.set(++serial, fn); return serial; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.setTimeout = (fn, delay = 0) => { timers.set(++serial, { fn, at: now + delay }); return serial; };
  window.clearTimeout = id => timers.delete(id);
  window.GardenMotion = {
    canAnimate: () => !hidden && !reduced.matches && !root.classList.contains('garden-lite-motion'),
    isEconomy: () => economy,
    isVisible: () => visible,
    subscribe: callback => subscribers.push(callback)
  };
  photo.getBoundingClientRect = () => ({ left: 10, top: 20, width: 1000, height: 800 });
  window.eval(`(function (reduceMotion, finePointer) {
    var motion = window.GardenMotion;
    function gardenMotionIsLite() {
      return reduceMotion.matches || document.documentElement.classList.contains('garden-lite-motion');
    }
    ${homeWindow}
    setupHomeWindow();
  })(window.matchMedia('(prefers-reduced-motion: reduce)'), window.matchMedia('(hover: hover) and (pointer: fine)'));`);

  function notify() { subscribers.forEach(callback => callback()); }
  function pointer(type, x = 900, y = 600, pointerType = fine.matches ? 'mouse' : 'touch') {
    const event = new window.MouseEvent(type, { clientX: x, clientY: y, cancelable: true });
    Object.defineProperty(event, 'pointerType', { value: pointerType });
    photo.dispatchEvent(event);
    return event;
  }
  function advance(ms) {
    const end = now + ms;
    while (now < end) {
      now = Math.min(end, now + 16);
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) { timers.delete(id); timer.fn(); }
      }
      const callbacks = [...frames.values()]; frames.clear();
      callbacks.forEach(callback => { draws += 1; callback(now); });
    }
  }
  return {
    window, photo, lens, wipes, mist, frames, timers, pointer, advance,
    paths: () => [...wipes.children],
    active: () => photo.classList.contains('is-lens-active'),
    pending: () => frames.size + timers.size,
    draws: () => draws,
    economy(value) { economy = value; notify(); },
    quiet(value) { root.classList.toggle('garden-lite-motion', value); notify(); },
    reduced(value) { reduced.matches = value; reduced.dispatchEvent(new window.Event('change')); notify(); },
    visible(value) { visible = value; notify(); },
    hidden(value) { hidden = value; window.document.dispatchEvent(new window.Event('visibilitychange')); notify(); },
    page(value) { window.dispatchEvent(new window.Event(value ? 'pageshow' : 'pagehide')); },
    viewport(type) { window.dispatchEvent(new window.Event(type)); }
  };
}

function assertCleared(f) {
  assert.equal(f.active(), false);
  assert.equal(f.wipes.children.length, 0);
  assert.equal(f.mist.children.length, 0);
  assert.equal(f.pending(), 0);
}

test('hover moves merge into the latest local wipe without an idle animation loop', t => {
  const f = fixture(t);
  f.pointer('pointerenter', 100, 100);
  for (let i = 0; i < 20; i += 1) f.pointer('pointermove', 300 + i, 200 + i);
  f.pointer('pointermove', 900, 600);
  assert.equal(f.active(), false); assert.equal(f.frames.size, 1);
  f.advance(16);
  assert.equal(f.active(), true); assert.equal(f.draws(), 1);
  assert.equal(f.paths().length, 1);
  const wipe = f.paths()[0];
  assert.match(wipe.getAttribute('d'), /^M890\.0 580\.0/);
  assert.equal(f.mist.firstElementChild.getAttribute('d'), wipe.getAttribute('d'));
  assert.ok(Number(wipe.getAttribute('stroke-width')) < 150, 'the reveal remains a small hand-width patch');
  assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 1);
  const still = wipe.getAttribute('d'); f.advance(2000);
  assert.equal(wipe.getAttribute('d'), still); assert.equal(f.draws(), 1);
});

test('nearby moves extend a wipe while a distant jump starts an unconnected patch', t => {
  const f = fixture(t);
  f.pointer('pointermove', 100, 100); f.advance(16);
  const first = f.paths()[0], dot = first.getAttribute('d');
  f.pointer('pointermove', 130, 125); f.advance(16);
  assert.equal(f.paths().length, 1); assert.notEqual(first.getAttribute('d'), dot);
  f.pointer('pointermove', 900, 600); f.advance(16);
  assert.equal(f.paths().length, 2);
  const second = f.paths()[1];
  assert.match(second.getAttribute('d'), /^M890\.0 580\.0/);
  assert.doesNotMatch(second.getAttribute('d'), /[LQ]/, 'a jump must not clear a long connecting corridor');
  assert.equal(f.mist.children.length, 2); assert.equal(f.timers.size, 1);
});

test('older marks mist over before newer marks and expiry clears both SVG layers', t => {
  const f = fixture(t);
  f.pointer('pointermove', 100, 100); f.advance(16);
  const first = f.paths()[0]; f.advance(500);
  f.pointer('pointermove', 900, 600); f.advance(16);
  const second = f.paths()[1];
  assert.equal(f.timers.size, 1);
  f.advance(4100);
  assert.equal(first.isConnected, false); assert.deepEqual(f.paths(), [second]);
  assert.equal(f.active(), true); assert.equal(f.mist.children.length, 1);
  assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 1);
  f.advance(600); assertCleared(f); assert.equal(f.draws(), 2);
});

test('long wiping sessions retain at most ten recent patches and one expiry timer', t => {
  const f = fixture(t);
  let first;
  for (let i = 0; i < 15; i += 1) {
    f.pointer('pointermove', i % 2 ? 900 : 100, 400); f.advance(16);
    if (i === 0) first = f.paths()[0];
    assert.ok(f.paths().length <= 10);
    assert.equal(f.mist.children.length, f.paths().length);
    assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 1);
  }
  assert.equal(f.paths().length, 10); assert.equal(first.isConnected, false);
  f.advance(5000); assertCleared(f); assert.equal(f.draws(), 15);
});

test('mouse leave and cancellation stop a queued paint while existing marks continue fading', t => {
  for (const event of ['pointerleave', 'pointercancel']) {
    const f = fixture(t);
    f.pointer('pointermove', 100, 100); f.advance(16);
    const first = f.paths()[0], path = first.getAttribute('d');
    f.pointer('pointermove', 900, 600); assert.equal(f.frames.size, 1);
    f.pointer(event);
    assert.equal(f.active(), true); assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 1);
    f.advance(2000);
    assert.deepEqual(f.paths(), [first]); assert.equal(first.getAttribute('d'), path); assert.equal(f.draws(), 1);
    f.advance(3000); assertCleared(f);
  }
});

for (const policy of ['economy', 'quiet', 'reduced', 'visible', 'hidden', 'page', 'scroll', 'resize']) {
  test(`${policy} clears all marks and scheduled work; a new eligible move resumes wiping`, t => {
    const f = fixture(t);
    const transient = policy === 'scroll' || policy === 'resize';
    const blocked = policy !== 'visible' && policy !== 'page';
    f.pointer('pointermove', 100, 100); f.advance(16); assert.equal(f.active(), true);
    f.pointer('pointermove', 900, 600); assert.equal(f.frames.size, 1);
    if (transient) f.viewport(policy);
    else f[policy](blocked);
    assertCleared(f);
    if (!transient) f.pointer('pointermove');
    f.advance(5000); assertCleared(f); assert.equal(f.draws(), 1);
    if (!transient) f[policy](!blocked);
    assert.equal(f.active(), false);
    f.pointer('pointermove', 600, 400); f.advance(16);
    assert.equal(f.active(), true); assert.equal(f.paths().length, 1);
    assert.equal(f.draws(), 2); assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 1);
  });
}

test('touch down and drag leave temporary marks after lifting without preventing native scrolling', t => {
  const f = fixture(t, { fine: false });
  f.pointer('pointerenter'); f.pointer('pointermove'); assertCleared(f);
  const down = f.pointer('pointerdown', 300, 200); f.advance(16);
  assert.equal(down.defaultPrevented, false); assert.equal(f.active(), true);
  const move = f.pointer('pointermove', 330, 225); f.advance(16);
  assert.equal(move.defaultPrevented, false);
  assert.equal(f.paths().length, 1); const path = f.paths()[0].getAttribute('d');
  f.pointer('pointerup'); f.pointer('pointerleave');
  assert.equal(f.active(), true); assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 1);
  f.pointer('pointermove', 900, 600); f.advance(2000);
  assert.equal(f.paths()[0].getAttribute('d'), path); assert.equal(f.paths().length, 1);
  f.advance(3000); assertCleared(f);
});

test('a quick touch lift or leave flushes its pending mark, while cancellation does not', t => {
  for (const event of ['pointerup', 'pointerleave']) {
    const f = fixture(t, { fine: false });
    f.pointer('pointerdown', 300, 200); assert.equal(f.frames.size, 1);
    f.pointer(event);
    assert.equal(f.active(), true); assert.equal(f.paths().length, 1); assert.equal(f.frames.size, 0);
    f.advance(16); assert.equal(f.paths().length, 1);
    f.advance(5000); assertCleared(f);
  }
  const f = fixture(t, { fine: false });
  f.pointer('pointerdown'); f.pointer('pointercancel'); f.advance(16);
  assertCleared(f); assert.equal(f.draws(), 0);
});

test('touch on a device with a mouse still requires contact and leaves a mark on a quick tap', t => {
  const f = fixture(t);
  f.pointer('pointerenter', 300, 200, 'touch'); f.pointer('pointermove', 300, 200, 'touch');
  assertCleared(f);
  f.pointer('pointerdown', 300, 200, 'touch'); f.pointer('pointerup', 300, 200, 'touch');
  assert.equal(f.paths().length, 1); assert.equal(f.active(), true); assert.equal(f.frames.size, 0);
});

test('a forced pause during touch cancels both pending wiping and expiry', t => {
  const f = fixture(t, { fine: false });
  f.pointer('pointerdown', 100, 100); f.advance(16);
  f.pointer('pointermove', 150, 125); f.economy(true); assertCleared(f);
  f.pointer('pointerup'); f.advance(5000); assertCleared(f); assert.equal(f.draws(), 1);
  f.economy(false); f.pointer('pointermove'); assert.equal(f.frames.size, 0);
  f.pointer('pointerdown', 900, 600); f.advance(16);
  assert.equal(f.active(), true); f.advance(5000); assertCleared(f);
});
