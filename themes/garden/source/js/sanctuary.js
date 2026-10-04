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
  var realms = Array.prototype.slice.call(root.querySelectorAll('[data-root-realm]'));
  var threads = Array.prototype.slice.call(root.querySelectorAll('[data-root-thread]'));
  var sigils = Array.prototype.slice.call(root.querySelectorAll('[data-root-sigil]'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var motion = window.GardenMotion;
  var awake = false, selected = null, suspended = false, frame = 0;
  var lightX = 50, lightY = 52;
  var bounds = stage.getBoundingClientRect();
  var visible = bounds.bottom > 0 && bounds.top < window.innerHeight;

  function canAnimate() {
    return awake && visible && !suspended && !document.hidden && !reduced.matches &&
      !document.documentElement.classList.contains('garden-lite-motion') &&
      (!motion || ((!motion.canAnimate || motion.canAnimate()) && (!motion.isEconomy || !motion.isEconomy())));
  }
  function pointerAllowed() { return fine.matches && canAnimate(); }
  function resetLight() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    stage.style.setProperty('--root-light-x', '50%');
    stage.style.setProperty('--root-light-y', '52%');
  }
  function policy() {
    root.dataset.motion = canAnimate() ? 'running' : 'paused';
    if (!pointerAllowed()) resetLight();
  }
  function announceReading() {
    if (status && selected) status.textContent = '微光相连，' + selected.dataset.realmName + '。' + selected.dataset.realmStory;
  }
  function selectRealm(realm) {
    selected = realm;
    var index = realm.dataset.rootRealm;
    realms.forEach(function (item) { item.setAttribute('aria-pressed', item === realm ? 'true' : 'false'); });
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
    if (reading) {
      if (!awake && reading.contains(document.activeElement)) awaken.focus();
      reading.hidden = !awake;
    }
    if (hint) hint.textContent = awake ? '九界已显影 · 再次轻触收起' : '轻触印记 · 让九界显影';
    if (awake) {
      if (!selected) {
        var first = realms.find(function (realm) { return realm.dataset.rootRealm === '0'; });
        if (first) selectRealm(first);
      } else announceReading();
    } else if (status) status.textContent = '余光收起，九界静候下一次相逢。';
    policy();
  }

  awaken.addEventListener('click', function () { setAwake(!awake); });
  realms.forEach(function (realm) {
    realm.addEventListener('click', function () { if (awake) selectRealm(realm); });
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
    });
  }, { passive: true });
  stage.addEventListener('pointerleave', resetLight);
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
  awaken.disabled = false;
  root.dataset.ready = 'true';
})();
