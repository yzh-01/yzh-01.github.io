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
  var stillLabel = root.querySelector('[data-root-still-label]');
  var realms = Array.prototype.slice.call(root.querySelectorAll('[data-root-realm]'));
  var sigilButtons = Array.prototype.slice.call(root.querySelectorAll('[data-root-sigil-button]'));
  var threads = Array.prototype.slice.call(root.querySelectorAll('[data-root-thread]'));
  var sigils = Array.prototype.slice.call(root.querySelectorAll('[data-root-sigil]'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var motion = window.GardenMotion;
  var awake = false, selected = null, suspended = false, still = false, frame = 0, echoTimer = 0;
  var lightX = 50, lightY = 52;
  var bounds = stage.getBoundingClientRect();
  var visible = bounds.bottom > 0 && bounds.top < window.innerHeight;

  function canAnimate() {
    return awake && !still && visible && !suspended && !document.hidden && !reduced.matches &&
      !document.documentElement.classList.contains('garden-lite-motion') &&
      (!motion || ((!motion.canAnimate || motion.canAnimate()) && (!motion.isEconomy || !motion.isEconomy())));
  }
  function pointerAllowed() { return fine.matches && canAnimate(); }
  function resetLight() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    stage.style.setProperty('--root-light-x', '50%');
    stage.style.setProperty('--root-light-y', '52%');
    stage.style.setProperty('--root-sway-x', '0px');
    stage.style.setProperty('--root-sway-y', '0px');
  }
  function clearEcho() {
    if (echoTimer) window.clearTimeout(echoTimer);
    echoTimer = 0;
    root.dataset.echo = 'false';
  }
  function pulse(x, y) {
    if (!echoField || !canAnimate()) return;
    clearEcho();
    stage.style.setProperty('--root-echo-x', Math.max(0, Math.min(100, x)).toFixed(2) + '%');
    stage.style.setProperty('--root-echo-y', Math.max(0, Math.min(100, y)).toFixed(2) + '%');
    void echoField.offsetWidth;
    root.dataset.echo = 'true';
    echoTimer = window.setTimeout(clearEcho, 1900);
  }
  function policy() {
    var running = canAnimate();
    root.dataset.motion = running ? 'running' : 'paused';
    if (!running) clearEcho();
    if (echo) echo.disabled = !running;
    if (!pointerAllowed()) resetLight();
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
    if (hint) hint.textContent = awake ? 'TRACE A RUNE · TOUCH AGAIN TO REST' : 'TOUCH THE SIGN · FOLLOW THE LIGHT';
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
    root.dataset.still = String(still);
    stillButton.setAttribute('aria-pressed', String(still));
    stillButton.setAttribute('aria-label', still ? '恢复动态' : '静止光幕');
    if (stillLabel) stillLabel.textContent = still ? 'STILL' : 'DRIFT';
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
    lightX = Math.max(10, Math.min(90, (event.clientX - rect.left) / rect.width * 100));
    lightY = Math.max(10, Math.min(90, (event.clientY - rect.top) / rect.height * 100));
    if (frame) return;
    frame = window.requestAnimationFrame(function () {
      frame = 0;
      if (!pointerAllowed()) return;
      stage.style.setProperty('--root-light-x', lightX.toFixed(2) + '%');
      stage.style.setProperty('--root-light-y', lightY.toFixed(2) + '%');
      stage.style.setProperty('--root-sway-x', ((lightX - 50) * 0.3).toFixed(2) + 'px');
      stage.style.setProperty('--root-sway-y', ((lightY - 50) * 0.15).toFixed(2) + 'px');
    });
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
  resetLight();
  root.dataset.still = 'false';
  if (stillButton) {
    stillButton.setAttribute('aria-pressed', 'false');
    stillButton.setAttribute('aria-label', '静止光幕');
  }
  if (stillLabel) stillLabel.textContent = 'DRIFT';
  awaken.disabled = false;
  root.dataset.ready = 'true';
})();
