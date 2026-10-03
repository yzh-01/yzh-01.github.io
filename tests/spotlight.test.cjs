const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const site = fs.readFileSync(path.join(__dirname, '../themes/garden/source/js/site.js'), 'utf8');
const homeWindow = site.slice(site.indexOf('  function setupHomeWindow()'), site.indexOf('  function setupHeroFog()'));

function fixture(t, options = {}) {
  const dom = new JSDOM('<section data-home-window><div data-home-lens></div></section>', {
    url: 'https://garden.test/', runScripts: 'outside-only'
  });
  const { window } = dom;
  t.after(() => window.close());
  const root = window.document.documentElement;
  const photo = window.document.querySelector('[data-home-window]');
  const lens = photo.querySelector('[data-home-lens]');
  const reduced = new window.EventTarget(); reduced.matches = false;
  const fine = new window.EventTarget(); fine.matches = options.fine !== false;
  window.matchMedia = query => query.includes('reduced-motion') ? reduced : fine;
  const frames = new Map(), timers = new Map(), subscribers = [];
  let serial = 0, now = 0, hidden = false, economy = false, visible = true, draws = 0;
  Object.defineProperty(window.document, 'hidden', { get: () => hidden });
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
  window.eval(`(function () {
    var motion = window.GardenMotion;
    var reduceMotion = arguments[0], finePointer = arguments[1];
    function gardenMotionIsLite() {
      return reduceMotion.matches || document.documentElement.classList.contains('garden-lite-motion');
    }
    ${homeWindow}
    setupHomeWindow();
  })(window.matchMedia('(prefers-reduced-motion: reduce)'), window.matchMedia('(hover: hover) and (pointer: fine)'));`);

  function notify() { subscribers.forEach(callback => callback()); }
  function pointer(type, x = 900, y = 600) {
    const event = new window.MouseEvent(type, { clientX: x, clientY: y });
    Object.defineProperty(event, 'pointerType', { value: options.fine === false ? 'touch' : 'mouse' });
    photo.dispatchEvent(event);
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
    window, photo, lens, frames, timers, pointer, advance,
    active: () => photo.classList.contains('is-lens-active'),
    pending: () => frames.size + timers.size,
    draws: () => draws,
    economy(value) { economy = value; notify(); },
    quiet(value) { root.classList.toggle('garden-lite-motion', value); notify(); },
    reduced(value) { reduced.matches = value; reduced.dispatchEvent(new window.Event('change')); notify(); },
    visible(value) { visible = value; notify(); },
    hidden(value) { hidden = value; window.document.dispatchEvent(new window.Event('visibilitychange')); notify(); },
    page(value) { window.dispatchEvent(new window.Event(value ? 'pageshow' : 'pagehide')); }
  };
}

test('pointer moves reveal the latest position in one frame and leave no idle loop', t => {
  const f = fixture(t);
  f.pointer('pointerenter', 100, 100);
  for (let i = 0; i < 20; i += 1) f.pointer('pointermove', 300 + i, 200 + i);
  f.pointer('pointermove', 900, 600);
  assert.equal(f.active(), false);
  assert.equal(f.frames.size, 1);
  f.advance(16);
  assert.equal(f.active(), true);
  assert.equal(f.lens.style.getPropertyValue('--spot-x'), '890.0px');
  assert.equal(f.lens.style.getPropertyValue('--spot-y'), '580.0px');
  assert.equal(f.draws(), 1);
  assert.equal(f.pending(), 0);
  const still = f.lens.getAttribute('style'); f.advance(2000);
  assert.equal(f.lens.getAttribute('style'), still);
  assert.equal(f.draws(), 1);
});

test('leaving or cancelling the pointer removes the reveal and cancels a pending paint', t => {
  for (const event of ['pointerleave', 'pointercancel']) {
    const f = fixture(t);
    f.pointer('pointermove'); f.advance(16); assert.equal(f.active(), true);
    f.pointer('pointermove', 300, 200); assert.equal(f.frames.size, 1);
    f.pointer(event);
    assert.equal(f.active(), false); assert.equal(f.pending(), 0);
    f.advance(2000); assert.equal(f.active(), false); assert.equal(f.draws(), 1);
  }
});

for (const policy of ['economy', 'quiet', 'reduced', 'visible', 'hidden', 'page']) {
  test(`${policy} suspension clears the reveal and queued work; a new pointer move can resume`, t => {
    const f = fixture(t);
    const blocked = policy !== 'visible' && policy !== 'page';
    f.pointer('pointermove'); f.advance(16); assert.equal(f.active(), true);
    f.pointer('pointermove', 300, 200); assert.equal(f.frames.size, 1);
    f[policy](blocked);
    assert.equal(f.active(), false); assert.equal(f.pending(), 0);
    f.pointer('pointermove'); f.advance(2000);
    assert.equal(f.active(), false); assert.equal(f.pending(), 0); assert.equal(f.draws(), 1);
    f[policy](!blocked);
    assert.equal(f.active(), false);
    f.pointer('pointermove', 600, 400); f.advance(16);
    assert.equal(f.active(), true); assert.equal(f.draws(), 2); assert.equal(f.pending(), 0);
  });
}

test('touch reveals briefly, extends on another tap, and clears all scheduled work', t => {
  const f = fixture(t, { fine: false });
  f.pointer('pointerenter'); f.pointer('pointermove');
  assert.equal(f.active(), false); assert.equal(f.pending(), 0);
  f.pointer('pointerdown', 300, 200);
  assert.equal(f.frames.size, 1); assert.equal(f.timers.size, 1);
  f.advance(16); assert.equal(f.active(), true);
  f.pointer('pointerleave'); // A finger lifting must not end the timed reveal.
  assert.equal(f.active(), true);
  f.advance(800); f.pointer('pointerdown', 700, 500); f.advance(16);
  assert.equal(f.timers.size, 1);
  assert.equal(f.lens.style.getPropertyValue('--spot-x'), '690.0px');
  f.advance(700); assert.equal(f.active(), true);
  f.advance(600); assert.equal(f.active(), false); assert.equal(f.pending(), 0);
});

test('suspending a touch reveal cancels its expiry timer and prevents a delayed reappearance', t => {
  const f = fixture(t, { fine: false });
  f.pointer('pointerdown'); f.economy(true);
  assert.equal(f.active(), false); assert.equal(f.pending(), 0);
  f.advance(2000); assert.equal(f.active(), false); assert.equal(f.draws(), 0);
  f.economy(false); f.pointer('pointerdown'); f.advance(16);
  assert.equal(f.active(), true); f.advance(1200);
  assert.equal(f.active(), false); assert.equal(f.pending(), 0);
});
