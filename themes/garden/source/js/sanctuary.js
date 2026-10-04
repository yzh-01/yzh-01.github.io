(function () {
  'use strict';
  var root = document.querySelector('[data-root-sanctuary]');
  if (!root) return;
  var stage = root.querySelector('[data-root-clearing]');
  var awaken = root.querySelector('[data-root-awaken]');
  if (!stage || !awaken) return;
  var reading = root.querySelector('[data-root-reading]');
  var label = root.querySelector('[data-root-label]');
  var title = root.querySelector('[data-root-title]');
  var story = root.querySelector('[data-root-story]');
  var hint = root.querySelector('[data-root-hint]');
  var status = root.querySelector('[data-root-status]');
  var hotspots = root.querySelector('[data-root-hotspots]');
  var controls = root.querySelector('[data-root-controls]');
  var echo = root.querySelector('[data-root-echo]');
  var echoField = root.querySelector('[data-root-echo-field]');
  var stillButton = root.querySelector('[data-root-still]');
  var realms = Array.prototype.slice.call(root.querySelectorAll('[data-root-realm]'));
  var sigilButtons = Array.prototype.slice.call(root.querySelectorAll('[data-root-sigil-button]'));
  var threads = Array.prototype.slice.call(root.querySelectorAll('[data-root-thread]'));
  var sigils = Array.prototype.slice.call(root.querySelectorAll('[data-root-sigil]'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var motion = window.GardenMotion;
  var awake = false, selected = null, suspended = false, still = false;
  var time = 0, lightX = 50, lightY = 52, targetX = 50, targetY = 52;
  var echoAge = -1, echoSeed = 0, sparks = [], sky = [];
  var bloom = echoField && echoField.querySelector('b');
  var sparkNodes = echoField ? Array.prototype.slice.call(echoField.querySelectorAll('i')) : [];
  var motes = Array.prototype.slice.call(root.querySelectorAll('[data-root-mote]')).map(function (node) {
    return { node: node, x: Number(node.getAttribute('cx')), y: Number(node.getAttribute('cy')) };
  });
  var bounds = stage.getBoundingClientRect();
  var visible = bounds.bottom > 0 && bounds.top < window.innerHeight;

  // These atmosphere paths use absolute, paired M/C/S/L coordinates. Deform
  // their control points together so folds travel through the light itself.
  function collectSky(selector, strength, depth) {
    root.querySelectorAll(selector).forEach(function (node, index) {
      var tokens = node.getAttribute('d').match(/[A-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
      var points = [];
      var layer = depth + (selector.indexOf('rays') === -1 ? index * .8 : 0);
      for (var i = 0; i < tokens.length; i++) {
        if (/^[A-Z]$/i.test(tokens[i])) continue;
        var at = i, x = Number(tokens[i]), y = Number(tokens[++i]);
        var fold = x * .008 + layer, ripple = x * .017 + layer, shear = x * .004 + layer;
        points.push({ at: at, x: x, y: y, height: Math.max(.3, Math.min(1, y / 230)),
          fold: fold, ripple: ripple, shear: shear,
          foldBase: Math.sin(fold), rippleBase: Math.sin(ripple), shearBase: Math.sin(shear) });
      }
      sky.push({ node: node, tokens: tokens, points: points, strength: strength,
        opacity: Number(node.getAttribute('opacity') || 1), ray: selector.indexOf('rays') !== -1 });
    });
  }
  collectSky('.ash-sky-volume path', .6, .8);
  collectSky('.ash-sky-curtain path', 1, 0);
  collectSky('.ash-sky-rays path', 1, .2);
  collectSky('.ash-sky-mist path', .35, 2.8);

  function restricted() {
    return reduced.matches || document.documentElement.classList.contains('garden-lite-motion') ||
      document.documentElement.classList.contains('garden-overrun') ||
      (!document.hidden && motion && motion.canAnimate && !motion.canAnimate());
  }
  function canAnimate() {
    return awake && !still && visible && !suspended && !document.hidden && !restricted();
  }
  function pointerAllowed() { return fine.matches && canAnimate(); }
  function resetLight() {
    targetX = 50;
    targetY = 52;
  }
  function clearEcho() {
    echoAge = -1;
    root.dataset.echo = 'false';
    if (bloom) bloom.style.opacity = '0';
    sparkNodes.forEach(function (spark) { spark.style.opacity = '0'; });
  }
  function pulse(x, y) {
    if (!echoField || !canAnimate()) return;
    clearEcho();
    echoAge = 0;
    echoSeed++;
    stage.style.setProperty('--root-echo-x', Math.max(0, Math.min(100, x)).toFixed(2) + '%');
    stage.style.setProperty('--root-echo-y', Math.max(0, Math.min(100, y)).toFixed(2) + '%');
    sparks = sparkNodes.map(function (node, index) {
      var seed = index * 2.39996 + echoSeed * 1.618;
      return { node: node, delay: index * .055, life: 2.3 + .35 * Math.sin(seed),
        drift: Math.sin(seed) * 42, lift: 48 + (1 + Math.cos(seed * 1.7)) * 28, bend: Math.cos(seed) * 18 };
    });
    root.dataset.echo = 'true';
  }
  function paintEcho(elapsed) {
    if (echoAge < 0) return;
    echoAge += elapsed;
    if (echoAge > 3.1) { clearEcho(); return; }
    var glow = Math.min(1, echoAge / 2.8);
    if (bloom) {
      bloom.style.opacity = (Math.pow(Math.sin(glow * Math.PI), 2) * .5).toFixed(3);
      bloom.style.transform = 'translate(-50%, calc(-55% - ' + (glow * 35).toFixed(2) + 'px)) scale(' + (.65 + glow * .75).toFixed(3) + ', ' + (.85 + glow * .3).toFixed(3) + ')';
    }
    sparks.forEach(function (spark) {
      var age = Math.max(0, Math.min(1, (echoAge - spark.delay) / spark.life));
      var x = spark.drift * age + Math.sin(age * Math.PI * 1.4) * spark.bend;
      var y = -spark.lift * age * (.7 + .3 * age);
      spark.node.style.opacity = (Math.pow(Math.sin(age * Math.PI), 1.5) * .8).toFixed(3);
      spark.node.style.transform = 'translate(' + x.toFixed(2) + 'px, ' + y.toFixed(2) + 'px)';
    });
  }
  function paint(now, elapsed) {
    if (!canAnimate()) return;
    var seconds = Math.min(100, elapsed) / 1000;
    time += seconds;
    var ease = 1 - Math.exp(-seconds / .75);
    lightX += (targetX - lightX) * ease;
    lightY += (targetY - lightY) * ease;
    stage.style.setProperty('--root-light-x', lightX.toFixed(2) + '%');
    stage.style.setProperty('--root-light-y', lightY.toFixed(2) + '%');
    stage.style.setProperty('--root-mist-shift', (Math.sin(time * .19) * 12).toFixed(2) + '%');
    sky.forEach(function (path) {
      path.points.forEach(function (point) {
        var fold = Math.sin(point.fold - time * .48) - point.foldBase;
        var ripple = Math.sin(point.ripple + time * .31) - point.rippleBase;
        var shear = Math.sin(point.shear + time * .27) - point.shearBase;
        var x = point.x + (shear * 24 + (lightX - 50) * .3 * point.height) * path.strength;
        var y = point.y + (fold * 25 + ripple * 8 + (lightY - 52) * .16) * path.strength * point.height;
        path.tokens[point.at] = x.toFixed(2);
        path.tokens[point.at + 1] = y.toFixed(2);
      });
      path.node.setAttribute('d', path.tokens.join(' '));
      if (path.ray) {
        var flow = .78 + .22 * Math.sin(path.points[0].x * .012 - time * .6);
        path.node.setAttribute('opacity', (path.opacity * flow).toFixed(3));
      }
    });
    motes.forEach(function (mote, index) {
      var phase = time * .27 + index * 2.39996;
      mote.node.setAttribute('cx', (mote.x + Math.sin(phase) * 18).toFixed(2));
      mote.node.setAttribute('cy', (mote.y + Math.cos(phase * .8) * 13).toFixed(2));
      mote.node.setAttribute('opacity', (.08 + Math.pow(.5 + .5 * Math.sin(time * .65 + index * 1.7), 2) * .4).toFixed(3));
    });
    threads.forEach(function (thread, index) { thread.style.strokeDashoffset = (-time * (6 + index * .25)).toFixed(2); });
    paintEcho(seconds);
  }
  var loop = motion && motion.createLoop ? motion.createLoop(paint, {
    fps: function () { return motion.isEconomy && motion.isEconomy() ? 18 : 30; }, enabled: canAnimate
  }) : (function () {
    var frame = 0, last = 0;
    function tick(now) {
      frame = 0;
      if (!canAnimate()) { last = 0; return; }
      if (!last || now - last >= 1000 / 30) { paint(now, last ? now - last : 1000 / 30); last = now; }
      frame = window.requestAnimationFrame(tick);
    }
    return {
      start: function () { if (!frame) frame = window.requestAnimationFrame(tick); },
      stop: function () { window.cancelAnimationFrame(frame); frame = last = 0; }
    };
  })();
  function updateControl() {
    var blocked = Boolean(restricted());
    var held = still || blocked;
    root.dataset.still = String(held);
    if (stillButton) {
      stillButton.disabled = blocked;
      stillButton.setAttribute('aria-pressed', String(held));
      var description = blocked ? (reduced.matches || document.documentElement.classList.contains('garden-lite-motion') ?
        '已遵循减弱动态设置，光幕保持静止' : '当前动效策略已暂停光幕') :
        held ? '恢复极光、雾气与光屑的流动' : '定格当前的极光、雾气与光屑';
      stillButton.setAttribute('aria-label', description);
      stillButton.title = description;
    }
    if (hint) hint.textContent = !awake ? 'TOUCH THE SIGN · FOLLOW THE LIGHT' :
      held ? 'TRACE A RUNE · A MOMENT HELD' : 'TRACE A RUNE · LIGHT IN MOTION';
  }
  function policy() {
    var running = canAnimate();
    root.dataset.motion = running ? 'running' : 'paused';
    if (running) loop.start();
    else loop.stop();
    // A user pause holds the complete current pose, including an echo in flight.
    if (!awake || restricted()) clearEcho();
    if (echo) echo.disabled = !running;
    if (!fine.matches) resetLight();
    updateControl();
  }
  function pointRealm(index) {
    threads.forEach(function (thread) { thread.classList.toggle('is-pointed', awake && thread.dataset.rootThread === index); });
    sigils.forEach(function (sigil) { sigil.classList.toggle('is-pointed', awake && sigil.dataset.rootSigil === index); });
  }
  function realmAt(index) {
    return realms.find(function (realm) { return realm.dataset.rootRealm === index; });
  }
  function placeSigilButtons() {
    var rect = stage.getBoundingClientRect();
    sigilButtons.forEach(function (button) {
      var sigil = sigils.find(function (item) { return item.dataset.rootSigil === button.dataset.rootSigilButton; });
      var matrix = sigil && typeof sigil.getScreenCTM === 'function' ? sigil.getScreenCTM() : null;
      var x = matrix ? matrix.e - rect.left : NaN;
      var y = matrix ? matrix.f - rect.top : NaN;
      var inside = Number.isFinite(x) && Number.isFinite(y) && x >= 21 && x <= rect.width - 21 && y >= 21 && y <= rect.height - 21;
      if (!inside && button === document.activeElement) {
        var realm = realmAt(button.dataset.rootSigilButton);
        if (awake && realm) realm.focus();
        else awaken.focus();
      }
      button.hidden = !inside;
      if (inside) {
        button.style.left = x.toFixed(2) + 'px';
        button.style.top = y.toFixed(2) + 'px';
      }
    });
  }
  function announceReading() {
    if (status && selected) status.textContent = '微光相连，' + selected.dataset.realmName + '。' + selected.dataset.realmStory;
  }
  function selectRealm(realm) {
    selected = realm;
    var index = realm.dataset.rootRealm;
    realms.forEach(function (item) { item.setAttribute('aria-pressed', item === realm ? 'true' : 'false'); });
    sigilButtons.forEach(function (button) { button.setAttribute('aria-pressed', button.dataset.rootSigilButton === index ? 'true' : 'false'); });
    threads.forEach(function (thread) { thread.classList.toggle('is-selected', thread.dataset.rootThread === index); });
    sigils.forEach(function (sigil) { sigil.classList.toggle('is-selected', sigil.dataset.rootSigil === index); });
    if (label) label.textContent = realm.dataset.realmRune + ' / ' + realm.dataset.realmName;
    if (title) title.textContent = realm.dataset.realmName;
    if (story) story.textContent = realm.dataset.realmStory;
    announceReading();
  }
  function setAwake(value) {
    awake = Boolean(value);
    root.dataset.awake = String(awake);
    awaken.setAttribute('aria-pressed', String(awake));
    awaken.setAttribute('aria-label', awake ? '收起余光' : '唤醒印记');
    if (!awake && [reading, controls, hotspots].some(function (group) { return group && group.contains(document.activeElement); })) awaken.focus();
    if (reading) {
      reading.hidden = !awake;
    }
    if (controls) controls.hidden = !awake;
    if (hotspots) hotspots.hidden = !awake;
    if (awake) {
      placeSigilButtons();
      if (!selected) {
        var first = realms.find(function (realm) { return realm.dataset.rootRealm === '0'; });
        if (first) selectRealm(first);
      } else announceReading();
    } else {
      pointRealm(null);
      if (status) status.textContent = '余光收起，九界静候下一次相逢。';
    }
    policy();
  }

  awaken.addEventListener('click', function () { setAwake(!awake); });
  realms.forEach(function (realm) {
    realm.addEventListener('click', function () { if (awake) selectRealm(realm); });
  });
  sigilButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var realm = realmAt(button.dataset.rootSigilButton);
      if (awake && realm) selectRealm(realm);
    });
  });
  realms.concat(sigilButtons).forEach(function (button) {
    function preview() { pointRealm(button.dataset.rootRealm || button.dataset.rootSigilButton); }
    button.addEventListener('pointerenter', preview);
    button.addEventListener('focus', preview);
    button.addEventListener('pointerleave', function () { pointRealm(null); });
    button.addEventListener('blur', function () { pointRealm(null); });
  });
  if (stillButton) stillButton.addEventListener('click', function () {
    if (!awake) return;
    still = !still;
    policy();
  });
  if (echo) echo.addEventListener('click', function () { pulse(50, 52); });
  stage.addEventListener('click', function (event) {
    if (event.target.closest('button, [data-root-controls]')) return;
    var rect = stage.getBoundingClientRect();
    if (rect.width && rect.height) pulse((event.clientX - rect.left) / rect.width * 100, (event.clientY - rect.top) / rect.height * 100);
  });
  stage.addEventListener('pointermove', function (event) {
    if (!pointerAllowed()) return;
    var rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    targetX = Math.max(10, Math.min(90, (event.clientX - rect.left) / rect.width * 100));
    targetY = Math.max(10, Math.min(90, (event.clientY - rect.top) / rect.height * 100));
  }, { passive: true });
  stage.addEventListener('pointerleave', resetLight);
  if ('ResizeObserver' in window) {
    var resizeObserver = new ResizeObserver(placeSigilButtons);
    resizeObserver.observe(stage);
  } else window.addEventListener('resize', placeSigilButtons, { passive: true });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && awake) { event.preventDefault(); setAwake(false); }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.target === stage) visible = entry.isIntersecting; });
      policy();
    }, { threshold: 0 }).observe(stage);
  } else visible = true;
  document.addEventListener('visibilitychange', policy);
  reduced.addEventListener('change', policy);
  fine.addEventListener('change', policy);
  if (motion && motion.subscribe) motion.subscribe(policy);
  else new MutationObserver(policy).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('pagehide', function () { suspended = true; policy(); });
  window.addEventListener('pageshow', function () { suspended = false; policy(); });
  setAwake(false);
  awaken.disabled = false;
  root.dataset.ready = 'true';
})();
