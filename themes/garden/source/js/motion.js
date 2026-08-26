(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var battery = null;
  var mode = 'auto';
  var economy = false;
  var scrolling = false;
  var scrollTimer = 0;
  var frame = 0;
  var timer = 0;
  var painting = false;
  var loops = [];
  var listeners = [];
  var previousState = '';
  var buttons = document.querySelectorAll('[data-performance-choice]');
  var status = document.querySelector('[data-performance-status]');

  try {
    mode = localStorage.getItem('garden-performance') || 'auto';
    if (localStorage.getItem('garden-motion') === 'lite') root.classList.add('garden-lite-motion');
  } catch (_) {}
  if (['auto', 'full', 'economy'].indexOf(mode) === -1) mode = 'auto';

  function canAnimate() {
    return !document.hidden && !reduced.matches &&
      !root.classList.contains('garden-lite-motion') && !root.classList.contains('garden-overrun');
  }

  function runnable(loop) {
    return loop.active && canAnimate() && (!loop.options.enabled || loop.options.enabled());
  }

  function clearSchedule() {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    frame = timer = 0;
  }

  // All canvas loops share one clock. Low-rate scenes sleep between paints instead
  // of polling requestAnimationFrame at the display's 60/120/144Hz refresh rate.
  function schedule() {
    if (painting || frame || timer) return;
    var next = Infinity;
    loops.forEach(function (loop) { if (runnable(loop)) next = Math.min(next, loop.next); });
    if (next === Infinity) return;
    var delay = next - performance.now();
    if (delay > 1) {
      timer = window.setTimeout(function () { timer = 0; schedule(); }, delay - 1);
    } else {
      frame = window.requestAnimationFrame(paint);
    }
  }

  function paint(now) {
    frame = 0;
    painting = true;
    try { loops.forEach(function (loop) {
      if (!runnable(loop) || now + 1 < loop.next) return;
      var fps = typeof loop.options.fps === 'function' ? loop.options.fps() : (loop.options.fps || 30);
      var interval = 1000 / Math.max(1, Math.min(60, fps));
      var elapsed = loop.last ? Math.min(100, now - loop.last) : interval;
      loop.last = now;
      loop.next = loop.next && now - loop.next < interval ? loop.next + interval : now + interval;
      if (loop.options.continuous === false) loop.active = false;
      try { loop.render(now, elapsed); }
      catch (error) {
        loop.active = false;
        // A failed effect must not take down other scenes sharing the clock.
        window.setTimeout(function () { throw error; }, 0);
      }
    }); } finally {
      painting = false;
      schedule();
    }
  }

  function refresh() {
    clearSchedule();
    loops.forEach(function (loop) {
      if (!runnable(loop)) { loop.last = 0; loop.next = 0; }
    });
    schedule();
  }

  function notify() {
    listeners.forEach(function (listener) { listener(); });
    refresh();
  }

  function applyPolicy() {
    var onBattery = battery && battery.charging === false;
    var saveData = connection && connection.saveData;
    economy = mode === 'economy' || (mode === 'auto' && Boolean(onBattery || saveData));
    root.dataset.renderQuality = economy ? 'economy' : 'full';
    root.classList.toggle('garden-page-hidden', document.hidden);
    root.classList.toggle('garden-is-scrolling', scrolling);
    buttons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.performanceChoice === mode)); });
    if (status) {
      status.textContent = reduced.matches || root.classList.contains('garden-lite-motion') ? '已遵循减弱动态 / 安静模式。' :
        mode === 'economy' ? '节能：降低背景负担，保留点击和立体互动。' :
        mode === 'full' ? '完整：保留全部可见动效，离屏仍会暂停。' :
        onBattery ? '自动 · 电池供电，已启用节能动效。' :
        saveData ? '自动 · 已按设备节省偏好降低动效负担。' :
        battery ? '自动 · 正在充电或已接电，保留完整动效。' : '自动 · 电源状态不可用时，可手动选择节能。';
    }
    var state = [economy, canAnimate(), scrolling, root.classList.contains('garden-booting')].join(':');
    if (state !== previousState) { previousState = state; notify(); }
  }

  window.GardenMotion = {
    isEconomy: function () { return economy; },
    isScrolling: function () { return scrolling; },
    canAnimate: canAnimate,
    isVisible: function (element) { return !element || element.dataset.motionVisible !== 'false'; },
    subscribe: function (listener) { listeners.push(listener); },
    createLoop: function (render, options) {
      var loop = { render: render, options: options || {}, active: false, last: 0, next: 0 };
      loops.push(loop);
      return {
        start: function () { loop.active = true; schedule(); },
        stop: function () { loop.active = false; loop.last = 0; loop.next = 0; refresh(); }
      };
    }
  };

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      mode = button.dataset.performanceChoice;
      try { localStorage.setItem('garden-performance', mode); } catch (_) {}
      applyPolicy();
    });
  });

  var sections = document.querySelectorAll('[data-motion-section]');
  sections.forEach(function (section) {
    var bounds = section.getBoundingClientRect();
    section.dataset.motionVisible = String(bounds.bottom > 0 && bounds.top < window.innerHeight);
  });
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.target.dataset.motionVisible = String(entry.isIntersecting); });
      notify();
    }, { rootMargin: '40px 0px', threshold: 0 });
    sections.forEach(function (section) { observer.observe(section); });
  } else {
    // Never freeze content when viewport observation is unavailable.
    sections.forEach(function (section) { section.dataset.motionVisible = 'true'; });
  }

  window.addEventListener('scroll', function () {
    window.clearTimeout(scrollTimer);
    if (!scrolling) { scrolling = true; applyPolicy(); }
    scrollTimer = window.setTimeout(function () { scrolling = false; applyPolicy(); }, 140);
  }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    window.clearTimeout(scrollTimer);
    scrolling = false;
    applyPolicy();
  });
  reduced.addEventListener('change', applyPolicy);
  new MutationObserver(applyPolicy).observe(root, { attributes: true, attributeFilter: ['class'] });
  if (connection && connection.addEventListener) connection.addEventListener('change', applyPolicy);
  applyPolicy();

  // Read only the charging flag, locally. Browsers may omit or deny this API;
  // the manual setting and visibility optimizations work without it.
  if (typeof navigator.getBattery === 'function') {
    try {
      navigator.getBattery().then(function (value) {
        battery = value;
        battery.addEventListener('chargingchange', applyPolicy);
        applyPolicy();
      }).catch(function () {});
    } catch (_) {}
  }
})();
