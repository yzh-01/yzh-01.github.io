(function () {
  'use strict';

  var nav = document.getElementById('g-nav');
  var articleBackTop = document.querySelector('.article-back-top');
  var scrollProgress = document.getElementById('g-scroll-progress');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var gardenRoute = document.querySelector('.garden-route');
  var gardenRouteFill = gardenRoute ? gardenRoute.querySelector('.garden-route-track i') : null;
  var gardenRouteItems = [];
  var gardenRouteStart = 0;
  var gardenRouteEnd = 1;
  var ticking = false;

  function updateGardenRoute() {
    if (!gardenRoute || !gardenRouteItems.length) return;
    var marker = window.scrollY + window.innerHeight * 0.44;
    var progress = Math.min(1, Math.max(0, (marker - gardenRouteStart) / (gardenRouteEnd - gardenRouteStart || 1)));
    var activeIndex = 0;

    gardenRouteItems.forEach(function (item, index) {
      if (marker >= item.top) activeIndex = index;
    });

    if (gardenRouteFill) gardenRouteFill.style.transform = 'scaleY(' + progress.toFixed(4) + ')';
    gardenRouteItems.forEach(function (item, index) {
      var active = index === activeIndex;
      item.link.classList.toggle('active', active);
      if (active) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    });
  }

  function refreshGardenRoute() {
    if (!gardenRouteItems.length) return;
    gardenRouteItems.forEach(function (item) {
      item.top = item.target.getBoundingClientRect().top + window.scrollY;
    });
    gardenRouteStart = gardenRouteItems[0].top;
    gardenRouteEnd = gardenRouteItems[gardenRouteItems.length - 1].top;
  }

  function updateScrollState() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    if (articleBackTop) articleBackTop.classList.toggle('visible', window.scrollY > Math.max(360, window.innerHeight * 0.55));
    if (scrollProgress) {
      var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      var progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
      scrollProgress.style.transform = 'scaleX(' + progress + ')';
      scrollProgress.parentElement.classList.toggle('is-visible', maxScroll > 80);
    }
    updateGardenRoute();
    ticking = false;
  }

  updateScrollState();
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScrollState);
  }, { passive: true });
  window.addEventListener('resize', function () {
    refreshGardenRoute();
    updateScrollState();
  }, { passive: true });
  window.addEventListener('load', function () {
    refreshGardenRoute();
    updateScrollState();
  }, { once: true });

  if (articleBackTop) {
    articleBackTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  }

  function setupGardenTheme() {
    var root = document.documentElement;
    var controls = document.querySelector('[data-garden-controls]');
    var panel = document.getElementById('garden-settings');
    var toggle = document.querySelector('.garden-settings-toggle');
    var themeColor = document.getElementById('g-theme-color');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    var buttons = controls ? Array.prototype.slice.call(controls.querySelectorAll('[data-theme-choice]')) : [];
    var status = controls ? controls.querySelector('[data-theme-status]') : null;
    var currentMode = 'system';

    try { currentMode = window.localStorage.getItem('garden-theme') || 'system'; } catch (error) {}
    if (['system', 'light', 'dark'].indexOf(currentMode) === -1) currentMode = 'system';

    function resolvedTheme() {
      return currentMode === 'system' ? (systemDark.matches ? 'dark' : 'light') : currentMode;
    }

    function updateControls() {
      buttons.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.dataset.themeChoice === currentMode));
      });
      if (!status) return;
      var resolvedLabel = resolvedTheme() === 'dark' ? '深色' : '浅色';
      status.textContent = currentMode === 'system' ? '跟随系统 · 当前为' + resolvedLabel : '已固定为' + resolvedLabel + '模式';
    }

    function applyTheme(mode, persist) {
      currentMode = mode;
      if (mode === 'system') root.removeAttribute('data-theme');
      else root.dataset.theme = mode;

      var resolved = resolvedTheme();
      root.dataset.resolvedTheme = resolved;
      root.style.colorScheme = resolved;
      if (themeColor) themeColor.setAttribute('content', resolved === 'dark' ? '#090b0a' : '#e3e8e0');

      if (persist) {
        try { window.localStorage.setItem('garden-theme', mode); } catch (error) {}
      }
      updateControls();
    }

    applyTheme(currentMode, false);

    function syncSystemTheme() {
      if (currentMode === 'system') applyTheme('system', false);
    }
    if (typeof systemDark.addEventListener === 'function') systemDark.addEventListener('change', syncSystemTheme);
    else if (typeof systemDark.addListener === 'function') systemDark.addListener(syncSystemTheme);

    if (!controls || !panel || !toggle) return;

    var panelTimer = 0;
    var panelFrame = 0;

    function setPanel(open) {
      window.clearTimeout(panelTimer);
      window.cancelAnimationFrame(panelFrame);
      if (open) {
        panel.hidden = false;
        panelFrame = window.requestAnimationFrame(function () {
          panelFrame = 0;
          panel.classList.add('is-open');
        });
      } else {
        panel.classList.remove('is-open');
        panelTimer = window.setTimeout(function () {
          panel.hidden = true;
          panelTimer = 0;
        }, 240);
      }
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '关闭花园设置' : '打开花园设置');
    }

    toggle.addEventListener('click', function () {
      setPanel(toggle.getAttribute('aria-expanded') !== 'true');
    });

    var themeTimer = 0;

    function switchTheme(mode) {
      var nextResolved = mode === 'system' ? (systemDark.matches ? 'dark' : 'light') : mode;
      window.clearTimeout(themeTimer);
      if (nextResolved === resolvedTheme() || reduceMotion.matches) {
        root.classList.remove('theme-switching');
        applyTheme(mode, true);
        return;
      }

      root.classList.add('theme-switching');
      applyTheme(mode, true);
      themeTimer = window.setTimeout(function () {
        themeTimer = 0;
        root.classList.remove('theme-switching');
      }, 80);
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        switchTheme(button.dataset.themeChoice);
      });
    });

    document.addEventListener('pointerdown', function (event) {
      if (!panel.hidden && !controls.contains(event.target)) setPanel(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || panel.hidden) return;
      setPanel(false);
      toggle.focus();
    });
  }

  function setupGardenEntry() {
    var entry = document.querySelector('[data-garden-entry]');
    if (!entry) return;

    var entryClock = entry.querySelector('[data-entry-clock]');
    var entryTimeFormatter = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    function updateEntryClock() {
      if (!entryClock) return;
      var now = new Date();
      entryClock.textContent = entryTimeFormatter.format(now);
      entryClock.dateTime = now.toISOString();
    }

    updateEntryClock();
    if (reduceMotion.matches) return;
    window.setInterval(function () {
      if (!document.hidden) updateEntryClock();
    }, 1000);

    var clearLayer = entry.querySelector('[data-entry-clear]');
    var entryStage = entry.querySelector('.garden-entry-stage');
    var pointerFrame = 0;
    var scrollFrame = 0;
    var touchTimer = 0;
    var pointerX = 0;
    var pointerY = 0;

    entry.classList.add('entry-motion-ready');

    function setClearPosition(event) {
      if (!clearLayer) return;
      var rect = entry.getBoundingClientRect();
      var x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      var y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      clearLayer.style.setProperty('--entry-clear-x', x.toFixed(1) + 'px');
      clearLayer.style.setProperty('--entry-clear-y', y.toFixed(1) + 'px');
    }

    function scheduleClearPosition(event) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(function () {
        pointerFrame = 0;
        setClearPosition({ clientX: pointerX, clientY: pointerY });
      });
    }

    if (finePointer.matches) {
      entry.addEventListener('pointerenter', function (event) {
        scheduleClearPosition(event);
        entry.classList.add('is-pointer-active');
      });
      entry.addEventListener('pointermove', scheduleClearPosition, { passive: true });
      entry.addEventListener('pointerleave', function () {
        entry.classList.remove('is-pointer-active');
      });
    } else {
      entry.addEventListener('pointerdown', function (event) {
        scheduleClearPosition(event);
        entry.classList.add('is-pointer-active');
        window.clearTimeout(touchTimer);
        touchTimer = window.setTimeout(function () {
          entry.classList.remove('is-pointer-active');
        }, 900);
      }, { passive: true });
    }

    function updateEntryExit() {
      scrollFrame = 0;
      var rect = entry.getBoundingClientRect();
      var travel = Math.max(1, entry.offsetHeight * .72);
      var progress = Math.max(0, Math.min(1, -rect.top / travel));
      if (entryStage) {
        entryStage.style.transform = 'translate3d(0, ' + (-34 * progress).toFixed(1) + 'px, 0)';
        entryStage.style.opacity = Math.max(0, 1 - progress * 1.18).toFixed(3);
      }
      entry.style.setProperty('--entry-bg-y', (18 * progress).toFixed(1) + 'px');
    }

    function scheduleEntryExit() {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(updateEntryExit);
    }

    updateEntryExit();
    window.addEventListener('scroll', scheduleEntryExit, { passive: true });
    window.addEventListener('resize', scheduleEntryExit, { passive: true });

    if (!('IntersectionObserver' in window)) {
      entry.classList.add('is-active');
      return;
    }

    var observer = new IntersectionObserver(function (records) {
      records.forEach(function (record) {
        if (record.isIntersecting && record.intersectionRatio >= 0.42) {
          entry.classList.add('is-active');
        } else if (!record.isIntersecting || record.intersectionRatio <= 0.12) {
          entry.classList.remove('is-active');
        }
      });
    }, { threshold: [0, 0.12, 0.42, 0.75] });

    observer.observe(entry);
  }

  function setupHomeClock() {
    var clocks = Array.prototype.slice.call(document.querySelectorAll('[data-home-clock]'));
    if (!clocks.length) return;

    var formatter = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    function updateClock() {
      var now = new Date();
      var baseTime = formatter.format(now);
      var milliseconds = String(now.getMilliseconds()).padStart(3, '0');
      clocks.forEach(function (clock) {
        var prefix = clock.dataset.clockPrefix || '';
        var suffix = Object.prototype.hasOwnProperty.call(clock.dataset, 'clockMs') ? ':' + milliseconds : '';
        clock.textContent = prefix + baseTime + suffix;
        clock.dateTime = now.toISOString();
      });
    }

    updateClock();
    window.setInterval(function () {
      if (!document.hidden) updateClock();
    }, 100);
  }

  function setupContributionCalendar() {
    var wall = document.querySelector('[data-contribution-wall]');
    var contributionGrid = wall ? wall.querySelector('[data-contribution-grid]') : null;
    var contributionMonths = wall ? wall.querySelector('[data-contribution-months]') : null;
    var contributionSummary = wall ? wall.querySelector('[data-contribution-summary]') : null;
    var githubUser = wall ? wall.dataset.githubUser : '';
    var githubCacheKey = 'garden-github-contributions:' + githubUser;
    var githubCacheTtl = 6 * 60 * 60 * 1000;
    var calendar = document.querySelector('[data-folio-calendar]');
    var calendarTitle = calendar ? calendar.querySelector('[data-calendar-title]') : null;
    var calendarGrid = calendar ? calendar.querySelector('[data-calendar-grid]') : null;
    var calendarProgress = calendar ? calendar.querySelector('[data-calendar-progress]') : null;
    if (!contributionGrid && !calendarGrid) return;

    function pad(value) {
      return String(value).padStart(2, '0');
    }

    function dateKey(date) {
      return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    }

    function normalizeGithubContributions(payload) {
      if (!payload || !Array.isArray(payload.contributions)) throw new Error('Invalid GitHub contribution payload');
      return payload.contributions.filter(function (entry) {
        return entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date);
      }).map(function (entry) {
        return {
          date: entry.date,
          count: Math.max(0, Number(entry.count) || 0),
          level: Math.max(0, Math.min(4, Number(entry.level) || 0))
        };
      });
    }

    function readGithubCache() {
      if (!githubUser) return null;
      try {
        var cached = JSON.parse(window.localStorage.getItem(githubCacheKey));
        if (!cached || !Array.isArray(cached.contributions) || !cached.savedAt) return null;
        return {
          contributions: normalizeGithubContributions(cached),
          fresh: Date.now() - Number(cached.savedAt) < githubCacheTtl
        };
      } catch (error) {
        return null;
      }
    }

    function writeGithubCache(contributions) {
      try {
        window.localStorage.setItem(githubCacheKey, JSON.stringify({
          savedAt: Date.now(),
          contributions: contributions
        }));
      } catch (error) {}
    }

    function renderContributionWall(now, contributions, state) {
      if (!wall || !contributionGrid || !contributionMonths) return;
      var counts = Object.create(null);
      var levels = Object.create(null);
      (contributions || []).forEach(function (entry) {
        counts[entry.date] = entry.count;
        levels[entry.date] = entry.level;
      });

      var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var end = new Date(today);
      end.setDate(end.getDate() + (6 - end.getDay()));
      var start = new Date(end);
      start.setDate(start.getDate() - 195);
      var todayKey = dateKey(today);
      var activeDays = 0;
      var totalContributions = 0;
      var fragment = document.createDocumentFragment();
      contributionGrid.textContent = '';
      contributionMonths.textContent = '';

      for (var dayIndex = 0; dayIndex < 196; dayIndex += 1) {
        var day = new Date(start);
        day.setDate(start.getDate() + dayIndex);
        var key = dateKey(day);
        var count = counts[key] || 0;
        if (count && day <= today) {
          activeDays += 1;
          totalContributions += count;
        }
        var level = levels[key] || 0;
        var cell = document.createElement('span');
        cell.dataset.level = String(level);
        cell.dataset.date = key;
        cell.dataset.count = String(count);
        cell.dataset.index = String(dayIndex);
        cell.style.setProperty('--cell-delay', ((dayIndex % 28) * 14 + (dayIndex % 7) * 18) + 'ms');
        cell.title = key + ' · ' + count + (count === 1 ? ' GitHub contribution' : ' GitHub contributions');
        if (day > today) cell.classList.add('is-future');
        if (key === todayKey) cell.classList.add('is-today');
        fragment.appendChild(cell);
      }
      contributionGrid.appendChild(fragment);
      contributionGrid.setAttribute('aria-label', '最近二十八周共有 ' + totalContributions + ' 次 GitHub 贡献，活跃 ' + activeDays + ' 天');
      wall.dataset.githubState = state || 'live';
      if (contributionSummary) {
        if (state === 'syncing') contributionSummary.textContent = 'SYNCING GITHUB';
        else if (state === 'offline') contributionSummary.textContent = 'GITHUB OFFLINE';
        else contributionSummary.textContent = String(totalContributions).padStart(3, '0') + ' CONTRIBUTIONS';
        contributionSummary.dataset.defaultText = contributionSummary.textContent;
      }

      var previousMonth = -1;
      for (var week = 0; week < 28; week += 1) {
        var weekDate = new Date(start);
        weekDate.setDate(start.getDate() + week * 7);
        var month = weekDate.getMonth();
        if (month === previousMonth) continue;
        previousMonth = month;
        var label = document.createElement('span');
        label.textContent = String(month + 1).padStart(2, '0');
        label.style.left = (week / 28 * 100).toFixed(3) + '%';
        contributionMonths.appendChild(label);
      }
    }

    function syncGithubContributions(cached) {
      if (!wall || !githubUser || typeof window.fetch !== 'function') return;
      if (cached && cached.fresh) return;

      var controller = typeof window.AbortController === 'function' ? new AbortController() : null;
      var timeout = window.setTimeout(function () {
        if (controller) controller.abort();
      }, 8000);
      var endpoint = 'https://github-contributions-api.jogruber.de/v4/' + encodeURIComponent(githubUser) + '?y=last';
      var options = { credentials: 'omit', cache: 'default' };
      if (controller) options.signal = controller.signal;

      window.fetch(endpoint, options).then(function (response) {
        if (!response.ok) throw new Error('GitHub contribution request failed');
        return response.json();
      }).then(function (payload) {
        var contributions = normalizeGithubContributions(payload);
        writeGithubCache(contributions);
        renderContributionWall(new Date(), contributions, 'live');
      }).catch(function () {
        if (!cached) renderContributionWall(new Date(), [], 'offline');
      }).then(function () {
        window.clearTimeout(timeout);
      });
    }

    function renderCalendar(now) {
      if (!calendar || !calendarGrid) return;
      var year = now.getFullYear();
      var month = now.getMonth();
      var day = now.getDate();
      var firstDay = new Date(year, month, 1);
      var leading = (firstDay.getDay() + 6) % 7;
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var cellCount = Math.ceil((leading + daysInMonth) / 7) * 7;
      var fragment = document.createDocumentFragment();
      calendarGrid.textContent = '';

      for (var index = 0; index < cellCount; index += 1) {
        var dateNumber = index - leading + 1;
        var isOutside = dateNumber < 1 || dateNumber > daysInMonth;
        var cell = document.createElement(isOutside ? 'span' : 'button');
        cell.style.setProperty('--calendar-delay', (index * 14) + 'ms');
        if (isOutside) {
          cell.className = 'is-outside';
          cell.setAttribute('aria-hidden', 'true');
        } else {
          var key = year + '-' + pad(month + 1) + '-' + pad(dateNumber);
          cell.type = 'button';
          cell.textContent = String(dateNumber);
          cell.dataset.date = key;
          cell.dataset.index = String(index);
          cell.setAttribute('aria-label', year + ' 年 ' + (month + 1) + ' 月 ' + dateNumber + ' 日');
          if (dateNumber === day) {
            cell.className = 'is-today';
            cell.setAttribute('aria-current', 'date');
          }
        }
        fragment.appendChild(cell);
      }
      calendarGrid.appendChild(fragment);
      calendarGrid.setAttribute('aria-label', year + ' 年 ' + (month + 1) + ' 月日历');

      if (calendarTitle) {
        calendarTitle.textContent = year + '.' + pad(month + 1) + '.' + pad(day);
        calendarTitle.dateTime = dateKey(now);
        calendarTitle.dataset.defaultText = calendarTitle.textContent;
        calendarTitle.dataset.defaultDatetime = calendarTitle.dateTime;
      }
      if (calendarProgress) {
        var startOfYear = new Date(year, 0, 1);
        var startOfNextYear = new Date(year + 1, 0, 1);
        var progress = (now - startOfYear) / (startOfNextYear - startOfYear) * 100;
        calendarProgress.textContent = progress.toFixed(3) + '%';
      }
    }

    function render() {
      var now = new Date();
      var cached = readGithubCache();
      renderContributionWall(now, cached ? cached.contributions : [], cached ? 'cached' : 'syncing');
      renderCalendar(now);
      syncGithubContributions(cached);
    }

    function clearContributionPoint() {
      if (!contributionGrid) return;
      Array.prototype.forEach.call(contributionGrid.querySelectorAll('.is-pointed, .is-near'), function (cell) {
        cell.classList.remove('is-pointed', 'is-near');
      });
      if (wall) wall.classList.remove('is-reading-date');
      if (contributionSummary && contributionSummary.dataset.defaultText) contributionSummary.textContent = contributionSummary.dataset.defaultText;
    }

    function pointContribution(cell) {
      if (!contributionGrid || !cell || !contributionGrid.contains(cell)) return;
      clearContributionPoint();
      var cells = Array.prototype.slice.call(contributionGrid.children);
      var index = Number(cell.dataset.index);
      cell.classList.add('is-pointed');
      [index - 7, index + 7, index - 1, index + 1].forEach(function (nearIndex) {
        if (cells[nearIndex]) cells[nearIndex].classList.add('is-near');
      });
      if (wall) wall.classList.add('is-reading-date');
      if (contributionSummary) {
        var count = Number(cell.dataset.count || 0);
        contributionSummary.textContent = cell.dataset.date.replace(/-/g, '.') + (count ? ' / +' + count + ' GH' : ' / IDLE');
      }
    }

    function clearCalendarPoint() {
      if (!calendarGrid) return;
      Array.prototype.forEach.call(calendarGrid.querySelectorAll('.is-pointed, .is-near'), function (cell) {
        cell.classList.remove('is-pointed', 'is-near');
      });
      if (calendar) calendar.classList.remove('is-date-hovered');
      if (calendarTitle && calendarTitle.dataset.defaultText) {
        calendarTitle.textContent = calendarTitle.dataset.defaultText;
        calendarTitle.dateTime = calendarTitle.dataset.defaultDatetime;
      }
    }

    function pointCalendar(cell) {
      if (!calendarGrid || !cell || cell.tagName !== 'BUTTON') return;
      clearCalendarPoint();
      var cells = Array.prototype.slice.call(calendarGrid.children);
      var index = Number(cell.dataset.index);
      cell.classList.add('is-pointed');
      [index - 1, index + 1, index - 7, index + 7].forEach(function (nearIndex) {
        var near = cells[nearIndex];
        if (near && near.tagName === 'BUTTON') near.classList.add('is-near');
      });
      if (calendar) calendar.classList.add('is-date-hovered');
      if (calendarTitle) {
        calendarTitle.textContent = cell.dataset.date.replace(/-/g, '.');
        calendarTitle.dateTime = cell.dataset.date;
      }
    }

    render();
    if (contributionGrid) {
      contributionGrid.addEventListener('pointermove', function (event) {
        var cell = event.target.closest('span[data-date]');
        if (cell && !cell.classList.contains('is-pointed')) pointContribution(cell);
      }, { passive: true });
      contributionGrid.addEventListener('pointerleave', clearContributionPoint, { passive: true });
    }
    if (calendarGrid) {
      calendarGrid.addEventListener('pointerover', function (event) {
        var cell = event.target.closest('button[data-date]');
        if (cell) pointCalendar(cell);
      }, { passive: true });
      calendarGrid.addEventListener('pointerleave', clearCalendarPoint, { passive: true });
      calendarGrid.addEventListener('focusin', function (event) {
        var cell = event.target.closest('button[data-date]');
        if (cell) pointCalendar(cell);
      });
      calendarGrid.addEventListener('focusout', function (event) {
        if (!calendarGrid.contains(event.relatedTarget)) clearCalendarPoint();
      });
    }
    window.setInterval(function () {
      if (!document.hidden) render();
    }, 60 * 60 * 1000);
  }

  function setupWorldMotion() {
    var world = document.querySelector('.folio-world');
    if (!world || gardenMotionIsLite()) return;

    var currentX = 0;
    var currentY = 0;
    var currentScroll = 0;
    var currentEnergy = 0;
    var currentPointerX = window.innerWidth * .5;
    var currentPointerY = window.innerHeight * .42;
    var targetX = 0;
    var targetY = 0;
    var targetScroll = 0;
    var targetEnergy = 0;
    var targetPointerX = currentPointerX;
    var targetPointerY = currentPointerY;
    var lastPointerX = currentPointerX;
    var lastPointerY = currentPointerY;
    var lastScrollY = window.scrollY;
    var frame = 0;

    function mix(from, to, amount) { return from + (to - from) * amount; }
    function near(a, b) { return Math.abs(a - b) < .025; }

    function render() {
      frame = 0;
      currentX = mix(currentX, targetX, .105);
      currentY = mix(currentY, targetY, .105);
      currentScroll = mix(currentScroll, targetScroll, .09);
      currentEnergy = mix(currentEnergy, targetEnergy, .16);
      currentPointerX = mix(currentPointerX, targetPointerX, .14);
      currentPointerY = mix(currentPointerY, targetPointerY, .14);
      targetEnergy *= .88;

      world.style.setProperty('--world-back-x', (-currentX * .24).toFixed(2) + 'px');
      world.style.setProperty('--world-back-y', (-currentY * .18 + currentScroll * .2).toFixed(2) + 'px');
      world.style.setProperty('--world-mid-x', (currentX * .38).toFixed(2) + 'px');
      world.style.setProperty('--world-mid-y', (currentY * .27 + currentScroll * .48).toFixed(2) + 'px');
      world.style.setProperty('--world-front-x', (currentX * .72).toFixed(2) + 'px');
      world.style.setProperty('--world-front-y', (currentY * .5 + currentScroll * .78).toFixed(2) + 'px');
      world.style.setProperty('--world-pointer-x', currentPointerX.toFixed(1) + 'px');
      world.style.setProperty('--world-pointer-y', currentPointerY.toFixed(1) + 'px');
      world.style.setProperty('--world-energy', currentEnergy.toFixed(3));
      world.style.setProperty('--world-contour-opacity', (.54 + currentEnergy * .18).toFixed(3));
      world.style.setProperty('--world-rain-opacity', (.4 + currentEnergy * .14).toFixed(3));
      world.style.setProperty('--world-rain-opacity-light', (.24 + currentEnergy * .1).toFixed(3));
      world.style.setProperty('--world-brightness', (1 + currentEnergy * .22).toFixed(3));
      world.style.setProperty('--rain-skew', (currentX * .045).toFixed(2) + 'deg');

      if (!near(currentX, targetX) || !near(currentY, targetY) || !near(currentScroll, targetScroll) || currentEnergy > .012 || !near(currentPointerX, targetPointerX) || !near(currentPointerY, targetPointerY)) schedule();
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(render);
    }

    document.addEventListener('pointermove', function (event) {
      var dx = event.clientX - lastPointerX;
      var dy = event.clientY - lastPointerY;
      targetX = (event.clientX / Math.max(1, window.innerWidth) - .5) * 30;
      targetY = (event.clientY / Math.max(1, window.innerHeight) - .5) * 18;
      targetPointerX = event.clientX;
      targetPointerY = event.clientY;
      targetEnergy = Math.max(targetEnergy, Math.min(1, Math.sqrt(dx * dx + dy * dy) / 42));
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      schedule();
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', function () {
      targetX = 0;
      targetY = 0;
      targetPointerX = window.innerWidth * .5;
      targetPointerY = window.innerHeight * .42;
      schedule();
    }, { passive: true });

    window.addEventListener('scroll', function () {
      var nextScrollY = window.scrollY;
      var delta = nextScrollY - lastScrollY;
      targetScroll = Math.max(-38, Math.min(8, nextScrollY * -.018));
      targetEnergy = Math.max(targetEnergy, Math.min(1, Math.abs(delta) / 34));
      lastScrollY = nextScrollY;
      schedule();
    }, { passive: true });

    window.addEventListener('resize', function () {
      targetPointerX = Math.min(targetPointerX, window.innerWidth);
      targetPointerY = Math.min(targetPointerY, window.innerHeight);
      schedule();
    }, { passive: true });

    schedule();
  }

  function setupFieldMotion() {
    var sections = Array.prototype.slice.call(document.querySelectorAll('[data-field-motion]'));
    if (!sections.length || gardenMotionIsLite()) return;
    var states = sections.map(function (section) {
      var rows = Array.prototype.slice.call(section.querySelectorAll('.folio-directory-item, [data-motion-row]'));
      rows.forEach(function (row, index) {
        row.classList.add('folio-motion-row');
        row.style.setProperty('--motion-delay', (80 + index * 95) + 'ms');
      });
      var contribution = section.querySelector('.folio-contribution');
      var calendar = section.querySelector('.folio-calendar');
      if (contribution) contribution.classList.add('is-motion-ready');
      if (calendar) calendar.classList.add('is-motion-ready');
      return {
        section: section,
        rows: rows,
        contribution: contribution,
        calendar: calendar,
        active: false,
        awakened: false,
        pointerX: 0,
        pointerY: 0
      };
    });
    var frame = 0;

    function render() {
      frame = 0;
      states.forEach(function (state) {
        if (!state.active) return;
        var rect = state.section.getBoundingClientRect();
        var centerOffset = (window.innerHeight * .5 - (rect.top + rect.height * .5)) * .028;
        var y = Math.max(-18, Math.min(18, centerOffset + state.pointerY));
        state.section.style.setProperty('--field-x', state.pointerX.toFixed(2) + 'px');
        state.section.style.setProperty('--field-y', y.toFixed(2) + 'px');
      });
    }

    function scheduleRender() {
      if (!frame) frame = window.requestAnimationFrame(render);
    }

    function awaken(state) {
      if (state.awakened) return;
      state.awakened = true;
      window.requestAnimationFrame(function () {
        state.rows.forEach(function (row) { row.classList.add('is-motion-in'); });
        if (state.contribution) state.contribution.classList.add('is-awake');
        if (state.calendar) state.calendar.classList.add('is-awake');
      });
    }

    function setActive(state, active) {
      state.active = active;
      state.section.classList.toggle('is-field-active', active);
      if (active) awaken(state);
      else {
        state.pointerX = 0;
        state.pointerY = 0;
      }
      scheduleRender();
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var state = states.find(function (item) { return item.section === entry.target; });
          if (state) setActive(state, entry.isIntersecting);
        });
      }, { threshold: .04, rootMargin: '8% 0px 8% 0px' });
      states.forEach(function (state) { observer.observe(state.section); });
    } else {
      states.forEach(function (state) { setActive(state, true); });
    }

    if (finePointer.matches) {
      states.forEach(function (state) {
        state.section.addEventListener('pointermove', function (event) {
          var rect = state.section.getBoundingClientRect();
          state.pointerX = ((event.clientX - rect.left) / rect.width - .5) * 12;
          state.pointerY = ((event.clientY - rect.top) / rect.height - .5) * 7;
          scheduleRender();
        }, { passive: true });
        state.section.addEventListener('pointerleave', function () {
          state.pointerX = 0;
          state.pointerY = 0;
          scheduleRender();
        }, { passive: true });
      });
    }

    window.addEventListener('scroll', scheduleRender, { passive: true });
    window.addEventListener('resize', scheduleRender, { passive: true });
  }

  function setupHomeQuoteFragment() {
    var card = document.querySelector('[data-home-quote-card]');
    if (!card) return;
    var quote = card.querySelector('[data-home-quote]');
    var author = card.querySelector('[data-home-quote-author]');
    var work = card.querySelector('[data-home-quote-work]');
    var indexLabel = card.querySelector('[data-home-quote-index]');
    var status = card.querySelector('[data-home-quote-status]');
    var nextButton = card.querySelector('[data-home-quote-next]');
    var progress = card.querySelector('[data-home-quote-progress]');
    var film = card.querySelector('[data-home-quote-film]');
    var frameLabel = card.querySelector('[data-home-quote-frame]');
    var items = Array.prototype.slice.call(card.querySelectorAll('[data-home-quote-pool] > span'));
    if (!quote || !author || !work || !nextButton || items.length < 2) return;
    var storageKey = 'garden-last-home-quote';
    var sessionOrder = [];
    var cyclePosition = 0;
    var currentIndex = -1;
    var timer = 0;
    var changeTimer = 0;
    var revealTimer = 0;
    var interval = 10500;

    function getItemData(item, itemIndex) {
      var named = Boolean(item.dataset.quoteAuthor);
      return {
        text: item.textContent.trim(),
        author: named ? item.dataset.quoteAuthor : 'LOW TIDE ARCHIVE',
        work: named ? item.dataset.quoteWork : item.dataset.quoteSource,
        number: itemIndex + 1
      };
    }

    function shuffledOrder(avoidIndex) {
      var order = items.map(function (_, itemIndex) { return itemIndex; });
      for (var cursor = order.length - 1; cursor > 0; cursor -= 1) {
        var swapIndex = Math.floor(Math.random() * (cursor + 1));
        var temporary = order[cursor];
        order[cursor] = order[swapIndex];
        order[swapIndex] = temporary;
      }
      if (order.length > 1 && order[0] === avoidIndex) {
        var alternative = order.findIndex(function (itemIndex) { return itemIndex !== avoidIndex; });
        var first = order[0];
        order[0] = order[alternative];
        order[alternative] = first;
      }
      return order;
    }

    function remember(itemIndex) {
      try { window.localStorage.setItem(storageKey, String(itemIndex)); } catch (error) {}
    }

    function previousIndex() {
      try {
        var stored = Number(window.localStorage.getItem(storageKey));
        return Number.isInteger(stored) ? stored : -1;
      } catch (error) {
        return -1;
      }
    }

    function schedule() {
      window.clearTimeout(timer);
      if (progress) {
        progress.style.animation = 'none';
        void progress.offsetWidth;
        progress.style.animation = gardenMotionIsLite() ? 'none' : 'garden-quote-progress ' + interval + 'ms linear forwards';
      }
      timer = window.setTimeout(function () {
        if (!document.hidden) showNext();
        else schedule();
      }, interval);
    }

    function renderItem(itemIndex, immediate) {
      window.clearTimeout(changeTimer);
      window.clearTimeout(revealTimer);
      var data = getItemData(items[itemIndex], itemIndex);
      var shouldAnimate = !immediate && !gardenMotionIsLite();
      card.classList.remove('is-changing');
      if (shouldAnimate) {
        void card.offsetWidth;
        card.classList.add('is-changing');
      }
      if (status) status.textContent = shouldAnimate ? 'EXPOSING' : 'LOCKED';
      changeTimer = window.setTimeout(function () {
        quote.textContent = '“' + data.text + '”';
        quote.dataset.quoteCopy = '“' + data.text + '”';
        author.textContent = data.author;
        work.textContent = data.work;
        if (indexLabel) indexLabel.textContent = String(data.number).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
        if (frameLabel) frameLabel.textContent = String(data.number).padStart(2, '0');
        if (status) status.textContent = 'LOCKED';
        card.dataset.quoteNumber = String(data.number).padStart(2, '0');
        currentIndex = itemIndex;
        remember(itemIndex);
        if (!shouldAnimate) {
          card.classList.remove('is-changing');
          return;
        }
        revealTimer = window.setTimeout(function () {
          card.classList.remove('is-changing');
        }, 260);
      }, shouldAnimate ? 190 : 0);
      schedule();
    }

    function showNext() {
      if (!sessionOrder.length || cyclePosition >= sessionOrder.length) {
        sessionOrder = shuffledOrder(currentIndex);
        cyclePosition = 0;
      }
      renderItem(sessionOrder[cyclePosition], false);
      cyclePosition += 1;
    }

    nextButton.addEventListener('click', function () {
      showNext();
    });

    if (film && !gardenMotionIsLite() && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var motionFrame = 0;
      var targetX = 0;
      var targetY = 0;
      var targetRotateX = 0;
      var targetRotateY = 0;
      var currentX = 0;
      var currentY = 0;
      var currentRotateX = 0;
      var currentRotateY = 0;

      function renderFilmMotion() {
        currentX += (targetX - currentX) * .13;
        currentY += (targetY - currentY) * .13;
        currentRotateX += (targetRotateX - currentRotateX) * .13;
        currentRotateY += (targetRotateY - currentRotateY) * .13;
        film.style.transform = 'translate3d(' + currentX.toFixed(2) + 'px,' + currentY.toFixed(2) + 'px,0) rotateX(' + currentRotateX.toFixed(2) + 'deg) rotateY(' + currentRotateY.toFixed(2) + 'deg) rotateZ(-.25deg)';

        var settled = Math.abs(targetX - currentX) < .02 && Math.abs(targetY - currentY) < .02 && Math.abs(targetRotateX - currentRotateX) < .02 && Math.abs(targetRotateY - currentRotateY) < .02;
        if (!settled) {
          motionFrame = window.requestAnimationFrame(renderFilmMotion);
          return;
        }
        motionFrame = 0;
        if (!targetX && !targetY && !targetRotateX && !targetRotateY) {
          film.style.transform = '';
          card.classList.remove('is-tracking');
        }
      }

      function requestFilmMotion() {
        if (!motionFrame) motionFrame = window.requestAnimationFrame(renderFilmMotion);
      }

      card.addEventListener('pointermove', function (event) {
        var bounds = card.getBoundingClientRect();
        var normalizedX = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
        var normalizedY = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
        targetX = normalizedX * 5;
        targetY = normalizedY * 3;
        targetRotateX = normalizedY * -1.15;
        targetRotateY = normalizedX * 1.45;
        card.classList.add('is-tracking');
        requestFilmMotion();
      });

      card.addEventListener('pointerleave', function () {
        targetX = 0;
        targetY = 0;
        targetRotateX = 0;
        targetRotateY = 0;
        requestFilmMotion();
      });
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        window.clearTimeout(timer);
        if (progress) progress.style.animationPlayState = 'paused';
      } else {
        if (progress) progress.style.animationPlayState = 'running';
        schedule();
      }
    });

    sessionOrder = shuffledOrder(previousIndex());
    renderItem(sessionOrder[0], true);
    cyclePosition = 1;
  }

  function setupHomeWindow() {
    var photo = document.querySelector('[data-home-window]');
    var scene = photo;
    var lens = photo ? photo.querySelector('[data-home-lens]') : null;
    if (!photo || !scene || !lens || reduceMotion.matches) return;

    var frame = 0;
    var touchTimer = 0;
    var pointerX = 0;
    var pointerY = 0;

    function renderLens() {
      frame = 0;
      var rect = scene.getBoundingClientRect();
      var x = Math.max(0, Math.min(rect.width, pointerX - rect.left));
      var y = Math.max(0, Math.min(rect.height, pointerY - rect.top));
      var radius = Math.max(110, Math.min(190, rect.width * .13));
      lens.style.clipPath = 'circle(' + radius.toFixed(1) + 'px at ' + x.toFixed(1) + 'px ' + y.toFixed(1) + 'px)';
    }

    function moveLens(event) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(renderLens);
    }

    if (finePointer.matches) {
      scene.addEventListener('pointerenter', function (event) {
        moveLens(event);
        photo.classList.add('is-lens-active');
      }, { passive: true });
      scene.addEventListener('pointermove', moveLens, { passive: true });
      scene.addEventListener('pointerleave', function () {
        photo.classList.remove('is-lens-active');
      }, { passive: true });
      return;
    }

    scene.addEventListener('pointerdown', function (event) {
      moveLens(event);
      photo.classList.add('is-lens-active');
      window.clearTimeout(touchTimer);
      touchTimer = window.setTimeout(function () {
        photo.classList.remove('is-lens-active');
      }, 900);
    }, { passive: true });
  }

  function setupHeroFog() {
    var hero = document.querySelector('.hero');
    var backdrop = document.querySelector('.site-backdrop');
    if (!hero || !backdrop) return;

    var pointerX = window.innerWidth * 0.62;
    var pointerY = window.innerHeight * 0.34;
    var sceneX = 0;
    var sceneY = 0;
    var pointerFrame = 0;

    function motionEnabled() {
      return finePointer.matches && !reduceMotion.matches;
    }

    function renderPointer() {
      pointerFrame = 0;
      backdrop.style.setProperty('--g-fog-x', (pointerX + 24).toFixed(1) + 'px');
      backdrop.style.setProperty('--g-fog-y', (pointerY + 24).toFixed(1) + 'px');
      backdrop.style.setProperty('--g-scene-x', sceneX.toFixed(2) + 'px');
      backdrop.style.setProperty('--g-scene-y', sceneY.toFixed(2) + 'px');
    }

    function schedulePointer(event) {
      if (!motionEnabled()) return;
      var rect = hero.getBoundingClientRect();
      var relativeX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      var relativeY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      pointerX = event.clientX;
      pointerY = event.clientY;
      sceneX = (0.5 - relativeX) * 8;
      sceneY = (0.5 - relativeY) * 5;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointer);
    }

    function deactivateFog() {
      if (pointerFrame) {
        window.cancelAnimationFrame(pointerFrame);
        pointerFrame = 0;
      }
      document.body.classList.remove('hero-fog-active');
      backdrop.style.removeProperty('--g-scene-x');
      backdrop.style.removeProperty('--g-scene-y');
    }

    function syncMotionCapability() {
      var enabled = motionEnabled();
      document.body.classList.toggle('hero-motion-ready', enabled);
      if (!enabled) deactivateFog();
    }

    hero.addEventListener('pointerenter', function (event) {
      if (!motionEnabled()) return;
      document.body.classList.add('hero-fog-active');
      schedulePointer(event);
    }, { passive: true });
    hero.addEventListener('pointermove', schedulePointer, { passive: true });
    hero.addEventListener('pointerleave', deactivateFog, { passive: true });

    if (typeof finePointer.addEventListener === 'function') {
      finePointer.addEventListener('change', syncMotionCapability);
      reduceMotion.addEventListener('change', syncMotionCapability);
    } else if (typeof finePointer.addListener === 'function') {
      finePointer.addListener(syncMotionCapability);
      reduceMotion.addListener(syncMotionCapability);
    }

    syncMotionCapability();
  }

  function setupGardenRoute() {
    if (!gardenRoute) return;
    var links = Array.prototype.slice.call(gardenRoute.querySelectorAll('[data-route-link]'));
    gardenRouteItems = links.map(function (link) {
      var target = document.querySelector(link.getAttribute('href'));
      return target ? { link: link, target: target, top: 0 } : null;
    }).filter(Boolean);

    if (gardenRouteItems.length < 2) {
      gardenRoute.hidden = true;
      return;
    }

    refreshGardenRoute();
    updateScrollState();
  }

  function setupGardenWander() {
    var wander = document.querySelector('[data-garden-wander]');
    var pool = document.querySelector('[data-garden-wander-pool]');
    if (!wander || !pool) return;

    var paths = Array.prototype.slice.call(pool.querySelectorAll('[data-wander-path]')).map(function (item) {
      return item.dataset.wanderPath;
    }).filter(Boolean);
    if (!paths.length) return;

    wander.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();

      var lastPath = '';
      try { lastPath = window.sessionStorage.getItem('garden-last-wander') || ''; } catch (error) {}
      var currentPath = window.location.pathname;
      var candidates = paths.filter(function (path) {
        return path !== currentPath && (paths.length < 3 || path !== lastPath);
      });
      if (!candidates.length) candidates = paths.slice();

      var randomValue = Math.random();
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        var values = new Uint32Array(1);
        window.crypto.getRandomValues(values);
        randomValue = values[0] / 4294967296;
      }
      var destination = candidates[Math.floor(randomValue * candidates.length)];
      try { window.sessionStorage.setItem('garden-last-wander', destination); } catch (error) {}
      window.location.assign(destination);
    });
  }

  function setupPageTransitions() {
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-post-transition]'));
    if (!links.length || !window.CSS || !window.CSS.supports('view-transition-name: garden-post-title')) return;

    function clearTransitionSources() {
      document.querySelectorAll('.is-transition-source').forEach(function (item) {
        item.classList.remove('is-transition-source');
      });
    }

    links.forEach(function (link) {
      link.addEventListener('click', function (event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var title = link.querySelector('[data-post-transition-title]');
        if (!title) return;
        clearTransitionSources();
        title.classList.add('is-transition-source');
      });
    });

    window.addEventListener('pageshow', clearTransitionSources);
  }

  function setupHomeDepth() {
    var hero = document.querySelector('.is-home .hero');
    var identity = hero ? hero.querySelector('.hero-identity') : null;
    var orbit = hero ? hero.querySelector('.hero-orbit') : null;
    if (!hero || !identity || !orbit || !window.CSS || !window.CSS.supports('translate: 1px')) return;

    var frame = 0;
    var leaveTimer = 0;
    var targetX = 0;
    var targetY = 0;

    function enabled() {
      return finePointer.matches && !reduceMotion.matches;
    }

    function renderDepth() {
      frame = 0;
      identity.style.translate = (targetX * 9).toFixed(2) + 'px ' + (targetY * 7).toFixed(2) + 'px';
      orbit.style.translate = (targetX * -13).toFixed(2) + 'px ' + (targetY * -10).toFixed(2) + 'px';
    }

    function scheduleDepth(event) {
      if (!enabled()) return;
      var rect = hero.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
      targetY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
      identity.style.willChange = 'translate';
      orbit.style.willChange = 'translate';
      window.clearTimeout(leaveTimer);
      if (!frame) frame = window.requestAnimationFrame(renderDepth);
    }

    function resetDepth() {
      targetX = 0;
      targetY = 0;
      if (!frame) frame = window.requestAnimationFrame(renderDepth);
      leaveTimer = window.setTimeout(function () {
        identity.style.removeProperty('will-change');
        orbit.style.removeProperty('will-change');
      }, 650);
    }

    hero.addEventListener('pointermove', scheduleDepth, { passive: true });
    hero.addEventListener('pointerleave', resetDepth, { passive: true });
    reduceMotion.addEventListener('change', function () {
      if (!enabled()) resetDepth();
    });
  }

  function setupCardSpotlights() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-spotlight]'));
    if (!cards.length) return;

    function spotlightEnabled() {
      return finePointer.matches && !reduceMotion.matches;
    }

    function syncSpotlights() {
      var enabled = spotlightEnabled();
      document.body.classList.toggle('card-motion-ready', enabled);
      if (enabled) return;
      cards.forEach(function (card) {
        card.style.removeProperty('--spot-x');
        card.style.removeProperty('--spot-y');
      });
    }

    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        if (!spotlightEnabled()) return;
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', (event.clientX - rect.left).toFixed(1) + 'px');
        card.style.setProperty('--spot-y', (event.clientY - rect.top).toFixed(1) + 'px');
      }, { passive: true });
    });

    if (typeof finePointer.addEventListener === 'function') {
      finePointer.addEventListener('change', syncSpotlights);
      reduceMotion.addEventListener('change', syncSpotlights);
    } else if (typeof finePointer.addListener === 'function') {
      finePointer.addListener(syncSpotlights);
      reduceMotion.addListener(syncSpotlights);
    }

    syncSpotlights();
  }

  function setupArchiveFilter() {
    var input = document.getElementById('archive-filter-input');
    var list = document.getElementById('archive-list');
    var status = document.getElementById('archive-filter-status');
    var empty = document.getElementById('archive-filter-empty');
    if (!input || !list || !status || !empty) return;

    var posts = Array.prototype.slice.call(list.querySelectorAll('.archive-post'));
    var years = Array.prototype.slice.call(list.querySelectorAll('.archive-year'));

    function normalize(value) {
      var text = String(value || '');
      if (text.normalize) text = text.normalize('NFKC');
      return text.toLocaleLowerCase('zh-CN');
    }

    function filterPosts() {
      var terms = normalize(input.value).trim().split(/\s+/).filter(Boolean);
      var visibleCount = 0;

      posts.forEach(function (post) {
        var haystack = normalize(post.dataset.search);
        var matches = !terms.length || terms.every(function (term) {
          return haystack.indexOf(term) !== -1;
        });
        post.hidden = !matches;
        if (matches) visibleCount += 1;
      });

      years.forEach(function (year) {
        year.hidden = !year.querySelector('.archive-post:not([hidden])');
      });

      empty.hidden = visibleCount !== 0;
      status.textContent = terms.length
        ? '找到 ' + visibleCount + ' 篇文章'
        : '显示全部 ' + posts.length + ' 篇文章';
    }

    input.addEventListener('input', filterPosts);
    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !input.value) return;
      input.value = '';
      filterPosts();
    });
  }

  function setupReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!items.length || reduceMotion.matches || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -8% 0px'
    });

    items.forEach(function (item) {
      if (item.getBoundingClientRect().top <= window.innerHeight * 0.88) return;
      item.classList.add('reveal-ready');
      observer.observe(item);
    });

    if (typeof reduceMotion.addEventListener === 'function') {
      reduceMotion.addEventListener('change', function (event) {
        if (!event.matches) return;
        items.forEach(function (item) {
          item.classList.remove('reveal-ready');
          item.classList.add('reveal-visible');
          observer.unobserve(item);
        });
      }, { once: true });
    }
  }

  function gardenMotionIsLite() {
    return reduceMotion.matches || document.documentElement.classList.contains('garden-lite-motion');
  }

  function setupGardenBoot() {
    var root = document.documentElement;
    var boot = document.querySelector('[data-garden-boot]');
    if (!boot) return;

    var status = boot.querySelector('[data-boot-status]');
    var progressText = boot.querySelector('[data-boot-progress]');
    var progressBar = boot.querySelector('[data-boot-bar]');
    var enter = boot.querySelector('[data-boot-enter]');
    var lite = boot.querySelector('[data-motion-lite]');
    var startedAt = performance.now();
    var skipBoot = new URLSearchParams(window.location.search).has('skip-boot');
    var duration = skipBoot ? 1 : (reduceMotion.matches ? 180 : 1750);
    var finished = false;

    try {
      if (window.localStorage.getItem('garden-motion') === 'lite') root.classList.add('garden-lite-motion');
    } catch (error) {}

    if (skipBoot) {
      boot.hidden = true;
      root.classList.remove('garden-booting');
      return;
    }

    if (lite && root.classList.contains('garden-lite-motion')) lite.textContent = '恢复完整动效';

    boot.hidden = false;
    root.classList.add('garden-booting');

    function setProgress(value) {
      var rounded = Math.max(0, Math.min(100, Math.round(value)));
      if (progressText) progressText.textContent = String(rounded).padStart(2, '0');
      if (progressBar) progressBar.style.transform = 'scaleX(' + (rounded / 100).toFixed(3) + ')';
      if (!status) return;
      if (rounded < 28) status.textContent = '正在辨认花园里的痕迹';
      else if (rounded < 58) status.textContent = '把散落的句子接回原位';
      else if (rounded < 86) status.textContent = '唤醒窗口边上的猫';
      else status.textContent = '现场已接通';
    }

    function finish() {
      if (finished) return;
      finished = true;
      setProgress(100);
      root.classList.remove('garden-booting');
      boot.classList.add('is-leaving');
      window.setTimeout(function () {
        boot.hidden = true;
        if (!window.location.hash) return;
        var anchor = document.getElementById(window.location.hash.slice(1));
        if (!anchor) return;
        var previousScrollBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        anchor.scrollIntoView({ block: 'start' });
        window.requestAnimationFrame(function () { root.style.scrollBehavior = previousScrollBehavior; });
      }, reduceMotion.matches ? 20 : 520);
    }

    function tick(now) {
      if (finished) return;
      var linear = Math.min(1, (now - startedAt) / duration);
      var eased = 1 - Math.pow(1 - linear, 3);
      setProgress(eased * 100);
      if (linear >= 1) window.setTimeout(finish, reduceMotion.matches ? 0 : 230);
      else window.requestAnimationFrame(tick);
    }

    setProgress(0);
    window.requestAnimationFrame(tick);
    if (enter) enter.addEventListener('click', finish);
    if (lite) {
      lite.addEventListener('click', function () {
        if (root.classList.contains('garden-lite-motion')) {
          root.classList.remove('garden-lite-motion');
          try { window.localStorage.removeItem('garden-motion'); } catch (error) {}
          window.location.reload();
          return;
        }
        root.classList.add('garden-lite-motion');
        try { window.localStorage.setItem('garden-motion', 'lite'); } catch (error) {}
        finish();
      });
    }
    boot.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' || event.key === 'Enter') finish();
    });
  }

  function setupGardenHud() {
    var percent = document.querySelector('[data-hud-percent]');
    var progress = document.querySelector('[data-hud-progress]');
    var cpu = document.querySelector('[data-hud-cpu]');
    var mem = document.querySelector('[data-hud-mem]');
    if (!percent && !progress) return;
    var frame = 0;

    function render() {
      frame = 0;
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      var value = Math.max(0, Math.min(1, window.scrollY / max));
      if (percent) percent.textContent = String(Math.round(value * 100)).padStart(3, '0');
      if (progress) progress.style.transform = 'scaleY(' + value.toFixed(4) + ')';
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(render);
    }

    render();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.setInterval(function () {
      if (document.hidden) return;
      if (cpu) cpu.textContent = String(4 + Math.floor(Math.random() * 14)).padStart(2, '0');
      if (mem) mem.textContent = String(22 + Math.floor(Math.random() * 7)).padStart(2, '0');
    }, 1700);
  }

  function setupGardenCursor() {
    var root = document.documentElement;
    var cursor = document.querySelector('[data-garden-cursor]');
    if (!cursor || !finePointer.matches || gardenMotionIsLite()) return;
    var dot = cursor.querySelector('.garden-cursor-dot');
    var frameElement = cursor.querySelector('.garden-cursor-frame');
    var label = cursor.querySelector('span');
    if (!dot || !frameElement) return;

    var currentTarget = null;

    function placeFrame(x, y, width, height, targeting) {
      frameElement.style.width = width.toFixed(1) + 'px';
      frameElement.style.height = height.toFixed(1) + 'px';
      frameElement.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      if (label) label.style.transform = 'translate3d(' + (x + width + (targeting ? 7 : -10)).toFixed(1) + 'px,' + (y + 5).toFixed(1) + 'px,0)';
    }

    function updateTarget(element, pointerX, pointerY) {
      if (element && element === currentTarget) return;
      currentTarget = element;
      cursor.classList.toggle('is-targeting', Boolean(element));
      if (!element) {
        placeFrame(pointerX, pointerY, 30, 30, false);
        return;
      }
      var rect = element.getBoundingClientRect();
      placeFrame(rect.left - 5, rect.top - 5, rect.width + 10, rect.height + 10, true);
    }

    document.addEventListener('pointermove', function (event) {
      dot.style.transform = 'translate3d(' + event.clientX.toFixed(1) + 'px,' + event.clientY.toFixed(1) + 'px,0)';
      var hovered = event.target.closest ? event.target.closest('a, button, [data-cursor-target]') : null;
      updateTarget(hovered, event.clientX, event.clientY);
      cursor.classList.add('is-visible');
    }, { passive: true });
    document.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });
    document.documentElement.addEventListener('mouseleave', function () { cursor.classList.remove('is-visible'); });
    window.addEventListener('scroll', function () {
      if (!currentTarget) return;
      var rect = currentTarget.getBoundingClientRect();
      placeFrame(rect.left - 5, rect.top - 5, rect.width + 10, rect.height + 10, true);
    }, { passive: true });

    root.classList.add('garden-cursor-on');
  }

  function setupGardenRipples() {
    var layer = document.querySelector('[data-ripple-layer]');
    if (!layer || gardenMotionIsLite()) return;
    document.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      var ripple = document.createElement('span');
      ripple.className = 'garden-ripple';
      ripple.textContent = '[+]';
      ripple.style.left = event.clientX + 'px';
      ripple.style.top = event.clientY + 'px';
      layer.appendChild(ripple);
      window.setTimeout(function () { ripple.remove(); }, 760);
    });
  }

  function setupGardenScramble() {
    if (gardenMotionIsLite()) return;
    var alphabet = '!<>-_\\/[]{}—=+*^?#01';
    Array.prototype.forEach.call(document.querySelectorAll('[data-scramble]'), function (element) {
      var original = element.textContent.trim();
      if (!original) return;
      element.dataset.scrambleLabel = original;
      if (!element.getAttribute('aria-label')) element.setAttribute('aria-label', original);
      var timer = 0;

      element.addEventListener('pointerenter', function () {
        window.clearInterval(timer);
        var step = 0;
        var total = Math.max(8, original.length * 2);
        timer = window.setInterval(function () {
          var settled = Math.floor((step / total) * original.length);
          element.textContent = original.split('').map(function (character, index) {
            if (/\s/.test(character) || index < settled) return character;
            return alphabet[Math.floor(Math.random() * alphabet.length)];
          }).join('');
          step += 1;
          if (step > total) {
            window.clearInterval(timer);
            element.textContent = original;
          }
        }, 28);
      });
    });
  }

  function setupFolioOutro() {
    var outro = document.querySelector('[data-folio-outro]');
    if (!outro) return;
    var text = outro.querySelector('[data-outro-text]');
    var track = outro.querySelector('[data-outro-track]');
    var meter = outro.querySelector('[data-outro-meter]');
    var status = outro.querySelector('[data-outro-status]');
    var keeper = outro.querySelector('[data-outro-keeper]');
    var returnLink = outro.querySelector('.folio-outro-actions a');
    var target = text ? text.dataset.outroValue || text.textContent : '';
    var glyphs = '▒░▓/\\<>[]{}01?#';
    var models = [];
    var decodeFrame = 0;
    var physicsFrame = 0;
    var pointerFrame = 0;
    var settleFrame = 0;
    var dragFrame = 0;
    var dragRect = null;
    var pendingDragX = 0;
    var lastTunePercentage = -1;
    var statusTimer = 0;
    var pointerX = 0;
    var pointerY = 0;
    var previousX = 0;
    var previousY = 0;
    var previousTime = 0;
    var pointerVelocityX = 0;
    var pointerVelocityY = 0;
    var pointerEnergy = 0;
    var pointerActive = false;
    var dragging = false;
    var tune = 1;
    var scrambleTick = 0;
    var entered = false;
    var baseStatus = 'MOVE: REPEL // CLICK: IMPACT // DRAG: DETUNE';
    var keeperTimer = 0;

    function keeperPalette() {
      var light = document.documentElement.dataset.resolvedTheme === 'light';
      return light ? {
        outline: '#050806', deepest: '#0a0e0b', shadow: '#111813', cloth: '#18221b',
        mid: '#253229', edge: '#3b4a3f', scarf: '#203528', scarfLight: '#59735f',
        face: '#030504', faceShadow: '#080c09', hair: '#010201', eye: '#b9d8bd',
        leather: '#151a16', brass: '#655f49', glow: '#7ea886', light: '#dcebdd', boot: '#030504'
      } : {
        outline: '#010302', deepest: '#040705', shadow: '#0a100c', cloth: '#101812',
        mid: '#19251d', edge: '#2c3b30', scarf: '#1e3225', scarfLight: '#54715b',
        face: '#010201', faceShadow: '#050806', hair: '#000100', eye: '#c9e3cc',
        leather: '#101511', brass: '#696047', glow: '#96c29d', light: '#edf7ed', boot: '#010302'
      };
    }

    function keeperRect(context, x, y, width, height, color) {
      context.fillStyle = color;
      context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
    }

    function keeperPoly(context, points, color) {
      context.fillStyle = color;
      context.beginPath();
      points.forEach(function (point, index) {
        if (index) context.lineTo(Math.round(point[0]), Math.round(point[1]));
        else context.moveTo(Math.round(point[0]), Math.round(point[1]));
      });
      context.closePath();
      context.fill();
    }

    function drawKeeperLantern(context, x, y, palette) {
      keeperRect(context, x + 3, y - 5, 8, 2, palette.brass);
      keeperRect(context, x + 1, y - 3, 12, 3, palette.outline);
      keeperRect(context, x, y, 14, 16, palette.outline);
      keeperRect(context, x + 2, y + 2, 10, 11, palette.brass);
      keeperRect(context, x + 4, y + 3, 6, 9, palette.glow);
      keeperRect(context, x + 6, y + 4, 3, 7, palette.light);
      keeperRect(context, x + 2, y + 14, 10, 3, palette.deepest);
      keeperRect(context, x + 3, y + 1, 2, 12, palette.edge);
    }

    function drawKeeperCharacter(context, now) {
      if (!context || !keeperCanvas) return;
      var palette = keeperPalette();
      var pointing = outro.classList.contains('is-keeper-pointing');
      var walking = outro.classList.contains('is-keeper-walking');
      var startled = outro.classList.contains('is-keeper-startled');
      var settled = outro.classList.contains('is-keeper-settled');
      var watching = outro.classList.contains('is-keeper-watching') && !pointing;
      var turning = watching && Math.abs(keeperLookX) > .14;
      var walkFrame = Math.floor(now / 120) % 4;
      var reactionAge = Math.max(0, now - keeperReactionStart);
      var jump = startled ? -Math.round(Math.sin(Math.min(1, reactionAge / 680) * Math.PI) * 13) : 0;
      var squash = settled && reactionAge < 430 ? Math.sin(Math.min(1, reactionAge / 430) * Math.PI) : 0;
      var facing = pointing ? 1 : (turning ? (keeperLookX < 0 ? -1 : 1) : keeperFacing);
      var lookY = watching ? Math.max(-5, Math.min(5, Math.round(keeperLookY * 5))) : 0;
      var anchorX = 102;
      var groundY = 118 + jump;
      var bodyBob = walking ? (walkFrame % 2 ? -2 : 0) : 0;

      context.clearRect(0, 0, keeperCanvas.width, keeperCanvas.height);
      context.imageSmoothingEnabled = false;

      context.save();
      context.globalAlpha = startled ? .22 : .38;
      keeperPoly(context, startled ? [[92, 119], [112, 119], [116, 122], [88, 122]] : [[74, 117], [126, 117], [132, 122], [68, 122]], palette.outline);
      context.restore();

      context.save();
      context.translate(anchorX, groundY);
      context.scale(facing, 1);
      if (squash) context.scale(1 + squash * .06, 1 - squash * .1);

      var legSwing = walking ? (walkFrame < 2 ? 5 : -3) : 0;
      keeperRect(context, -13 + legSwing, -34, 11, 29, palette.outline);
      keeperRect(context, -10 + legSwing, -32, 6, 22, palette.shadow);
      keeperRect(context, -16 + legSwing, -7, 16, 7, palette.boot);
      keeperRect(context, 3 - legSwing, -34, 11, 29, palette.outline);
      keeperRect(context, 6 - legSwing, -32, 6, 22, palette.deepest);
      keeperRect(context, 1 - legSwing, -7, 17, 7, palette.boot);

      if (turning || pointing) {
        context.translate(4, 0);
        context.save();
        context.globalAlpha = pointing ? .26 : .18;
        keeperPoly(context, [[37, -72 + lookY], [78, -98 + lookY * 2], [78, -32 + lookY * 2], [37, -58 + lookY]], palette.glow);
        context.globalAlpha = pointing ? .24 : .13;
        keeperPoly(context, [[39, -69 + lookY], [78, -83 + lookY * 2], [78, -46 + lookY * 2], [39, -61 + lookY]], palette.light);
        context.restore();

        keeperPoly(context, [[-24, -84 + bodyBob], [-12, -90 + bodyBob], [4, -85 + bodyBob], [7, -43], [-5, -31], [-20, -36]], palette.outline);
        keeperPoly(context, [[-21, -81 + bodyBob], [-11, -86 + bodyBob], [1, -81 + bodyBob], [3, -45], [-6, -36], [-17, -40]], palette.cloth);
        keeperRect(context, -24, -78 + bodyBob, 8, 31, palette.leather);
        keeperRect(context, -22, -74 + bodyBob, 3, 23, palette.brass);
        keeperPoly(context, [[-4, -78], [5, -80], [15, -52], [9, -48], [2, -58]], palette.outline);
        keeperPoly(context, [[-1, -76], [4, -77], [12, -53], [9, -52]], palette.mid);
        keeperPoly(context, [[1, -79], [10, -80], [27, -69 + lookY], [25, -62 + lookY], [15, -64 + lookY]], palette.outline);
        keeperPoly(context, [[5, -76], [9, -76], [24, -67 + lookY], [23, -64 + lookY], [14, -67]], palette.edge);
        keeperRect(context, 24, -69 + lookY, 8, 8, palette.faceShadow);
        drawKeeperLantern(context, 31, -77 + lookY, palette);

        keeperPoly(context, [[-19, -112 + lookY], [-8, -120 + lookY], [9, -119 + lookY], [20, -107 + lookY], [22, -91 + lookY], [15, -82 + lookY], [-8, -82 + lookY], [-20, -91 + lookY]], palette.outline);
        keeperPoly(context, [[-15, -109 + lookY], [-7, -116 + lookY], [8, -115 + lookY], [16, -105 + lookY], [17, -93 + lookY], [11, -86 + lookY], [-7, -86 + lookY], [-16, -93 + lookY]], palette.cloth);
        keeperPoly(context, [[-10, -107 + lookY], [6, -111 + lookY], [16, -104 + lookY], [15, -91 + lookY], [5, -87 + lookY], [-7, -91 + lookY]], palette.deepest);
        keeperPoly(context, [[-9, -108 + lookY], [4, -113 + lookY], [13, -106 + lookY], [5, -105 + lookY], [-1, -101 + lookY]], palette.outline);
        context.save();
        context.globalAlpha = .26;
        keeperRect(context, 5, -103 + lookY, 11, 10, palette.glow);
        context.restore();
        keeperRect(context, 8, -100 + lookY, 5, 4, palette.eye);
        keeperRect(context, 14, -95 + lookY, 7, 4, palette.shadow);
        keeperRect(context, 18, -94 + lookY, 4, 2, palette.deepest);
        keeperPoly(context, [[-14, -88], [10, -90], [18, -83], [13, -77], [-9, -80]], palette.scarf);
        keeperRect(context, -8, -86, 20, 3, palette.scarfLight);
        keeperPoly(context, [[-12, -83], [-29, -76], [-33, -66], [-16, -71]], palette.scarf);
        keeperRect(context, -30, -73, 12, 3, palette.scarfLight);
        keeperRect(context, -3, -52, 11, 18, palette.deepest);
        keeperRect(context, 0, -48, 5, 9, palette.scarfLight);

        keeperRect(context, 25, -87 + lookY, 3, 3, palette.glow);
        keeperRect(context, 30, -93 + lookY, 2, 2, palette.light);
        keeperRect(context, 35, -87 + lookY, 2, 2, palette.glow);
      } else {
        var armSwing = walking ? (walkFrame < 2 ? 5 : -3) : 0;
        keeperRect(context, -24, -82 + bodyBob, 12, 38, palette.outline);
        keeperRect(context, -21, -78 + bodyBob, 7, 29, palette.leather);
        keeperRect(context, -19, -74 + bodyBob, 3, 22, palette.brass);
        keeperPoly(context, [[-21, -78 + bodyBob], [-13, -81 + bodyBob], [-13 + armSwing, -43], [-21 + armSwing, -41]], palette.outline);
        keeperPoly(context, [[-18, -75 + bodyBob], [-15, -76 + bodyBob], [-16 + armSwing, -46], [-19 + armSwing, -45]], palette.mid);
        keeperPoly(context, [[20, -78 + bodyBob], [13, -82 + bodyBob], [14 - armSwing, -43], [22 - armSwing, -41]], palette.outline);
        keeperPoly(context, [[17, -75 + bodyBob], [14, -77 + bodyBob], [17 - armSwing, -46], [20 - armSwing, -45]], palette.edge);
        keeperPoly(context, [[-18, -84 + bodyBob], [17, -84 + bodyBob], [24, -35], [12, -29], [5, -34], [-2, -29], [-9, -34], [-24, -35]], palette.outline);
        keeperPoly(context, [[-14, -81 + bodyBob], [13, -81 + bodyBob], [19, -39], [10, -34], [4, -39], [-2, -34], [-9, -39], [-19, -39]], palette.cloth);
        keeperPoly(context, [[-12, -78 + bodyBob], [-4, -81 + bodyBob], [-6, -40], [-13, -43]], palette.mid);
        keeperPoly(context, [[11, -79 + bodyBob], [14, -77 + bodyBob], [18, -40], [11, -38]], palette.shadow);
        keeperRect(context, -7, -67 + bodyBob, 14, 27, palette.deepest);
        keeperRect(context, -4, -62 + bodyBob, 8, 17, palette.shadow);
        keeperRect(context, -1, -56 + bodyBob, 4, 4, palette.scarfLight);

        keeperPoly(context, [[-21, -110 + lookY], [-11, -120 + lookY], [10, -120 + lookY], [21, -110 + lookY], [23, -91 + lookY], [15, -82 + lookY], [-15, -82 + lookY], [-23, -92 + lookY]], palette.outline);
        keeperPoly(context, [[-17, -108 + lookY], [-9, -116 + lookY], [9, -116 + lookY], [17, -107 + lookY], [18, -94 + lookY], [12, -87 + lookY], [-12, -87 + lookY], [-18, -94 + lookY]], palette.cloth);
        keeperRect(context, -13, -107 + lookY, 26, 17, palette.deepest);
        keeperPoly(context, [[-13, -108 + lookY], [-6, -114 + lookY], [11, -112 + lookY], [14, -104 + lookY], [7, -106 + lookY], [2, -101 + lookY], [-4, -105 + lookY], [-13, -101 + lookY]], palette.outline);
        context.save();
        context.globalAlpha = .22;
        keeperRect(context, -11 + Math.round(keeperLookX * 2), -102 + lookY, 9, 10, palette.glow);
        keeperRect(context, 2 + Math.round(keeperLookX * 2), -102 + lookY, 9, 10, palette.glow);
        context.restore();
        keeperRect(context, -8 + Math.round(keeperLookX * 2), -99 + lookY, 4, 4, palette.eye);
        keeperRect(context, 5 + Math.round(keeperLookX * 2), -99 + lookY, 4, 4, palette.eye);
        keeperRect(context, -4, -90 + lookY, 9, 3, palette.shadow);
        keeperPoly(context, [[-18, -88], [14, -89], [21, -82], [14, -75], [-13, -77], [-22, -82]], palette.scarf);
        keeperRect(context, -10, -85, 25, 3, palette.scarfLight);
        keeperPoly(context, [[14, -84], [31, -77], [28, -68], [12, -76]], palette.scarf);
        keeperRect(context, 16, -80, 11, 3, palette.scarfLight);
        drawKeeperLantern(context, 15 - armSwing, -44, palette);
      }
      context.restore();
    }

    function paintKeeper(now) {
      keeperFrame = 0;
      if (!keeperContext) return;
      drawKeeperCharacter(keeperContext, now);
      if (keeperVisible && !gardenMotionIsLite() && (
        outro.classList.contains('is-keeper-walking') ||
        outro.classList.contains('is-keeper-startled') ||
        outro.classList.contains('is-keeper-settled')
      )) keeperFrame = window.requestAnimationFrame(paintKeeper);
    }

    function startKeeperPaint() {
      if (!keeperFrame) keeperFrame = window.requestAnimationFrame(paintKeeper);
    }

    function reactKeeper(className, duration) {
      if (!keeper) return;
      window.clearTimeout(keeperTimer);
      outro.classList.remove('is-keeper-startled', 'is-keeper-settled');
      outro.classList.add(className);
      keeperTimer = window.setTimeout(function () {
        outro.classList.remove(className);
      }, duration || 520);
    }

    function buildTitle() {
      if (!text || !target) return;
      var fragment = document.createDocumentFragment();
      text.textContent = '';
      target.split('').forEach(function (character, index) {
        var glyph = document.createElement('span');
        glyph.className = 'folio-outro-glyph' + (/\s/.test(character) ? ' is-space' : '');
        glyph.textContent = /\s/.test(character) ? '\u00a0' : character;
        glyph.style.setProperty('--glyph-index', index);
        fragment.appendChild(glyph);
        models.push({
          element: glyph,
          character: character,
          baseX: 0,
          baseY: 0,
          x: 0,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          rotation: 0,
          rotationVelocity: 0
        });
      });
      text.appendChild(fragment);
    }

    function measureTitle() {
      models.forEach(function (model) {
        var rect = model.element.getBoundingClientRect();
        model.baseX = rect.left + rect.width / 2 - model.x;
        model.baseY = rect.top + rect.height / 2 - model.y;
      });
    }

    function applyCharacters(progress, randomize) {
      var resolved = Math.floor(Math.max(0, Math.min(1, progress)) * models.length);
      scrambleTick += randomize ? 1 : 0;
      models.forEach(function (model, index) {
        if (/\s/.test(model.character)) return;
        model.element.textContent = index < resolved || progress >= 1
          ? model.character
          : glyphs[(index * 7 + scrambleTick) % glyphs.length];
      });
    }

    function decode() {
      if (!models.length) return;
      window.cancelAnimationFrame(decodeFrame);
      var started = performance.now();
      var duration = 980;

      function render(now) {
        var progress = Math.min(1, (now - started) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        applyCharacters(eased, true);
        if (progress < 1) decodeFrame = window.requestAnimationFrame(render);
        else applyCharacters(1, false);
      }

      decodeFrame = window.requestAnimationFrame(render);
    }

    function setStatus(message, duration) {
      if (!status) return;
      window.clearTimeout(statusTimer);
      status.textContent = message;
      if (duration) {
        statusTimer = window.setTimeout(function () { status.textContent = baseStatus; }, duration);
      }
    }

    function setTune(value, randomize, lightweight) {
      tune = Math.max(0, Math.min(1, value));
      var percentage = Math.round(tune * 100);
      if (track) {
        var trackX = Math.max(0, (track.clientWidth - 7) * tune);
        var keeperX = 28 + Math.max(0, track.clientWidth - 56) * tune;
        track.style.setProperty('--outro-tune', tune.toFixed(3));
        track.style.setProperty('--outro-track-x', trackX.toFixed(1) + 'px');
        (keeper || outro).style.setProperty('--outro-keeper-x', keeperX.toFixed(1) + 'px');
        if (percentage !== lastTunePercentage) track.setAttribute('aria-valuenow', percentage);
      }
      if (percentage !== lastTunePercentage && meter) meter.textContent = 'SIGNAL ' + String(percentage).padStart(3, '0') + '%';
      lastTunePercentage = percentage;
      if (!lightweight) {
        applyCharacters(tune, randomize);
        schedulePhysics();
      }
    }

    function settleTune() {
      window.cancelAnimationFrame(settleFrame);
      var from = tune;
      var started = performance.now();
      var duration = 360;
      outro.classList.add('is-keeper-walking');

      function render(now) {
        var progress = Math.min(1, (now - started) / duration);
        var eased = 1 - Math.pow(1 - progress, 4);
        setTune(from + (1 - from) * eased, false, true);
        if (progress < 1) settleFrame = window.requestAnimationFrame(render);
        else {
          setTune(1, false, false);
          setStatus(baseStatus);
          outro.classList.remove('is-keeper-walking');
          reactKeeper('is-keeper-settled', 460);
        }
      }

      settleFrame = window.requestAnimationFrame(render);
    }

    function updateTune(clientX) {
      if (!track) return;
      var rect = dragRect || track.getBoundingClientRect();
      setTune((clientX - rect.left) / rect.width, false, true);
    }

    function flushDragTune() {
      dragFrame = 0;
      if (dragging) updateTune(pendingDragX);
    }

    function schedulePhysics() {
      if (!physicsFrame) physicsFrame = window.requestAnimationFrame(renderPhysics);
    }

    function renderPhysics() {
      physicsFrame = 0;
      var isMoving = false;
      var detune = 1 - tune;
      pointerEnergy *= .9;
      outro.style.setProperty('--outro-energy', Math.max(pointerEnergy, detune * .85).toFixed(3));

      models.forEach(function (model, index) {
        var targetX = dragging ? Math.sin((index + 1) * 1.67) * detune * 25 : 0;
        var targetY = dragging ? Math.cos((index + 1) * 1.31) * detune * 38 : 0;
        var targetRotation = dragging ? Math.sin((index + 2) * 1.13) * detune * 16 : 0;
        var forceX = (targetX - model.x) * .09;
        var forceY = (targetY - model.y) * .09;
        var rotationForce = (targetRotation - model.rotation) * .08;

        if (pointerActive && !dragging) {
          var dx = model.baseX + model.x - pointerX;
          var dy = model.baseY + model.y - pointerY;
          var distance = Math.sqrt(dx * dx + dy * dy) || 1;
          var radius = Math.max(130, Math.min(210, window.innerWidth * .16));
          if (distance < radius) {
            var falloff = Math.pow(1 - distance / radius, 2);
            var strength = falloff * (2.4 + pointerEnergy * 8.5);
            forceX += dx / distance * strength + pointerVelocityX * falloff * .035;
            forceY += dy / distance * strength + pointerVelocityY * falloff * .035;
            rotationForce += (index % 2 ? 1 : -1) * falloff * pointerEnergy * .75;
          }
        }

        model.velocityX = (model.velocityX + forceX) * .79;
        model.velocityY = (model.velocityY + forceY) * .79;
        model.rotationVelocity = (model.rotationVelocity + rotationForce) * .76;
        model.x += model.velocityX;
        model.y += model.velocityY;
        model.rotation += model.rotationVelocity;

        var stretch = Math.min(.075, (Math.abs(model.velocityX) + Math.abs(model.velocityY)) * .0045);
        model.element.style.transform = 'translate3d(' + model.x.toFixed(2) + 'px,' + model.y.toFixed(2) + 'px,0) rotate(' + model.rotation.toFixed(2) + 'deg) scale(' + (1 + stretch).toFixed(3) + ',' + (1 - stretch * .55).toFixed(3) + ')';
        if (Math.abs(model.x) + Math.abs(model.y) + Math.abs(model.velocityX) + Math.abs(model.velocityY) + Math.abs(model.rotation) > .08) isMoving = true;
      });

      if (dragging || isMoving || pointerEnergy > .01) schedulePhysics();
    }

    function createImpact(clientX, clientY) {
      var rect = outro.getBoundingClientRect();
      var pulse = document.createElement('span');
      var localX = clientX - rect.left;
      var localY = clientY - rect.top;
      pulse.className = 'folio-outro-pulse';
      pulse.style.left = localX.toFixed(1) + 'px';
      pulse.style.top = localY.toFixed(1) + 'px';
      pulse.setAttribute('aria-hidden', 'true');
      outro.appendChild(pulse);
      pulse.addEventListener('animationend', function () { pulse.remove(); }, { once: true });

      measureTitle();
      models.forEach(function (model, index) {
        var dx = model.baseX - clientX;
        var dy = model.baseY - clientY;
        var distance = Math.sqrt(dx * dx + dy * dy) || 1;
        var falloff = Math.max(0, 1 - distance / 760);
        var angleX = distance < 2 ? Math.cos(index * 1.7) : dx / distance;
        var angleY = distance < 2 ? Math.sin(index * 1.7) : dy / distance;
        model.velocityX += angleX * falloff * 18;
        model.velocityY += angleY * falloff * 13 - falloff * 2;
        model.rotationVelocity += (index % 2 ? 1 : -1) * falloff * 2.2;
      });
      pointerEnergy = 1;
      setStatus('FIELD.IMPACT: X' + Math.round(localX) + ' / Y' + Math.round(localY), 1100);
      reactKeeper('is-keeper-startled', 720);
      schedulePhysics();
    }

    function renderPointer() {
      pointerFrame = 0;
      var rect = outro.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var localX = Math.max(0, Math.min(rect.width, pointerX - rect.left));
      var localY = Math.max(0, Math.min(rect.height, pointerY - rect.top));
      var nx = localX / rect.width - .5;
      var ny = localY / rect.height - .5;
      var orbitSize = Math.max(150, Math.min(240, rect.width * .18));
      outro.style.setProperty('--outro-parallax-x', (nx * 38).toFixed(1) + 'px');
      outro.style.setProperty('--outro-parallax-y', (ny * 18).toFixed(1) + 'px');
      outro.style.setProperty('--outro-title-x', (nx * 10).toFixed(1) + 'px');
      outro.style.setProperty('--outro-title-y', (ny * 6).toFixed(1) + 'px');
      outro.style.setProperty('--outro-orbit-x', (localX - orbitSize / 2).toFixed(1) + 'px');
      outro.style.setProperty('--outro-orbit-y', (localY - orbitSize / 2).toFixed(1) + 'px');
    }

    function resetPointer() {
      var rect = outro.getBoundingClientRect();
      pointerX = rect.left + rect.width / 2;
      pointerY = rect.top + rect.height / 2;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointer);
    }

    buildTitle();
    setTune(tune, false);

    if (gardenMotionIsLite()) {
      outro.classList.add('is-visible');
      applyCharacters(1, false);
      if (track) {
        track.removeAttribute('role');
        track.removeAttribute('tabindex');
        track.removeAttribute('aria-valuemin');
        track.removeAttribute('aria-valuemax');
        track.removeAttribute('aria-valuenow');
      }
      return;
    }

    outro.classList.add('is-interactive');
    outro.addEventListener('click', function (event) {
      if (event.target.closest('a, [data-outro-track]')) return;
      createImpact(event.clientX, event.clientY);
    });

    if (finePointer.matches) {
      outro.addEventListener('pointerenter', function (event) {
        pointerActive = true;
        pointerX = event.clientX;
        pointerY = event.clientY;
        previousX = pointerX;
        previousY = pointerY;
        previousTime = performance.now();
        measureTitle();
        outro.classList.add('is-pointer-in');
        outro.classList.add('is-keeper-watching');
        if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointer);
        schedulePhysics();
      });
      outro.addEventListener('pointermove', function (event) {
        if (dragging) return;
        if (!dragging) pointerActive = true;
        var now = performance.now();
        var elapsed = Math.max(8, now - previousTime);
        pointerVelocityX = (event.clientX - previousX) / elapsed * 16.67;
        pointerVelocityY = (event.clientY - previousY) / elapsed * 16.67;
        pointerEnergy = Math.min(1, Math.sqrt(pointerVelocityX * pointerVelocityX + pointerVelocityY * pointerVelocityY) / 28);
        pointerX = event.clientX;
        pointerY = event.clientY;
        previousX = pointerX;
        previousY = pointerY;
        previousTime = now;
        if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointer);
        schedulePhysics();
      }, { passive: true });
      outro.addEventListener('pointerleave', function () {
        pointerActive = false;
        pointerEnergy = 0;
        outro.classList.remove('is-pointer-in');
        outro.classList.remove('is-keeper-watching');
        resetPointer();
        schedulePhysics();
      });
      resetPointer();
    }

    if (track) {
      track.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        window.cancelAnimationFrame(settleFrame);
        dragging = true;
        pointerActive = false;
        dragRect = track.getBoundingClientRect();
        pendingDragX = event.clientX;
        outro.classList.add('is-tuning');
        setStatus('FIELD.TUNE // RELEASE TO RESOLVE');
        updateTune(event.clientX);
      });
      window.addEventListener('pointermove', function (event) {
        if (!dragging) return;
        pendingDragX = event.clientX;
        if (!dragFrame) dragFrame = window.requestAnimationFrame(flushDragTune);
      }, { passive: true });
      window.addEventListener('pointerup', function () {
        if (!dragging) return;
        window.cancelAnimationFrame(dragFrame);
        dragFrame = 0;
        updateTune(pendingDragX);
        dragging = false;
        dragRect = null;
        pointerActive = finePointer.matches;
        outro.classList.remove('is-tuning');
        settleTune();
      });
      window.addEventListener('pointercancel', function () {
        if (!dragging) return;
        window.cancelAnimationFrame(dragFrame);
        dragFrame = 0;
        dragging = false;
        dragRect = null;
        outro.classList.remove('is-tuning');
        settleTune();
      });
      track.addEventListener('keydown', function (event) {
        var next = tune;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next -= .1;
        else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next += .1;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = 1;
        else return;
        event.preventDefault();
        window.cancelAnimationFrame(settleFrame);
        dragging = true;
        outro.classList.add('is-tuning');
        outro.classList.add('is-keeper-walking');
        setTune(next, true);
        dragging = false;
        window.clearTimeout(track._settleTimer);
        track._settleTimer = window.setTimeout(function () {
          outro.classList.remove('is-tuning');
          settleTune();
        }, 360);
      });
    }

    if (returnLink) {
      if (finePointer.matches) {
        returnLink.addEventListener('pointerenter', function () { outro.classList.add('is-keeper-pointing'); });
        returnLink.addEventListener('pointerleave', function () { outro.classList.remove('is-keeper-pointing'); });
      }
      returnLink.addEventListener('focus', function () { outro.classList.add('is-keeper-pointing'); });
      returnLink.addEventListener('blur', function () { outro.classList.remove('is-keeper-pointing'); });
    }

    window.addEventListener('resize', function () {
      measureTitle();
      setTune(tune, false);
    }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureTitle);

    if (!('IntersectionObserver' in window)) {
      outro.classList.add('is-visible');
      applyCharacters(1, false);
      measureTitle();
      return;
    }

    outro.classList.add('is-motion-ready');
    applyCharacters(0, true);
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > .16) {
          if (entered) return;
          entered = true;
          outro.classList.add('is-visible');
          decode();
          window.requestAnimationFrame(measureTitle);
          return;
        }
        if (!entry.isIntersecting) {
          entered = false;
          outro.classList.remove('is-visible');
          applyCharacters(0, true);
        }
      });
    }, { threshold: [0, .16, .35], rootMargin: '0px 0px -5% 0px' });
    observer.observe(outro);
  }

  function setupFolioEclipse() {
    var outro = document.querySelector('[data-folio-outro]');
    var eclipse = outro && outro.querySelector('[data-outro-eclipse]');
    var trigger = eclipse && eclipse.querySelector('[data-outro-return]');
    var text = outro && outro.querySelector('[data-outro-text]');
    if (!outro || !eclipse || !trigger) return;
    var frame = 0;
    var pointerX = 0;
    var pointerY = 0;
    var entered = false;

    function buildTitle() {
      if (!text || text.children.length) return;
      var value = text.dataset.outroValue || text.textContent;
      var fragment = document.createDocumentFragment();
      value.split('').forEach(function (character) {
        var glyph = document.createElement('span');
        glyph.className = 'folio-outro-glyph' + (/\s/.test(character) ? ' is-space' : '');
        glyph.textContent = /\s/.test(character) ? '\u00a0' : character;
        fragment.appendChild(glyph);
      });
      text.textContent = '';
      text.appendChild(fragment);
    }

    function renderPointer() {
      frame = 0;
      var rect = eclipse.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var nx = Math.max(-1, Math.min(1, (pointerX - (rect.left + rect.width / 2)) / (rect.width / 2)));
      var ny = Math.max(-1, Math.min(1, (pointerY - (rect.top + rect.height / 2)) / (rect.height / 2)));
      trigger.style.setProperty('--eclipse-x', (nx * 7).toFixed(2) + 'px');
      trigger.style.setProperty('--eclipse-y', (ny * 5).toFixed(2) + 'px');
      trigger.style.setProperty('--eclipse-tilt', (nx * 3.5).toFixed(2) + 'deg');
    }

    function resetPointer() {
      trigger.style.setProperty('--eclipse-x', '0px');
      trigger.style.setProperty('--eclipse-y', '0px');
      trigger.style.setProperty('--eclipse-tilt', '0deg');
    }

    buildTitle();

    if (!gardenMotionIsLite() && finePointer.matches) {
      eclipse.addEventListener('pointermove', function (event) {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!frame) frame = window.requestAnimationFrame(renderPointer);
      }, { passive: true });
      eclipse.addEventListener('pointerleave', resetPointer);
    }

    trigger.addEventListener('click', function () {
      if (outro.classList.contains('is-eclipse-closing')) return;
      outro.classList.add('is-eclipse-closing');
      window.setTimeout(function () {
        var start = document.querySelector('#hello');
        if (start) start.scrollIntoView({ behavior: gardenMotionIsLite() ? 'auto' : 'smooth', block: 'start' });
        else window.scrollTo({ top: 0, behavior: gardenMotionIsLite() ? 'auto' : 'smooth' });
      }, gardenMotionIsLite() ? 0 : 260);
      window.setTimeout(function () { outro.classList.remove('is-eclipse-closing'); }, 760);
    });

    if (!('IntersectionObserver' in window) || gardenMotionIsLite()) {
      outro.classList.add('is-visible');
      return;
    }

    outro.classList.add('is-motion-ready');
    new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || entry.intersectionRatio < .18 || entered) return;
        entered = true;
        outro.classList.add('is-visible');
        observer.unobserve(outro);
      });
    }, { threshold: [.18, .4] }).observe(outro);
  }

  function setupPixelOutro() {
    var outro = document.querySelector('[data-folio-outro]');
    var vista = outro && outro.querySelector('[data-pixel-outro]');
    var screen = vista && vista.querySelector('[data-pixel-lamp]');
    if (!outro || !vista || !screen) return;
    var moon = screen.querySelector('.pixel-moon');
    var ridges = screen.querySelectorAll('.pixel-ridge');
    var beam = screen.querySelector('.pixel-beam');
    var beamFocus = screen.querySelector('.pixel-beam-focus');
    var boatBody = screen.querySelector('.pixel-boat > i');
    var boatLight = screen.querySelector('.pixel-boat > i > em');
    var lampLight = screen.querySelector('.pixel-lighthouse > i');
    var reflection = screen.querySelector('.pixel-reflection');
    var bleedSky = vista.querySelector('.folio-pixel-bleed-sky');
    var bleedBeam = vista.querySelector('.folio-pixel-bleed-beam');
    var bleedWaterLines = vista.querySelectorAll('.folio-pixel-bleed-water > i, .folio-pixel-bleed-water > b, .folio-pixel-bleed-water > em');
    var rain = screen.querySelector('.pixel-rain');
    var frame = 0;
    var pointerX = 0;
    var pointerY = 0;
    var entered = false;
    var boatReaction = null;
    var signalActive = false;
    var signalQueue = 0;
    var signalFinishTimer = 0;
    var signalReplyTimer = 0;
    var signalAnimations = [];
    var bleedPulses = [];
    var bleedBeamFrame = 0;

    function getZone(x, y) {
      var moonX = (x - .185) / .105;
      var moonY = (y - .19) / .13;
      if (moonX * moonX + moonY * moonY < 1) return 'moon';
      if (x > .73 && y > .3 && y < .79) return 'lamp';
      if (y > .62) return 'water';
      return 'sky';
    }

    function renderPointer() {
      frame = 0;
      var rect = screen.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var nx = Math.max(-1, Math.min(1, (pointerX - (rect.left + rect.width / 2)) / (rect.width / 2)));
      var ny = Math.max(-1, Math.min(1, (pointerY - (rect.top + rect.height / 2)) / (rect.height / 2)));
      if (moon) moon.style.transform = 'translate3d(' + (nx * -2.4).toFixed(2) + 'px,' + (ny * -1.6).toFixed(2) + 'px,0)';
      Array.prototype.forEach.call(ridges, function (ridge, index) {
        ridge.style.transform = 'translate3d(' + (nx * (index ? -1.1 : -1.8)).toFixed(2) + 'px,' + (ny * (index ? -.45 : -.7)).toFixed(2) + 'px,0)';
      });

      var localX = Math.max(0, Math.min(1, (pointerX - rect.left) / rect.width));
      var localY = Math.max(0, Math.min(1, (pointerY - rect.top) / rect.height));
      screen.dataset.pixelZone = getZone(localX, localY);
      if (beam && lampLight && !screen.classList.contains('is-lamp-off') && !signalActive) {
        var lampRect = lampLight.getBoundingClientRect();
        var lighthouseX = lampRect.left + lampRect.width / 2;
        var lighthouseY = lampRect.top + lampRect.height / 2;
        var angle = Math.atan2(lighthouseY - pointerY, lighthouseX - pointerX) * 180 / Math.PI;
        angle = Math.max(-18, Math.min(18, angle));
        beam.style.transform = 'rotate(' + angle.toFixed(2) + 'deg) scaleX(1)';
        screen.classList.add('is-aiming');
        if (beamFocus) {
          var focusY = Math.max(rect.height * .68, Math.min(rect.height * .89, pointerY - rect.top));
          beamFocus.style.transform = 'translate3d(' + (pointerX - rect.left).toFixed(1) + 'px,' + focusY.toFixed(1) + 'px,0)';
        }
      }
    }

    function resetPointer() {
      if (moon) moon.style.transform = 'translate3d(0,0,0)';
      Array.prototype.forEach.call(ridges, function (ridge) { ridge.style.transform = 'translate3d(0,0,0)'; });
      if (beam) beam.style.removeProperty('transform');
      if (beamFocus) beamFocus.style.transform = 'translate3d(-100px,-100px,0)';
      screen.classList.remove('is-aiming');
      delete screen.dataset.pixelZone;
    }

    function animateEffect(element, keyframes, options, fallback) {
      var removed = false;
      function remove() {
        if (removed) return;
        removed = true;
        element.remove();
      }
      if (typeof element.animate === 'function') {
        var animation = element.animate(keyframes, options);
        animation.finished.then(remove, remove);
      }
      window.setTimeout(remove, fallback);
    }

    function nudgeBoat(x) {
      if (!boatBody || gardenMotionIsLite() || typeof boatBody.animate !== 'function') return;
      if (boatReaction) boatReaction.cancel();
      var direction = x < .5 ? 1 : -1;
      var reaction = boatBody.animate([
        { transform: 'translate3d(0,0,0) rotate(0deg)', offset: 0 },
        { transform: 'translate3d(' + (direction * 4) + 'px,-4px,0) rotate(' + (direction * 4) + 'deg)', offset: .34 },
        { transform: 'translate3d(' + (direction * -2) + 'px,2px,0) rotate(' + (direction * -2) + 'deg)', offset: .7 },
        { transform: 'translate3d(0,0,0) rotate(0deg)', offset: 1 }
      ], { duration: 440, easing: 'steps(6, end)' });
      boatReaction = reaction;
      reaction.finished.then(function () {
        if (boatReaction === reaction) boatReaction = null;
      }, function () {
        if (boatReaction === reaction) boatReaction = null;
      });
    }

    function pulseBleedWater() {
      if (!bleedWaterLines.length || gardenMotionIsLite()) return;
      bleedPulses.forEach(function (animation) { animation.cancel(); });
      bleedPulses = [];
      Array.prototype.forEach.call(bleedWaterLines, function (line, index) {
        if (typeof line.animate !== 'function') return;
        bleedPulses.push(line.animate([
          { opacity: .22, transform: 'scaleX(.48)', offset: 0 },
          { opacity: .92, transform: 'scaleX(1.16)', offset: .48 },
          { opacity: .34, transform: 'scaleX(.82)', offset: 1 }
        ], { duration: 560 + index * 70, delay: index * 55, easing: 'steps(7, end)' }));
      });
    }

    function alignBleedBeam() {
      bleedBeamFrame = 0;
      if (!bleedBeam || !lampLight) return;
      var bleed = bleedBeam.parentElement;
      var bleedRect = bleed.getBoundingClientRect();
      var lampRect = lampLight.getBoundingClientRect();
      var beamHeight = bleedBeam.offsetHeight;
      if (!bleedRect.width || !beamHeight) return;
      var originX = lampRect.left + lampRect.width / 2 - bleedRect.left;
      var originY = lampRect.top + lampRect.height / 2 - bleedRect.top;
      bleedBeam.style.left = originX.toFixed(1) + 'px';
      bleedBeam.style.top = (originY - beamHeight / 2).toFixed(1) + 'px';
      bleedBeam.style.width = Math.max(96, bleedRect.width - originX + 24).toFixed(1) + 'px';
    }

    function queueBleedBeamAlignment() {
      if (!bleedBeamFrame) bleedBeamFrame = window.requestAnimationFrame(alignBleedBeam);
    }

    function createRipple(x, y, reactToBoat) {
      if (gardenMotionIsLite()) return;
      var ripple = document.createElement('span');
      ripple.className = 'pixel-click-ripple';
      ripple.style.left = (x * 100).toFixed(2) + '%';
      ripple.style.top = (Math.max(.68, y) * 100).toFixed(2) + '%';
      ripple.setAttribute('aria-hidden', 'true');
      screen.appendChild(ripple);
      animateEffect(ripple, [
        { opacity: .88, transform: 'scale(.72)', offset: 0 },
        { opacity: .62, transform: 'scale(1.28)', offset: .36 },
        { opacity: 0, transform: 'scale(3.1)', offset: 1 }
      ], { duration: 680, easing: 'steps(7, end)', fill: 'forwards' }, 820);
      pulseBleedWater();
      if (reactToBoat !== false) nudgeBoat(x);
    }

    function createMeteor(x, y) {
      if (gardenMotionIsLite()) return;
      var meteor = document.createElement('span');
      meteor.className = 'pixel-meteor';
      meteor.style.left = (Math.min(.72, x) * 100).toFixed(2) + '%';
      meteor.style.top = (Math.min(.48, y) * 100).toFixed(2) + '%';
      meteor.setAttribute('aria-hidden', 'true');
      screen.appendChild(meteor);
      animateEffect(meteor, [
        { opacity: 1, transform: 'translate3d(0,0,0)', offset: 0 },
        { opacity: 1, transform: 'translate3d(52px,27px,0)', offset: .72 },
        { opacity: 0, transform: 'translate3d(74px,38px,0)', offset: 1 }
      ], { duration: 520, easing: 'steps(7, end)', fill: 'forwards' }, 720);
    }

    function createLightning(x) {
      if (gardenMotionIsLite()) return;
      var lightning = document.createElement('span');
      var flash = document.createElement('span');
      lightning.className = 'pixel-lightning';
      flash.className = 'pixel-sky-flash';
      lightning.style.left = (Math.max(.08, Math.min(.68, x)) * 100).toFixed(2) + '%';
      lightning.style.top = '7%';
      lightning.setAttribute('aria-hidden', 'true');
      flash.setAttribute('aria-hidden', 'true');
      screen.appendChild(flash);
      screen.appendChild(lightning);
      animateEffect(lightning, [
        { opacity: 0, transform: 'scaleY(.92)', offset: 0 },
        { opacity: 1, transform: 'scaleY(1)', offset: .1 },
        { opacity: .18, transform: 'scaleY(1)', offset: .36 },
        { opacity: 1, transform: 'scaleY(1)', offset: .5 },
        { opacity: 0, transform: 'scaleY(1)', offset: 1 }
      ], { duration: 440, easing: 'steps(5, end)', fill: 'forwards' }, 600);
      animateEffect(flash, [
        { opacity: 0, transform: 'scale(1)', offset: 0 },
        { opacity: .8, transform: 'scale(1)', offset: .12 },
        { opacity: .08, transform: 'scale(1)', offset: .4 },
        { opacity: .46, transform: 'scale(1)', offset: .52 },
        { opacity: 0, transform: 'scale(1)', offset: 1 }
      ], { duration: 360, easing: 'steps(4, end)', fill: 'forwards' }, 520);
      if (rain && typeof rain.animate === 'function') {
        rain.animate([
          { opacity: .2, transform: 'translate3d(0,-16px,0)' },
          { opacity: .52, transform: 'translate3d(-5px,2px,0)' },
          { opacity: .2, transform: 'translate3d(-10px,18px,0)' }
        ], { duration: 460, easing: 'steps(5, end)' });
      }
      if (bleedSky && typeof bleedSky.animate === 'function') {
        bleedSky.animate([
          { opacity: .16, transform: 'scale(1)' },
          { opacity: .88, transform: 'scale(1)' },
          { opacity: .22, transform: 'scale(1)' },
          { opacity: .64, transform: 'scale(1)' },
          { opacity: .16, transform: 'scale(1)' }
        ], { duration: 360, easing: 'steps(4, end)' });
      }
      nudgeBoat(x);
    }

    function createMoonPulse() {
      if (gardenMotionIsLite()) return;
      var pulse = document.createElement('span');
      pulse.className = 'pixel-click-ripple pixel-moon-pulse';
      pulse.style.left = '18.5%';
      pulse.style.top = '19%';
      pulse.setAttribute('aria-hidden', 'true');
      screen.appendChild(pulse);
      animateEffect(pulse, [
        { opacity: .82, transform: 'scale(.82)' },
        { opacity: 0, transform: 'scale(2.6)' }
      ], { duration: 520, easing: 'steps(6, end)', fill: 'forwards' }, 680);
    }

    function updateLabel() {
      var weather = screen.classList.contains('is-clear') ? '晴夜' : '雨夜';
      var lamp = signalActive ? '灯塔正在呼叫' : '灯塔等待呼叫';
      screen.setAttribute('aria-label', '交互像素' + weather + '，' + lamp + '；月亮、天空、湖面与灯塔均可点击');
    }

    function toggleWeather() {
      screen.classList.toggle('is-clear');
      vista.classList.toggle('is-clear', screen.classList.contains('is-clear'));
      createMoonPulse();
      updateLabel();
    }

    function trackSignalAnimation(element, keyframes, options) {
      if (!element || typeof element.animate !== 'function') return;
      signalAnimations.push(element.animate(keyframes, options));
    }

    function clearSignalAnimations() {
      signalAnimations.forEach(function (animation) { animation.cancel(); });
      signalAnimations = [];
    }

    function finishLighthouseSignal() {
      window.clearTimeout(signalReplyTimer);
      signalActive = false;
      screen.classList.remove('is-signal-active', 'is-signal-response', 'is-signal-queued');
      vista.classList.remove('is-signal-active', 'is-signal-response', 'is-signal-queued');
      screen.classList.add('is-lamp-off');
      clearSignalAnimations();
      updateLabel();
      if (signalQueue > 0) {
        signalQueue -= 1;
        signalFinishTimer = window.setTimeout(startLighthouseSignal, 120);
      }
    }

    function startLighthouseSignal() {
      if (signalActive) {
        signalQueue = Math.min(2, signalQueue + 1);
        screen.classList.add('is-signal-queued');
        vista.classList.add('is-signal-queued');
        return;
      }
      if (gardenMotionIsLite() || !beam || typeof beam.animate !== 'function') {
        screen.classList.toggle('is-lamp-off');
        updateLabel();
        return;
      }

      window.clearTimeout(signalFinishTimer);
      clearSignalAnimations();
      signalActive = true;
      alignBleedBeam();
      screen.classList.remove('is-lamp-off', 'is-aiming', 'is-signal-response', 'is-signal-queued');
      screen.classList.add('is-signal-active');
      vista.classList.remove('is-signal-response', 'is-signal-queued');
      vista.classList.add('is-signal-active');
      beam.style.removeProperty('transform');
      updateLabel();

      trackSignalAnimation(lampLight, [
        { opacity: .72, transform: 'scale(.96)', offset: 0 },
        { opacity: .58, transform: 'scale(.9)', offset: .08 },
        { opacity: 1, transform: 'scale(1.14)', offset: .18 },
        { opacity: .82, transform: 'scale(1)', offset: .28 },
        { opacity: 1, transform: 'scale(1.08)', offset: .54 },
        { opacity: .76, transform: 'scale(1)', offset: .63 },
        { opacity: 1, transform: 'scale(1.08)', offset: .83 },
        { opacity: .72, transform: 'scale(.96)', offset: 1 }
      ], { duration: 1900, easing: 'steps(16, end)', fill: 'both' });

      trackSignalAnimation(beam, [
        { opacity: 0, transform: 'rotate(-14deg) scaleX(.72)', offset: 0 },
        { opacity: .58, transform: 'rotate(-14deg) scaleX(.94)', offset: .18 },
        { opacity: .64, transform: 'rotate(10deg) scaleX(1)', offset: .56 },
        { opacity: .46, transform: 'rotate(-3deg) scaleX(.98)', offset: .8 },
        { opacity: 0, transform: 'rotate(-3deg) scaleX(.86)', offset: 1 }
      ], { duration: 1900, easing: 'steps(18, end)', fill: 'both' });

      trackSignalAnimation(reflection, [
        { opacity: 0, transform: 'scaleY(.72)', offset: 0 },
        { opacity: 0, transform: 'scaleY(.72)', offset: .34 },
        { opacity: .72, transform: 'scaleY(1.1)', offset: .57 },
        { opacity: .34, transform: 'scaleY(.9)', offset: .8 },
        { opacity: 0, transform: 'scaleY(.76)', offset: 1 }
      ], { duration: 1900, easing: 'steps(14, end)', fill: 'both' });

      trackSignalAnimation(boatLight, [
        { opacity: .16, transform: 'scale(.94)', offset: 0 },
        { opacity: .16, transform: 'scale(.94)', offset: .5 },
        { opacity: 1, transform: 'scale(1.7)', offset: .57 },
        { opacity: .16, transform: 'scale(.94)', offset: .64 },
        { opacity: 1, transform: 'scale(1.45)', offset: .73 },
        { opacity: .16, transform: 'scale(.94)', offset: .82 },
        { opacity: .16, transform: 'scale(.94)', offset: 1 }
      ], { duration: 1900, easing: 'steps(10, end)', fill: 'both' });

      trackSignalAnimation(boatBody, [
        { transform: 'translate3d(0,0,0) rotate(0deg)', offset: 0 },
        { transform: 'translate3d(0,0,0) rotate(0deg)', offset: .48 },
        { transform: 'translate3d(3px,-3px,0) rotate(3deg)', offset: .59 },
        { transform: 'translate3d(-2px,2px,0) rotate(-2deg)', offset: .72 },
        { transform: 'translate3d(0,0,0) rotate(0deg)', offset: .9 },
        { transform: 'translate3d(0,0,0) rotate(0deg)', offset: 1 }
      ], { duration: 1900, easing: 'steps(12, end)', fill: 'both' });

      signalReplyTimer = window.setTimeout(function () {
        if (!signalActive) return;
        screen.classList.add('is-signal-response');
        vista.classList.add('is-signal-response');
        createRipple(.29, .75, false);
      }, 1060);
      signalFinishTimer = window.setTimeout(finishLighthouseSignal, 1900);
    }

    function triggerLighthouseSignal(keyboardInitiated) {
      if (!keyboardInitiated) {
        startLighthouseSignal();
        return;
      }
      if (signalActive) return;
      screen.classList.add('is-keyboard-change');
      screen.classList.toggle('is-lamp-off');
      updateLabel();
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { screen.classList.remove('is-keyboard-change'); });
      });
    }

    if (!gardenMotionIsLite() && finePointer.matches) {
      screen.addEventListener('pointermove', function (event) {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!frame) frame = window.requestAnimationFrame(renderPointer);
      }, { passive: true });
      screen.addEventListener('pointerleave', resetPointer);
    }

    screen.addEventListener('click', function (event) {
      if (!event.detail) {
        triggerLighthouseSignal(true);
        return;
      }
      var rect = screen.getBoundingClientRect();
      var x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      var y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      var zone = getZone(x, y);
      if (zone === 'moon') toggleWeather();
      else if (zone === 'lamp') triggerLighthouseSignal(false);
      else if (zone === 'water') createRipple(x, y);
      else if (screen.classList.contains('is-clear')) createMeteor(x, y);
      else createLightning(x);
    });

    alignBleedBeam();
    window.addEventListener('resize', queueBleedBeamAlignment, { passive: true });
    updateLabel();

    if (!('IntersectionObserver' in window) || gardenMotionIsLite()) {
      outro.classList.add('is-visible');
      return;
    }

    outro.classList.add('is-motion-ready');
    new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || entry.intersectionRatio < .14 || entered) return;
        entered = true;
        outro.classList.add('is-visible');
        observer.unobserve(outro);
      });
    }, { threshold: [.14, .32] }).observe(outro);
  }

  function setupFractureTitle() {
    var fracture = document.querySelector('[data-fracture]');
    var scene = document.querySelector('.folio-cover');
    if (!fracture || !scene || gardenMotionIsLite() || !finePointer.matches) return;
    var shards = Array.prototype.slice.call(fracture.querySelectorAll('.folio-fracture-shard'));
    var strengths = [[-1.1, -.7], [.45, -1], [1.1, -.45], [-.75, .9], [.85, .75]];
    var frame = 0;
    var nx = 0;
    var ny = 0;

    function render() {
      frame = 0;
      shards.forEach(function (shard, index) {
        var strength = strengths[index];
        var x = nx * 15 * strength[0];
        var y = ny * 11 * strength[1];
        var rotation = nx * strength[0] * 1.4;
        shard.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + rotation.toFixed(2) + 'deg)';
      });
    }

    scene.addEventListener('pointermove', function (event) {
      var rect = scene.getBoundingClientRect();
      nx = ((event.clientX - rect.left) / rect.width - .5) * 2;
      ny = ((event.clientY - rect.top) / rect.height - .5) * 2;
      if (!frame) frame = window.requestAnimationFrame(render);
    }, { passive: true });
    scene.addEventListener('pointerleave', function () {
      nx = 0;
      ny = 0;
      if (!frame) frame = window.requestAnimationFrame(render);
    });
    scene.addEventListener('click', function (event) {
      if (event.target.closest('a, button')) return;
      fracture.classList.add('is-struck');
      window.setTimeout(function () { fracture.classList.remove('is-struck'); render(); }, 620);
    });
  }

  function setupGardenParticles() {
    var canvas = document.querySelector('[data-garden-particles]');
    var cover = document.querySelector('.folio-cover');
    if (!canvas || !cover || gardenMotionIsLite()) return;
    var context = canvas.getContext('2d');
    if (!context) return;
    var particles = [];
    var width = 0;
    var height = 0;
    var scale = 1;
    var pointer = { x: -1000, y: -1000 };
    var visible = true;

    function resize() {
      scale = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      var wanted = Math.max(24, Math.min(58, Math.floor(width / 24)));
      while (particles.length < wanted) particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * .18,
        vy: -.08 - Math.random() * .2,
        radius: .5 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2
      });
      particles.length = wanted;
    }

    function draw(time) {
      context.clearRect(0, 0, width, height);
      if (visible && !document.hidden) {
        particles.forEach(function (particle, index) {
          var dx = particle.x - pointer.x;
          var dy = particle.y - pointer.y;
          var distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 115 && distance > 0) {
            particle.x += dx / distance * (115 - distance) * .012;
            particle.y += dy / distance * (115 - distance) * .012;
          }
          particle.x += particle.vx + Math.sin(time * .00035 + particle.phase) * .06;
          particle.y += particle.vy;
          if (particle.y < -10) { particle.y = height + 10; particle.x = Math.random() * width; }
          if (particle.x < -10) particle.x = width + 10;
          if (particle.x > width + 10) particle.x = -10;
          context.beginPath();
          context.fillStyle = 'rgba(196, 225, 199,' + (.25 + .2 * Math.sin(time * .001 + particle.phase)).toFixed(3) + ')';
          context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          context.fill();

          for (var j = index + 1; j < Math.min(particles.length, index + 5); j += 1) {
            var other = particles[j];
            var lx = other.x - particle.x;
            var ly = other.y - particle.y;
            var lineDistance = Math.sqrt(lx * lx + ly * ly);
            if (lineDistance > 92) continue;
            context.beginPath();
            context.strokeStyle = 'rgba(168, 207, 174,' + ((1 - lineDistance / 92) * .12).toFixed(3) + ')';
            context.moveTo(particle.x, particle.y);
            context.lineTo(other.x, other.y);
            context.stroke();
          }
        });
      }
      window.requestAnimationFrame(draw);
    }

    cover.addEventListener('pointermove', function (event) { pointer.x = event.clientX; pointer.y = event.clientY; }, { passive: true });
    cover.addEventListener('pointerleave', function () { pointer.x = -1000; pointer.y = -1000; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; canvas.style.opacity = visible ? '.42' : '0'; }, { threshold: .02 }).observe(cover);
    }
    window.addEventListener('resize', resize, { passive: true });
    resize();
    window.requestAnimationFrame(draw);
  }

  function setupGardenPet() {
    var pet = document.querySelector('[data-garden-pet]');
    if (!pet) return;
    var button = pet.querySelector('[data-pet-button]');
    var bubble = pet.querySelector('[data-pet-bubble]');
    if (!button || !bubble) return;
    var count = pet.dataset.postCount || '几';
    var messages = [
      '你终于找到我了。这里的猫比目录更可靠。',
      '这座花园目前有 ' + count + ' 篇笔记，还在慢慢长。',
      '移动光标，封面上的名字会裂开一点。',
      '试试上上下下左右左右 B A？',
      '别急着把每条路都走完。随便拐弯也算数。'
    ];
    var messageIndex = 0;
    var bubbleTimer = 0;
    var pressTimer = 0;
    var longPressed = false;

    function syncMobilePet() {
      document.body.classList.toggle('garden-pet-ready', window.scrollY > window.innerHeight * .42);
    }

    function speak(message, duration) {
      window.clearTimeout(bubbleTimer);
      bubble.textContent = message;
      pet.classList.add('is-speaking');
      bubbleTimer = window.setTimeout(function () { pet.classList.remove('is-speaking'); }, duration || 4200);
    }

    function hop() {
      pet.classList.remove('is-happy');
      void pet.offsetWidth;
      pet.classList.add('is-happy');
      window.setTimeout(function () { pet.classList.remove('is-happy'); }, 620);
    }

    window.setTimeout(function () { speak('嘘，花园刚刚醒。'); }, 2100);
    syncMobilePet();
    window.addEventListener('scroll', syncMobilePet, { passive: true });
    window.addEventListener('resize', syncMobilePet, { passive: true });
    button.addEventListener('click', function () {
      if (longPressed) { longPressed = false; return; }
      hop();
      speak(messages[messageIndex % messages.length]);
      messageIndex += 1;
    });
    button.addEventListener('pointerdown', function () {
      longPressed = false;
      pressTimer = window.setTimeout(function () {
        longPressed = true;
        hop();
        speak('CORE.DATA / 我替他守着这里，也替你记住来过。', 5200);
      }, 680);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (eventName) {
      button.addEventListener(eventName, function () { window.clearTimeout(pressTimer); });
    });
    document.addEventListener('garden:pet', function (event) { speak(event.detail || '花园收到了一条暗号。', 5200); });
    window.setInterval(function () {
      if (document.hidden || window.scrollY < window.innerHeight * .6) return;
      speak(messages[messageIndex % messages.length], 3600);
      messageIndex += 1;
    }, 24000);
  }

  function setupGardenEasterEgg() {
    var overlay = document.querySelector('[data-garden-overgrowth]');
    if (!overlay) return;
    var canvas = overlay.querySelector('[data-overgrowth-field]');
    var close = overlay.querySelector('[data-overgrowth-close]');
    var status = overlay.querySelector('[data-overgrowth-status]');
    var hint = overlay.querySelector('[data-overgrowth-hint]');
    var controls = overlay.querySelector('[data-game-controls]');
    var context = canvas ? canvas.getContext('2d', { alpha: false, desynchronized: true }) : null;
    if (!canvas || !context) return;

    var sequence = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
    var palette = {
      ink: '#050607', night: '#0b0e0f', cloud: '#14191a', slate: '#202728',
      mist: '#3b4745', moss: '#758374', light: '#c9d0c6', bone: '#e4e6df'
    };
    var position = 0;
    var active = false;
    var receding = false;
    var frame = 0;
    var resizeTimer = 0;
    var timers = [];
    var previousFocus = null;
    var logicalWidth = 320;
    var logicalHeight = 180;
    var worldWidth = 760;
    var horizonY = 88;
    var groundY = 128;
    var cameraX = 0;
    var startedAt = 0;
    var lastFrame = 0;
    var randomState = 0x2f6e2b1d;
    var gameState = 'idle';
    var respawnAt = 0;
    var wonAt = 0;
    var lastGateNotice = 0;
    var screenShake = 0;
    var activatedCount = 0;
    var checkpoint = { x: 18, y: 0 };
    var platforms = [];
    var signals = [];
    var hazards = [];
    var buildings = [];
    var stars = [];
    var rain = [];
    var particles = [];
    var ripples = [];
    var input = { left: false, right: false, pointer: 0, jumpBuffer: 0, jumpHeld: false };
    var player = {
      x: 18, y: 0, previousY: 0, width: 5, height: 14,
      velocityX: 0, velocityY: 0, direction: 1, onGround: false,
      coyote: 0, step: 0, squash: 0, visible: true, gliding: false,
      idleTime: 0, lastIdleShake: 0, shakeUntil: 0,
      signalPoseUntil: 0, landedAt: 0
    };
    var gate = { x: 0, y: 0 };

    function random() {
      randomState ^= randomState << 13;
      randomState ^= randomState >>> 17;
      randomState ^= randomState << 5;
      return (randomState >>> 0) / 4294967296;
    }

    function clamp(value, minimum, maximum) {
      return Math.max(minimum, Math.min(maximum, value));
    }

    function easeOut(value) {
      var progress = clamp(value, 0, 1);
      return 1 - Math.pow(1 - progress, 3);
    }

    function clearTimers() {
      timers.forEach(function (timer) { window.clearTimeout(timer); });
      timers = [];
    }

    function later(callback, delay) {
      timers.push(window.setTimeout(callback, delay));
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

    function fitCanvas() {
      var rect = overlay.getBoundingClientRect();
      var cssWidth = Math.max(1, Math.round(rect.width || window.innerWidth));
      var cssHeight = Math.max(1, Math.round(rect.height || window.innerHeight));
      var pixelSize = cssWidth < 720 ? 3 : (cssWidth > 2600 ? 6 : 4);
      logicalWidth = Math.max(128, Math.round(cssWidth / pixelSize));
      logicalHeight = Math.max(96, Math.round(cssHeight / pixelSize));
      worldWidth = Math.max(380, Math.round(logicalWidth * 2.42));
      horizonY = Math.round(logicalHeight * .48);
      groundY = Math.round(logicalHeight * .72);
      canvas.width = logicalWidth;
      canvas.height = logicalHeight;
      context.imageSmoothingEnabled = false;
    }

    function addGroundSegment(start, end) {
      if (end - start < 2) return;
      platforms.push({ x: start, y: groundY, width: end - start, height: logicalHeight - groundY + 8, elevated: false });
    }

    function buildLevel() {
      platforms = [];
      signals = [];
      hazards = [];
      buildings = [];
      stars = [];
      rain = [];
      randomState = 0x2f6e2b1d;

      var gapWidth = clamp(Math.round(logicalWidth * .046), 13, 23);
      var gapCenters = [worldWidth * .285, worldWidth * .555, worldWidth * .785];
      var cursor = 0;
      gapCenters.forEach(function (center) {
        addGroundSegment(cursor, center - gapWidth / 2);
        cursor = center + gapWidth / 2;
      });
      addGroundSegment(cursor, worldWidth);

      var upper = {
        x: worldWidth * .425,
        y: groundY - 15,
        width: Math.max(38, worldWidth * .105),
        height: 3,
        elevated: true
      };
      platforms.push(upper);
      var memoryPlatform = { x: worldWidth * .67, y: groundY - 10, width: Math.max(25, worldWidth * .07), height: 3, elevated: true };
      platforms.push(memoryPlatform);

      signals.push({ x: worldWidth * .17, y: groundY, active: false, label: 'ARTICLE', phase: random() * Math.PI * 2 });
      signals.push({ x: upper.x + upper.width * .56, y: upper.y, active: false, label: 'NOTE', phase: random() * Math.PI * 2 });
      signals.push({ x: memoryPlatform.x + memoryPlatform.width * .56, y: memoryPlatform.y, active: false, label: 'MEMORY', phase: random() * Math.PI * 2 });

      hazards.push({ x: worldWidth * .355, y: groundY - 5, min: worldWidth * .325, max: worldWidth * .405, velocity: 9.5, phase: 0 });
      hazards.push({ x: worldWidth * .615, y: groundY - 5, min: worldWidth * .59, max: worldWidth * .68, velocity: -11, phase: 1.8 });
      hazards.push({ x: worldWidth * .835, y: groundY - 5, min: worldWidth * .815, max: worldWidth * .89, velocity: 12, phase: 3.1 });

      gate.x = worldWidth - 34;
      gate.y = groundY;
      checkpoint.x = 18;
      checkpoint.y = groundY - player.height;

      for (var starIndex = 0; starIndex < Math.round(logicalWidth * .12); starIndex += 1) {
        stars.push({ x: random() * logicalWidth, y: random() * Math.max(8, horizonY - 13), bright: random() > .84, phase: random() * Math.PI * 2 });
      }
      var buildingX = -8;
      while (buildingX < worldWidth + logicalWidth) {
        var buildingWidth = 5 + Math.floor(random() * 12);
        var buildingHeight = 7 + Math.floor(random() * Math.max(7, logicalHeight * .12));
        buildings.push({ x: buildingX, width: buildingWidth, height: buildingHeight, lit: random() > .7, phase: random() * Math.PI * 2 });
        buildingX += buildingWidth + 1 + Math.floor(random() * 4);
      }
      var rainCount = Math.round(logicalWidth * .3);
      for (var rainIndex = 0; rainIndex < rainCount; rainIndex += 1) {
        rain.push({
          x: random() * logicalWidth,
          y: random() * logicalHeight,
          speed: 48 + random() * 78,
          length: 1 + Math.floor(random() * 5),
          depth: .25 + random() * .75
        });
      }
    }

    function resetPlayer(atCheckpoint) {
      var spawn = atCheckpoint ? checkpoint : { x: 18, y: groundY - player.height };
      player.x = spawn.x;
      player.y = spawn.y;
      player.previousY = player.y;
      player.velocityX = 0;
      player.velocityY = 0;
      player.direction = 1;
      player.onGround = true;
      player.coyote = .1;
      player.step = 0;
      player.squash = 0;
      player.gliding = false;
      player.idleTime = 0;
      player.lastIdleShake = performance.now();
      player.shakeUntil = 0;
      player.signalPoseUntil = 0;
      player.landedAt = 0;
      player.visible = true;
      cameraX = clamp(player.x - logicalWidth * .28, 0, worldWidth - logicalWidth);
      input.jumpBuffer = 0;
    }

    function resetGame() {
      buildLevel();
      overlay.classList.remove('is-game-won');
      activatedCount = 0;
      particles = [];
      ripples = [];
      screenShake = 0;
      wonAt = 0;
      gameState = 'playing';
      resetPlayer(false);
      if (status) status.textContent = 'ENDLINE // 00 / 03 SIGNALS';
      if (hint) hint.textContent = '点亮三座文章信标。A/D 移动，W/空格跳跃；空中按住可撑伞缓降。';
    }

    function spawnPixels(x, y, count, color, force) {
      for (var index = 0; index < count; index += 1) {
        var angle = random() * Math.PI * 2;
        var speed = (4 + random() * (force || 18));
        particles.push({
          x: x, y: y,
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed - 5,
          age: 0,
          life: .32 + random() * .65,
          color: color || palette.light
        });
      }
      while (particles.length > 110) particles.shift();
    }

    function addRipple(x, y, strength) {
      ripples.push({ x: x, y: y, age: 0, life: .8 + (strength || 1) * .26, strength: strength || 1 });
      while (ripples.length > 24) ripples.shift();
    }

    function queueJump() {
      if (!active || gameState !== 'playing') return;
      input.jumpBuffer = .14;
      input.jumpHeld = true;
    }

    function releaseJump() {
      input.jumpHeld = false;
      if (player.velocityY < -24) player.velocityY *= .52;
    }

    function killPlayer(reason) {
      if (gameState !== 'playing') return;
      gameState = 'respawning';
      respawnAt = performance.now() + 720;
      player.visible = false;
      input.left = input.right = false;
      input.pointer = 0;
      screenShake = 4.5;
      spawnPixels(player.x + player.width / 2, Math.min(player.y + player.height / 2, groundY), 28, palette.light, 24);
      addRipple(player.x + player.width / 2, groundY + 1, 1.2);
      if (status) status.textContent = 'SIGNAL LOST // REBUILDING AT LAST LIGHT';
      if (hint) hint.textContent = reason === 'noise' ? '被噪点碰到了。稍等，正在最近的信标处重组。' : '掉进断轨了。稍等，正在最近的信标处重组。';
    }

    function activateSignal(signal) {
      if (signal.active || gameState !== 'playing') return;
      signal.active = true;
      signal.activatedAt = performance.now();
      activatedCount += 1;
      checkpoint.x = signal.x - player.width / 2;
      checkpoint.y = signal.y - player.height;
      screenShake = 1.1;
      player.signalPoseUntil = performance.now() + 720;
      spawnPixels(signal.x, signal.y - 8, 22, palette.moss, 18);
      addRipple(signal.x, signal.y + 1, 1.25);
      if (status) status.textContent = signal.label + ' SIGNAL RESTORED // 0' + activatedCount + ' / 03';
      if (hint) hint.textContent = activatedCount === 3 ? '全部信标已恢复。继续向右，ENDLINE 已经打开。' : '这里现在是新的检查点。继续向右寻找下一段信号。';
      document.dispatchEvent(new CustomEvent('garden:pet', { detail: signal.label + ' 已经写回花园。' }));
    }

    function winGame(now) {
      if (gameState !== 'playing') return;
      gameState = 'won';
      wonAt = now;
      overlay.classList.add('is-game-won');
      player.velocityX = 0;
      player.velocityY = 0;
      input.left = input.right = false;
      input.pointer = 0;
      screenShake = 1.8;
      spawnPixels(gate.x + 5, gate.y - 13, 42, palette.bone, 28);
      if (status) status.textContent = 'ENDLINE CLEARED // 03 / 03 SIGNALS';
      if (hint) hint.textContent = '通关。三段内容信号已写回花园。按 R 可以重新开始。';
      document.dispatchEvent(new CustomEvent('garden:pet', { detail: '线路尽头不是终点，是花园重新开始更新。' }));
    }

    function inputAxis() {
      var keyboard = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      return keyboard || input.pointer;
    }

    function updateRain(delta) {
      var rainScale = gameState === 'won' ? .24 : 1;
      rain.forEach(function (drop) {
        drop.y += drop.speed * delta * rainScale;
        drop.x += clamp(player.velocityX * .004, -.35, .35) * drop.speed * delta;
        if (drop.y > logicalHeight + 6 || drop.x < -8 || drop.x > logicalWidth + 8) {
          drop.y = -drop.length - random() * 14;
          drop.x = random() * logicalWidth;
        }
      });
    }

    function updateHazards(delta) {
      hazards.forEach(function (hazard) {
        hazard.x += hazard.velocity * delta;
        if (hazard.x <= hazard.min || hazard.x >= hazard.max) {
          hazard.x = clamp(hazard.x, hazard.min, hazard.max);
          hazard.velocity *= -1;
        }
      });
    }

    function updateParticles(delta) {
      particles = particles.filter(function (particle) {
        particle.age += delta;
        particle.x += particle.velocityX * delta;
        particle.y += particle.velocityY * delta;
        particle.velocityY += 44 * delta;
        return particle.age < particle.life;
      });
      ripples = ripples.filter(function (ripple) {
        ripple.age += delta;
        return ripple.age < ripple.life;
      });
    }

    function horizontalOverlap(aX, aWidth, bX, bWidth) {
      return aX + aWidth > bX && aX < bX + bWidth;
    }

    function updatePlayer(delta, now) {
      if (gameState === 'respawning') {
        if (now >= respawnAt) {
          resetPlayer(true);
          gameState = 'playing';
          spawnPixels(player.x + player.width / 2, player.y + player.height / 2, 18, palette.moss, 14);
          if (status) status.textContent = 'REBUILT // CHECKPOINT RESTORED';
          if (hint) hint.textContent = '继续。信标不会因为失败而熄灭。';
        }
        return;
      }
      if (gameState === 'won') {
        var exitProgress = clamp((now - wonAt) / 1100, 0, 1);
        player.gliding = false;
        player.direction = 1;
        player.step += delta * 7;
        player.x += (gate.x + 6 - player.x) * Math.min(1, delta * 2.8);
        player.visible = exitProgress < .92;
        return;
      }

      var axis = inputAxis();
      var acceleration = player.onGround ? 148 : (player.gliding ? 112 : 94);
      if (axis) {
        player.velocityX += axis * acceleration * delta;
        player.direction = axis < 0 ? -1 : 1;
      } else {
        player.velocityX *= Math.pow(player.onGround ? .0006 : .12, delta);
      }
      var maximumSpeed = player.gliding ? 39 : 35;
      player.velocityX = clamp(player.velocityX, -maximumSpeed, maximumSpeed);
      if (Math.abs(player.velocityX) < .12) player.velocityX = 0;
      player.x = clamp(player.x + player.velocityX * delta, 0, worldWidth - player.width);

      input.jumpBuffer = Math.max(0, input.jumpBuffer - delta);
      player.coyote = player.onGround ? .105 : Math.max(0, player.coyote - delta);
      if (input.jumpBuffer > 0 && player.coyote > 0) {
        input.jumpBuffer = 0;
        player.coyote = 0;
        player.onGround = false;
        player.velocityY = -76;
        player.squash = .2;
        spawnPixels(player.x + player.width / 2, player.y + player.height, 5, palette.mist, 9);
      }

      player.previousY = player.y;
      var previousBottom = player.y + player.height;
      player.gliding = input.jumpHeld && !player.onGround && player.velocityY > 9;
      var gravity = player.gliding ? 72 : 168;
      var terminalVelocity = player.gliding ? 34 : 78;
      player.velocityY = Math.min(terminalVelocity, player.velocityY + gravity * delta);
      player.y += player.velocityY * delta;
      var nextBottom = player.y + player.height;
      var landedOn = null;
      if (player.velocityY >= 0) {
        platforms.forEach(function (platform) {
          if (landedOn || !horizontalOverlap(player.x + .7, player.width - 1.4, platform.x, platform.width)) return;
          if (previousBottom <= platform.y + 1.2 && nextBottom >= platform.y) landedOn = platform;
        });
      }
      if (landedOn) {
        var landingSpeed = player.velocityY;
        player.y = landedOn.y - player.height;
        player.velocityY = 0;
        if (!player.onGround && landingSpeed > 28) {
          player.squash = clamp(landingSpeed / 150, .14, .4);
          player.landedAt = now;
          addRipple(player.x + player.width / 2, landedOn.y + 1, .65);
          spawnPixels(player.x + player.width / 2, landedOn.y, 7, palette.mist, 13);
        }
        player.gliding = false;
        player.onGround = true;
      } else {
        player.onGround = false;
      }
      player.squash = Math.max(0, player.squash - delta * 1.9);
      if (Math.abs(player.velocityX) > .8 && player.onGround) player.step += delta * (5.8 + Math.abs(player.velocityX) * .1);
      if (player.onGround && Math.abs(player.velocityX) < .24 && !axis) {
        player.idleTime += delta;
        if (player.idleTime > 3.1 && now - player.lastIdleShake > 4300) {
          player.lastIdleShake = now;
          player.shakeUntil = now + 560;
          spawnPixels(player.x + player.width / 2, player.y - 7, 7, palette.mist, 11);
        }
      } else {
        player.idleTime = 0;
      }

      signals.forEach(function (signal) {
        var centerX = player.x + player.width / 2;
        var bottom = player.y + player.height;
        if (!signal.active && Math.abs(centerX - signal.x) < 7 && Math.abs(bottom - signal.y) < 11) activateSignal(signal);
      });

      hazards.forEach(function (hazard) {
        if (gameState !== 'playing') return;
        if (horizontalOverlap(player.x, player.width, hazard.x - 2, 5) && player.y + player.height > hazard.y && player.y < hazard.y + 5) killPlayer('noise');
      });

      if (player.y > logicalHeight + 12) killPlayer('fall');
      if (gameState !== 'playing') return;
      if (player.x + player.width > gate.x - 1) {
        if (activatedCount === signals.length) {
          winGame(now);
        } else {
          player.x = gate.x - player.width - 2;
          player.velocityX = -14;
          if (now - lastGateNotice > 900) {
            lastGateNotice = now;
            if (status) status.textContent = 'ENDLINE LOCKED // ' + String(signals.length - activatedCount).padStart(2, '0') + ' SIGNALS MISSING';
            if (hint) hint.textContent = '还有信标没有点亮。向左返回，已点亮的位置仍是检查点。';
          }
        }
      }
    }

    function updateCamera(delta) {
      var target = clamp(player.x - logicalWidth * .38, 0, Math.max(0, worldWidth - logicalWidth));
      cameraX += (target - cameraX) * Math.min(1, delta * 5.4);
      screenShake = Math.max(0, screenShake - delta * 10);
    }

    function updateGame(delta, now) {
      updateRain(delta);
      updateHazards(delta);
      updateParticles(delta);
      updatePlayer(delta, now);
      updateCamera(delta);
    }

    function screenX(worldX, parallax) {
      return worldX - cameraX * (parallax === undefined ? 1 : parallax);
    }

    function drawMoon() {
      var x = Math.round(logicalWidth * .76);
      var y = Math.round(logicalHeight * .18);
      var radius = Math.max(8, Math.round(Math.min(logicalWidth, logicalHeight) * .075));
      for (var row = -radius; row <= radius; row += 1) {
        var half = Math.floor(Math.sqrt(Math.max(0, radius * radius - row * row)));
        for (var column = -half; column <= half; column += 2) {
          if ((column + row) % 3) pixel(x + column, y + row, 1, 1, palette.mist, .36);
        }
      }
    }

    function drawSky(now) {
      pixel(0, 0, logicalWidth, logicalHeight, palette.night);
      drawMoon();
      stars.forEach(function (star) {
        pixel(star.x - cameraX * .035, star.y, 1, 1, star.bright ? palette.light : palette.mist, star.bright ? .25 + Math.sin(now * .001 + star.phase) * .08 : .1);
      });
      var cloudOffset = ((now - startedAt) * .0022) % (logicalWidth + 70);
      pixel(logicalWidth - cloudOffset, horizonY * .34, 66, 2, palette.slate, .24);
      pixel(logicalWidth * .32 - cloudOffset * .5, horizonY * .55, 92, 3, palette.cloud, .28);
      buildings.forEach(function (building) {
        var x = screenX(building.x, .2);
        if (x + building.width < -2 || x > logicalWidth + 2) return;
        pixel(x, horizonY - building.height, building.width, building.height, palette.cloud, .88);
        if (building.lit) pixel(x + Math.floor(building.width / 2), horizonY - building.height + 4, 1, 1, palette.moss, .24 + Math.sin(now * .0007 + building.phase) * .04);
      });
      pixel(0, horizonY, logicalWidth, 1, palette.mist, .3);
      pixel(0, horizonY + 2, logicalWidth, 1, palette.slate, .25);
    }

    function drawPlatforms(now) {
      platforms.forEach(function (platform) {
        var x = screenX(platform.x);
        if (x + platform.width < -4 || x > logicalWidth + 4) return;
        pixel(x, platform.y, platform.width, platform.height, palette.ink);
        pixel(x, platform.y, platform.width, 1, platform.elevated ? palette.moss : palette.mist, platform.elevated ? .46 : .38);
        pixel(x, platform.y + 3, platform.width, 1, palette.slate, .26);
        if (platform.elevated) {
          for (var brace = 4; brace < platform.width; brace += 14) pixelLine(x + brace, platform.y + 3, x + brace + 5, platform.y + 10, palette.mist, .19);
        } else {
          for (var sleeper = 2; sleeper < platform.width; sleeper += 15) pixel(x + sleeper, platform.y + 17, 9, 1, palette.mist, .17);
          pixel(x, platform.y + 15, platform.width, 1, palette.slate, .44);
          pixel(x, platform.y + 23, platform.width, 1, palette.slate, .5);
        }
      });
      for (var puddle = 0; puddle < 7; puddle += 1) {
        var puddleX = screenX(worldWidth * (.09 + puddle * .125));
        var shimmer = .12 + Math.sin(now * .0014 + puddle) * .03;
        pixel(puddleX, groundY + 5 + (puddle % 3) * 3, 9 + (puddle % 4) * 4, 1, palette.mist, shimmer);
      }
    }

    function drawRain(front) {
      rain.forEach(function (drop) {
        if ((drop.depth > .62) !== front) return;
        var lean = clamp(player.velocityX * .012, -.8, .8) * drop.length;
        pixelLine(drop.x, drop.y, drop.x + lean, drop.y + drop.length, front ? palette.light : palette.mist, front ? .2 + drop.depth * .2 : .1 + drop.depth * .1);
      });
    }

    function drawSignal(signal, now) {
      var x = screenX(signal.x);
      if (x < -12 || x > logicalWidth + 12) return;
      var pulse = .78 + Math.sin(now * .002 + signal.phase) * .13;
      var alpha = signal.active ? pulse : .2;
      pixel(x, signal.y - 10, 1, 11, palette.mist, signal.active ? .54 : .28);
      pixel(x - 2, signal.y - 12, 5, 3, signal.active ? palette.light : palette.slate, alpha);
      pixel(x - 1, signal.y - 13, 3, 1, signal.active ? palette.bone : palette.mist, alpha);
      if (signal.active) {
        pixel(x - 6, signal.y - 10, 13, 1, palette.moss, alpha * .16);
        for (var reflection = 2; reflection < 13; reflection += 3) pixel(x - Math.floor((13 - reflection) / 4), signal.y + reflection, 1 + Math.floor((13 - reflection) / 2), 1, palette.moss, alpha * (1 - reflection / 13) * .22);
      }
    }

    function drawHazard(hazard, now) {
      var x = screenX(hazard.x);
      if (x < -10 || x > logicalWidth + 10) return;
      var glitch = Math.floor(now / 110 + hazard.phase) % 3;
      pixel(x - 2, hazard.y + 2, 5, 3, palette.slate, .9);
      pixel(x - 1 + glitch, hazard.y, 3, 2, palette.mist, .72);
      pixel(x - 4 + glitch * 2, hazard.y + 1, 2, 1, palette.light, .34);
      pixel(x + 3 - glitch, hazard.y + 4, 2, 1, palette.moss, .28);
    }

    function drawGate(now) {
      var x = screenX(gate.x);
      if (x < -20 || x > logicalWidth + 20) return;
      var powered = activatedCount === signals.length;
      var open = powered ? easeOut((now - (wonAt || signals[2].activatedAt || now)) / 900) : 0;
      pixel(x, gate.y - 27, 2, 28, palette.mist, .58);
      pixel(x + 12, gate.y - 27, 2, 28, palette.mist, .58);
      pixel(x, gate.y - 28, 14, 2, palette.mist, .58);
      pixel(x + 2, gate.y - 25, 10, 22, palette.slate, .82);
      pixel(x + 2, gate.y - 25, Math.max(1, 5 - open * 5), 22, palette.ink);
      pixel(x + 7 + open * 5, gate.y - 25, Math.max(1, 5 - open * 5), 22, palette.ink);
      pixel(x + 6, gate.y - 31, 2, 2, powered ? palette.bone : palette.mist, powered ? .9 : .25);
      if (powered) pixel(x - 5, gate.y - 29, 24, 1, palette.moss, .12 + Math.sin(now * .003) * .04);
    }

    function drawPlayer(now) {
      if (!player.visible) return;
      var x = Math.round(screenX(player.x));
      var y = Math.round(player.y);
      var centerX = x + 2;
      var winning = gameState === 'won';
      var winProgress = winning ? clamp((now - wonAt) / 1100, 0, 1) : 0;
      var moving = (Math.abs(player.velocityX) > .8 && player.onGround) || (winning && winProgress < .78);
      var stepFrame = moving ? Math.floor(player.step * 3) % 6 : 0;
      var bobPattern = [0, -1, 0, 0, -1, 0];
      var bob = moving ? bobPattern[stepFrame] : (player.idleTime > 1.2 ? Math.round(Math.sin(now * .0022) * .45) : 0);
      var direction = player.direction;
      var squash = player.squash > .08 ? 1 : 0;
      var gliding = player.gliding;
      var airborne = !player.onGround;
      var signalPose = now < player.signalPoseUntil;
      var shaking = now < player.shakeUntil;
      var shake = shaking ? Math.round(Math.sin((player.shakeUntil - now) * .075) * 2) : 0;
      var foldedUmbrella = winning && now - wonAt > 260;
      var blink = Math.floor((now + player.x * 23) / 1850) % 7 === 0;

      if (player.onGround) {
        var landingGlow = clamp(1 - (now - player.landedAt) / 260, 0, 1);
        pixel(centerX - 6 - landingGlow * 2, y + player.height + 2, 13 + landingGlow * 4, 1, palette.mist, .13 + landingGlow * .12);
        pixel(centerX - 3, y + player.height + 5, 7, 1, palette.moss, .07);
      }

      var scarfLift = gliding ? -2 : clamp(Math.round(-player.velocityY * .025), -1, 2);
      var scarfWave = Math.round(Math.sin(now * .01 + player.step) * 1.2);
      pixel(centerX - direction * 3, y + 4 + bob, 3, 2, palette.moss, .78);
      pixel(centerX - direction * 6, y + 4 + bob + scarfLift, 4, 1, palette.moss, .64);
      pixel(centerX - direction * 9, y + 4 + bob + scarfLift + scarfWave, 4, 1, palette.moss, .42);
      if (Math.abs(player.velocityX) > 18 || gliding) pixel(centerX - direction * 12, y + 4 + bob + scarfLift + scarfWave, 3, 1, palette.moss, .24);

      pixel(centerX - direction * 4, y + 4 + bob + squash, 4, 7 - squash, palette.ink, .94);
      pixel(centerX - direction * 4, y + 5 + bob + squash, 2, 4, palette.mist, .38);

      if (foldedUmbrella) {
        var foldedX = centerX + direction * 5;
        pixelLine(foldedX, y - 5 + bob, foldedX, y + 10 + bob, palette.mist, .72);
        pixel(foldedX - 1, y - 5 + bob, 3, 8, palette.slate, .9);
        pixel(foldedX, y - 6 + bob, 1, 2, palette.light, .55);
        pixel(foldedX + direction, y + 10 + bob, 2, 1, palette.moss, .58);
      } else {
        var canopyHalf = gliding ? 12 : 10;
        var canopyCenter = centerX + clamp(Math.round(player.velocityX * .028), -2, 2) + shake;
        var canopyY = y - (gliding ? 11 : 9) + bob + squash;
        pixel(canopyCenter - 2, canopyY, 5, 1, palette.mist, .78);
        pixel(canopyCenter - 5, canopyY + 1, 11, 1, palette.slate, .94);
        pixel(canopyCenter - canopyHalf + 3, canopyY + 2, canopyHalf * 2 - 5, 1, palette.slate);
        pixel(canopyCenter - canopyHalf, canopyY + 3, canopyHalf * 2 + 1, 2, palette.ink);
        pixel(canopyCenter - canopyHalf + 1, canopyY + 3, canopyHalf - 2, 1, palette.mist, .52);
        pixel(canopyCenter - canopyHalf, canopyY + 5, 4, 1, palette.slate, .92);
        pixel(canopyCenter - 2, canopyY + 5, 5, 1, palette.slate, .92);
        pixel(canopyCenter + canopyHalf - 3, canopyY + 5, 4, 1, palette.slate, .92);
        pixelLine(canopyCenter, canopyY + 1, canopyCenter - canopyHalf + 3, canopyY + 4, palette.mist, .28);
        pixelLine(canopyCenter, canopyY + 1, canopyCenter + canopyHalf - 3, canopyY + 4, palette.mist, .28);
        pixelLine(canopyCenter, canopyY + 2, centerX + 2, y + 8 + bob, palette.mist, .68);
        pixel(centerX + 1, y + 8 + bob, 3, 1, palette.mist, .64);
        if (gliding || shaking) {
          var dripStep = Math.floor(now / 90) % 4;
          pixel(canopyCenter - canopyHalf, canopyY + 7 + dripStep, 1, 2, palette.light, .35);
          pixel(canopyCenter + canopyHalf, canopyY + 6 + ((dripStep + 2) % 4), 1, 2, palette.light, .3);
          if (shaking) pixel(canopyCenter - 4, canopyY + 8 + ((dripStep + 1) % 3), 1, 1, palette.moss, .38);
        }
      }

      pixel(centerX - 2, y + bob + squash, 5, 4 - squash, palette.slate);
      pixel(centerX - 1 + direction, y + 1 + bob + squash, 3, 2, palette.light, .68);
      pixel(centerX - 2, y + bob + squash, 5, 1, palette.ink, .9);
      pixel(centerX - direction * 2, y + 1 + bob + squash, 1, 3, palette.ink, .68);
      if (!blink) pixel(centerX + direction, y + 2 + bob + squash, 1, 1, palette.bone, .7);

      pixel(centerX - 3, y + 4 + bob + squash, 7, 7 - squash, palette.slate);
      pixel(centerX - 2, y + 5 + bob + squash, 5, 5 - squash, palette.mist, .52);
      pixel(centerX - 2, y + 4 + bob + squash, 2, 2, palette.light, .32);
      pixel(centerX + 2, y + 6 + bob, 1, 1, palette.moss, .66);
      pixel(centerX, y + 6 + bob, 1, 1, palette.ink, .72);
      pixel(centerX, y + 8 + bob, 1, 1, palette.ink, .72);

      if (signalPose) {
        pixelLine(centerX - direction * 2, y + 6 + bob, centerX - direction * 6, y + 1 + bob, palette.mist, .82);
        pixel(centerX - direction * 7, y + bob, 2, 2, palette.bone, .78);
      } else {
        pixelLine(centerX + direction * 2, y + 6 + bob, centerX + direction * 3, y + 9 + bob, palette.mist, .66);
        pixel(centerX + direction * 3, y + 9 + bob, 2, 1, palette.light, .54);
      }

      if (airborne) {
        if (gliding) {
          pixel(centerX - direction * 1, y + 10 + bob, 3, 2, palette.mist, .86);
          pixel(centerX - direction * 4, y + 11 + bob, 4, 2, palette.slate, .92);
          pixel(centerX - direction * 6, y + 12 + bob, 3, 1, palette.light, .44);
        } else {
          var tuck = player.velocityY < 0 ? 1 : 0;
          pixel(centerX - 3, y + 10 - tuck + bob, 3, 2, palette.mist, .84);
          pixel(centerX + 1, y + 11 + tuck + bob, 3, 2, palette.slate, .9);
          pixel(centerX - 4, y + 11 - tuck + bob, 2, 1, palette.light, .4);
        }
      } else {
        var legFrames = [
          [-1, 0, 1, 0], [-2, 0, 2, -1], [-1, -1, 3, 0],
          [1, 0, -1, 0], [2, -1, -2, 0], [3, 0, -1, -1]
        ];
        var legs = legFrames[stepFrame];
        pixel(centerX - 2 + legs[0] * direction, y + 10 + legs[1] + bob, 2, 4 - Math.max(0, legs[1]), palette.mist, .86);
        pixel(centerX + 1 + legs[2] * direction, y + 10 + legs[3] + bob, 2, 4 - Math.max(0, legs[3]), palette.slate, .94);
        pixel(centerX - 3 + legs[0] * direction, y + 13 + bob, 3, 1, palette.light, .44);
        pixel(centerX + 1 + legs[2] * direction, y + 13 + bob, 3, 1, palette.light, .34);
      }
    }

    function drawEffects() {
      ripples.forEach(function (ripple) {
        var progress = ripple.age / ripple.life;
        var width = 2 + easeOut(progress) * 20 * ripple.strength;
        pixel(screenX(ripple.x) - width / 2, ripple.y, width, 1, palette.light, (1 - progress) * .34);
      });
      particles.forEach(function (particle) {
        pixel(screenX(particle.x), particle.y, 1, 1, particle.color, clamp(1 - particle.age / particle.life, 0, 1) * .72);
      });
    }

    function drawHud(now) {
      var startX = logicalWidth - 27;
      signals.forEach(function (signal, index) {
        pixel(startX + index * 8, 8, 5, 5, signal.active ? palette.light : palette.slate, signal.active ? .84 : .48);
        pixel(startX + 1 + index * 8, 9, 3, 3, signal.active ? palette.moss : palette.ink, signal.active ? .62 + Math.sin(now * .002 + index) * .08 : .8);
      });
      pixel(startX, 16, 21, 1, palette.mist, .2);
      var progress = clamp(player.x / Math.max(1, gate.x), 0, 1);
      pixel(startX, 16, 21 * progress, 1, palette.moss, .56);
    }

    function renderGame(now) {
      var shakeX = screenShake > 0 ? (random() - .5) * screenShake : 0;
      var shakeY = screenShake > 0 ? (random() - .5) * screenShake * .5 : 0;
      context.save();
      context.translate(Math.round(shakeX), Math.round(shakeY));
      drawSky(now);
      drawRain(false);
      drawPlatforms(now);
      signals.forEach(function (signal) { drawSignal(signal, now); });
      hazards.forEach(function (hazard) { drawHazard(hazard, now); });
      drawGate(now);
      drawEffects();
      drawPlayer(now);
      drawRain(true);
      drawHud(now);
      var reveal = easeOut((now - startedAt) / 760);
      if (reveal < 1) {
        var open = logicalHeight * reveal;
        var top = horizonY - open * .48;
        var bottom = horizonY + open * .52;
        pixel(0, 0, logicalWidth, Math.max(0, top), palette.ink);
        pixel(0, bottom, logicalWidth, logicalHeight - bottom, palette.ink);
      }
      context.restore();
    }

    function renderLoop(now) {
      if (!active) return;
      if (document.hidden) {
        lastFrame = now;
        frame = window.requestAnimationFrame(renderLoop);
        return;
      }
      var elapsed = now - lastFrame;
      if (elapsed < 1000 / 30) {
        frame = window.requestAnimationFrame(renderLoop);
        return;
      }
      var delta = Math.min(.045, elapsed / 1000);
      lastFrame = now;
      if (!receding) updateGame(delta, now);
      renderGame(now);
      frame = window.requestAnimationFrame(renderLoop);
    }

    function stopGame() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      input.left = input.right = false;
      input.pointer = 0;
      input.jumpHeld = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    function finish() {
      if (!active || receding) return;
      clearTimers();
      receding = true;
      overlay.classList.add('is-receding');
      if (status) status.textContent = 'LEVEL CLOSED // RETURNING TO GARDEN';
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
      startedAt = performance.now();
      lastFrame = startedAt;
      resetGame();
      document.dispatchEvent(new CustomEvent('garden:pet', { detail: 'ENDLINE 已打开：找回文章、笔记和记忆。' }));

      if (gardenMotionIsLite()) {
        startedAt -= 1200;
        renderGame(performance.now());
        if (status) status.textContent = 'STATIC LEVEL // MOTION REDUCED';
        if (hint) hint.textContent = '系统已按动态偏好展示静态关卡。可以退出并返回页面。';
        later(finish, 5200);
        return;
      }
      frame = window.requestAnimationFrame(renderLoop);
    }

    function isEditingTarget(target) {
      return target && (target.matches('input, textarea, select') || target.isContentEditable);
    }

    document.addEventListener('keydown', function (event) {
      var target = event.target;
      if (isEditingTarget(target)) return;
      var key = event.key.toLowerCase();
      if (active) {
        if (event.key === 'Escape') { event.preventDefault(); finish(); return; }
        if (target && target.closest && target.closest('button') && (event.key === ' ' || event.key === 'Enter')) return;
        if (key === 'r') { event.preventDefault(); resetGame(); startedAt = performance.now() - 800; return; }
        if (key === 'a' || event.key === 'ArrowLeft') { event.preventDefault(); input.left = true; return; }
        if (key === 'd' || event.key === 'ArrowRight') { event.preventDefault(); input.right = true; return; }
        if (key === 'w' || event.key === 'ArrowUp' || event.key === ' ') {
          event.preventDefault();
          if (!event.repeat) queueJump();
          return;
        }
        return;
      }
      position = key === sequence[position] ? position + 1 : (key === sequence[0] ? 1 : 0);
      if (position < sequence.length) return;
      position = 0;
      awaken();
    });

    document.addEventListener('keyup', function (event) {
      if (!active) return;
      var key = event.key.toLowerCase();
      if (key === 'a' || event.key === 'ArrowLeft') input.left = false;
      if (key === 'd' || event.key === 'ArrowRight') input.right = false;
      if (key === 'w' || event.key === 'ArrowUp' || event.key === ' ') releaseJump();
    });

    overlay.addEventListener('pointermove', function (event) {
      if (!active || receding || gardenMotionIsLite() || event.pointerType === 'touch') return;
      var rect = canvas.getBoundingClientRect();
      var pointerScreenX = (event.clientX - rect.left) / Math.max(1, rect.width) * logicalWidth;
      var playerScreenX = screenX(player.x + player.width / 2);
      input.pointer = pointerScreenX < playerScreenX - 14 ? -1 : (pointerScreenX > playerScreenX + 14 ? 1 : 0);
    }, { passive: true });
    overlay.addEventListener('pointerleave', function () { input.pointer = 0; });
    overlay.addEventListener('pointerdown', function (event) {
      if (!active || receding || gardenMotionIsLite() || event.button !== 0 || event.pointerType === 'touch' || event.target.closest('button')) return;
      event.preventDefault();
      queueJump();
    });
    overlay.addEventListener('pointerup', function (event) {
      if (event.pointerType !== 'touch') releaseJump();
    });

    function bindHoldControl(selector, property) {
      if (!controls) return;
      var button = controls.querySelector(selector);
      if (!button) return;
      button.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        input[property] = true;
      });
      function release(event) {
        input[property] = false;
        if (button.hasPointerCapture && button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
      }
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', function () { input[property] = false; });
    }

    bindHoldControl('[data-game-left]', 'left');
    bindHoldControl('[data-game-right]', 'right');
    if (controls) {
      var jump = controls.querySelector('[data-game-jump]');
      if (jump) {
        jump.addEventListener('pointerdown', function (event) { event.preventDefault(); queueJump(); });
        jump.addEventListener('pointerup', releaseJump);
        jump.addEventListener('pointercancel', releaseJump);
      }
    }
    if (close) close.addEventListener('click', finish);
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        fitCanvas();
        if (!active) return;
        startedAt = performance.now() - 800;
        resetGame();
        if (gardenMotionIsLite()) renderGame(performance.now());
      }, 140);
    }, { passive: true });
    fitCanvas();
  }

  function setupSearchShortcut() {
    var link = document.querySelector('[data-search-link]');
    if (!link) return;

    document.addEventListener('keydown', function (event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      var target = event.target;
      var isEditing = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );
      if (isEditing) return;

      event.preventDefault();
      var searchInput = document.getElementById('garden-search-input');
      if (searchInput) searchInput.focus();
      else window.location.assign(link.href);
    });
  }

  setupGardenTheme();
  setupGardenBoot();
  setupGardenHud();
  setupGardenRipples();
  setupGardenScramble();
  setupPixelOutro();
  setupFractureTitle();
  setupGardenParticles();
  setupGardenPet();
  setupGardenEasterEgg();
  setupGardenEntry();
  setupHomeClock();
  setupContributionCalendar();
  setupWorldMotion();
  setupFieldMotion();
  setupHomeQuoteFragment();
  setupHomeWindow();
  setupGardenRoute();
  setupGardenWander();
  setupHeroFog();
  setupHomeDepth();
  setupCardSpotlights();
  setupPageTransitions();
  setupArchiveFilter();
  setupReveal();
  setupSearchShortcut();
})();
