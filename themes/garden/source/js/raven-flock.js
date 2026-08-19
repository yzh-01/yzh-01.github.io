(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var XLINK_NS = 'http://www.w3.org/1999/xlink';
  var RAVEN_ATLAS_PATH = '/images/raven-atlas-v1.png?v=20260819-111';
  var preparedRavenAtlasPath = RAVEN_ATLAS_PATH;
  var RAVEN_SPRITES = [
    { column: 0, row: 0, nativeDirection: 1 },
    { column: 1, row: 0, nativeDirection: 1 },
    { column: 2, row: 0, nativeDirection: 1 },
    { column: 0, row: 1, nativeDirection: 1 },
    { column: 1, row: 1, nativeDirection: 1 },
    { column: 2, row: 1, nativeDirection: -1 }
  ];
  var RAVEN_FLIGHT_SEQUENCES = [
    [1, 0, 4, 0],
    [1, 2, 4, 0],
    [1, 0, 4, 2],
    [3, 0, 4, 2]
  ];

  var HERO_PATHS = [
    { ex: -.54, ey: -.32, c1x: -.07, c1y: -.05, c2x: -.35, c2y: -.42, scale: 1.26, delay: 0, duration: 3000 },
    { ex: .58, ey: -.3, c1x: .08, c1y: -.08, c2x: .37, c2y: -.4, scale: 1.18, delay: 120, duration: 3000 },
    { ex: .61, ey: .05, c1x: .11, c1y: -.01, c2x: .4, c2y: -.12, scale: 1.02, delay: 1580, duration: 1680 },
    { ex: -.58, ey: .08, c1x: -.1, c1y: -.02, c2x: -.42, c2y: .2, scale: .72, delay: 1660, duration: 1740 },
    { ex: .43, ey: .43, c1x: .06, c1y: .09, c2x: .34, c2y: .28, scale: .8, delay: 1740, duration: 1720 },
    { ex: -.4, ey: .39, c1x: -.06, c1y: .08, c2x: -.29, c2y: .32, scale: .98, delay: 1820, duration: 1660 },
    { ex: .2, ey: -.52, c1x: .02, c1y: -.12, c2x: .1, c2y: -.38, scale: .56, delay: 1900, duration: 1750 },
    { ex: -.2, ey: -.47, c1x: -.02, c1y: -.11, c2x: -.13, c2y: -.34, scale: .62, delay: 1980, duration: 1710 },
    { ex: .14, ey: .54, c1x: .02, c1y: .12, c2x: .2, c2y: .37, scale: .88, delay: 2060, duration: 1650 }
  ];

  function svgNode(name, attributes) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(function (key) {
      node.setAttribute(key, attributes[key]);
    });
    return node;
  }

  function clearLayer(layer) {
    while (layer && layer.firstChild) layer.removeChild(layer.firstChild);
  }

  function cubicPoint(path, progress) {
    var inverse = 1 - progress;
    var x = inverse * inverse * inverse * path.sx +
      3 * inverse * inverse * progress * path.c1x +
      3 * inverse * progress * progress * path.c2x +
      progress * progress * progress * path.ex;
    var y = inverse * inverse * inverse * path.sy +
      3 * inverse * inverse * progress * path.c1y +
      3 * inverse * progress * progress * path.c2y +
      progress * progress * progress * path.ey;
    var dx = 3 * inverse * inverse * (path.c1x - path.sx) +
      6 * inverse * progress * (path.c2x - path.c1x) +
      3 * progress * progress * (path.ex - path.c2x);
    var dy = 3 * inverse * inverse * (path.c1y - path.sy) +
      6 * inverse * progress * (path.c2y - path.c1y) +
      3 * progress * progress * (path.ey - path.c2y);
    return { x: x, y: y, dx: dx, dy: dy };
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function flightPitch(point, direction) {
    var pitch = Math.atan2(point.dy, Math.max(1, Math.abs(point.dx))) * 180 / Math.PI;
    return clamp(pitch * direction, -11, 11);
  }

  function ravenTransform(x, y, pitch, scale) {
    return 'translate(' + x + 'px,' + y + 'px) rotate(' + pitch + 'deg) scale(' + scale + ')';
  }

  function createRaven(variant, isLeader, direction) {
    var sequence = isLeader ? RAVEN_FLIGHT_SEQUENCES[variant % 2] : [variant % 5];
    var firstSprite = RAVEN_SPRITES[sequence[0]];
    var facing = direction * firstSprite.nativeDirection;
    var flight = svgNode('g', { 'class': 'folio-raven-flight' + (isLeader ? ' is-leader' : '') });
    var shape = svgNode('g', {
      'class': 'folio-raven-shape',
      transform: facing < 0 ? 'scale(-1 1)' : 'scale(1 1)'
    });
    var motion = svgNode('g', { 'class': 'folio-raven-motion' });
    var frames = [];
    sequence.forEach(function (spriteIndex, frameIndex) {
      var sprite = RAVEN_SPRITES[spriteIndex];
      var spriteView = svgNode('svg', {
        'class': 'folio-raven-sprite folio-raven-sprite--frame' + (frameIndex === 0 ? ' is-current' : ''),
        x: isLeader ? '-102' : '-88',
        y: isLeader ? '-102' : '-88',
        width: isLeader ? '204' : '176',
        height: isLeader ? '204' : '176',
        viewBox: (sprite.column * 512) + ' ' + (sprite.row * 512) + ' 512 512',
        preserveAspectRatio: 'xMidYMid meet',
        overflow: 'hidden'
      });
      var atlas = svgNode('image', {
        'class': 'folio-raven-atlas',
        x: '0',
        y: '0',
        width: '1536',
        height: '1024',
        preserveAspectRatio: 'none',
        href: preparedRavenAtlasPath
      });
      atlas.setAttributeNS(XLINK_NS, 'href', preparedRavenAtlasPath);
      spriteView.appendChild(atlas);
      motion.appendChild(spriteView);
      frames.push(spriteView);
    });
    shape.appendChild(motion);
    flight.appendChild(shape);
    flight._ravenFrames = frames;
    flight._ravenMotion = motion;
    return flight;
  }

  function makeFlightFrames(path, baseScale, collapse, direction) {
    var offsets = [0, .08, .18, .34, .55, .78, 1];
    return offsets.map(function (offset) {
      var smooth = offset * offset * (3 - 2 * offset);
      var point = cubicPoint(path, smooth);
      var opening = Math.min(1, offset / .22);
      var scale = baseScale * (.14 + opening * .86);
      if (collapse && offset > .7) scale *= Math.max(.18, 1 - (offset - .7) / .3);
      var opacity = offset === 0 ? 0 : offset < .12 ? .9 : offset < .72 ? 1 : Math.max(0, 1 - (offset - .72) / .28);
      return {
        offset: offset,
        opacity: opacity,
        transform: ravenTransform(point.x.toFixed(2), point.y.toFixed(2), flightPitch(point, direction).toFixed(2), scale.toFixed(3))
      };
    });
  }

  function makeLeaderFrames(source, path, baseScale, direction) {
    var entryPoint = { dx: path.sx - source.x, dy: path.sy - source.y };
    var entryPitch = flightPitch(entryPoint, direction);
    var holdPitch = direction < 0 ? 3 : -3;
    var middleX = source.x + (path.sx - source.x) * .56;
    var middleY = source.y + (path.sy - source.y) * .56 - 4;
    var earlyFlight = cubicPoint(path, .08);
    var middleFlight = cubicPoint(path, .5);
    var finalFlight = cubicPoint(path, 1);
    return [
      { offset: 0, opacity: 0, transform: ravenTransform(source.x, source.y, entryPitch, baseScale * .18) },
      { offset: .13, opacity: .92, transform: ravenTransform(middleX, middleY, entryPitch, baseScale * .7) },
      { offset: .27, opacity: 1, transform: ravenTransform(path.sx, path.sy, holdPitch, baseScale) },
      { offset: .41, opacity: 1, transform: ravenTransform(path.sx + direction * 3, path.sy - 4, holdPitch + direction * 2, baseScale * 1.025) },
      { offset: .56, opacity: 1, transform: ravenTransform(path.sx, path.sy, holdPitch, baseScale) },
      { offset: .68, opacity: 1, transform: ravenTransform(earlyFlight.x.toFixed(2), earlyFlight.y.toFixed(2), flightPitch(earlyFlight, direction).toFixed(2), baseScale) },
      { offset: .84, opacity: .96, transform: ravenTransform(middleFlight.x.toFixed(2), middleFlight.y.toFixed(2), flightPitch(middleFlight, direction).toFixed(2), baseScale * .98) },
      { offset: 1, opacity: 0, transform: ravenTransform(finalFlight.x.toFixed(2), finalFlight.y.toFixed(2), flightPitch(finalFlight, direction).toFixed(2), baseScale * .92) }
    ];
  }

  function setupRavenFlock() {
    var cover = document.querySelector('.folio-cover');
    var wordmark = document.querySelector('[data-winter-wordmark]');
    var eclipse = wordmark && wordmark.querySelector('.folio-wordmark-disc');
    var trigger = document.querySelector('[data-flock-trigger]');
    var sigil = document.querySelector('[data-norse-sigil]');
    var yggdrasilName = document.querySelector('[data-yggdrasil-name]');
    var norseKey = document.querySelector('[data-norse-key]');
    var flockLayer = document.querySelector('[data-raven-flock]');
    var articles = document.querySelector('.folio-articles');
    var echoLayer = document.querySelector('[data-flock-echo]');
    if (!cover || !wordmark || !eclipse || !trigger || !flockLayer) return;

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var narrowScreen = window.matchMedia('(max-width: 768px)');
    var activeAnimations = [];
    var activeTimers = [];
    var resizeFrame = 0;
    var busy = false;
    var echoArmed = false;
    var echoPlaying = false;
    var articleVisible = false;
    var atlasPromise = null;
    var atlasObjectUrl = '';
    var pendingFlight = false;
    var flightRequestToken = 0;

    function motionIsLite() {
      return reduceMotion.matches || root.classList.contains('garden-lite-motion');
    }

    function preloadRavenAtlas() {
      if (atlasPromise) return atlasPromise;
      atlasPromise = new Promise(function (resolve) {
        var image = new Image();
        image.decoding = 'async';
        image.addEventListener('load', function () {
          try {
            var canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            var context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(image, 0, 0);
            var raster = context.getImageData(0, 0, canvas.width, canvas.height);
            var pixels = raster.data;
            for (var offset = 0; offset < pixels.length; offset += 4) {
              var luminance = (pixels[offset] * 77 + pixels[offset + 1] * 150 + pixels[offset + 2] * 29) >> 8;
              var keyedAlpha = Math.max(0, Math.min(255, Math.round((255 - luminance) * 3.5 - 148)));
              pixels[offset + 3] = Math.min(pixels[offset + 3], keyedAlpha);
            }
            context.putImageData(raster, 0, 0);
            canvas.toBlob(function (blob) {
              if (blob) {
                atlasObjectUrl = URL.createObjectURL(blob);
                preparedRavenAtlasPath = atlasObjectUrl;
              }
              resolve();
            }, 'image/png');
          } catch (error) {
            resolve();
          }
        }, { once: true });
        image.addEventListener('error', resolve, { once: true });
        image.src = RAVEN_ATLAS_PATH;
      });
      return atlasPromise;
    }

    function requestHeroFlight() {
      if (busy || pendingFlight) return;
      pendingFlight = true;
      var requestToken = ++flightRequestToken;
      trigger.setAttribute('aria-disabled', 'true');
      preloadRavenAtlas().then(function () {
        if (requestToken !== flightRequestToken) return;
        pendingFlight = false;
        trigger.removeAttribute('aria-disabled');
        if (!document.hidden && !busy) runHeroFlight();
      });
    }

    function later(callback, delay) {
      var timer = window.setTimeout(function () {
        var index = activeTimers.indexOf(timer);
        if (index >= 0) activeTimers.splice(index, 1);
        callback();
      }, delay);
      activeTimers.push(timer);
      return timer;
    }

    function play(element, frames, options) {
      if (!element || typeof element.animate !== 'function') return null;
      var animation = element.animate(frames, options);
      activeAnimations.push(animation);
      animation.addEventListener('finish', function () {
        var index = activeAnimations.indexOf(animation);
        if (index >= 0) activeAnimations.splice(index, 1);
      }, { once: true });
      return animation;
    }

    function fitLayer(layer, container) {
      if (!layer || !container) return { width: 1, height: 1 };
      var width = Math.max(1, container.clientWidth);
      var height = Math.max(1, container.clientHeight);
      layer.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      return { width: width, height: height };
    }

    function refreshTrigger() {
      resizeFrame = 0;
      var coverRect = cover.getBoundingClientRect();
      var eclipseRect = eclipse.getBoundingClientRect();
      cover.style.setProperty('--flock-origin-x', (eclipseRect.left - coverRect.left + eclipseRect.width / 2).toFixed(2) + 'px');
      cover.style.setProperty('--flock-origin-y', (eclipseRect.top - coverRect.top + eclipseRect.height / 2).toFixed(2) + 'px');
      fitLayer(flockLayer, cover);
      if (articles && echoLayer) fitLayer(echoLayer, articles);
    }

    function scheduleRefresh() {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(refreshTrigger);
    }

    function sourcePoint() {
      var coverRect = cover.getBoundingClientRect();
      var eclipseRect = eclipse.getBoundingClientRect();
      return {
        x: eclipseRect.left - coverRect.left + eclipseRect.width / 2,
        y: eclipseRect.top - coverRect.top + eclipseRect.height / 2
      };
    }

    function animateRavenFlight(raven, duration, delay, index) {
      var frames = raven._ravenFrames || [];
      var motion = raven._ravenMotion;
      if (!frames.length || !motion) return;
      var isLeader = raven.classList.contains('is-leader');
      var cycle = isLeader ? 1080 + (index % 2) * 100 : 680 + (index % 3) * 54;
      var iterations = Math.ceil(duration / cycle) + 1;
      var visibility = [
        [
          { offset: 0, opacity: 1 }, { offset: .14, opacity: 1 },
          { offset: .23, opacity: 0 }, { offset: .94, opacity: 0 }, { offset: 1, opacity: 1 }
        ],
        [
          { offset: 0, opacity: 0 }, { offset: .12, opacity: 0 },
          { offset: .22, opacity: 1 }, { offset: .46, opacity: 1 },
          { offset: .56, opacity: 0 }, { offset: 1, opacity: 0 }
        ],
        [
          { offset: 0, opacity: 0 }, { offset: .44, opacity: 0 },
          { offset: .54, opacity: 1 }, { offset: .68, opacity: 1 },
          { offset: .78, opacity: 0 }, { offset: 1, opacity: 0 }
        ],
        [
          { offset: 0, opacity: 0 }, { offset: .66, opacity: 0 },
          { offset: .76, opacity: 1 }, { offset: .92, opacity: 1 },
          { offset: 1, opacity: 0 }
        ]
      ];
      if (frames.length > 1) {
        frames.forEach(function (frame, frameIndex) {
          play(frame, visibility[frameIndex], {
            duration: cycle,
            delay: delay,
            iterations: iterations,
            easing: 'cubic-bezier(.4,0,.2,1)',
            fill: 'both'
          });
        });
      }
      var lift = isLeader ? 3.4 : 1.9;
      play(motion, [
        { offset: 0, transform: 'translateY(0) rotate(0deg) scale(1)' },
        { offset: .18, transform: 'translateY(' + (-lift) + 'px) rotate(-.8deg) scale(1.012,.988)' },
        { offset: .42, transform: 'translateY(' + (-lift * .42) + 'px) rotate(-.25deg) scale(1)' },
        { offset: .64, transform: 'translateY(' + (lift * .72) + 'px) rotate(.7deg) scale(.988,1.014)' },
        { offset: .82, transform: 'translateY(' + (lift * .2) + 'px) rotate(.2deg) scale(1.004,.996)' },
        { offset: 1, transform: 'translateY(0) rotate(0deg) scale(1)' }
      ], {
        duration: cycle,
        delay: delay,
        iterations: iterations,
        easing: 'cubic-bezier(.45,.02,.22,1)',
        fill: 'both'
      });
    }

    function addFeathers(point, dimensions, baseDelay) {
      var trails = [
        { dx: -dimensions.width * .09, dy: dimensions.height * .09, rotate: -118, delay: 108 },
        { dx: dimensions.width * .08, dy: dimensions.height * .14, rotate: 74, delay: 162 },
        { dx: -dimensions.width * .03, dy: -dimensions.height * .12, rotate: -48, delay: 204 },
        { dx: dimensions.width * .14, dy: -dimensions.height * .08, rotate: 126, delay: 248 }
      ];
      trails.forEach(function (trail, index) {
        var feather = svgNode('path', {
          'class': 'folio-raven-feather',
          d: index % 2 ? 'M 0 -8 C 3 -5 3 3 0 9 C -2 4 -2 -4 0 -8 Z' : 'M 0 -7 C 2 -3 2 4 -1 8 C -3 3 -2 -4 0 -7 Z'
        });
        flockLayer.appendChild(feather);
        play(feather, [
          { opacity: 0, transform: 'translate(' + point.x + 'px,' + point.y + 'px) rotate(0deg) scale(.15)' },
          { opacity: .7, offset: .28, transform: 'translate(' + (point.x + trail.dx * .3) + 'px,' + (point.y + trail.dy * .18) + 'px) rotate(' + (trail.rotate * .25) + 'deg) scale(.52)' },
          { opacity: 0, transform: 'translate(' + (point.x + trail.dx) + 'px,' + (point.y + trail.dy) + 'px) rotate(' + trail.rotate + 'deg) scale(.7)' }
        ], { duration: 760, delay: (baseDelay || 0) + trail.delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
      });
    }

    function finishHeroFlight() {
      clearLayer(flockLayer);
      activeAnimations = [];
      wordmark.classList.remove('is-flock-opening');
      if (sigil) sigil.classList.remove('is-awake');
      if (yggdrasilName) yggdrasilName.classList.remove('is-awake');
      if (norseKey) norseKey.classList.remove('is-awake');
      trigger.removeAttribute('aria-disabled');
      busy = false;
    }

    function runQuietFlock(point) {
      var positions = [
        { x: -42, y: -28, pitch: 4, scale: .58, direction: -1 },
        { x: 44, y: -16, pitch: -3, scale: .68, direction: 1 },
        { x: 12, y: 34, pitch: 2, scale: .5, direction: 1 }
      ];
      positions.forEach(function (position, index) {
        var raven = createRaven(index, index < 2, position.direction);
        flockLayer.appendChild(raven);
        play(raven, [
          { opacity: 0, transform: ravenTransform(point.x + position.x, point.y + position.y, position.pitch, position.scale * .94) },
          { opacity: .78, offset: .38, transform: ravenTransform(point.x + position.x, point.y + position.y, position.pitch, position.scale) },
          { opacity: 0, transform: ravenTransform(point.x + position.x, point.y + position.y, position.pitch, position.scale) }
        ], { duration: 520, delay: index * 42, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
      });
      later(finishHeroFlight, 720);
    }

    function runHeroFlight() {
      if (busy) return;
      busy = true;
      echoArmed = !!articles;
      trigger.setAttribute('aria-disabled', 'true');
      clearLayer(flockLayer);
      var dimensions = fitLayer(flockLayer, cover);
      var point = sourcePoint();
      wordmark.classList.add('is-flock-opening');
      if (sigil) sigil.classList.add('is-awake');
      if (yggdrasilName) yggdrasilName.classList.add('is-awake');
      if (norseKey) norseKey.classList.add('is-awake');

      if (motionIsLite()) {
        runQuietFlock(point);
        if (articleVisible) later(runArticleEcho, 760);
        return;
      }

      var count = narrowScreen.matches ? 6 : 9;
      HERO_PATHS.slice(0, count).forEach(function (definition, index) {
        var isLeader = index < 2;
        var direction = definition.ex < 0 ? -1 : 1;
        var holdDistance = Math.min(narrowScreen.matches ? 72 : 132, dimensions.width * .09);
        var holdX = point.x + direction * holdDistance;
        var holdY = point.y - (index === 0 ? (narrowScreen.matches ? 24 : 42) : (narrowScreen.matches ? 18 : 30));
        var path = {
          sx: isLeader ? holdX : point.x,
          sy: isLeader ? holdY : point.y,
          c1x: (isLeader ? holdX : point.x) + dimensions.width * definition.c1x,
          c1y: point.y + dimensions.height * definition.c1y,
          c2x: point.x + dimensions.width * definition.c2x,
          c2y: point.y + dimensions.height * definition.c2y,
          ex: point.x + dimensions.width * definition.ex,
          ey: point.y + dimensions.height * definition.ey
        };
        var raven = createRaven(index, isLeader, direction);
        var launchDelay = 520 + definition.delay;
        var flightScale = definition.scale * (narrowScreen.matches ? .76 : 1);
        var frames = isLeader ? makeLeaderFrames(point, path, flightScale, direction) : makeFlightFrames(path, flightScale, false, direction);
        var flightDuration = narrowScreen.matches ? definition.duration * .86 : definition.duration;
        flockLayer.appendChild(raven);
        play(raven, frames, {
          duration: flightDuration,
          delay: launchDelay,
          easing: 'linear',
          fill: 'both'
        });
        animateRavenFlight(raven, flightDuration, launchDelay, index);
      });

      addFeathers(point, dimensions, 900);
      later(finishHeroFlight, narrowScreen.matches ? 4000 : 4600);
      if (articleVisible) later(runArticleEcho, narrowScreen.matches ? 4100 : 4700);
    }

    function addNotch(layer, x, y, angle, delay) {
      var notch = svgNode('path', {
        'class': 'folio-raven-notch',
        d: 'M -10 -1 L 5 -4 L 10 0 L -6 4 Z'
      });
      layer.appendChild(notch);
      play(notch, [
        { opacity: 0, transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + angle + 'deg) scale(.2)' },
        { opacity: .72, offset: .22, transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + angle + 'deg) scale(1)' },
        { opacity: .46, offset: .62, transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + angle + 'deg) scale(.86)' },
        { opacity: 0, transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + angle + 'deg) scale(.72)' }
      ], { duration: 680, delay: delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    }

    function finishEcho() {
      clearLayer(echoLayer);
      echoPlaying = false;
    }

    function runArticleEcho() {
      if (!articles || !echoLayer || !echoArmed || echoPlaying || !articleVisible) return;
      echoArmed = false;
      echoPlaying = true;
      clearLayer(echoLayer);
      var dimensions = fitLayer(echoLayer, articles);
      var articleRect = articles.getBoundingClientRect();
      var streamHeader = articles.querySelector('.folio-article-stream > header');
      var contributionGrid = articles.querySelector('[data-contribution-grid]');
      var headerRect = streamHeader ? streamHeader.getBoundingClientRect() : articleRect;
      var gridRect = contributionGrid ? contributionGrid.getBoundingClientRect() : headerRect;
      var anchorX = headerRect.left - articleRect.left + headerRect.width * .4;
      var anchorY = headerRect.bottom - articleRect.top - 5;

      if (motionIsLite()) {
        addNotch(echoLayer, anchorX, anchorY, -12, 0);
        addNotch(echoLayer, anchorX + 54, anchorY + 2, 8, 54);
        addNotch(echoLayer, gridRect.left - articleRect.left + gridRect.width * .64, gridRect.top - articleRect.top + gridRect.height * .54, -22, 96);
        later(finishEcho, 880);
        return;
      }

      var starts = [
        { y: anchorY - 34, scale: .56, delay: 0 },
        { y: anchorY + 8, scale: .72, delay: 62 },
        { y: anchorY + 48, scale: .48, delay: 126 }
      ];
      starts.forEach(function (entry, index) {
        var raven = createRaven(index + 1, false, -1);
        var path = {
          sx: dimensions.width + 72 + index * 18,
          sy: entry.y,
          c1x: dimensions.width * .82,
          c1y: entry.y - 48 + index * 19,
          c2x: anchorX + 160 - index * 28,
          c2y: anchorY - 30 + index * 20,
          ex: anchorX + index * 42,
          ey: anchorY + index * 3
        };
        echoLayer.appendChild(raven);
        play(raven, makeFlightFrames(path, entry.scale, true, -1), {
          duration: 690 + index * 46,
          delay: entry.delay,
          easing: 'linear',
          fill: 'both'
        });
        animateRavenFlight(raven, 720, entry.delay, index);
      });

      addNotch(echoLayer, anchorX, anchorY, -12, 380);
      addNotch(echoLayer, anchorX + 52, anchorY + 2, 7, 430);
      addNotch(echoLayer, gridRect.left - articleRect.left + gridRect.width * .38, gridRect.top - articleRect.top + gridRect.height * .44, -18, 468);
      addNotch(echoLayer, gridRect.left - articleRect.left + gridRect.width * .66, gridRect.top - articleRect.top + gridRect.height * .62, 14, 514);
      later(finishEcho, 1320);
    }

    function cancelAll() {
      activeTimers.forEach(function (timer) { window.clearTimeout(timer); });
      activeTimers = [];
      activeAnimations.forEach(function (animation) {
        try { animation.cancel(); } catch (error) {}
      });
      activeAnimations = [];
      clearLayer(flockLayer);
      clearLayer(echoLayer);
      wordmark.classList.remove('is-flock-opening');
      if (sigil) sigil.classList.remove('is-awake');
      if (yggdrasilName) yggdrasilName.classList.remove('is-awake');
      if (norseKey) norseKey.classList.remove('is-awake');
      trigger.removeAttribute('aria-disabled');
      busy = false;
      echoArmed = false;
      echoPlaying = false;
      pendingFlight = false;
      flightRequestToken += 1;
    }

    trigger.addEventListener('click', function (event) {
      event.stopPropagation();
      requestHeroFlight();
    });
    trigger.addEventListener('pointerenter', preloadRavenAtlas, { passive: true });
    trigger.addEventListener('focus', preloadRavenAtlas);
    trigger.addEventListener('touchstart', preloadRavenAtlas, { passive: true });

    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!motionIsLite() && !(connection && connection.saveData)) {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(function () {
          if (!document.hidden) preloadRavenAtlas();
        }, { timeout: 2800 });
      } else {
        later(function () {
          if (!document.hidden) preloadRavenAtlas();
        }, 1800);
      }
    }

    window.addEventListener('resize', scheduleRefresh, { passive: true });
    window.addEventListener('orientationchange', scheduleRefresh, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) cancelAll();
      else scheduleRefresh();
    });
    window.addEventListener('pagehide', function () {
      cancelAll();
      if (atlasObjectUrl) URL.revokeObjectURL(atlasObjectUrl);
    }, { once: true });

    if (articles && echoLayer && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          articleVisible = entry.isIntersecting;
          if (articleVisible && echoArmed) runArticleEcho();
        });
      }, { threshold: .16 }).observe(articles);
    }

    refreshTrigger();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleRefresh);
  }

  setupRavenFlock();
})();
