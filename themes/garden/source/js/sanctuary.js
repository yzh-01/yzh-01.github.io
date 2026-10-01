(function () {
  'use strict';
  var section = document.querySelector('[data-ash-sanctuary]');
  if (!section) return;
  var scene = section.querySelector('[data-ash-landscape]');
  var canvas = scene.querySelector('[data-ash-canvas]');
  var status = section.querySelector('[data-ash-status]');
  var model = null, loading = false, visible = false, disposed = false;
  function ready() {
    if (disposed) return;
    scene.dataset.modelState = 'ready';
    canvas.removeAttribute('aria-hidden'); canvas.tabIndex = 0;
    if (status) status.textContent = scene.dataset.awake === 'true' ? '九界符文已点亮，世界树的根脉正在发光。' : '世界树的根系相连，九界静候微光。';
  }
  function fallback() {
    scene.dataset.modelState = 'fallback';
    canvas.setAttribute('aria-hidden', 'true'); canvas.tabIndex = -1;
    if (status) status.textContent = '当前显示世界树的静态微缩景观。';
  }
  function load() {
    if (disposed || loading || model || scene.dataset.modelState === 'fallback') return;
    loading = true; scene.dataset.modelState = 'loading';
    import(scene.dataset.worldModule).then(function (module) {
      if (disposed) return;
      model = module.createSanctuary(scene, {
        motion: window.GardenMotion,
        onReady: ready,
        onFallback: fallback,
        onAwake: function (awake) {
          if (status) status.textContent = awake ? '九界符文已点亮，世界树的根脉正在发光。' : '九界重新沉静，树心仍有一束微光。';
        }
      });
      model.setActive(visible);
    }).catch(fallback).finally(function () { loading = false; });
  }
  var observer, preload;
  if ('IntersectionObserver' in window) {
    // Keep the first screen's network and GPU budget untouched. Load shortly
    // before the miniature enters view, then pause it when it leaves.
    preload = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { load(); preload.disconnect(); }
    }, { rootMargin: '300px 0px' });
    preload.observe(scene);
    observer = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      scene.dataset.modelVisible = String(visible);
      if (visible) load();
      if (model) model.setActive(visible);
    }, { threshold: 0 });
    observer.observe(scene);
  } else {
    visible = true; load();
  }
  window.addEventListener('pagehide', function (event) {
    if (event.persisted) { if (model) model.setActive(false); return; }
    disposed = true; preload?.disconnect(); observer?.disconnect(); model?.destroy();
  });
  window.addEventListener('pageshow', function (event) { if (event.persisted && model) model.setActive(visible); });
})();
