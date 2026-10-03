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
  var auroraEdges = Array.prototype.slice.call(cover.querySelectorAll('[data-aurora-edge]'));
  var auroraProfiles = [
    { height: 225, wave: 4.4, rise: 55, offset: -.5, tilt: -24, width: 68, speed: 1 },
    { height: 286, wave: 3.5, rise: 34, offset: 1.6, tilt: 54, width: 46, speed: -.7 },
    { height: 245, wave: 2.8, rise: 40, offset: -1.6, tilt: -46, width: 28, speed: .55 }
  ];
  var phase = 0;
  var skyLoop;
  var awake = button.getAttribute('aria-pressed') === 'true';
  var auroraPainted = false;

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
    phase += elapsed * .0001;
    aurora.forEach(function (layer, index) {
      var top = [], bottom = [], edge = [];
      var profile = auroraProfiles[index % auroraProfiles.length];
      for (var i = 0; i < 11; i += 1) {
        var position = -.16 + i * 1.32 / 10;
        var height = profile.height + profile.tilt * (position - .5) +
          Math.sin(position * profile.wave + profile.offset + phase * profile.speed) * profile.rise +
          Math.sin(position * 7.2 - phase * .4 + index) * 8;
        var taper = Math.sin(Math.max(0, Math.min(1, position)) * Math.PI);
        var width = profile.width * (.28 + .72 * Math.pow(taper, .85));
        top.push([position * 1440, height - width * .5]);
        bottom.push([position * 1440, height + width * .5]);
        edge.push([position * 1440, height + width * .12]);
      }
      layer.setAttribute('d', curve(top, true) + curve(bottom.reverse(), false) + 'Z');
      if (auroraEdges[index]) auroraEdges[index].setAttribute('d', curve(edge, true));
    });
  }

  function allowed() {
    return visible && !suspended && !document.hidden && !reduced.matches &&
      !root.classList.contains('garden-booting') && !root.classList.contains('garden-lite-motion') &&
      (!motion || (motion.canAnimate() && !motion.isEconomy()));
  }
  function auroraAllowed() {
    return awake && allowed() && (!motion || !motion.isScrolling());
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
    // The static curtain also works without the shared clock and in quiet modes.
    if (awake && !auroraPainted) { paintAurora(0, 0); auroraPainted = true; }
    if (!entered && visible && !suspended && !document.hidden && !root.classList.contains('garden-booting')) {
      entered = true;
      if (allowed()) cover.classList.add('is-cover-entered');
    }
    if (!allowed()) stop();
    if (skyLoop) {
      if (auroraAllowed()) skyLoop.start();
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
    awake = !awake;
    button.setAttribute('aria-pressed', String(awake));
    cover.classList.toggle('is-norse-awake', awake);
    button.querySelector('[data-norse-action]').textContent = awake ? '收起极光' : '点亮极光';
    refresh();
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
    skyLoop = motion.createLoop(function (now, elapsed) {
      if (auroraAllowed()) paintAurora(now, elapsed);
    }, {
      fps: 20,
      enabled: auroraAllowed
    });
  }
  window.addEventListener('pagehide', function () { suspended = true; refresh(); });
  window.addEventListener('pageshow', function () { suspended = false; refresh(); });
  refresh();
})();
