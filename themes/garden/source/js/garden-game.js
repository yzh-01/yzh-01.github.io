(function () {
  'use strict';

  function gardenMotionIsLite() {
    return document.documentElement.classList.contains('garden-lite-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function setupGardenEasterEgg() {
    var overlay = document.querySelector('[data-garden-overgrowth]');
    if (!overlay) return;
    var canvas = overlay.querySelector('[data-overgrowth-field]');
    var close = overlay.querySelector('[data-overgrowth-close]');
    var status = overlay.querySelector('[data-overgrowth-status]');
    var hint = overlay.querySelector('[data-overgrowth-hint]');
    var controls = overlay.querySelector('[data-game-controls]');
    var relicPanel = overlay.querySelector('[data-relic-panel]');
    var relicState = overlay.querySelector('[data-relic-state]');
    var relicName = overlay.querySelector('[data-relic-name]');
    var relicEffect = overlay.querySelector('[data-relic-effect]');
    var relicConfirm = overlay.querySelector('[data-relic-confirm]');
    var relicOwned = overlay.querySelector('[data-relic-owned]');
    var context = canvas ? canvas.getContext('2d', { alpha: false, desynchronized: true }) : null;
    if (!canvas || !context) return;

    var palette = {
      ink: '#050607', night: '#101515', cloud: '#192020', slate: '#293332',
      mist: '#53625f', moss: '#829485', light: '#d2d8ce', bone: '#f0f1eb',
      archive: '#182223', tower: '#1c1d27', glasshouse: '#162a20',
      canal: '#10282d', courtyard: '#25251b', threshold: '#151b19'
    };
    var roomProfiles = {
      archive: { code: 'ARCHIVE', name: '沉水档案' },
      tower: { code: 'BROKEN TOWER', name: '断塔' },
      glasshouse: { code: 'MOSS HOUSE', name: '黑苔温室' },
      canal: { code: 'LOW CANAL', name: '低潮水道' },
      courtyard: { code: 'ASH COURT', name: '灰庭' },
      threshold: { code: 'THRESHOLD', name: '门限区' }
    };
    var active = false;
    var receding = false;
    var frame = 0;
    var resizeTimer = 0;
    var timers = [];
    var relicPanelTimer = 0;
    var previousFocus = null;
    var logicalWidth = 426;
    var logicalHeight = 240;
    var worldWidth = 720;
    var worldHeight = 420;
    var camera = { x: 0, y: 0 };
    var startedAt = 0;
    var runStartedAt = 0;
    var runResult = '';
    var lastFrame = 0;
    var gameState = 'idle';
    var activatedCount = 0;
    var spawnAt = 0;
    var respawnAt = 0;
    var wonAt = 0;
    var winSettled = false;
    var shotReadyAt = 0;
    var dryNoticeAt = 0;
    var weaponKick = 0;
    var gateNoticeAt = 0;
    var shadowId = 0;
    var runNumber = 0;
    var shotIndex = 0;
    var kills = 0;
    var screenShake = 0;
    var randomState = 0x51f15e1d;
    var input = { left: false, right: false, up: false, down: false };
    var pointer = { x: 0, y: 0, worldX: 0, worldY: 0, seen: false };
    var player = { x: 0, y: 0, vx: 0, vy: 0, radius: 5, aim: -.3, energy: 100, maxEnergy: 100, health: 3, maxHealth: 3, visible: true, invulnerableUntil: 0, checkpointX: 0, checkpointY: 0, winFromX: 0, winFromY: 0 };
    var gate = { x: 0, y: 0 };
    var rooms = [];
    var beacons = [];
    var ruins = [];
    var relics = [];
    var focusedRelic = null;
    var focusedRelicKey = '';
    var shadows = [];
    var enemyShots = [];
    var particles = [];
    var bullets = [];
    var rain = [];
    var fieldDots = [];
    var guide = { x: 0, y: 0, trail: [] };
    var upgrades = { mirror: 0, prism: 0, harvest: 0, focus: 0, vitality: 0, velocity: 0 };

    function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
    function random() {
      randomState ^= randomState << 13;
      randomState ^= randomState >>> 17;
      randomState ^= randomState << 5;
      return (randomState >>> 0) / 4294967296;
    }
    function distance(x0, y0, x1, y1) {
      var dx = x1 - x0;
      var dy = y1 - y0;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function easeOut(value) {
      var progress = clamp(value, 0, 1);
      return 1 - Math.pow(1 - progress, 3);
    }
    function later(callback, delay) { timers.push(window.setTimeout(callback, delay)); }
    function clearTimers() {
      timers.forEach(function (timer) { window.clearTimeout(timer); });
      timers = [];
      if (relicPanelTimer) window.clearTimeout(relicPanelTimer);
      relicPanelTimer = 0;
    }
    function pixel(x, y, width, height, color, alpha) {
      context.globalAlpha = alpha === undefined ? 1 : alpha;
      context.fillStyle = color;
      context.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
      context.globalAlpha = 1;
    }
    function pixelLine(x0, y0, x1, y1, color, alpha) {
      var startX = Math.round(x0);
      var startY = Math.round(y0);
      var endX = Math.round(x1);
      var endY = Math.round(y1);
      var dx = Math.abs(endX - startX);
      var sx = startX < endX ? 1 : -1;
      var dy = -Math.abs(endY - startY);
      var sy = startY < endY ? 1 : -1;
      var error = dx + dy;
      context.globalAlpha = alpha === undefined ? 1 : alpha;
      context.fillStyle = color;
      while (true) {
        context.fillRect(startX, startY, 1, 1);
        if (startX === endX && startY === endY) break;
        var twice = error * 2;
        if (twice >= dy) { error += dy; startX += sx; }
        if (twice <= dx) { error += dx; startY += sy; }
      }
      context.globalAlpha = 1;
    }
    function pixelRing(x, y, radius, color, alpha) {
      var points = Math.max(12, Math.round(radius * 1.8));
      for (var index = 0; index < points; index += 1) {
        var angle = index / points * Math.PI * 2;
        pixel(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 1, 1, color, alpha);
      }
    }
    function pixelText(value, x, y, color, alpha, align) {
      context.save();
      context.globalAlpha = alpha === undefined ? 1 : alpha;
      context.fillStyle = color;
      context.font = '600 7px "DotGothic16", "JetBrains Mono", monospace';
      context.textAlign = align || 'left';
      context.textBaseline = 'alphabetic';
      context.fillText(value, Math.round(x), Math.round(y));
      context.restore();
    }
    function fitCanvas() {
      var rect = overlay.getBoundingClientRect();
      var cssWidth = Math.max(1, Math.round(rect.width || window.innerWidth));
      var cssHeight = Math.max(1, Math.round(rect.height || window.innerHeight));
      var pixelSize = 2;
      logicalWidth = Math.max(190, Math.round(cssWidth / pixelSize));
      logicalHeight = Math.max(126, Math.round(cssHeight / pixelSize));
      canvas.width = logicalWidth;
      canvas.height = logicalHeight;
      context.imageSmoothingEnabled = false;
    }
    function setMessage(line, detail) {
      if (status) status.textContent = line;
      if (hint && detail) hint.textContent = detail;
    }
    function upgradeSummary() {
      var summary = [];
      if (upgrades.mirror) summary.push('镜面 ' + upgrades.mirror + ' · 反弹 ' + (1 + upgrades.mirror) + ' 次');
      if (upgrades.prism) summary.push('棱镜 ' + upgrades.prism + ' · 每 ' + Math.max(3, 5 - upgrades.prism) + ' 发分裂');
      if (upgrades.harvest) summary.push('苔灯 ' + upgrades.harvest + ' · 回能 +' + (12 + upgrades.harvest * 7));
      if (upgrades.focus) summary.push('聚焦 ' + upgrades.focus + ' · 强减速');
      if (upgrades.vitality) summary.push('余火 ' + upgrades.vitality + ' · 生命 ' + player.maxHealth);
      if (upgrades.velocity) summary.push('逆潮 ' + upgrades.velocity + ' · 移速 +' + (upgrades.velocity * 5));
      return summary.join('  /  ');
    }
    function hideRelicPanel() {
      if (!relicPanel) return;
      if (relicPanelTimer) window.clearTimeout(relicPanelTimer);
      relicPanelTimer = 0;
      relicPanel.classList.remove('is-visible', 'is-confirmed', 'is-compact');
      relicPanel.hidden = true;
    }
    function showRelicPanel(mode, relic) {
      if (!relicPanel) return;
      if (relicPanelTimer) window.clearTimeout(relicPanelTimer);
      relicPanelTimer = 0;
      relicPanel.hidden = false;
      relicPanel.classList.remove('is-confirmed', 'is-compact');
      relicPanel.classList.add('is-visible');
      if (mode === 'choice' && !relic) {
        if (relicState) relicState.textContent = 'SIGNAL OPTIONS // 等待聚焦';
        if (relicName) relicName.textContent = '选择强化';
        if (relicEffect) relicEffect.textContent = '靠近或用准星指向一个符号，效果会在这里显示。';
        if (relicConfirm) relicConfirm.textContent = '不会自动选择';
      } else if (mode === 'choice') {
        if (relicState) relicState.textContent = 'SIGNAL FOCUSED // 待确认';
        if (relicName) relicName.textContent = relic.name;
        if (relicEffect) relicEffect.textContent = relic.description;
        if (relicConfirm) relicConfirm.textContent = '左键 / ✦ 确认选择';
      } else {
        relicPanel.classList.add('is-confirmed');
        if (relicState) relicState.textContent = 'SIGNAL EMBEDDED // 已生效';
        if (relicName) relicName.textContent = relic.name;
        if (relicEffect) relicEffect.textContent = relic.description;
        if (relicConfirm) relicConfirm.textContent = '强化已经写入本局';
        relicPanelTimer = window.setTimeout(function () {
          relicPanel.classList.remove('is-confirmed');
          relicPanel.classList.add('is-compact');
          if (relicState) relicState.textContent = 'ACTIVE SIGNALS // 本局强化';
        }, 1800);
      }
      if (relicOwned) relicOwned.textContent = upgradeSummary() || '尚未获得强化';
    }
    function circleHitsRuin(x, y, radius) {
      for (var index = 0; index < ruins.length; index += 1) {
        var ruin = ruins[index];
        var nearestX = clamp(x, ruin.x, ruin.x + ruin.width);
        var nearestY = clamp(y, ruin.y, ruin.y + ruin.height);
        var dx = x - nearestX;
        var dy = y - nearestY;
        if (dx * dx + dy * dy < radius * radius) return true;
      }
      return false;
    }
    function shuffle(values) {
      for (var index = values.length - 1; index > 0; index -= 1) {
        var swap = Math.floor(random() * (index + 1));
        var value = values[index];
        values[index] = values[swap];
        values[swap] = value;
      }
      return values;
    }
    function addRuin(x, y, width, height, kind) {
      ruins.push({ x: x, y: y, width: Math.max(3, width), height: Math.max(3, height), kind: kind || 'wall' });
    }
    function pointClear(x, y, padding) {
      for (var index = 0; index < ruins.length; index += 1) {
        var ruin = ruins[index];
        if (x > ruin.x - padding && x < ruin.x + ruin.width + padding && y > ruin.y - padding && y < ruin.y + ruin.height + padding) return false;
      }
      return true;
    }
    function addRoomRuin(room, x, y, width, height, kind) {
      if (room.flipX) x = 1 - x - width;
      if (room.flipY) y = 1 - y - height;
      addRuin(room.x + room.width * x, room.y + room.height * y, room.width * width, room.height * height, kind);
    }
    function addRoomLayout(room, layout, kind) {
      layout.forEach(function (shape) {
        addRoomRuin(room, shape[0], shape[1], shape[2], shape[3], shape[4] || kind);
      });
    }
    function buildRoomGeometry(room, index) {
      var thinX = 5 / room.width;
      var thinY = 5 / room.height;
      var variant = room.variant;
      if (room.kind === 'archive') {
        var archiveLayouts = [
          [[.24, .16, thinX, .26], [.24, .6, thinX, .23], [.68, .2, thinX, .23], [.68, .61, thinX, .2]],
          [[.16, .27, .25, thinY], [.59, .27, .23, thinY], [.2, .7, .22, thinY], [.61, .7, .21, thinY]],
          [[.2, .15, thinX, .31], [.42, .54, thinX, .29], [.66, .16, thinX, .25], [.76, .58, thinX, .24], [.28, .64, .12, thinY]],
          [[.17, .19, .27, thinY], [.17, .19, thinX, .27], [.57, .25, .25, thinY], [.82 - thinX, .25, thinX, .27], [.28, .69, .31, thinY], [.59, .52, thinX, .18]]
        ];
        addRoomLayout(room, archiveLayouts[variant], 'shelf');
      } else if (room.kind === 'tower') {
        var towerLayouts = [
          [[.2, .27, .22, thinY], [.58, .27, .2, thinY], [.2, .7, .2, thinY], [.6, .7, .18, thinY]],
          [[.48, .14, thinX, .25], [.48, .61, thinX, .25], [.16, .49, .24, thinY], [.6, .49, .24, thinY]],
          [[.25, .2, .5, thinY], [.25, .77, .5, thinY], [.25, .2, thinX, .2], [.25, .58, thinX, .19], [.75 - thinX, .2, thinX, .29], [.75 - thinX, .65, thinX, .12]],
          [[.17, .22, .14, thinY], [.31, .22, thinX, .19], [.39, .43, .17, thinY], [.55, .43, thinX, .18], [.64, .64, .18, thinY], [.64, .64, thinX, .17]]
        ];
        addRoomLayout(room, towerLayouts[variant], 'beam');
      } else if (room.kind === 'glasshouse') {
        var glasshouseLayouts = [
          [[.18, .18, .14, .16], [.68, .17, .14, .19], [.17, .66, .16, .17], [.65, .63, .18, .18]],
          [[.39, .17, .22, .18], [.18, .51, .2, .2], [.62, .56, .2, .2]],
          [[.16, .22, .23, .13], [.16, .61, .23, .14], [.61, .2, .23, .15], [.61, .59, .23, .17]],
          [[.18, .18, .18, .22], [.46, .36, .2, .17], [.68, .65, .17, .17], [.18, .7, .2, .11]]
        ];
        addRoomLayout(room, glasshouseLayouts[variant], 'moss');
      } else if (room.kind === 'canal') {
        var canalLayouts = [
          [[.15, .3, .27, thinY], [.59, .3, .24, thinY], [.17, .68, .22, thinY], [.61, .68, .22, thinY]],
          [[.28, .15, thinX, .29], [.28, .61, thinX, .23], [.7, .18, thinX, .22], [.7, .57, thinX, .27]],
          [[.16, .23, .42, thinY], [.58, .23, thinX, .21], [.42, .48, thinX, .21], [.42, .69, .42, thinY]],
          [[.16, .22, .28, thinY], [.56, .22, .28, thinY], [.34, .49, .31, thinY], [.16, .76, .28, thinY], [.56, .76, .28, thinY]]
        ];
        addRoomLayout(room, canalLayouts[variant], 'waterwall');
      } else if (room.kind === 'courtyard') {
        var pillarX = 9 / room.width;
        var pillarY = 9 / room.height;
        var courtyardLayouts = [
          [[.21, .23, pillarX, pillarY], [.71, .21, pillarX, pillarY], [.24, .69, pillarX, pillarY], [.68, .67, pillarX, pillarY]],
          [[.46, .42, .11, .16], [.2, .2, pillarX, pillarY], [.73, .23, pillarX, pillarY], [.24, .72, pillarX, pillarY], [.7, .69, pillarX, pillarY]],
          [[.18, .2, pillarX, pillarY], [.35, .36, pillarX, pillarY], [.52, .52, pillarX, pillarY], [.69, .68, pillarX, pillarY]],
          [[.28, .16, pillarX, pillarY], [.28, .43, pillarX, pillarY], [.28, .71, pillarX, pillarY], [.68, .27, pillarX, pillarY], [.68, .58, pillarX, pillarY]]
        ];
        addRoomLayout(room, courtyardLayouts[variant], 'pillar');
      } else {
        var thresholdLayouts = [
          [[.25, .18, .09, .23], [.62, .59, .11, .2]],
          [[.19, .26, .24, thinY], [.58, .66, .24, thinY], [.48, .36, thinX, .24]],
          [[.24, .17, thinX, .3], [.48, .35, .1, .2], [.74, .57, thinX, .27]],
          [[.16, .24, .17, thinY], [.31, .24, thinX, .2], [.43, .47, .18, thinY], [.6, .47, thinX, .2], [.68, .69, .17, thinY]]
        ];
        addRoomLayout(room, thresholdLayouts[variant], 'broken');
      }
      room.phase = index * 1.73 + random() * 2;
    }
    function buildBoundaries(cellWidth, cellHeight) {
      var thickness = 4;
      var gap = Math.max(24, Math.min(cellWidth, cellHeight) * .18);
      for (var column = 1; column < 3; column += 1) {
        var wallX = column * cellWidth - thickness * .5;
        for (var row = 0; row < 2; row += 1) {
          var rowTop = row * cellHeight;
          var doorwayY = rowTop + cellHeight * (.29 + random() * .42);
          addRuin(wallX, rowTop, thickness, doorwayY - gap * .5 - rowTop, 'boundary');
          addRuin(wallX, doorwayY + gap * .5, thickness, rowTop + cellHeight - doorwayY - gap * .5, 'boundary');
        }
      }
      for (var horizontal = 0; horizontal < 3; horizontal += 1) {
        var wallY = cellHeight - thickness * .5;
        var roomLeft = horizontal * cellWidth;
        var doorwayX = roomLeft + cellWidth * (.29 + random() * .42);
        addRuin(roomLeft, wallY, doorwayX - gap * .5 - roomLeft, thickness, 'boundary');
        addRuin(doorwayX + gap * .5, wallY, roomLeft + cellWidth - doorwayX - gap * .5, thickness, 'boundary');
      }
    }
    function openPointInRoom(room, padding, xMinimum, xMaximum, yMinimum, yMaximum) {
      var point = { x: room.x + room.width * .5, y: room.y + room.height * .5 };
      for (var attempt = 0; attempt < 18; attempt += 1) {
        point.x = room.x + room.width * ((xMinimum || .22) + random() * ((xMaximum || .78) - (xMinimum || .22)));
        point.y = room.y + room.height * ((yMinimum || .22) + random() * ((yMaximum || .78) - (yMinimum || .22)));
        if (pointClear(point.x, point.y, padding)) return point;
      }
      return point;
    }
    function makeWorld() {
      var today = new Date();
      var dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      runNumber += 1;
      randomState = (dateSeed ^ (runNumber * 0x45d9f3b)) >>> 0;
      worldWidth = Math.max(logicalWidth + 100, Math.round(logicalWidth * 1.45));
      worldHeight = Math.max(logicalHeight + 76, Math.round(logicalHeight * 1.28));
      var cellWidth = worldWidth / 3;
      var cellHeight = worldHeight / 2;
      var roomKinds = shuffle(['archive', 'tower', 'glasshouse', 'canal', 'courtyard', 'threshold']);
      rooms = [];
      ruins = [];
      for (var roomIndex = 0; roomIndex < 6; roomIndex += 1) {
        var room = {
          x: roomIndex % 3 * cellWidth,
          y: Math.floor(roomIndex / 3) * cellHeight,
          width: cellWidth,
          height: cellHeight,
          kind: roomKinds[roomIndex],
          profile: roomProfiles[roomKinds[roomIndex]],
          variant: Math.floor(random() * 4),
          flipX: random() > .5,
          flipY: random() > .5
        };
        rooms.push(room);
        buildRoomGeometry(room, roomIndex);
      }
      buildBoundaries(cellWidth, cellHeight);
      var gatePoint = openPointInRoom(rooms[3], 25, .13, .3, .52, .79);
      gate.x = gatePoint.x;
      gate.y = gatePoint.y;
      var beaconRooms = shuffle([0, 1, 2, 4, 5]).slice(0, 3);
      var labels = ['ARTICLE', 'NOTE', 'MEMORY'];
      beacons = beaconRooms.map(function (roomIndex, index) {
        var room = rooms[roomIndex];
        var point = openPointInRoom(room, 30, .22, .78, .24, .77);
        return { x: point.x, y: point.y, charge: 0, active: false, label: labels[index], phase: random() * Math.PI * 2 };
      });
      ruins = ruins.filter(function (ruin) {
        var blocked = distance(clamp(gate.x, ruin.x, ruin.x + ruin.width), clamp(gate.y, ruin.y, ruin.y + ruin.height), gate.x, gate.y) < 22;
        beacons.forEach(function (beacon) {
          if (distance(clamp(beacon.x, ruin.x, ruin.x + ruin.width), clamp(beacon.y, ruin.y, ruin.y + ruin.height), beacon.x, beacon.y) < 38) blocked = true;
        });
        return !blocked;
      });
      player.x = gate.x + 16;
      player.y = gate.y;
      player.vx = player.vy = 0;
      player.aim = -.45;
      player.maxEnergy = 100;
      player.energy = player.maxEnergy;
      player.maxHealth = 3;
      player.health = player.maxHealth;
      player.visible = true;
      player.invulnerableUntil = 0;
      player.checkpointX = player.x;
      player.checkpointY = player.y;
      camera.x = clamp(player.x - logicalWidth * .5, 0, worldWidth - logicalWidth);
      camera.y = clamp(player.y - logicalHeight * .5, 0, worldHeight - logicalHeight);
      pointer.x = logicalWidth * .62;
      pointer.y = logicalHeight * .42;
      pointer.worldX = pointer.x + camera.x;
      pointer.worldY = pointer.y + camera.y;
      pointer.seen = false;
      guide.x = player.x + 18;
      guide.y = player.y - 10;
      guide.trail = [];
      upgrades = { mirror: 0, prism: 0, harvest: 0, focus: 0, vitality: 0, velocity: 0 };
      hideRelicPanel();
      relics = [];
      focusedRelic = null;
      focusedRelicKey = '';
      shadows = [];
      enemyShots = [];
      particles = [];
      bullets = [];
      rain = [];
      fieldDots = [];
      activatedCount = 0;
      shadowId = 0;
      shotIndex = 0;
      kills = 0;
      runStartedAt = performance.now();
      runResult = '';
      screenShake = 0;
      spawnAt = performance.now() + 1200;
      shotReadyAt = 0;
      dryNoticeAt = 0;
      weaponKick = 0;
      wonAt = 0;
      winSettled = false;
      for (var dotIndex = 0; dotIndex < Math.min(900, Math.round(worldWidth * worldHeight / 720)); dotIndex += 1) {
        fieldDots.push({ x: random() * worldWidth, y: random() * worldHeight, alpha: .04 + random() * .08 });
      }
      for (var rainIndex = 0; rainIndex < Math.round(logicalWidth * .24); rainIndex += 1) {
        rain.push({ x: random() * logicalWidth, y: random() * logicalHeight, speed: 28 + random() * 48, depth: .2 + random() * .8 });
      }
      setMessage('LOW TIDE // RUN ' + String(runNumber).padStart(2, '0'), '区域、内部地形与通道均已重构。恢复三座信标，途中拾取一个符号强化灯枪。');
    }
    function spawnPixels(x, y, count, color, force) {
      for (var index = 0; index < count; index += 1) {
        var angle = random() * Math.PI * 2;
        var speed = 3 + random() * (force || 18);
        particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: .35 + random() * .65, color: color || palette.light });
      }
      while (particles.length > 140) particles.shift();
    }
    function recordRun(now) {
      var seconds = Math.max(1, Math.round((now - runStartedAt) / 1000));
      var best = seconds;
      try {
        var stored = Number(window.localStorage.getItem('garden-low-tide-best')) || 0;
        best = stored ? Math.min(stored, seconds) : seconds;
        if (!stored || seconds < stored) window.localStorage.setItem('garden-low-tide-best', String(seconds));
      } catch (error) {}
      runResult = seconds + ' SEC / ' + kills + ' CLEARED / BEST ' + best + ' SEC';
    }
    function spawnShadow(now) {
      var angle = random() * Math.PI * 2;
      var radius = Math.min(logicalWidth, logicalHeight) * (.48 + random() * .18);
      var x = clamp(player.x + Math.cos(angle) * radius, 12, worldWidth - 12);
      var y = clamp(player.y + Math.sin(angle) * radius, 18, worldHeight - 12);
      if (!pointClear(x, y, 9) || distance(x, y, player.x, player.y) < 72) {
        spawnAt = now + 380;
        return;
      }
      var roll = random();
      var type = 'wisp';
      if (activatedCount >= 2 && roll > .76) type = 'watcher';
      else if (activatedCount >= 1 && roll > .54) type = 'leech';
      else if (roll > .28) type = 'skitter';
      var hp = type === 'watcher' ? 3 : (type === 'skitter' ? 1 : 2);
      shadows.push({
        id: ++shadowId, type: type, x: x, y: y, homeX: x, homeY: y,
        vx: 0, vy: 0, phase: random() * Math.PI * 2, hp: hp, maxHp: hp,
        stunnedUntil: 0, attackAt: now + 700 + random() * 900, revealed: false, destroyed: false
      });
      spawnAt = now + Math.max(760, 2050 - activatedCount * 330) + random() * 680;
    }
    function offerRelics(beacon, now) {
      var pool = shuffle([
        { key: 'mirror', glyph: 'mirror', name: '镜面', description: '弹丸增加一次墙面反弹' },
        { key: 'prism', glyph: 'prism', name: '棱镜', description: '每隔数发生成一次三向射击' },
        { key: 'harvest', glyph: 'harvest', name: '苔灯', description: '击破噪影时返还更多灯能' },
        { key: 'focus', glyph: 'focus', name: '聚焦', description: '灯束对噪影的减速效果增强' },
        { key: 'vitality', glyph: 'vitality', name: '余火', description: '增加一格生命并立即恢复' },
        { key: 'velocity', glyph: 'velocity', name: '逆潮', description: '提高人物移动速度' }
      ]).slice(0, 3);
      var angles = [Math.PI, -Math.PI * .5, 0];
      relics = pool.map(function (relic, index) {
        var distanceFromBeacon = 31;
        return {
          key: relic.key, glyph: relic.glyph, name: relic.name, description: relic.description,
          x: clamp(beacon.x + Math.cos(angles[index]) * distanceFromBeacon, 12, worldWidth - 12),
          y: clamp(beacon.y + Math.sin(angles[index]) * distanceFromBeacon, 18, worldHeight - 12),
          phase: now * .003 + index * 2.1
        };
      });
      focusedRelic = null;
      focusedRelicKey = '';
      gameState = 'choosing';
      shadows = shadows.filter(function (shadow) { return distance(shadow.x, shadow.y, beacon.x, beacon.y) > 52; });
      setMessage('CHOOSE A SIGNAL // 0' + activatedCount + ' / 03', '靠近或指向一个符号查看效果，再用左键或 ✦ 明确确认。');
      showRelicPanel('choice', null);
    }
    function collectRelic(relic) {
      upgrades[relic.key] += 1;
      if (relic.key === 'vitality') {
        player.maxHealth = Math.min(5, player.maxHealth + 1);
        player.health = player.maxHealth;
      }
      player.energy = player.maxEnergy;
      relics = [];
      focusedRelic = null;
      focusedRelicKey = '';
      gameState = 'playing';
      spawnPixels(player.x, player.y, 28, palette.bone, 20);
      screenShake = 1.4;
      setMessage('SIGNAL EMBEDDED // ' + relic.name, relic.description + (activatedCount === 3 ? '。三座信标已连接，返回起点门。' : '。继续寻找下一座信标。'));
      showRelicPanel('confirmed', relic);
    }
    function updateRelicFocus() {
      if (gameState !== 'choosing') return;
      var candidate = null;
      var candidateDistance = Infinity;
      relics.forEach(function (relic) {
        var pointerDistance = pointer.seen ? distance(pointer.worldX, pointer.worldY, relic.x, relic.y) : Infinity;
        var playerDistance = distance(player.x, player.y, relic.x, relic.y);
        var focusDistance = pointerDistance < 13 ? pointerDistance : (playerDistance < 17 ? playerDistance : Infinity);
        if (focusDistance < candidateDistance) {
          candidate = relic;
          candidateDistance = focusDistance;
        }
      });
      focusedRelic = candidate;
      var nextKey = candidate ? candidate.key : '';
      if (nextKey === focusedRelicKey) return;
      focusedRelicKey = nextKey;
      if (candidate) {
        setMessage('SIGNAL FOCUSED // ' + candidate.name, candidate.description + '。左键或 ✦ 确认选择。');
        showRelicPanel('choice', candidate);
      } else {
        setMessage('CHOOSE A SIGNAL // 0' + activatedCount + ' / 03', '靠近或指向一个符号查看效果；不会再自动选择。');
        showRelicPanel('choice', null);
      }
    }
    function activateBeacon(beacon, now) {
      beacon.active = true;
      beacon.activatedAt = now;
      beacon.charge = 1;
      activatedCount += 1;
      player.checkpointX = beacon.x;
      player.checkpointY = beacon.y + 14;
      player.energy = Math.min(player.maxEnergy, player.energy + 34);
      screenShake = 1.2;
      spawnPixels(beacon.x, beacon.y, 34, palette.moss, 24);
      offerRelics(beacon, now);
    }
    function launchBullet(angle, damage) {
      var aimX = Math.cos(angle);
      var aimY = Math.sin(angle);
      bullets.push({
        x: player.x + aimX * 8, y: player.y + aimY * 8,
        vx: aimX * 164, vy: aimY * 164, age: 0, life: 1.28,
        damage: damage || 1, bounces: 1 + upgrades.mirror,
        maxBounces: 1 + upgrades.mirror, bounceAt: 0, dead: false, trail: []
      });
    }
    function fireShot(now) {
      if (!active) return;
      if (gameState === 'choosing') {
        updateRelicFocus();
        if (focusedRelic) collectRelic(focusedRelic);
        return;
      }
      if (gameState !== 'playing' || now < shotReadyAt) return;
      if (player.energy < 9) {
        shotReadyAt = now + 180;
        weaponKick = .3;
        if (now >= dryNoticeAt) {
          dryNoticeAt = now + 900;
          setMessage('LANTERN DRAINED // HOLD THE BEAM', '停止射击片刻，或靠近已经恢复的信标补充灯能。');
        }
        return;
      }
      var aimX = Math.cos(player.aim);
      var aimY = Math.sin(player.aim);
      var muzzleX = player.x + aimX * 8;
      var muzzleY = player.y + aimY * 8;
      player.energy -= 9;
      shotReadyAt = now + 185;
      weaponKick = 1;
      shotIndex += 1;
      var omenDamage = player.energy > player.maxEnergy * .78 ? 2 : 1;
      launchBullet(player.aim, omenDamage);
      if (upgrades.prism && shotIndex % Math.max(3, 5 - upgrades.prism) === 0) {
        launchBullet(player.aim - .16, 1);
        launchBullet(player.aim + .16, 1);
      }
      if (bullets.length > 22) bullets.shift();
      screenShake = Math.max(screenShake, .7);
      spawnPixels(muzzleX, muzzleY, 6, palette.bone, 11);
    }
    function hurtPlayer(now) {
      if (now < player.invulnerableUntil || gameState !== 'playing') return;
      player.health -= 1;
      player.invulnerableUntil = now + 1100;
      player.energy = Math.max(0, player.energy - 18);
      screenShake = 3.2;
      spawnPixels(player.x, player.y, 24, palette.light, 26);
      if (player.health > 0) {
        setMessage('NOISE CONTACT // ' + player.health + ' LIGHTS REMAIN', '用灯束拖慢噪影，再用左键冷光弹击退它们。');
        return;
      }
      gameState = 'respawning';
      respawnAt = now + 760;
      setMessage('SIGNAL LOST // REBUILDING', '正在最近恢复的信标处重组。已恢复的信号不会丢失。');
    }
    function respawnPlayer(now) {
      player.x = player.checkpointX;
      player.y = player.checkpointY;
      player.vx = player.vy = 0;
      player.health = player.maxHealth;
      player.energy = Math.max(player.maxEnergy * .58, player.energy);
      player.invulnerableUntil = now + 1350;
      shadows = shadows.filter(function (shadow) { return distance(shadow.x, shadow.y, player.x, player.y) > 72; });
      gameState = 'playing';
      spawnPixels(player.x, player.y, 22, palette.moss, 17);
      setMessage('REBUILT // CHECKPOINT RESTORED', '继续搜索。微光会指向尚未恢复的信标。');
    }
    function nextTarget() {
      if (gameState === 'choosing' && relics.length) {
        var nearestRelic = relics[0];
        relics.forEach(function (relic) {
          if (distance(player.x, player.y, relic.x, relic.y) < distance(player.x, player.y, nearestRelic.x, nearestRelic.y)) nearestRelic = relic;
        });
        return nearestRelic;
      }
      var nearest = null;
      var nearestDistance = Infinity;
      beacons.forEach(function (beacon) {
        if (beacon.active) return;
        var gap = distance(player.x, player.y, beacon.x, beacon.y);
        if (gap < nearestDistance) { nearest = beacon; nearestDistance = gap; }
      });
      return nearest || gate;
    }
    function updatePlayer(delta, now) {
      if (gameState === 'respawning') {
        if (now >= respawnAt) respawnPlayer(now);
        return;
      }
      if (gameState === 'won') {
        var departure = clamp((now - wonAt) / 980, 0, 1);
        var easedDeparture = easeOut(departure);
        player.x = player.winFromX + (gate.x - player.winFromX) * easedDeparture;
        player.y = player.winFromY + (gate.y - player.winFromY) * easedDeparture;
        player.aim += delta * (2.4 + departure * 5.2);
        player.visible = departure < .82;
        if (departure >= .9 && !winSettled) {
          winSettled = true;
          player.visible = false;
          spawnPixels(gate.x, gate.y, 34, palette.bone, 22);
          setMessage('LOW TIDE CLEARED // ' + runResult, '角色已经穿过终点。按 R 会生成另一张地图和新的强化组合。');
        }
        return;
      }
      var axisX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      var axisY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      var magnitude = Math.sqrt(axisX * axisX + axisY * axisY) || 1;
      if (axisX || axisY) {
        axisX /= magnitude;
        axisY /= magnitude;
        if (!pointer.seen) player.aim = Math.atan2(axisY, axisX);
      }
      var speed = 43 + upgrades.velocity * 5;
      player.vx += (axisX * speed - player.vx) * Math.min(1, delta * 9);
      player.vy += (axisY * speed - player.vy) * Math.min(1, delta * 9);
      if (!axisX) player.vx *= Math.pow(.012, delta);
      if (!axisY) player.vy *= Math.pow(.012, delta);
      var nextX = clamp(player.x + player.vx * delta, 7, worldWidth - 7);
      if (!circleHitsRuin(nextX, player.y, player.radius)) player.x = nextX;
      else player.vx *= -.16;
      var nextY = clamp(player.y + player.vy * delta, 15, worldHeight - 9);
      if (!circleHitsRuin(player.x, nextY, player.radius)) player.y = nextY;
      else player.vy *= -.16;
      pointer.worldX = pointer.x + camera.x;
      pointer.worldY = pointer.y + camera.y;
      if (pointer.seen) player.aim = Math.atan2(pointer.worldY - player.y, pointer.worldX - player.x);

      if (gameState === 'choosing') {
        updateRelicFocus();
        return;
      }

      var beamLength = Math.min(118, logicalWidth * .29);
      var aimX = Math.cos(player.aim);
      var aimY = Math.sin(player.aim);
      var charging = false;
      beacons.forEach(function (beacon) {
        if (beacon.active) {
          if (distance(player.x, player.y, beacon.x, beacon.y) < 28) player.energy = Math.min(player.maxEnergy, player.energy + delta * 22);
          return;
        }
        var dx = beacon.x - player.x;
        var dy = beacon.y - player.y;
        var gap = Math.sqrt(dx * dx + dy * dy) || 1;
        var alignment = (dx / gap) * aimX + (dy / gap) * aimY;
        if (gap < beamLength && alignment > .78) {
          charging = true;
          beacon.charge = Math.min(1, beacon.charge + delta * .74);
          player.energy = Math.max(0, player.energy - delta * 5.5);
          if (beacon.charge >= 1) activateBeacon(beacon, now);
        } else {
          beacon.charge = Math.max(0, beacon.charge - delta * .15);
        }
      });
      if (!charging) player.energy = Math.min(player.maxEnergy, player.energy + delta * 8.5);
      if (activatedCount === beacons.length && distance(player.x, player.y, gate.x, gate.y) < 13) {
        gameState = 'won';
        wonAt = now;
        recordRun(now);
        winSettled = false;
        player.winFromX = player.x;
        player.winFromY = player.y;
        player.vx = player.vy = 0;
        overlay.classList.add('is-game-won');
        shadows = [];
        spawnPixels(gate.x, gate.y, 56, palette.bone, 31);
        setMessage('LOW TIDE CLEARED // 03 / 03 SIGNALS', '线路已经闭合。正在穿过终点。');
        document.dispatchEvent(new CustomEvent('garden:pet', { detail: '低潮区的三段信号已经恢复。' }));
      } else if (activatedCount < beacons.length && distance(player.x, player.y, gate.x, gate.y) < 13 && now > gateNoticeAt) {
        gateNoticeAt = now + 1200;
        setMessage('EXIT LOCKED // ' + (beacons.length - activatedCount) + ' SIGNALS MISSING', '微光会指向距离最近的未恢复信标。');
      }
    }
    function updateCamera(delta) {
      var targetX = clamp(player.x - logicalWidth * .5, 0, Math.max(0, worldWidth - logicalWidth));
      var targetY = clamp(player.y - logicalHeight * .5, 0, Math.max(0, worldHeight - logicalHeight));
      var follow = 1 - Math.pow(.0007, delta);
      camera.x += (targetX - camera.x) * follow;
      camera.y += (targetY - camera.y) * follow;
      pointer.worldX = pointer.x + camera.x;
      pointer.worldY = pointer.y + camera.y;
    }
    function updateBullets(delta, now) {
      bullets.forEach(function (bullet) {
        if (bullet.dead) return;
        bullet.age += delta;
        bullet.trail.unshift({ x: bullet.x, y: bullet.y });
        if (bullet.trail.length > 7) bullet.trail.pop();
        var travel = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) * delta;
        var steps = Math.max(1, Math.ceil(travel / 2.4));
        var stepDelta = delta / steps;
        for (var step = 0; step < steps && !bullet.dead; step += 1) {
          var nextX = bullet.x + bullet.vx * stepDelta;
          var nextY = bullet.y + bullet.vy * stepDelta;
          var hitX = circleHitsRuin(nextX, bullet.y, 1.5);
          var hitY = circleHitsRuin(bullet.x, nextY, 1.5);
          if (hitX || hitY) {
            if (bullet.bounces > 0) {
              if (hitX) bullet.vx *= -1;
              if (hitY) bullet.vy *= -1;
              if (!hitX && !hitY) { bullet.vx *= -1; bullet.vy *= -1; }
              bullet.bounces -= 1;
              bullet.bounceAt = now;
              var bounceSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) || 1;
              bullet.x += bullet.vx / bounceSpeed * 3;
              bullet.y += bullet.vy / bounceSpeed * 3;
              spawnPixels(bullet.x, bullet.y, 12, bullet.bounces ? palette.bone : palette.moss, 13);
              screenShake = Math.max(screenShake, .45);
            } else {
              bullet.dead = true;
              spawnPixels(bullet.x, bullet.y, 5, palette.mist, 7);
            }
            continue;
          }
          bullet.x = nextX;
          bullet.y = nextY;
          if (bullet.x < -4 || bullet.x > worldWidth + 4 || bullet.y < -4 || bullet.y > worldHeight + 4) bullet.dead = true;
          for (var enemyShotIndex = 0; enemyShotIndex < enemyShots.length && !bullet.dead; enemyShotIndex += 1) {
            var enemyShot = enemyShots[enemyShotIndex];
            if (enemyShot.dead || distance(bullet.x, bullet.y, enemyShot.x, enemyShot.y) > 4) continue;
            enemyShot.dead = true;
            bullet.dead = true;
            spawnPixels(bullet.x, bullet.y, 10, palette.bone, 13);
            player.energy = Math.min(player.maxEnergy, player.energy + 3);
          }
          for (var shadowIndex = 0; shadowIndex < shadows.length && !bullet.dead; shadowIndex += 1) {
            var shadow = shadows[shadowIndex];
            if (shadow.destroyed || distance(bullet.x, bullet.y, shadow.x, shadow.y) > 8) continue;
            bullet.dead = true;
            shadow.hp -= bullet.damage || 1;
            shadow.flashUntil = now + 150;
            shadow.stunnedUntil = now + 310;
            var shotMagnitude = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) || 1;
            shadow.x += bullet.vx / shotMagnitude * 9;
            shadow.y += bullet.vy / shotMagnitude * 9;
            screenShake = Math.max(screenShake, shadow.hp <= 0 ? 2.2 : 1.2);
            spawnPixels(shadow.x, shadow.y, shadow.hp <= 0 ? 24 : 12, shadow.hp <= 0 ? palette.light : palette.moss, shadow.hp <= 0 ? 25 : 15);
            if (shadow.hp <= 0 && !shadow.destroyed) {
              shadow.destroyed = true;
              kills += 1;
              player.energy = Math.min(player.maxEnergy, player.energy + 12 + upgrades.harvest * 7);
            }
          }
        }
      });
      bullets = bullets.filter(function (bullet) { return !bullet.dead && bullet.age < bullet.life; });
    }
    function moveShadow(shadow, targetVX, targetVY, delta, response) {
      shadow.vx += (targetVX - shadow.vx) * Math.min(1, delta * response);
      shadow.vy += (targetVY - shadow.vy) * Math.min(1, delta * response);
      var nextX = clamp(shadow.x + shadow.vx * delta, 7, worldWidth - 7);
      if (!circleHitsRuin(nextX, shadow.y, 4)) shadow.x = nextX;
      else shadow.vx *= -.55;
      var nextY = clamp(shadow.y + shadow.vy * delta, 13, worldHeight - 7);
      if (!circleHitsRuin(shadow.x, nextY, 4)) shadow.y = nextY;
      else shadow.vy *= -.55;
    }
    function fireEnemyShot(shadow, now) {
      var dx = player.x - shadow.x;
      var dy = player.y - shadow.y;
      var magnitude = Math.sqrt(dx * dx + dy * dy) || 1;
      enemyShots.push({ x: shadow.x, y: shadow.y, vx: dx / magnitude * 44, vy: dy / magnitude * 44, age: 0, life: 4, phase: shadow.phase });
      shadow.attackAt = now + Math.max(1050, 1850 - activatedCount * 160) + random() * 520;
      spawnPixels(shadow.x, shadow.y, 7, palette.mist, 8);
    }
    function updateEnemyShots(delta, now) {
      if (gameState !== 'playing') return;
      enemyShots.forEach(function (shot) {
        shot.age += delta;
        var nextX = shot.x + shot.vx * delta;
        var nextY = shot.y + shot.vy * delta;
        if (circleHitsRuin(nextX, nextY, 2) || nextX < 0 || nextX > worldWidth || nextY < 0 || nextY > worldHeight) {
          shot.dead = true;
          return;
        }
        shot.x = nextX;
        shot.y = nextY;
        if (distance(shot.x, shot.y, player.x, player.y) < player.radius + 3) {
          shot.dead = true;
          hurtPlayer(now);
        }
      });
      enemyShots = enemyShots.filter(function (shot) { return !shot.dead && shot.age < shot.life; });
    }
    function updateShadows(delta, now) {
      if (gameState !== 'playing') return;
      var maximum = 4 + activatedCount * 2;
      if (now >= spawnAt && shadows.length < maximum) spawnShadow(now);
      var beamLength = Math.min(132, logicalWidth * .33);
      var aimX = Math.cos(player.aim);
      var aimY = Math.sin(player.aim);
      shadows.forEach(function (shadow) {
        if (shadow.destroyed) return;
        var dx = player.x - shadow.x;
        var dy = player.y - shadow.y;
        var gap = Math.sqrt(dx * dx + dy * dy) || 1;
        var toShadowX = -dx / gap;
        var toShadowY = -dy / gap;
        var alignment = toShadowX * aimX + toShadowY * aimY;
        shadow.revealed = gap < beamLength && alignment > .8;
        var slow = shadow.revealed ? Math.max(.1, .3 - upgrades.focus * .07) : 1;
        if (now < shadow.stunnedUntil) slow *= -.35;
        if (shadow.type === 'watcher') {
          var orbitX = shadow.homeX + Math.cos(now * .0009 + shadow.phase) * 8;
          var orbitY = shadow.homeY + Math.sin(now * .0011 + shadow.phase) * 6;
          moveShadow(shadow, (orbitX - shadow.x) * 1.5 * slow, (orbitY - shadow.y) * 1.5 * slow, delta, 2.8);
          if (gap < 170 && now >= shadow.attackAt && shadow.revealed) fireEnemyShot(shadow, now);
        } else if (shadow.type === 'skitter') {
          var strafe = Math.sin(now * .005 + shadow.phase) * 17;
          moveShadow(shadow, (dx / gap * 24 - dy / gap * strafe) * slow, (dy / gap * 24 + dx / gap * strafe) * slow, delta, 7.2);
        } else if (shadow.type === 'leech') {
          var retreat = now < shadow.attackAt ? -1 : 1;
          moveShadow(shadow, dx / gap * 17 * slow * retreat, dy / gap * 17 * slow * retreat, delta, 4.6);
          if (gap < 11 && now >= shadow.attackAt) {
            player.energy = Math.max(0, player.energy - 24);
            shadow.attackAt = now + 1150;
            shadow.x -= dx / gap * 19;
            shadow.y -= dy / gap * 19;
            screenShake = 1.8;
            spawnPixels(player.x, player.y, 16, palette.moss, 17);
            if (player.energy <= 0) hurtPlayer(now);
          }
        } else {
          moveShadow(shadow, dx / gap * (14 + activatedCount * 2) * slow, dy / gap * (14 + activatedCount * 2) * slow, delta, 4.1);
        }
        if (shadow.type !== 'leech' && gap < player.radius + 4) hurtPlayer(now);
      });
      shadows = shadows.filter(function (shadow) { return !shadow.destroyed && shadow.hp > 0; });
    }
    function updateGuide(delta, now) {
      var target = nextTarget();
      var dx = target.x - player.x;
      var dy = target.y - player.y;
      var gap = Math.sqrt(dx * dx + dy * dy) || 1;
      var lead = Math.min(34, gap * .42);
      var targetX = player.x + dx / gap * lead;
      var targetY = player.y + dy / gap * lead - 7 + Math.sin(now * .004) * 3;
      guide.x += (targetX - guide.x) * Math.min(1, delta * 5);
      guide.y += (targetY - guide.y) * Math.min(1, delta * 5);
      guide.trail.unshift({ x: guide.x, y: guide.y });
      if (guide.trail.length > 8) guide.trail.pop();
    }
    function updateEffects(delta) {
      particles = particles.filter(function (particle) {
        particle.age += delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vx *= Math.pow(.08, delta);
        particle.vy *= Math.pow(.08, delta);
        return particle.age < particle.life;
      });
      weaponKick *= Math.pow(.0008, delta);
      rain.forEach(function (drop) {
        drop.x -= drop.speed * delta * .16;
        drop.y += drop.speed * delta;
        if (drop.y > logicalHeight + 3 || drop.x < -3) { drop.x = random() * logicalWidth + logicalWidth * .12; drop.y = -random() * 20; }
      });
      screenShake = Math.max(0, screenShake - delta * 8);
    }
    function updateGame(delta, now) {
      updatePlayer(delta, now);
      updateCamera(delta);
      updateBullets(delta, now);
      updateShadows(delta, now);
      updateEnemyShots(delta, now);
      updateGuide(delta, now);
      updateEffects(delta);
    }
    function drawContour(centerX, centerY, radiusX, radiusY, phase, alpha) {
      var previousX = 0;
      var previousY = 0;
      var points = 42;
      for (var point = 0; point <= points; point += 1) {
        var angle = point / points * Math.PI * 2;
        var distortion = 1 + Math.sin(angle * 3 + phase) * .07 + Math.cos(angle * 5 - phase) * .035;
        var x = centerX + Math.cos(angle) * radiusX * distortion;
        var y = centerY + Math.sin(angle) * radiusY * distortion;
        if (point) pixelLine(previousX, previousY, x, y, palette.mist, alpha);
        previousX = x;
        previousY = y;
      }
    }
    function drawFogLayer(now, foreground) {
      var drift = now * (foreground ? .0028 : .0015);
      var bandCount = foreground ? 4 : 6;
      for (var band = 0; band < bandCount; band += 1) {
        var y = logicalHeight * ((band + (foreground ? .4 : .7)) / bandCount) + Math.sin(drift + band * 1.7) * (foreground ? 6 : 10);
        var segmentWidth = foreground ? 32 : 46;
        var offset = ((drift * (foreground ? 21 : 13) + band * 37) % (segmentWidth * 2)) - segmentWidth;
        for (var x = offset; x < logicalWidth; x += segmentWidth * 1.55) {
          var width = segmentWidth * (.72 + (band % 3) * .18);
          pixel(x, y, width, foreground ? 2 : 1, foreground ? palette.light : palette.mist, foreground ? .024 : .055);
          pixel(x + width * .22, y + (foreground ? 3 : 2), width * .56, 1, palette.moss, foreground ? .018 : .032);
        }
      }
    }
    function drawGround(now) {
      pixel(0, 0, worldWidth, worldHeight, palette.night);
      fieldDots.forEach(function (dot, index) {
        if (dot.x < camera.x - 3 || dot.x > camera.x + logicalWidth + 3 || dot.y < camera.y - 3 || dot.y > camera.y + logicalHeight + 3) return;
        var flicker = .72 + Math.sin(now * .0011 + index * 2.17) * .28;
        pixel(dot.x, dot.y, 1, 1, palette.mist, dot.alpha * flicker);
      });
      rooms.forEach(function (room, roomIndex) {
        if (room.x + room.width < camera.x || room.x > camera.x + logicalWidth || room.y + room.height < camera.y || room.y > camera.y + logicalHeight) return;
        pixel(room.x + 2, room.y + 2, room.width - 4, room.height - 4, palette[room.kind], .88);
        pixel(room.x + 4, room.y + 4, room.width - 8, 1, room.kind === 'glasshouse' ? palette.moss : palette.mist, .2);
        pixel(room.x + 4, room.y + room.height - 5, room.width - 8, 1, palette.ink, .56);
        pixel(room.x + 8, room.y + 8, 16, 1, palette.moss, .36);
        pixel(room.x + 8, room.y + 8, 1, 11, palette.moss, .24);
        pixelText(room.profile.code, room.x + 11, room.y + 18, room.kind === 'glasshouse' ? palette.moss : palette.mist, .42);
        if (room.kind === 'tower') {
          for (var ring = 0; ring < 5; ring += 1) drawContour(room.x + room.width * .5, room.y + room.height * .5, 18 + ring * 16, 10 + ring * 11, room.phase + ring, .08 + ring * .008);
          pixelLine(room.x + room.width * .5, room.y + 25, room.x + room.width * .5, room.y + room.height - 24, palette.mist, .13);
          pixelLine(room.x + 25, room.y + room.height * .5, room.x + room.width - 25, room.y + room.height * .5, palette.mist, .13);
        } else if (room.kind === 'archive') {
          for (var shelf = 0; shelf < 7; shelf += 1) {
            var shelfY = room.y + 30 + shelf * 12;
            pixel(room.x + room.width * .37, shelfY, room.width * .26, 2, palette.mist, .18);
            pixel(room.x + room.width * .4 + shelf % 3 * 7, shelfY + 3, 5, 3, palette.light, .08);
          }
          for (var page = 0; page < 9; page += 1) pixel(room.x + 28 + page * 17 % Math.max(30, room.width - 48), room.y + 31 + page * 29 % Math.max(30, room.height - 52), 3, 2, palette.light, .1);
        } else if (room.kind === 'glasshouse') {
          for (var sprout = 0; sprout < 18; sprout += 1) {
            var sproutX = room.x + 18 + (sprout * 37 + roomIndex * 11) % Math.max(20, room.width - 36);
            var sproutY = room.y + 18 + (sprout * 23 + roomIndex * 17) % Math.max(20, room.height - 36);
            pixel(sproutX, sproutY, 3, 2, palette.moss, .3);
            pixel(sproutX + 1, sproutY - 5, 1, 5, palette.mist, .23);
            pixel(sproutX - 2, sproutY - 4, 3, 1, palette.moss, .2);
          }
          pixelLine(room.x + 14, room.y + room.height * .72, room.x + room.width * .42, room.y + 22, palette.moss, .11);
          pixelLine(room.x + room.width - 17, room.y + room.height * .68, room.x + room.width * .62, room.y + 26, palette.moss, .11);
        } else if (room.kind === 'canal') {
          pixel(room.x + 8, room.y + room.height * .2, room.width - 16, room.height * .21, palette.ink, .32);
          pixel(room.x + 8, room.y + room.height * .59, room.width - 16, room.height * .22, palette.ink, .32);
          for (var current = 0; current < 8; current += 1) {
            var currentY = room.y + room.height * (.23 + current * .075);
            pixel(room.x + 16 + Math.sin(now * .0015 + current) * 5, currentY, room.width - 32, 1, current % 2 ? palette.mist : palette.moss, .13);
          }
        } else if (room.kind === 'courtyard') {
          for (var tileX = 16; tileX < room.width - 12; tileX += 18) {
            for (var tileY = 28; tileY < room.height - 14; tileY += 16) {
              if ((tileX / 18 + tileY / 16) % 2 < 1) pixel(room.x + tileX, room.y + tileY, 8, 6, palette.slate, .12);
            }
          }
        } else {
          for (var fracture = 0; fracture < 5; fracture += 1) {
            pixelLine(room.x + 16 + fracture * 9, room.y + room.height - 14, room.x + room.width - 28 + fracture * 4, room.y + 20 + fracture * 11, fracture % 2 ? palette.moss : palette.mist, .11 - fracture * .008);
          }
        }
      });
      ruins.forEach(function (ruin, index) {
        if (ruin.x + ruin.width < camera.x - 6 || ruin.x > camera.x + logicalWidth + 6 || ruin.y + ruin.height < camera.y - 6 || ruin.y > camera.y + logicalHeight + 6) return;
        pixel(ruin.x + 3, ruin.y + 4, ruin.width, ruin.height, palette.ink, .54);
        pixel(ruin.x, ruin.y, ruin.width, ruin.height, palette.ink, .98);
        pixel(ruin.x, ruin.y, ruin.width, 1, ruin.kind === 'moss' ? palette.moss : palette.mist, ruin.kind === 'moss' ? .58 : .42);
        pixel(ruin.x, ruin.y, 1, ruin.height, palette.moss, ruin.kind === 'boundary' ? .08 : .14);
        pixel(ruin.x + ruin.width - 1, ruin.y + 3, 1, ruin.height - 3, palette.slate, .25);
        for (var cut = 5; cut < ruin.height; cut += 13 + index) {
          var inset = 2 + (cut + index * 3) % 5;
          pixel(ruin.x + inset, ruin.y + cut, Math.max(2, ruin.width - inset - 3), 1, palette.slate, .38);
          pixel(ruin.x + (cut * 3 + index) % Math.max(2, Math.round(ruin.width - 2)), ruin.y + cut - 2, 2, 2, palette.night, .82);
        }
      });
      for (var puddle = 0; puddle < 18; puddle += 1) {
        var x = worldWidth * (.04 + puddle * .053);
        var y = worldHeight * (.12 + (puddle % 6) * .145);
        if (x < camera.x - 30 || x > camera.x + logicalWidth + 30 || y < camera.y - 6 || y > camera.y + logicalHeight + 6) continue;
        var shimmer = Math.sin(now * .0017 + puddle) * 2;
        pixel(x + shimmer, y, 14 + puddle % 3 * 7, 1, palette.mist, .12);
        pixel(x + 5 - shimmer * .4, y + 3, 8 + puddle % 2 * 9, 1, palette.moss, .055);
      }
    }
    function drawPlayerLight(now) {
      var radius = 72 + Math.sin(now * .0024) * 3;
      var gradient = context.createRadialGradient(player.x, player.y, 4, player.x, player.y, radius);
      gradient.addColorStop(0, 'rgba(194, 214, 197, .2)');
      gradient.addColorStop(.42, 'rgba(117, 148, 126, .09)');
      gradient.addColorStop(1, 'rgba(70, 91, 78, 0)');
      context.save();
      context.globalCompositeOperation = 'screen';
      context.fillStyle = gradient;
      context.fillRect(player.x - radius, player.y - radius, radius * 2, radius * 2);
      context.restore();
      pixelRing(player.x, player.y, 24 + Math.sin(now * .003) * 2, palette.moss, .08);
    }
    function drawBeam(now) {
      if (gameState === 'won') return;
      var length = Math.min(118, logicalWidth * .29);
      var spread = .32;
      for (var ray = -7; ray <= 7; ray += 1) {
        var offset = ray / 7 * spread;
        var angle = player.aim + offset;
        var strength = 1 - Math.abs(ray) / 9;
        pixelLine(player.x, player.y, player.x + Math.cos(angle) * length, player.y + Math.sin(angle) * length, ray === 0 ? palette.light : palette.moss, (ray === 0 ? .17 : .025) * strength);
      }
      var scan = ((now - startedAt) * .00018) % 1;
      pixel(player.x + Math.cos(player.aim) * length * scan, player.y + Math.sin(player.aim) * length * scan, 2, 2, palette.bone, .28);
      for (var mote = 0; mote < 11; mote += 1) {
        var travel = ((now * .00011 + mote * .087) % 1);
        var lateral = Math.sin(mote * 8.41) * spread * travel * 15;
        var beamX = player.x + Math.cos(player.aim) * length * travel + Math.cos(player.aim + Math.PI / 2) * lateral;
        var beamY = player.y + Math.sin(player.aim) * length * travel + Math.sin(player.aim + Math.PI / 2) * lateral;
        pixel(beamX, beamY, mote % 4 === 0 ? 2 : 1, 1, palette.light, .1 + (1 - travel) * .12);
      }
    }
    function drawGate(now) {
      var open = activatedCount === beacons.length;
      var departure = gameState === 'won' ? clamp((now - wonAt) / 980, 0, 1) : 0;
      pixel(gate.x - 8, gate.y - 9, 17, 18, palette.ink, .96);
      pixel(gate.x - 8, gate.y - 9, 17, 1, palette.mist, .62);
      pixel(gate.x - 8, gate.y - 9, 1, 18, palette.mist, .5);
      pixel(gate.x + 8, gate.y - 9, 1, 18, palette.mist, .5);
      pixel(gate.x - 4, gate.y - 5, 9, 10, open ? palette.moss : palette.slate, open ? .3 : .72);
      if (departure > 0) {
        pixel(gate.x - 3, gate.y - 6, 7, 12, palette.bone, .18 + Math.sin(departure * Math.PI) * .42);
        pixelRing(gate.x, gate.y, 8 + easeOut(departure) * 19, palette.light, (1 - departure) * .42);
      }
      pixel(gate.x - 1, gate.y - 13, 3, 3, open ? palette.bone : palette.mist, open ? .85 + Math.sin(now * .005) * .12 : .25);
      if (open) pixelRing(gate.x, gate.y, 13 + Math.sin(now * .004) * 2, palette.moss, .14);
    }
    function drawBeacons(now) {
      beacons.forEach(function (beacon) {
        var pulse = .68 + Math.sin(now * .003 + beacon.phase) * .2;
        pixel(beacon.x, beacon.y - 8, 1, 17, palette.mist, beacon.active ? .7 : .38);
        pixel(beacon.x - 3, beacon.y - 10, 7, 3, beacon.active ? palette.light : palette.slate, beacon.active ? pulse : .5);
        pixel(beacon.x - 1, beacon.y - 11, 3, 1, beacon.active ? palette.bone : palette.mist, beacon.active ? .9 : .42);
        if (!beacon.active && beacon.charge > 0) pixelRing(beacon.x, beacon.y - 8, 7 + beacon.charge * 8, palette.moss, .16 + beacon.charge * .44);
        if (beacon.active) {
          pixelRing(beacon.x, beacon.y - 8, 10 + Math.sin(now * .002 + beacon.phase) * 2, palette.moss, .16);
          pixel(beacon.x - 8, beacon.y + 11, 17, 1, palette.moss, .16);
        }
      });
    }
    function drawRelics(now) {
      relics.forEach(function (relic, index) {
        var lift = Math.sin(now * .005 + relic.phase) * 2;
        var x = relic.x;
        var y = relic.y + lift;
        var focused = focusedRelic === relic;
        pixel(x - 10, y - 10, 21, 21, palette.ink, focused ? .7 : .4);
        pixelRing(x, y, (focused ? 11 : 8) + Math.sin(now * .004 + index) * 1.5, focused ? palette.bone : palette.moss, focused ? .62 : .28);
        pixel(x - 6, y + 9, 13, 1, focused ? palette.light : palette.mist, focused ? .68 : .28);
        if (relic.glyph === 'mirror') {
          pixelLine(x - 3, y + 4, x + 3, y - 4, palette.bone, .84);
          pixelLine(x - 1, y + 4, x + 4, y - 2, palette.moss, .44);
        } else if (relic.glyph === 'prism') {
          pixelLine(x, y - 4, x - 4, y + 3, palette.bone, .88);
          pixelLine(x - 4, y + 3, x + 4, y + 3, palette.bone, .88);
          pixelLine(x + 4, y + 3, x, y - 4, palette.moss, .72);
        } else if (relic.glyph === 'harvest') {
          pixel(x, y - 4, 1, 9, palette.bone, .8);
          pixel(x - 3, y - 1, 3, 2, palette.moss, .75);
          pixel(x + 1, y - 3, 3, 2, palette.moss, .75);
        } else if (relic.glyph === 'focus') {
          pixelRing(x, y, 4, palette.bone, .78);
          pixel(x, y, 1, 1, palette.light, 1);
        } else if (relic.glyph === 'vitality') {
          pixel(x - 3, y - 1, 7, 3, palette.bone, .78);
          pixel(x - 1, y - 3, 3, 7, palette.bone, .78);
        } else {
          pixelLine(x - 4, y + 3, x, y - 4, palette.bone, .82);
          pixelLine(x, y - 4, x + 4, y + 2, palette.moss, .7);
          pixel(x + 2, y + 2, 3, 1, palette.bone, .68);
        }
        pixelText(relic.name, x, y + 18, focused ? palette.bone : palette.moss, focused ? .96 : .72, 'center');
        if (focused) {
          pixel(x - 13, y - 13, 5, 1, palette.bone, .75);
          pixel(x - 13, y - 13, 1, 5, palette.bone, .75);
          pixel(x + 9, y - 13, 5, 1, palette.bone, .75);
          pixel(x + 13, y - 13, 1, 5, palette.bone, .75);
          pixel(x - 13, y + 13, 5, 1, palette.bone, .75);
          pixel(x + 9, y + 13, 5, 1, palette.bone, .75);
        }
      });
    }
    function drawGuide(now) {
      guide.trail.forEach(function (point, index) { pixel(point.x, point.y, 1, 1, palette.moss, (1 - index / 8) * .18); });
      pixel(guide.x - 2, guide.y, 5, 1, palette.moss, .15);
      pixel(guide.x, guide.y - 2, 1, 5, palette.moss, .15);
      pixel(guide.x, guide.y, 2, 2, palette.bone, .62 + Math.sin(now * .007) * .2);
    }
    function drawShadows(now) {
      shadows.forEach(function (shadow) {
        var flicker = Math.floor(now / 90 + shadow.phase * 10) % 3;
        var hitFlash = now < (shadow.flashUntil || 0);
        var color = hitFlash ? palette.bone : (shadow.revealed ? palette.light : palette.slate);
        var alpha = shadow.revealed ? .96 : .82;
        if (shadow.type === 'watcher') {
          pixelRing(shadow.x, shadow.y, 8, color, hitFlash ? .98 : alpha);
          pixel(shadow.x - 5, shadow.y - 3, 11, 7, palette.ink, .94);
          pixel(shadow.x - 2, shadow.y - 2, 5, 5, shadow.revealed ? palette.bone : palette.moss, .86);
          pixelRing(shadow.x, shadow.y, 12 + Math.sin(now * .004 + shadow.phase), palette.moss, shadow.revealed ? .24 : .1);
        } else if (shadow.type === 'skitter') {
          pixel(shadow.x - 7, shadow.y - 3, 15, 6, color, hitFlash ? .98 : alpha);
          pixelLine(shadow.x - 5, shadow.y + 3, shadow.x - 9 - flicker, shadow.y + 7, palette.mist, .72);
          pixelLine(shadow.x + 5, shadow.y + 3, shadow.x + 9 + flicker, shadow.y + 7, palette.mist, .72);
          pixel(shadow.x + 3, shadow.y - 1, 2, 2, palette.bone, shadow.revealed ? .96 : .52);
        } else if (shadow.type === 'leech') {
          pixel(shadow.x - 4, shadow.y - 7, 9, 15, color, hitFlash ? .98 : alpha);
          pixel(shadow.x - 6, shadow.y + 3, 13, 3, palette.moss, shadow.revealed ? .74 : .42);
          pixel(shadow.x - 2, shadow.y - 4, 5, 2, palette.bone, shadow.revealed ? .9 : .42);
        } else {
          pixel(shadow.x - 4 + flicker, shadow.y - 5, 9, 11, color, hitFlash ? .98 : alpha);
          pixel(shadow.x - 6, shadow.y - 2 + flicker, 13, 4, palette.mist, shadow.revealed ? .68 : .38);
          pixel(shadow.x - 1, shadow.y - 3, 2, 2, palette.bone, shadow.revealed ? .94 : .48);
        }
        pixel(shadow.x - 8 - flicker, shadow.y + 8, 4, 1, palette.mist, shadow.revealed ? .46 : .2);
        if (shadow.revealed) {
          pixel(shadow.x - 7, shadow.y + 7, 15, 1, palette.moss, .16);
          if (shadow.type !== 'watcher') pixelRing(shadow.x, shadow.y, 8 + Math.sin(now * .006 + shadow.phase) * 1.5, palette.moss, .1);
        }
      });
    }
    function drawEnemyShots(now) {
      enemyShots.forEach(function (shot) {
        var pulse = .6 + Math.sin(now * .011 + shot.phase) * .3;
        pixelRing(shot.x, shot.y, 4, palette.moss, .18 * pulse);
        pixel(shot.x - 1, shot.y - 1, 3, 3, palette.mist, .62);
        pixel(shot.x, shot.y, 1, 1, palette.bone, .84);
      });
    }
    function drawBullets(now) {
      bullets.forEach(function (bullet) {
        bullet.trail.forEach(function (point, index) {
          if (index === 0) return;
          pixel(point.x, point.y, index < 3 ? 2 : 1, 1, index < 3 ? palette.light : palette.moss, (1 - index / bullet.trail.length) * .42);
        });
        var magnitude = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) || 1;
        var directionX = bullet.vx / magnitude;
        var directionY = bullet.vy / magnitude;
        pixelLine(bullet.x - directionX * 4, bullet.y - directionY * 4, bullet.x, bullet.y, palette.bone, .9);
        pixel(bullet.x - 1, bullet.y - 1, 3, 3, palette.light, .46);
        pixel(bullet.x, bullet.y, 1, 1, palette.bone, 1);
        if (now - bullet.bounceAt < 130) {
          var bounceProgress = clamp((now - bullet.bounceAt) / 130, 0, 1);
          pixelRing(bullet.x, bullet.y, 3 + bounceProgress * 8, palette.bone, (1 - bounceProgress) * .72);
        }
      });
    }
    function drawPlayer(now) {
      if (gameState === 'respawning' || !player.visible) return;
      if (now < player.invulnerableUntil && Math.floor(now / 75) % 2 === 0) return;
      var moving = Math.abs(player.vx) + Math.abs(player.vy) > 3;
      var bob = moving ? Math.floor(now / 110) % 2 : 0;
      var aimX = Math.cos(player.aim);
      var aimY = Math.sin(player.aim);
      var recoilX = aimX * weaponKick * 1.7;
      var recoilY = aimY * weaponKick * 1.7;
      pixel(player.x - 5 - recoilX, player.y + 1 + bob - recoilY, 11, 9, palette.ink, .98);
      pixel(player.x - 4 - recoilX, player.y + 2 + bob - recoilY, 9, 7, palette.slate, .98);
      pixel(player.x - 3, player.y - 6 + bob, 7, 7, palette.ink, 1);
      pixel(player.x - 2, player.y - 5 + bob, 5, 5, palette.mist, .92);
      pixel(player.x + aimX * 3, player.y - 3 + aimY * 2 + bob, 2, 2, palette.bone, .98);
      pixel(player.x - 7 - player.vx * .04, player.y + 5 - player.vy * .04 + bob, 7, 3, palette.moss, .78);
      var lanternX = player.x + aimX * (9 - weaponKick * 2);
      var lanternY = player.y + aimY * (9 - weaponKick * 2) + bob;
      pixelLine(player.x + aimX * 3, player.y + aimY * 3 + bob, lanternX, lanternY, palette.mist, .82);
      pixel(lanternX - 2, lanternY - 2, 5, 5, palette.moss, .82);
      pixel(lanternX - 1, lanternY - 1, 3, 3, palette.bone, 1);
    }
    function drawEffects() {
      particles.forEach(function (particle) {
        var alpha = clamp(1 - particle.age / particle.life, 0, 1) * .74;
        var magnitude = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        if (magnitude > 8) pixelLine(particle.x, particle.y, particle.x - particle.vx * .045, particle.y - particle.vy * .045, particle.color, alpha * .5);
        pixel(particle.x, particle.y, 1, 1, particle.color, alpha);
      });
    }
    function drawRain() {
      rain.forEach(function (drop) { pixelLine(drop.x, drop.y, drop.x - 1, drop.y + 2 + drop.depth * 3, drop.depth > .64 ? palette.light : palette.mist, .08 + drop.depth * .12); });
    }
    function roomAtPlayer() {
      for (var index = 0; index < rooms.length; index += 1) {
        var room = rooms[index];
        if (player.x >= room.x && player.x <= room.x + room.width && player.y >= room.y && player.y <= room.y + room.height) return room;
      }
      return rooms[0];
    }
    function drawHud(now) {
      var right = logicalWidth - 10;
      for (var heart = 0; heart < player.maxHealth; heart += 1) pixel(right - 62 + heart * 7, 9, 5, 4, heart < player.health ? palette.light : palette.slate, heart < player.health ? .78 : .48);
      beacons.forEach(function (beacon, index) {
        pixel(right - 25 + index * 8, 8, 5, 5, beacon.active ? palette.light : palette.slate, beacon.active ? .84 : .48);
        pixel(right - 24 + index * 8, 9, 3, 3, beacon.active ? palette.moss : palette.ink, .72);
      });
      pixel(right - 62, 17, 53, 2, palette.slate, .62);
      pixel(right - 62, 17, 53 * player.energy / player.maxEnergy, 2, player.energy >= 9 ? palette.moss : palette.mist, .72);
      var shotReady = now >= shotReadyAt && player.energy >= 9;
      pixel(right - 7, 16, 3, 4, shotReady ? palette.bone : palette.slate, shotReady ? .82 + Math.sin(now * .006) * .12 : .5);
      var mapWidth = 54;
      var mapHeight = 32;
      var mapX = right - mapWidth;
      var mapY = 27;
      pixel(mapX - 2, mapY - 2, mapWidth + 4, mapHeight + 4, palette.ink, .58);
      rooms.forEach(function (room) {
        pixel(mapX + room.x / worldWidth * mapWidth, mapY + room.y / worldHeight * mapHeight, room.width / worldWidth * mapWidth - 1, room.height / worldHeight * mapHeight - 1, palette.slate, .35);
      });
      beacons.forEach(function (beacon) {
        pixel(mapX + beacon.x / worldWidth * mapWidth, mapY + beacon.y / worldHeight * mapHeight, 2, 2, beacon.active ? palette.bone : palette.moss, beacon.active ? .85 : .46);
      });
      pixel(mapX + gate.x / worldWidth * mapWidth, mapY + gate.y / worldHeight * mapHeight, 2, 2, activatedCount === 3 ? palette.light : palette.mist, .72);
      pixel(mapX + player.x / worldWidth * mapWidth, mapY + player.y / worldHeight * mapHeight, 2, 2, palette.bone, .96);
      var activeRoom = roomAtPlayer();
      if (activeRoom && activeRoom.profile) {
        pixel(8, logicalHeight - 21, 72, 15, palette.ink, .58);
        pixel(8, logicalHeight - 21, 18, 1, palette.moss, .54);
        pixelText(activeRoom.profile.code, 11, logicalHeight - 13, palette.light, .72);
        pixelText(activeRoom.profile.name, 11, logicalHeight - 7, palette.moss, .7);
      }
    }
    function drawCrosshair(now) {
      if (!pointer.seen || (gameState !== 'playing' && gameState !== 'choosing')) return;
      var locked = gameState === 'choosing' ? Boolean(focusedRelic) : shadows.some(function (shadow) { return !shadow.destroyed && distance(pointer.worldX, pointer.worldY, shadow.x, shadow.y) < 9; });
      var radius = 5 + weaponKick * 3 + (locked ? Math.sin(now * .012) : 0);
      var color = locked ? palette.bone : palette.moss;
      pixel(pointer.x - radius - 3, pointer.y, 3, 1, color, locked ? .95 : .62);
      pixel(pointer.x + radius + 1, pointer.y, 3, 1, color, locked ? .95 : .62);
      pixel(pointer.x, pointer.y - radius - 3, 1, 3, color, locked ? .95 : .62);
      pixel(pointer.x, pointer.y + radius + 1, 1, 3, color, locked ? .95 : .62);
      pixel(pointer.x, pointer.y, 1, 1, palette.light, locked ? .92 : .48);
    }
    function renderGame(now) {
      var shakeX = screenShake ? (random() - .5) * screenShake : 0;
      var shakeY = screenShake ? (random() - .5) * screenShake : 0;
      pixel(0, 0, logicalWidth, logicalHeight, palette.ink);
      context.save();
      context.translate(Math.round(shakeX - camera.x), Math.round(shakeY - camera.y));
      drawGround(now);
      drawPlayerLight(now);
      drawBeam(now);
      drawGate(now);
      drawBeacons(now);
      drawRelics(now);
      drawGuide(now);
      drawShadows(now);
      drawEnemyShots(now);
      drawBullets(now);
      drawEffects();
      drawPlayer(now);
      context.restore();
      drawFogLayer(now, false);
      drawFogLayer(now, true);
      drawRain();
      drawHud(now);
      drawCrosshair(now);
      var reveal = easeOut((now - startedAt) / 720);
      if (reveal < 1) {
        var opening = logicalWidth * reveal;
        pixel(opening, 0, logicalWidth - opening, logicalHeight, palette.ink);
      }
    }
    function renderLoop(now) {
      if (!active) return;
      if (document.hidden) { lastFrame = now; frame = window.requestAnimationFrame(renderLoop); return; }
      var elapsed = now - lastFrame;
      if (elapsed < 1000 / 30) { frame = window.requestAnimationFrame(renderLoop); return; }
      var delta = Math.min(.045, elapsed / 1000);
      lastFrame = now;
      if (!receding) updateGame(delta, now);
      renderGame(now);
      frame = window.requestAnimationFrame(renderLoop);
    }
    function stopGame() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      input.left = input.right = input.up = input.down = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    function resetGame() {
      overlay.classList.remove('is-game-won');
      gameState = 'playing';
      makeWorld();
      startedAt = performance.now() - 520;
      lastFrame = performance.now();
    }
    function finish() {
      if (!active || receding) return;
      clearTimers();
      receding = true;
      hideRelicPanel();
      overlay.classList.add('is-receding');
      setMessage('LOW TIDE CLOSED // RETURNING', '正在返回花园。');
      later(function () {
        overlay.classList.remove('is-active', 'is-receding', 'is-game-won');
        overlay.setAttribute('aria-hidden', 'true');
        active = false;
        gameState = 'idle';
        stopGame();
        if (previousFocus && previousFocus.focus && document.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
      }, gardenMotionIsLite() ? 20 : 440);
    }
    function awaken() {
      clearTimers();
      stopGame();
      overlay.classList.remove('is-active', 'is-receding', 'is-game-won');
      void overlay.offsetWidth;
      previousFocus = document.activeElement;
      active = true;
      receding = false;
      overlay.classList.add('is-active');
      overlay.setAttribute('aria-hidden', 'false');
      fitCanvas();
      resetGame();
      overlay.focus({ preventScroll: true });
      document.dispatchEvent(new CustomEvent('garden:pet', { detail: 'LOW TIDE 已打开：别让噪影吞掉灯光。' }));
      if (gardenMotionIsLite()) {
        renderGame(performance.now());
        setMessage('STATIC LOW TIDE // MOTION REDUCED', '系统已按动态偏好展示静态彩蛋。');
        later(finish, 5200);
        return;
      }
      frame = window.requestAnimationFrame(renderLoop);
    }
    function isEditingTarget(target) {
      return target && (target.matches('input, textarea, select') || target.isContentEditable);
    }
    function setDirection(key, pressed) {
      if (key === 'a' || key === 'arrowleft') input.left = pressed;
      if (key === 'd' || key === 'arrowright') input.right = pressed;
      if (key === 'w' || key === 'arrowup') input.up = pressed;
      if (key === 's' || key === 'arrowdown') input.down = pressed;
    }
    document.addEventListener('keydown', function (event) {
      if (isEditingTarget(event.target)) return;
      var key = event.key.toLowerCase();
      if (active) {
        if (event.key === 'Escape') { event.preventDefault(); finish(); return; }
        if (event.target && event.target.closest && event.target.closest('[data-overgrowth-close]') && (event.key === ' ' || event.key === 'Enter')) return;
        if (key === 'r') { event.preventDefault(); resetGame(); return; }
        if (event.key === ' ') { event.preventDefault(); return; }
        if (key === 'a' || key === 'd' || key === 'w' || key === 's' || key.indexOf('arrow') === 0) {
          event.preventDefault();
          setDirection(key, true);
        }
        return;
      }
    });
    document.addEventListener('keyup', function (event) {
      if (!active) return;
      setDirection(event.key.toLowerCase(), false);
    });
    overlay.addEventListener('pointermove', function (event) {
      if (!active || receding || event.pointerType === 'touch') return;
      var rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / Math.max(1, rect.width) * logicalWidth;
      pointer.y = (event.clientY - rect.top) / Math.max(1, rect.height) * logicalHeight;
      pointer.worldX = pointer.x + camera.x;
      pointer.worldY = pointer.y + camera.y;
      pointer.seen = true;
    }, { passive: true });
    overlay.addEventListener('pointerdown', function (event) {
      if (!active || receding || event.pointerType === 'touch' || event.button !== 0 || event.target.closest('button')) return;
      event.preventDefault();
      var rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / Math.max(1, rect.width) * logicalWidth;
      pointer.y = (event.clientY - rect.top) / Math.max(1, rect.height) * logicalHeight;
      pointer.worldX = pointer.x + camera.x;
      pointer.worldY = pointer.y + camera.y;
      pointer.seen = true;
      player.aim = Math.atan2(pointer.worldY - player.y, pointer.worldX - player.x);
      fireShot(performance.now());
    });
    function bindHold(selector, property) {
      if (!controls) return;
      var button = controls.querySelector(selector);
      if (!button) return;
      button.addEventListener('pointerdown', function (event) { event.preventDefault(); button.setPointerCapture(event.pointerId); input[property] = true; });
      function release(event) {
        input[property] = false;
        if (button.hasPointerCapture && button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
      }
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', function () { input[property] = false; });
    }
    bindHold('[data-game-left]', 'left');
    bindHold('[data-game-right]', 'right');
    bindHold('[data-game-up]', 'up');
    bindHold('[data-game-down]', 'down');
    if (controls) {
      var shot = controls.querySelector('[data-game-shot]');
      if (shot) shot.addEventListener('pointerdown', function (event) { event.preventDefault(); fireShot(performance.now()); });
    }
    if (close) close.addEventListener('click', finish);
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        fitCanvas();
        if (active) resetGame();
      }, 140);
    }, { passive: true });
    fitCanvas();
    window.gardenLowTideAwaken = awaken;
    awaken();
  }


  setupGardenEasterEgg();
})();
