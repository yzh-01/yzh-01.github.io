(function () {
  'use strict';

  var ninefold = document.querySelector('[data-ninefold]');
  var trigger = document.querySelector('[data-ninefold-trigger]');
  var cover = document.querySelector('.folio-cover');
  var wordmark = document.querySelector('[data-winter-wordmark]');
  var eclipse = wordmark && wordmark.querySelector('.folio-wordmark-disc');
  if (!ninefold || !trigger || !cover || !wordmark || !eclipse) return;

  var root = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var resizeFrame = 0;
  var finishTimer = 0;
  var active = false;

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

  function finish() {
    window.clearTimeout(finishTimer);
    finishTimer = 0;
    active = false;
    ninefold.classList.remove('is-unfolding');
    wordmark.classList.remove('is-ninefold-open');
    trigger.removeAttribute('aria-disabled');
  }

  function unfold(event) {
    if (event) event.stopPropagation();
    if (active) return;
    active = true;
    measure();
    ninefold.classList.add('is-unfolding');
    wordmark.classList.add('is-ninefold-open');
    trigger.setAttribute('aria-disabled', 'true');
    finishTimer = window.setTimeout(finish, isQuiet() ? 520 : 3380);
  }

  trigger.addEventListener('click', unfold);
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('orientationchange', scheduleMeasure, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && active) finish();
    if (!document.hidden) scheduleMeasure();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleMeasure);
  scheduleMeasure();
})();
