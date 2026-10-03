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
      <g data-window-mist></g><image/><image/></svg>
    <a href="#"><span>link</span></a><button><span>button</span></button>
    <input><textarea></textarea><select></select><div contenteditable></div>
    <div data-ninefold><span>ninefold</span></div><div class="folio-cover-notes"><span>notes</span></div>
    <p data-window-guide></p></section>`, { url: 'https://garden.test/', runScripts: 'outside-only' });
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
  const frames = new Map(), timers = new Map(), subscribers = [], captures = new Set();
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
  photo.getBoundingClientRect = () => ({ left: 10, top: 20, right: 1010, bottom: 820, width: 1000, height: 800 });
  photo.setPointerCapture = id => captures.add(id);
  photo.hasPointerCapture = id => captures.has(id);
  photo.releasePointerCapture = id => captures.delete(id);
  window.eval(`(function (reduceMotion, finePointer) {
    var motion = window.GardenMotion;
    function gardenMotionIsLite() {
      return reduceMotion.matches || document.documentElement.classList.contains('garden-lite-motion');
    }
    ${homeWindow}
    setupHomeWindow();
  })(window.matchMedia('(prefers-reduced-motion: reduce)'), window.matchMedia('(hover: hover) and (pointer: fine)'));`);

  function notify() { subscribers.forEach(callback => callback()); }
  function pointer(type, x = 300, y = 200, eventOptions = {}) {
    const button = eventOptions.button ?? 0;
    const buttons = eventOptions.buttons ?? (type === 'pointerup' ? 0 : button === 1 ? 4 : button === 2 ? 2 : 1);
    const event = new window.MouseEvent(type, { clientX: x, clientY: y, button, buttons, cancelable: true, bubbles: true });
    Object.defineProperties(event, {
      pointerType: { value: eventOptions.pointerType ?? (options.fine === false ? 'touch' : 'mouse') },
      pointerId: { value: eventOptions.pointerId ?? 1 }
    });
    (eventOptions.target || photo).dispatchEvent(event);
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
    window, photo, lens, wipes, mist, frames, timers, captures, pointer, advance,
    paths: () => [...wipes.children],
    active: () => photo.classList.contains('is-lens-active'),
    writing: () => photo.classList.contains('is-window-wiping'),
    pending: () => frames.size + timers.size,
    draws: () => draws,
    drag(x = 300, y = 200, eventOptions = {}) {
      pointer('pointerdown', x, y, eventOptions); pointer('pointermove', x + 30, y + 20, eventOptions); advance(16);
    },
    economy(value) { economy = value; notify(); },
    quiet(value) { root.classList.toggle('garden-lite-motion', value); notify(); },
    reduced(value) { reduced.matches = value; reduced.dispatchEvent(new window.Event('change')); notify(); },
    visible(value) { visible = value; notify(); },
    hidden(value) { hidden = value; window.document.dispatchEvent(new window.Event('visibilitychange')); notify(); },
    page(value) { window.dispatchEvent(new window.Event(value ? 'pageshow' : 'pagehide')); },
    viewport(type) { window.dispatchEvent(new window.Event(type)); },
    escape() { window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })); }
  };
}

function assertCleared(f) {
  assert.equal(f.active(), false); assert.equal(f.writing(), false);
  assert.equal(f.wipes.children.length, 0); assert.equal(f.mist.children.length, 0);
  assert.equal(f.pending(), 0); assert.equal(f.captures.size, 0);
}

test('hovering, ordinary clicks, scrolling and right dragging do not clear the glass', t => {
  const f = fixture(t);
  f.pointer('pointerenter'); f.pointer('pointermove', 900, 600, { buttons: 0 });
  f.pointer('pointerdown'); f.pointer('pointerup');
  f.viewport('scroll'); f.pointer('pointermove', 900, 600);
  f.pointer('pointerdown', 300, 200, { button: 2 });
  f.pointer('pointermove', 500, 300, { buttons: 2 }); f.pointer('pointerup', 500, 300, { button: 2 });
  f.advance(5000); assertCleared(f); assert.equal(f.draws(), 0);
});

test('left dragging requires deliberate movement and coalesces updates into the latest local wipe', t => {
  const f = fixture(t);
  f.pointer('pointerdown'); f.pointer('pointermove', 304, 203);
  assert.equal(f.frames.size, 0); assert.equal(f.active(), false);
  f.pointer('pointermove', 320, 210);
  for (let i = 0; i < 20; i += 1) f.pointer('pointermove', 350 + i, 230 + i);
  f.pointer('pointermove', 420, 260); assert.equal(f.frames.size, 1);
  f.advance(16);
  assert.equal(f.active(), true); assert.equal(f.writing(), true); assert.equal(f.draws(), 1);
  const wipe = f.paths()[0];
  assert.match(wipe.getAttribute('d'), /L410\.0 240\.0$/);
  assert.equal(f.mist.firstElementChild.getAttribute('d'), wipe.getAttribute('d'));
  assert.ok(wipe.classList.contains('is-writing'));
  assert.ok(Number(wipe.getAttribute('stroke-width')) < 120, 'the clear area remains a hand-width wipe');
  assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 0);
  const still = wipe.getAttribute('d'); f.advance(7000);
  assert.equal(wipe.getAttribute('d'), still); assert.equal(wipe.isConnected, true); assert.equal(f.draws(), 1);
  f.pointer('pointerup');
  assert.equal(wipe.classList.contains('is-writing'), false); assert.equal(f.writing(), false);
  assert.equal(f.timers.size, 1); assert.equal(f.captures.size, 0);
  f.advance(4600); assertCleared(f);
});

test('middle dragging prevents automatic scrolling and preserves normal link and button actions', t => {
  const f = fixture(t);
  const down = f.pointer('pointerdown', 300, 200, { button: 1 });
  assert.equal(down.defaultPrevented, true);
  f.pointer('pointermove', 340, 225, { buttons: 4 }); f.advance(16);
  assert.equal(f.active(), true);
  f.pointer('pointerup', 340, 225, { button: 1 });
  assert.equal(f.pointer('auxclick', 340, 225, { button: 1 }).defaultPrevented, true);
  for (const selector of ['a span', 'button span']) {
    const target = f.photo.querySelector(selector);
    assert.equal(f.pointer('pointerdown', 300, 200, { button: 1, target }).defaultPrevented, false);
    assert.equal(f.pointer('auxclick', 300, 200, { button: 1, target }).defaultPrevented, false);
  }
});

test('navigation, controls, editable fields, ninefold and cover notes cannot start a wipe', t => {
  const f = fixture(t);
  for (const selector of ['a span', 'button span', 'input', 'textarea', 'select', '[contenteditable]', '[data-ninefold] span', '.folio-cover-notes span']) {
    const target = f.photo.querySelector(selector);
    f.pointer('pointerdown', 300, 200, { target }); f.pointer('pointermove', 400, 250, { target });
    f.pointer('pointerup', 400, 250, { target }); assertCleared(f);
  }
});

test('only the captured pointer and original mouse button may continue a gesture', t => {
  const f = fixture(t);
  f.pointer('pointerdown', 300, 200, { pointerId: 7 });
  f.pointer('pointermove', 400, 250, { pointerId: 8 }); assert.equal(f.frames.size, 0);
  f.pointer('pointerup', 400, 250, { pointerId: 8, target: f.window });
  assert.equal(f.captures.has(7), true);
  f.pointer('pointermove', 340, 225, { pointerId: 7 }); f.advance(16); assert.equal(f.active(), true);
  f.pointer('pointermove', 360, 240, { pointerId: 7, buttons: 0 });
  assert.equal(f.writing(), false); assert.equal(f.frames.size, 0); assert.equal(f.captures.size, 0);
  assert.equal(f.paths()[0].classList.contains('is-writing'), false);
  f.pointer('pointermove', 400, 270, { pointerId: 7 }); assert.equal(f.frames.size, 0);
});

test('a release outside the cover flushes a pending deliberate drag and starts refogging', t => {
  const f = fixture(t);
  f.pointer('pointerdown'); f.pointer('pointermove', 330, 225); assert.equal(f.frames.size, 1);
  f.pointer('pointerup', 330, 225, { target: f.window });
  assert.equal(f.paths().length, 1); assert.equal(f.active(), true); assert.equal(f.frames.size, 0);
  assert.equal(f.paths()[0].classList.contains('is-writing'), false); assert.equal(f.timers.size, 1);
  f.advance(5000); assertCleared(f);
});

test('nearby dragging extends a wipe while distant jumps start unconnected patches', t => {
  const f = fixture(t); f.drag(100, 100);
  const first = f.paths()[0], path = first.getAttribute('d');
  f.pointer('pointermove', 160, 140); f.advance(16);
  assert.equal(f.paths().length, 1); assert.notEqual(first.getAttribute('d'), path);
  f.pointer('pointermove', 900, 600); f.advance(16);
  assert.equal(f.paths().length, 2);
  assert.doesNotMatch(f.paths()[1].getAttribute('d'), /[LQ]/, 'a jump must not clear a connecting corridor');
  assert.equal(f.timers.size, 0); f.pointer('pointerup'); assert.equal(f.timers.size, 1);
});

test('long held sessions retain at most ten patches, which refog together after release', t => {
  const f = fixture(t); f.pointer('pointerdown', 100, 400);
  let first;
  for (let i = 0; i < 15; i += 1) {
    f.pointer('pointermove', i % 2 ? 100 : 900, 400); f.advance(16);
    if (i === 0) first = f.paths()[0];
    assert.ok(f.paths().length <= 10); assert.equal(f.mist.children.length, f.paths().length);
    assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 0);
  }
  assert.equal(f.paths().length, 10); assert.equal(first.isConnected, false);
  f.advance(6000); assert.equal(f.paths().length, 10); assert.equal(f.draws(), 15);
  f.pointer('pointerup'); assert.equal(f.timers.size, 1);
  assert.ok(f.paths().every(wipe => !wipe.classList.contains('is-writing')));
  f.advance(4600); assertCleared(f);
});

test('released marks expire independently and are not revived by a new held gesture', t => {
  const f = fixture(t); f.drag(100, 100); f.pointer('pointerup');
  const first = f.paths()[0]; f.advance(500);
  f.drag(900, 600); const second = f.paths()[1];
  assert.equal(first.classList.contains('is-writing'), false); assert.equal(second.classList.contains('is-writing'), true);
  assert.equal(f.timers.size, 1);
  f.advance(4100);
  assert.equal(first.isConnected, false); assert.deepEqual(f.paths(), [second]);
  assert.equal(second.classList.contains('is-writing'), true); assert.equal(f.timers.size, 0);
  f.pointer('pointerup'); f.advance(4600); assertCleared(f);
});

test('leave, cancellation, lost capture and blur discard queued painting but preserve existing marks to refog', t => {
  for (const event of ['pointerleave', 'pointercancel', 'lostpointercapture', 'blur']) {
    const f = fixture(t); f.drag(100, 100);
    const first = f.paths()[0], path = first.getAttribute('d');
    f.pointer('pointermove', 900, 600); assert.equal(f.frames.size, 1);
    if (event === 'blur') f.viewport(event);
    else f.pointer(event);
    assert.equal(f.writing(), false); assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 1);
    assert.equal(f.captures.size, 0); assert.equal(first.classList.contains('is-writing'), false);
    f.advance(2000); assert.deepEqual(f.paths(), [first]); assert.equal(first.getAttribute('d'), path);
    f.advance(3000); assertCleared(f); assert.equal(f.draws(), 1);
  }
});

for (const policy of ['economy', 'quiet', 'reduced', 'visible', 'hidden', 'page', 'scroll', 'resize', 'escape']) {
  test(`${policy} clears active and fading marks plus all scheduled work; a fresh gesture can resume`, t => {
    const f = fixture(t); f.drag(100, 100); f.pointer('pointerup');
    f.drag(900, 600); f.pointer('pointermove', 850, 550);
    assert.equal(f.frames.size, 1); assert.equal(f.timers.size, 1);
    const transient = ['scroll', 'resize', 'escape'].includes(policy);
    const blocked = policy !== 'visible' && policy !== 'page';
    if (policy === 'escape') f.escape();
    else if (transient) f.viewport(policy);
    else f[policy](blocked);
    assertCleared(f);
    if (!transient) { f.pointer('pointerdown'); f.pointer('pointermove', 400, 250); }
    f.advance(5000); assertCleared(f); assert.equal(f.draws(), 2);
    if (!transient) f[policy](!blocked);
    f.drag(); assert.equal(f.active(), true); assert.equal(f.paths().length, 1); assert.equal(f.draws(), 3);
    f.pointer('pointerup'); f.advance(4600); assertCleared(f);
  });
}

test('ordinary touch taps and movement before the hold threshold preserve native scrolling without wiping', t => {
  const f = fixture(t, { fine: false });
  const tap = f.pointer('pointerdown'); assert.equal(tap.defaultPrevented, false);
  f.advance(200); f.pointer('pointerup'); f.advance(500); assertCleared(f);
  f.pointer('pointerdown');
  const scroll = f.pointer('pointermove', 300, 240); assert.equal(scroll.defaultPrevented, false);
  f.advance(1000); assertCleared(f); assert.equal(f.draws(), 0);
});

test('touch requires a long hold followed by dragging; release flushes the mark and preserves default pointer behavior', t => {
  const f = fixture(t, { fine: false });
  const down = f.pointer('pointerdown'); f.advance(400);
  assert.equal(down.defaultPrevented, false); assert.equal(f.active(), false); assert.equal(f.captures.has(1), true);
  const move = f.pointer('pointermove', 330, 225); assert.equal(move.defaultPrevented, false);
  assert.equal(f.frames.size, 1); f.pointer('pointerup', 330, 225, { target: f.window });
  assert.equal(f.paths().length, 1); assert.equal(f.active(), true); assert.equal(f.writing(), false);
  assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 1); assert.equal(f.captures.size, 0);
  f.advance(4600); assertCleared(f);
});

test('touch cancellation discards a pending mark, and a long stationary hold creates none', t => {
  const f = fixture(t, { fine: false });
  f.pointer('pointerdown'); f.advance(400); f.pointer('pointermove', 330, 225); f.pointer('pointercancel');
  f.advance(16); assertCleared(f); assert.equal(f.draws(), 0);
  f.pointer('pointerdown'); f.advance(1000); f.pointer('pointerup'); assertCleared(f);
});

test('a touch on a device with a mouse still requires the long hold', t => {
  const f = fixture(t);
  f.pointer('pointerdown', 300, 200, { pointerType: 'touch' });
  f.advance(100); f.pointer('pointerup', 300, 200, { pointerType: 'touch' }); assertCleared(f);
  f.pointer('pointerdown', 300, 200, { pointerType: 'touch' }); f.advance(400);
  f.pointer('pointermove', 330, 225, { pointerType: 'touch' }); f.advance(16);
  assert.equal(f.active(), true); f.pointer('pointerup', 330, 225, { pointerType: 'touch' });
});

test('forcing a pause during touch arming cancels the hold and an existing expiry timer', t => {
  const f = fixture(t, { fine: false });
  f.pointer('pointerdown'); f.advance(400); f.pointer('pointermove', 330, 225); f.advance(16); f.pointer('pointerup');
  f.pointer('pointerdown', 600, 400); assert.equal(f.timers.size, 2);
  f.economy(true); assertCleared(f); f.advance(5000); assertCleared(f);
  f.economy(false); f.pointer('pointermove', 640, 425); assert.equal(f.frames.size, 0);
  f.pointer('pointerdown', 600, 400); f.advance(400); f.pointer('pointermove', 630, 425); f.advance(16);
  assert.equal(f.active(), true);
});
