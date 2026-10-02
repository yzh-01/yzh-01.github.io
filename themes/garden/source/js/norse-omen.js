(function () {
  'use strict';
  var cover = document.querySelector('.folio-cover');
  var button = document.querySelector('[data-norse-awaken]');
  var drift = document.querySelector('[data-norse-drift]');
  if (!cover || !button || !drift) return;
  var motion = window.GardenMotion;
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var visible = false;
  var entered = false;
  var suspended = false;
  var frame = 0;
  var x = 0, y = 0, targetX = 0, targetY = 0, last = 0;
  var aurora = Array.prototype.slice.call(cover.querySelectorAll('[data-aurora-layer]'));
  var phase = 0;
  var skyLoop;

  function curve(points, move) {
    var path = (move ? 'M' : 'L') + points[0].map(function (v) { return v.toFixed(1); }).join(' ');
    for (var i = 0; i < points.length - 1; i += 1) {
      var previous = points[Math.max(0, i - 1)], current = points[i];
      var next = points[i + 1], after = points[Math.min(points.length - 1, i + 2)];
      var c1 = current.map(function (v, axis) { return v + (next[axis] - previous[axis]) / 6; });
      var c2 = next.map(function (v, axis) { return v - (after[axis] - current[axis]) / 6; });
      path += 'C' + c1.concat(c2, next).map(function (v) { return v.toFixed(1); }).join(' ');
    }
    return path;
  }

  function paintAurora(now, elapsed) {
    phase += elapsed * .00016;
    aurora.forEach(function (layer, index) {
      var top = [], bottom = [];
      for (var i = 0; i < 7; i += 1) {
        var position = -.15 + i * 1.3 / 6;
        var height = 174 + index * 38 + Math.sin(position * 5.2 + phase + index * .85) * 67 +
          Math.sin(position * 9 - phase * .6) * 17;
        top.push([position * 1440, height]);
        bottom.push([position * 1440, height + 75 + index * 14 + Math.cos(position * 4 + phase) * 20]);
      }
      layer.setAttribute('d', curve(top, true) + curve(bottom.reverse(), false) + 'Z');
    });
  }

  function allowed() {
    return visible && !suspended && !document.hidden && !reduced.matches &&
      !root.classList.contains('garden-booting') && !root.classList.contains('garden-lite-motion') &&
      (!motion || (motion.canAnimate() && !motion.isEconomy()));
  }
  function stop() {
    window.cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    x = y = targetX = targetY = 0;
    cover.style.removeProperty('--cover-drift-x');
    cover.style.removeProperty('--cover-drift-y');
  }
  function refresh() {
    cover.dataset.norsePaused = String(!allowed());
    if (!entered && visible && !suspended && !document.hidden && !root.classList.contains('garden-booting')) {
      entered = true;
      if (allowed()) cover.classList.add('is-cover-entered');
    }
    if (!allowed()) stop();
    if (skyLoop) {
      if (allowed()) skyLoop.start();
      else skyLoop.stop();
    }
  }
  function render(now) {
    frame = 0;
    if (!allowed()) { stop(); return; }
    var ease = 1 - Math.exp(-Math.min(last ? now - last : 16, 64) / 130);
    last = now;
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    cover.style.setProperty('--cover-drift-x', x.toFixed(2) + 'px');
    cover.style.setProperty('--cover-drift-y', y.toFixed(2) + 'px');
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .03) frame = window.requestAnimationFrame(render);
    else last = 0;
  }
  function schedule() {
    if (!frame && allowed()) frame = window.requestAnimationFrame(render);
  }
  button.hidden = false;
  button.addEventListener('click', function () {
    var awake = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(awake));
    cover.classList.toggle('is-norse-awake', awake);
    button.querySelector('[data-norse-action]').textContent = awake ? '收起极光' : '点亮极光';
  });
  cover.addEventListener('pointermove', function (event) {
    if (!allowed() || !fine.matches || event.pointerType === 'touch') return;
    var rect = cover.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width - .5) * 10;
    targetY = ((event.clientY - rect.top) / rect.height - .5) * 7;
    schedule();
  }, { passive: true });
  cover.addEventListener('pointerleave', function () { targetX = targetY = 0; schedule(); }, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      refresh();
    }).observe(cover);
  } else { visible = true; }
  document.addEventListener('visibilitychange', refresh);
  reduced.addEventListener('change', refresh);
  fine.addEventListener('change', stop);
  if (motion) motion.subscribe(refresh);
  else new MutationObserver(refresh).observe(root, { attributes: true, attributeFilter: ['class'] });
  if (aurora.length && motion && motion.createLoop) {
    paintAurora(0, 0);
    skyLoop = motion.createLoop(paintAurora, {
      fps: 20,
      enabled: function () { return allowed() && !motion.isScrolling(); }
    });
  }
  window.addEventListener('pagehide', function () { suspended = true; refresh(); });
  window.addEventListener('pageshow', function () { suspended = false; refresh(); });
  refresh();
})();
