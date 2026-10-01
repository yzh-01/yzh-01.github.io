(function () {
  'use strict';
  var section = document.querySelector('[data-ash-sanctuary]');
  if (!section) return;
  var scene = section.querySelector('[data-ash-landscape]');
  var canvas = scene.querySelector('[data-ash-canvas]');
  var poster = scene.querySelector('.ash-model-poster');
  var exhibit = section.querySelector('[data-ash-exhibit]');
  var controls = section.querySelector('[data-ash-controls]');
  var explore = section.querySelector('[data-ash-explore]');
  var zoom = section.querySelector('[data-ash-zoom]');
  var rain = section.querySelector('[data-ash-action="rain"]');
  var count = section.querySelector('[data-ash-count]');
  var status = section.querySelector('[data-ash-status]');
  var model = null, loading = false, visible = false, disposed = false;
  var exploring = false, lastStory = null;
  function renderStory(story) {
    [['label', '[data-ash-discovery-label]'], ['title', '[data-ash-discovery-title]'], ['story', '[data-ash-discovery-body]']].forEach(function (item) {
      var element = section.querySelector(item[1]);
      if (element) element.textContent = story[item[0]];
    });
  }
  function showStory(story) { lastStory = story; renderStory(story); }
  function updateExploring(value) {
    exploring = Boolean(value); scene.dataset.exploring = String(exploring);
    if (exhibit) exhibit.dataset.exploring = String(exploring);
    if (explore) {
      explore.setAttribute('aria-pressed', String(exploring));
      explore.querySelector('[data-ash-explore-label]').textContent = exploring ? '退出探索' : '探索模型';
    }
    var label = section.querySelector('[data-ash-mode-label]');
    var help = section.querySelector('[data-ash-mode-help]');
    if (label) label.textContent = exploring ? '模型内滚轮缩放' : '滚轮浏览页面';
    if (help) help.textContent = exploring ? 'Esc 退出 · 移出边框继续浏览' : '拖动旋转 · Shift + 滚轮缩放';
  }
  function ready() {
    if (disposed) return;
    scene.dataset.modelState = 'ready';
    canvas.removeAttribute('aria-hidden'); canvas.tabIndex = 0;
    poster?.setAttribute('aria-hidden', 'true');
    if (controls) controls.hidden = false;
    if (count) count.hidden = false;
    updateExploring(false);
    renderStory(lastStory || {label:'THE NINE WORLDS',title:'伸手，听一听九界。',story:'点符文石寻访九界，轻触泉水泛起涟漪，点击木屋切换暖灯。'});
    if (status) status.textContent = scene.dataset.awake === 'true' ? '九界符文已点亮，世界树的根脉正在发光。' : '世界树的根系相连，九界静候微光。';
  }
  function fallback() {
    scene.dataset.modelState = 'fallback';
    canvas.setAttribute('aria-hidden', 'true'); canvas.tabIndex = -1;
    poster?.removeAttribute('aria-hidden');
    if (controls) controls.hidden = true;
    if (count) count.hidden = true;
    updateExploring(false);
    renderStory({label:'THE NINE WORLDS',title:'寒夜仍有微光。',story:'当前显示静态景观。九块符文石守着树根，泉水映着长夜。'});
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
          showStory({label:'YGGDRASIL',title:awake?'九界相连，根脉共鸣。':'让世界树歇一会儿。',story:awake?'树心的暖光沿根系流淌，九块符文石一同回应。再轻触树心，让微光沉静。':'根脉的光慢慢收拢，已经寻访过的符文石仍记得你的足迹。'});
        },
        onExplore: updateExploring,
        onViewChange: function (percent) { if (zoom) zoom.value = percent + '%'; },
        onRealm: function (realm) {
          showStory({label:realm.label,title:realm.name,story:realm.story});
          if (count) count.textContent = '寻访 ' + realm.visited + ' / ' + realm.total;
          if (status) status.textContent = realm.name + '。' + realm.story + ' 已寻访 ' + realm.visited + ' / ' + realm.total + (realm.visited === realm.total ? '，九界已相连。' : '。');
        },
        onInteract: function (story) { showStory(story); if (status) status.textContent = story.title + '。' + story.story; },
        onWeather: function (enabled) {
          if (rain) rain.setAttribute('aria-pressed', String(enabled));
          var story = {label:'NIGHTFALL',title:enabled?'细雨重新落下。':'今夜，让雨停一会儿。',story:enabled?'雨滴轻叩石阶，泉水收藏灯火摇晃的倒影。':'长夜静了下来。极光仍在树冠后缓缓流动，灯火映着泉水。'};
          showStory(story); if (status) status.textContent = story.title;
        }
      });
      model.setActive(visible);
    }).catch(fallback).finally(function () { loading = false; });
  }
  if (explore) explore.addEventListener('click', function () {
    if (model && scene.dataset.modelState === 'ready') model.setExploring(!exploring);
  });
  if (controls) controls.addEventListener('click', function (event) {
    var button = event.target.closest('[data-ash-action]');
    if (!button || !model || scene.dataset.modelState !== 'ready') return;
    var action = button.dataset.ashAction;
    if (action === 'zoom-in') model.zoomBy(1.15);
    if (action === 'zoom-out') model.zoomBy(1 / 1.15);
    if (action === 'reset') model.reset();
    if (action === 'next') model.nextRealm();
    if (action === 'rain') model.setRain(rain.getAttribute('aria-pressed') !== 'true');
  });
  function exitExploring() { if (exploring) model?.setExploring(false); }
  if (exhibit) exhibit.addEventListener('pointerleave', exitExploring);
  document.addEventListener('pointerdown', function (event) { if (exploring && exhibit && !exhibit.contains(event.target)) exitExploring(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && exploring) { event.preventDefault(); exitExploring(); } });
  window.addEventListener('blur', exitExploring);
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
    exitExploring();
    if (event.persisted) { if (model) model.setActive(false); return; }
    disposed = true; preload?.disconnect(); observer?.disconnect(); model?.destroy();
  });
  window.addEventListener('pageshow', function (event) { if (event.persisted && model) model.setActive(visible); });
})();
