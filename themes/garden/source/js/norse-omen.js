(function () {
  'use strict';
  var cover = document.querySelector('.folio-cover');
  var button = document.querySelector('[data-norse-awaken]');
  var drift = document.querySelector('[data-norse-drift]');
  if (!cover || !button || !drift) return;
  var motion = window.GardenMotion;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var visible = false;
  var frame = 0;
  var x = 0, y = 0, targetX = 0, targetY = 0, last = 0;

  function allowed() {
    return visible && !document.hidden && !reduced.matches &&
      !document.documentElement.classList.contains('garden-lite-motion') &&
      (!motion || (motion.canAnimate() && !motion.isEconomy()));
  }
  function stop() {
    window.cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    x = y = targetX = targetY = 0;
    drift.style.removeProperty('transform');
  }
  function refresh() {
    cover.dataset.norsePaused = String(!allowed());
    if (!allowed()) stop();
  }
  function render(now) {
    frame = 0;
    if (!allowed()) { stop(); return; }
    var ease = 1 - Math.exp(-Math.min(last ? now - last : 16, 64) / 130);
    last = now;
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    drift.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
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
    button.querySelector('[data-norse-action]').textContent = awake ? '让世界树沉睡' : '唤醒世界树';
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
  if (motion) motion.subscribe(refresh);
  window.addEventListener('pagehide', stop);
  refresh();
})();
