(function () {
  'use strict';
  var section = document.querySelector('[data-ash-sanctuary]');
  if (!section) return;
  var scene = section.querySelector('[data-ash-landscape]');
  var heart = section.querySelector('[data-ash-heart]');
  var awaken = section.querySelector('[data-ash-awaken]');
  var weather = section.querySelector('[data-ash-weather]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var motion = window.GardenMotion;
  var visible = false, awake = false, clear = false, x = 0, y = 0, tx = 0, ty = 0, last = 0, frame = 0;
  var layers = Array.prototype.map.call(scene.querySelectorAll('[data-ash-layer]'), function (element, i) { return {element: element, depth: [-.35, .5, 1][i]}; });
  function canMove() {
    return visible && !document.hidden && !reduced.matches && !document.documentElement.classList.contains('garden-lite-motion') &&
      (!motion || (motion.canAnimate() && !motion.isEconomy()));
  }
  function cancel() {
    window.cancelAnimationFrame(frame); frame = 0; last = 0; x = y = tx = ty = 0;
    layers.forEach(function (layer) { layer.element.style.removeProperty('transform'); });
  }
  function policy() {
    scene.dataset.paused = String(!canMove());
    if (!canMove()) cancel();
  }
  function paint(now) {
    frame = 0;
    if (!canMove()) { cancel(); return; }
    var ease = 1 - Math.exp(-Math.min(last ? now - last : 16, 64) / 150);
    last = now; x += (tx - x) * ease; y += (ty - y) * ease;
    layers.forEach(function (layer) { layer.element.style.transform = 'translate(' + (x * layer.depth).toFixed(2) + 'px,' + (y * layer.depth).toFixed(2) + 'px)'; });
    if (Math.abs(tx - x) + Math.abs(ty - y) > .025) frame = window.requestAnimationFrame(paint);
    else last = 0;
  }
  function schedule() { if (!frame && canMove()) frame = window.requestAnimationFrame(paint); }
  function toggleAwake(event) {
    // Keyboard and reduced-motion interactions resolve immediately; CSS owns the visual transition.
    section.dataset.instant = String(event.detail === 0 || !canMove());
    awake = !awake; scene.dataset.awake = String(awake);
    heart.setAttribute('aria-pressed', String(awake)); awaken.setAttribute('aria-pressed', String(awake));
    heart.setAttribute('aria-label', awake ? '让世界树沉睡' : '唤醒世界树');
    section.querySelector('[data-ash-action]').textContent = awake ? '让世界树沉睡' : '唤醒世界树';
    section.querySelector('[data-ash-status]').textContent = awake ? '九界相连，根脉间亮起了微光。' : '林谷沉睡，静候一束微光。';
    section.querySelector('[data-ash-count]').textContent = awake ? '9 / 9' : '0 / 9';
  }
  awaken.addEventListener('click', toggleAwake); heart.addEventListener('click', toggleAwake);
  weather.addEventListener('click', function (event) {
    section.dataset.instant = String(event.detail === 0 || !canMove());
    clear = !clear; scene.dataset.weather = clear ? 'clear' : 'mist';
    weather.setAttribute('aria-pressed', String(clear));
    section.querySelector('[data-ash-weather-label]').textContent = clear ? '让薄雾归来' : '拨开薄雾';
  });
  scene.addEventListener('pointermove', function (event) {
    if (!canMove() || !fine.matches || event.pointerType === 'touch') return;
    var bounds = scene.getBoundingClientRect();
    tx = ((event.clientX - bounds.left) / bounds.width - .5) * 13;
    ty = ((event.clientY - bounds.top) / bounds.height - .5) * 7;
    schedule();
  }, {passive:true});
  scene.addEventListener('pointerleave', function () { tx = ty = 0; schedule(); }, {passive:true});
  if ('IntersectionObserver' in window) new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; policy(); }).observe(section);
  else visible = true;
  reduced.addEventListener('change', policy); document.addEventListener('visibilitychange', policy);
  if (motion) motion.subscribe(policy);
  window.addEventListener('pagehide', cancel);
  heart.hidden = false; section.querySelector('[data-ash-controls]').hidden = false;
  policy();
})();
