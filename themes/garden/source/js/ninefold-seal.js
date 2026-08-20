(function () {
  'use strict';

  var ninefold = document.querySelector('[data-ninefold]');
  var trigger = document.querySelector('[data-ninefold-trigger]');
  var cover = document.querySelector('.folio-cover');
  var wordmark = document.querySelector('[data-winter-wordmark]');
  var eclipse = wordmark && wordmark.querySelector('.folio-wordmark-disc');
  if (!ninefold || !trigger || !cover || !wordmark || !eclipse) return;
  var stones = Array.prototype.slice.call(ninefold.querySelectorAll('.folio-realm-stone'));

  var root = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var resizeFrame = 0;
  var finishTimer = 0;
  var busy = false;
  var opened = false;
  var targetOpen = false;

  function isQuiet() {
    return root.classList.contains('garden-lite-motion') || reducedMotion.matches;
  }

  function measure() {
    resizeFrame = 0;
    var coverRect = cover.getBoundingClientRect();
    var eclipseRect = eclipse.getBoundingClientRect();
    if (!coverRect.width || !coverRect.height || !eclipseRect.width) return;
    ninefold.style.setProperty('--ninefold-x', (eclipseRect.left + eclipseRect.width / 2 - coverRect.left).toFixed(2) + 'px');
    ninefold.style.setProperty('--ninefold-y', (eclipseRect.top + eclipseRect.height / 2 - coverRect.top).toFixed(2) + 'px');
  }

  function scheduleMeasure() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(measure);
  }

  function setStoneAccess(enabled) {
    stones.forEach(function (stone) { stone.tabIndex = enabled ? 0 : -1; });
  }

  function finishTransition() {
    window.clearTimeout(finishTimer);
    finishTimer = 0;
    busy = false;
    opened = targetOpen;
    ninefold.classList.remove('is-opening', 'is-closing');
    ninefold.classList.toggle('is-open', opened);
    wordmark.classList.remove('is-ninefold-transition');
    trigger.setAttribute('aria-expanded', opened ? 'true' : 'false');
    trigger.removeAttribute('aria-disabled');
    setStoneAccess(opened);
  }

  function toggleNinefold(event) {
    if (event) event.stopPropagation();
    if (busy) return;
    busy = true;
    targetOpen = !opened;
    measure();
    ninefold.classList.remove('is-opening', 'is-closing');
    ninefold.classList.add(targetOpen ? 'is-opening' : 'is-closing');
    if (!targetOpen) {
      ninefold.classList.remove('is-open');
      setStoneAccess(false);
      if (stones.indexOf(document.activeElement) !== -1) trigger.focus();
    }
    wordmark.classList.add('is-ninefold-transition');
    trigger.setAttribute('aria-expanded', targetOpen ? 'true' : 'false');
    trigger.setAttribute('aria-disabled', 'true');
    finishTimer = window.setTimeout(finishTransition, isQuiet() ? 80 : (targetOpen ? 1420 : 1080));
  }

  trigger.addEventListener('click', toggleNinefold);
  stones.forEach(function (stone) {
    stone.addEventListener('click', function (event) { event.stopPropagation(); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && opened && !busy) toggleNinefold(event);
  });
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('orientationchange', scheduleMeasure, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && busy) finishTransition();
    if (!document.hidden) scheduleMeasure();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleMeasure);
  scheduleMeasure();
})();
