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
  var echoAction = root.querySelector('[data-root-echo-action]');
  var echoPrompt = root.querySelector('[data-root-echo-prompt]');
  var echoWave = root.querySelector('[data-root-echo-wave]');
  var echoTrails = root.querySelector('[data-root-echo-trails]');
  var echoAnswer = root.querySelector('[data-root-echo-answer]');
  var echoMark = root.querySelector('[data-root-echo-mark]');
  var echoName = root.querySelector('[data-root-echo-name]');
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
  var echoAge = -1, echoTarget = null, echoCommitted = false, lastEcho = null, sky = [], trails = [];
  var remembered = Object.create(null);
  var numerals = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  var bloom = echoField && echoField.querySelector('b');
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
  // Reuse the nine existing routes. No nodes or timers accumulate on repeat calls.
  if (echoTrails) threads.forEach(function (thread, index) {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', thread.getAttribute('d'));
    path.setAttribute('class', 'ash-echo-trail');
    echoTrails.appendChild(path);
    var length = typeof thread.getTotalLength === 'function' ? thread.getTotalLength() : 400;
    trails.push({ node: path, length: length || 400, index: thread.dataset.rootThread, delay: .08 + index * .035 });
  });

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
  function progressText() { return numerals[Object.keys(remembered).length] + ' / IX REMEMBERED'; }
  function smooth(value) { value = Math.max(0, Math.min(1, value)); return value * value * (3 - 2 * value); }
  function clearEcho() {
    echoAge = -1;
    echoTarget = null;
    echoCommitted = false;
    root.dataset.echo = 'false';
    root.dataset.echoPhase = 'idle';
    stage.style.setProperty('--root-echo-energy', '0');
    if (bloom) bloom.style.opacity = '0';
    if (echoWave) echoWave.style.opacity = '0';
    if (echoAnswer) echoAnswer.style.opacity = '0';
    trails.forEach(function (trail) { trail.node.style.opacity = '0'; });
    sigils.concat(realms, sigilButtons).forEach(function (node) { node.classList.remove('is-echoing', 'is-answering'); });
  }
  function nextRealm() {
    var start = selected ? realms.indexOf(selected) : -1;
    for (var i = 1; i <= realms.length; i++) {
      var candidate = realms[(start + i) % realms.length];
      if (!remembered[candidate.dataset.rootRealm]) return candidate;
    }
    return realms[(start + 1) % realms.length];
  }
  function commitEcho() {
    if (!echoTarget || echoCommitted) return;
    echoCommitted = true;
    selectRealm(echoTarget, true);
    root.dataset.echoPhase = 'answered';
    if (echoMark) echoMark.textContent = echoTarget.dataset.realmMark || '';
    if (echoName) echoName.textContent = echoTarget.dataset.realmRune;
    sigilButtons.forEach(function (button) { button.classList.toggle('is-answering', button.dataset.rootSigilButton === echoTarget.dataset.rootRealm); });
    updateControl();
  }
  function callEcho() {
    if (!awake || !realms.length || (echoAge >= 0 && !echoCommitted)) return;
    clearEcho();
    echoTarget = nextRealm();
    // Discovery is still useful without animation: always return a readable world.
    if (!canAnimate()) {
      commitEcho();
      clearEcho();
      updateControl();
      return;
    }
    echoAge = 0;
    lastEcho = null;
    root.dataset.echo = 'true';
    root.dataset.echoPhase = 'calling';
    if (status) status.textContent = '回声穿过雾气，正在寻找尚未探索的世界。';
    paintEcho(0);
    updateControl();
  }
  function paintEcho(elapsed) {
    if (echoAge < 0) return;
    echoAge += elapsed;
    if (echoAge >= 1.7) commitEcho();
    if (echoAge >= 3.8) { clearEcho(); updateControl(); return; }
    var outward = smooth(echoAge / 1.45);
    var energy = (1 - smooth((echoAge - .45) / 1.4)) * (.3 + .7 * smooth(echoAge / .25));
    stage.style.setProperty('--root-echo-energy', energy.toFixed(3));
    if (bloom) {
      bloom.style.opacity = (energy * .85).toFixed(3);
      bloom.style.transform = 'translate(-50%, -50%) scale(' + (.25 + outward * 1.4).toFixed(3) + ', ' + (.55 + outward * .6).toFixed(3) + ')';
    }
    if (echoWave) {
      echoWave.style.opacity = (energy * .8).toFixed(3);
      echoWave.setAttribute('transform', 'translate(600 224) scale(' + (.15 + outward * 1.25).toFixed(3) + ' ' + (.7 + outward * .8).toFixed(3) + ') translate(-600 -224)');
    }
    trails.forEach(function (trail) {
      var travel = smooth((echoAge - trail.delay) / .82);
      var returning = trail.index === echoTarget.dataset.rootRealm && echoAge > 1.03;
      var back = smooth((echoAge - 1.03) / .67);
      var opacity = returning ? Math.sin(back * Math.PI) * .95 : Math.sin(travel * Math.PI) * .55;
      trail.node.style.strokeDasharray = (returning ? trail.length * .22 : trail.length).toFixed(2) + ' ' + trail.length.toFixed(2);
      trail.node.style.strokeDashoffset = (returning ? -trail.length * (1 - back) : trail.length * (1 - travel)).toFixed(2);
      trail.node.style.opacity = Math.max(0, opacity).toFixed(3);
      trail.node.classList.toggle('is-returning', returning);
    });
    sigils.concat(realms).forEach(function (node) {
      var i = Number(node.dataset.rootSigil || node.dataset.rootRealm);
      var response = Math.max(0, 1 - Math.abs(echoAge - (.82 + i * .035)) / .45);
      var chosen = (node.dataset.rootSigil || node.dataset.rootRealm) === echoTarget.dataset.rootRealm;
      if (chosen && echoCommitted) response = Math.max(response, 1 - smooth((echoAge - 2.9) / .9));
      node.classList.toggle('is-echoing', response > 0);
      node.style.setProperty('--echo-sigil-light', response.toFixed(3));
    });
    if (echoAnswer) {
      var arrive = smooth((echoAge - 1.55) / .45), fade = 1 - smooth((echoAge - 3.1) / .7);
      echoAnswer.style.opacity = echoCommitted ? (arrive * fade).toFixed(3) : '0';
      echoAnswer.style.transform = 'translate(-50%, ' + ((1 - arrive) * 8).toFixed(2) + 'px)';
    }
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
    var calling = echoAge >= 0 && !echoCommitted;
    if (echo) {
      // Keep keyboard focus while the call is busy; callEcho guards repeat input.
      echo.disabled = !awake;
      echo.setAttribute('aria-disabled', String(calling));
      echo.setAttribute('aria-busy', String(calling));
      echo.setAttribute('aria-label', calling ? (held ? '回声已暂停，恢复动态以接收回应' : '回声正在寻找下一界') :
        '呼唤' + (Object.keys(remembered).length < realms.length ? '一处尚未探索的世界' : '下一界的回声'));
    }
    if (echoAction) echoAction.textContent = calling ? (held ? 'HELD' : 'CALLING') : 'ECHO';
    if (echoPrompt) echoPrompt.textContent = calling ? (held ? 'RESUME DRIFT' : 'LISTEN TO THE MIST') :
      Object.keys(remembered).length < realms.length ? 'CALL AN UNSEEN WORLD' : 'REVISIT THE NINE';
    if (hint) hint.textContent = !awake ? 'TOUCH THE SIGN · FOLLOW THE LIGHT' :
      held ? (calling ? 'A MOMENT HELD · DRIFT TO HEAR THE ANSWER' : 'A MOMENT HELD · ECHO CAN STILL DISCOVER') :
      calling ? 'ONE CALL · NINE LIGHTS LISTEN' : lastEcho ? lastEcho.dataset.realmRune + ' ANSWERS · ' + progressText() : 'TRACE A RUNE · LIGHT IN MOTION';
  }
  function policy() {
    var running = canAnimate();
    root.dataset.motion = running ? 'running' : 'paused';
    if (running) loop.start();
    else loop.stop();
    // A user pause holds the complete current pose, including an echo in flight.
    if (!awake) clearEcho();
    else if (restricted() && echoAge >= 0) { commitEcho(); clearEcho(); }
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
  function selectRealm(realm, fromEcho) {
    if (!fromEcho) clearEcho();
    lastEcho = fromEcho ? realm : null;
    selected = realm;
    var index = realm.dataset.rootRealm;
    remembered[index] = true;
    root.dataset.remembered = String(Object.keys(remembered).length);
    realms.forEach(function (item) {
      item.setAttribute('aria-pressed', item === realm ? 'true' : 'false');
      item.classList.toggle('is-remembered', Boolean(remembered[item.dataset.rootRealm]));
    });
    sigilButtons.forEach(function (button) { button.setAttribute('aria-pressed', button.dataset.rootSigilButton === index ? 'true' : 'false'); });
    threads.forEach(function (thread) { thread.classList.toggle('is-selected', thread.dataset.rootThread === index); });
    sigils.forEach(function (sigil) { sigil.classList.toggle('is-selected', sigil.dataset.rootSigil === index); });
    if (label) label.textContent = realm.dataset.realmRune + ' · ' + progressText();
    if (title) title.textContent = realm.dataset.realmName;
    if (story) story.textContent = realm.dataset.realmStory;
    announceReading();
    if (fromEcho && status) status.textContent = '回声来自' + realm.dataset.realmName + '。' + realm.dataset.realmStory + ' 已探索九界中的 ' + Object.keys(remembered).length + ' 界。';
    updateControl();
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
  if (echo) echo.addEventListener('click', callEcho);
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
