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
  var auroraVeils = Array.prototype.slice.call(cover.querySelectorAll('[data-aurora-veil]'));
  var auroraRayGroups = Array.prototype.slice.call(cover.querySelectorAll('[data-aurora-rays]'));
  var auroraRays = [];
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

  function auroraHeight(position, index) {
    var profile = auroraProfiles[index];
    return profile.height + profile.tilt * (position - .5) +
      Math.sin(position * profile.wave + profile.offset + phase * profile.speed) * profile.rise +
      Math.sin(position * 7.2 - phase * .4 + index) * 8;
  }

  function createAuroraRays() {
    auroraRayGroups.forEach(function (group, depth) {
      var count = depth ? 24 : 36;
      for (var i = 0; i < count; i += 1) {
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        var variation = (Math.sin(i * 2.37 + depth * .7) + 1) * .5;
        var progress = i / (count - 1);
        path.setAttribute('fill', 'url(#norse-aurora-ray-' + (i % 11 === 8 ? 'pearl' : depth ? 'mint' : 'ice') + ')');
        group.appendChild(path);
        auroraRays.push({
          node: path, depth: depth, index: i,
          position: -.03 + progress * 1.06 + Math.sin(progress * Math.PI * 4 + depth * .9) * .052 + Math.sin(i * 1.73) * .005,
          variation: variation,
          brightness: (Math.sin(i * 1.43 + depth * .65) + 1) * .5,
          width: depth ? 6 + variation * 13 : 8 + variation * 17,
          height: depth ? 106 + variation * 147 : 88 + variation * 116
        });
      }
    });
  }

  function paintAuroraRays() {
    if (!auroraRays.length && auroraRayGroups.length) createAuroraRays();
    auroraRays.forEach(function (ray) {
      var position = ray.position + Math.sin(phase * .65 + ray.index * .9) * .003;
      var baseX = position * 1440;
      var baseY = auroraHeight(position, ray.depth ? 0 : 1) + (ray.depth ? 3 : 20);
      var envelope = .48 + .52 * Math.sin(Math.max(0, Math.min(1, position)) * Math.PI);
      var height = ray.height * envelope * (1 + Math.sin(phase * .55 + ray.index * 1.4) * .06);
      var lean = -32 + position * 18 + Math.sin(position * 4.2 + phase * .35 + ray.depth * .4) * 22;
      var topX = baseX + lean, topY = baseY - height;
      var width = ray.width, topWidth = width * (.8 + ray.variation * .35);
      var bend = Math.sin(position * 6.8 + phase * .5 + ray.depth * .6) * 16 + Math.sin(ray.index * 1.7) * 5;
      var points = [
        baseX - width * .5, baseY,
        baseX - width * .45 + bend, baseY - height * .3,
        topX - topWidth * .45 - bend, topY + height * .24,
        topX - topWidth * .5, topY,
        topX + topWidth * .5, topY,
        topX + topWidth * .45 - bend, topY + height * .24,
        baseX + width * .45 + bend, baseY - height * .3,
        baseX + width * .5, baseY
      ].map(function (value) { return value.toFixed(1); });
      ray.node.setAttribute('d', 'M' + points.slice(0, 2).join(' ') + 'C' + points.slice(2, 8).join(' ') +
        'L' + points.slice(8, 10).join(' ') + 'C' + points.slice(10).join(' ') + 'Z');
      ray.node.setAttribute('opacity', ((ray.depth ? .22 : .12) + ray.brightness * (ray.depth ? .22 : .18) +
        Math.sin(phase * .4 + ray.index * 1.7) * .015).toFixed(3));
    });
  }

  function paintAurora(now, elapsed) {
    phase += elapsed * .0001;
    aurora.forEach(function (layer, index) {
      var top = [], bottom = [], edge = [];
      var profile = auroraProfiles[index % auroraProfiles.length];
      for (var i = 0; i < 11; i += 1) {
        var position = -.16 + i * 1.32 / 10;
        var height = auroraHeight(position, index % auroraProfiles.length);
        var taper = Math.sin(Math.max(0, Math.min(1, position)) * Math.PI);
        var width = profile.width * (.28 + .72 * Math.pow(taper, .85));
        top.push([position * 1440, height - width * .5]);
        bottom.push([position * 1440, height + width * .5]);
        edge.push([position * 1440, height + width * .12]);
      }
      layer.setAttribute('d', curve(top, true) + curve(bottom.reverse(), false) + 'Z');
      if (auroraEdges[index]) auroraEdges[index].setAttribute('d', curve(edge, true));
    });
    auroraVeils.forEach(function (veil, index) {
      var top = [], bottom = [];
      for (var i = 0; i < 11; i += 1) {
        var position = -.16 + i * 1.32 / 10;
        var base = auroraHeight(position, index % 2);
        var spread = 118 + Math.sin(position * 4.5 + phase * .3 + index) * 38;
        top.push([position * 1440 - 28, base - spread]);
        bottom.push([position * 1440, base + 28]);
      }
      veil.setAttribute('d', curve(top, true) + curve(bottom.reverse(), false) + 'Z');
    });
    paintAuroraRays();
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
