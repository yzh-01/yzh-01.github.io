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

    function renderContributionWall(now) {
      if (!wall || !contributionGrid || !contributionMonths) return;
      var counts = Object.create(null);
      var dateNodes = wall.querySelectorAll('[data-contribution-date]');
      Array.prototype.forEach.call(dateNodes, function (node) {
        var key = node.dataset.contributionDate;
        counts[key] = (counts[key] || 0) + 1;
      });

      var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var end = new Date(today);
      end.setDate(end.getDate() + (6 - end.getDay()));
      var start = new Date(end);
      start.setDate(start.getDate() - 195);
      var todayKey = dateKey(today);
      var activeDays = 0;
      var fragment = document.createDocumentFragment();
      contributionGrid.textContent = '';
      contributionMonths.textContent = '';

      for (var dayIndex = 0; dayIndex < 196; dayIndex += 1) {
        var day = new Date(start);
        day.setDate(start.getDate() + dayIndex);
        var key = dateKey(day);
        var count = counts[key] || 0;
        if (count) activeDays += 1;
        var level = count === 0 ? 0 : (count === 1 ? 3 : 4);
        var cell = document.createElement('span');
        cell.dataset.level = String(level);
        cell.dataset.date = key;
        cell.dataset.count = String(count);
        cell.dataset.index = String(dayIndex);
        cell.style.setProperty('--cell-delay', ((dayIndex % 28) * 14 + (dayIndex % 7) * 18) + 'ms');
        cell.title = key + ' · ' + count + (count === 1 ? ' article' : ' articles');
        if (day > today) cell.classList.add('is-future');
        if (key === todayKey) cell.classList.add('is-today');
        fragment.appendChild(cell);
      }
      contributionGrid.appendChild(fragment);
      contributionGrid.setAttribute('aria-label', '最近二十八周共有 ' + activeDays + ' 天发布了文章');
      if (contributionSummary) {
        contributionSummary.textContent = String(activeDays).padStart(2, '0') + ' ACTIVE DAYS';
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
      renderContributionWall(now);
      renderCalendar(now);
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
        contributionSummary.textContent = cell.dataset.date.replace(/-/g, '.') + (count ? ' / +' + count : ' / IDLE');
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
    var source = card.querySelector('[data-home-quote-source]');
    var items = Array.prototype.slice.call(card.querySelectorAll('[data-home-quote-pool] > span'));
    if (!quote || !source || items.length < 2) return;
    var currentText = quote.textContent.replace(/[“”]/g, '').trim();
    var timer = 0;
    var changeTimer = 0;

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        if (!document.hidden) showNext();
        else schedule();
      }, 8500);
    }

    function showNext() {
      window.clearTimeout(changeTimer);
      var candidates = items.filter(function (item) { return item.textContent.trim() !== currentText; });
      var pool = candidates.length ? candidates : items;
      var item = pool[Math.floor(Math.random() * pool.length)];
      card.classList.add('is-changing');
      changeTimer = window.setTimeout(function () {
        quote.textContent = '“' + item.textContent.trim() + '”';
        source.textContent = '— ' + item.dataset.quoteSource;
        currentText = item.textContent.trim();
        card.classList.remove('is-changing');
      }, gardenMotionIsLite() ? 0 : 170);
      schedule();
    }

    card.addEventListener('click', showNext);
    card.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      showNext();
    });
    schedule();
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

    var pointerX = window.innerWidth / 2;
    var pointerY = window.innerHeight / 2;
    var frameX = pointerX;
    var frameY = pointerY;
    var frameW = 34;
    var frameH = 34;
    var targetX = frameX;
    var targetY = frameY;
    var targetW = frameW;
    var targetH = frameH;
    var currentTarget = null;

    function render() {
      frameX += (targetX - frameX) * .2;
      frameY += (targetY - frameY) * .2;
      frameW += (targetW - frameW) * .22;
      frameH += (targetH - frameH) * .22;
      dot.style.transform = 'translate3d(' + pointerX.toFixed(1) + 'px,' + pointerY.toFixed(1) + 'px,0)';
      frameElement.style.width = frameW.toFixed(1) + 'px';
      frameElement.style.height = frameH.toFixed(1) + 'px';
      frameElement.style.transform = 'translate3d(' + frameX.toFixed(1) + 'px,' + frameY.toFixed(1) + 'px,0)';
      if (label) label.style.transform = 'translate3d(' + (frameX + frameW + 7).toFixed(1) + 'px,' + (frameY + 5).toFixed(1) + 'px,0)';
      window.requestAnimationFrame(render);
    }

    function updateTarget(element) {
      if (element === currentTarget) return;
      currentTarget = element;
      cursor.classList.toggle('is-targeting', Boolean(element));
      if (!element) return;
      var rect = element.getBoundingClientRect();
      targetX = rect.left - 5;
      targetY = rect.top - 5;
      targetW = rect.width + 10;
      targetH = rect.height + 10;
    }

    document.addEventListener('pointermove', function (event) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      var hovered = event.target.closest ? event.target.closest('a, button, [data-cursor-target]') : null;
      updateTarget(hovered);
      if (!hovered) {
        targetX = pointerX;
        targetY = pointerY;
        targetW = 34;
        targetH = 34;
      }
      cursor.classList.add('is-visible');
    }, { passive: true });
    document.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });
    document.documentElement.addEventListener('mouseleave', function () { cursor.classList.remove('is-visible'); });
    window.addEventListener('scroll', function () {
      if (!currentTarget) return;
      var rect = currentTarget.getBoundingClientRect();
      targetX = rect.left - 5;
      targetY = rect.top - 5;
    }, { passive: true });

    root.classList.add('garden-cursor-on');
    window.requestAnimationFrame(render);
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
    var target = text ? text.dataset.outroValue || text.textContent : '';
    var glyphs = '▒░▓/\\<>[]{}01?#';
    var models = [];
    var decodeFrame = 0;
    var physicsFrame = 0;
    var pointerFrame = 0;
    var settleFrame = 0;
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

    function setTune(value, randomize) {
      tune = Math.max(0, Math.min(1, value));
      var percentage = Math.round(tune * 100);
      outro.style.setProperty('--outro-tune', tune.toFixed(3));
      if (track) {
        var trackX = Math.max(0, (track.clientWidth - 7) * tune);
        outro.style.setProperty('--outro-track-x', trackX.toFixed(1) + 'px');
        track.setAttribute('aria-valuenow', percentage);
      }
      if (meter) meter.textContent = 'SIGNAL ' + String(percentage).padStart(3, '0') + '%';
      if (dragging) setStatus('FIELD.TUNE: ' + String(percentage).padStart(3, '0') + ' // RELEASE TO RESOLVE');
      applyCharacters(tune, randomize);
      schedulePhysics();
    }

    function settleTune() {
      window.cancelAnimationFrame(settleFrame);
      var from = tune;
      var started = performance.now();
      var duration = 620;

      function render(now) {
        var progress = Math.min(1, (now - started) / duration);
        var eased = 1 - Math.pow(1 - progress, 4);
        setTune(from + (1 - from) * eased, true);
        if (progress < 1) settleFrame = window.requestAnimationFrame(render);
        else {
          setTune(1, false);
          setStatus(baseStatus);
        }
      }

      settleFrame = window.requestAnimationFrame(render);
    }

    function updateTune(clientX) {
      if (!track) return;
      var rect = track.getBoundingClientRect();
      setTune((clientX - rect.left) / rect.width, true);
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

      if (pointerActive || dragging || isMoving || pointerEnergy > .01) schedulePhysics();
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
        schedulePhysics();
      });
      outro.addEventListener('pointermove', function (event) {
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
        outro.classList.add('is-tuning');
        track.setPointerCapture(event.pointerId);
        measureTitle();
        updateTune(event.clientX);
      });
      track.addEventListener('pointermove', function (event) {
        if (!dragging) return;
        updateTune(event.clientX);
      });
      track.addEventListener('pointerup', function (event) {
        if (!dragging) return;
        dragging = false;
        pointerActive = finePointer.matches;
        outro.classList.remove('is-tuning');
        if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
        settleTune();
      });
      track.addEventListener('pointercancel', function () {
        dragging = false;
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
        setTune(next, true);
        dragging = false;
        window.clearTimeout(track._settleTimer);
        track._settleTimer = window.setTimeout(function () {
          outro.classList.remove('is-tuning');
          settleTune();
        }, 360);
      });
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
    var close = overlay.querySelector('[data-overgrowth-close]');
    var status = overlay.querySelector('[data-overgrowth-status]');
    var keeperLabel = overlay.querySelector('.garden-overgrowth-cat span');
    var keeper = overlay.querySelector('.garden-overgrowth-cat');
    var keeperFrame = overlay.querySelector('[data-sumi-frame]');
    var keeperBase = keeperFrame ? keeperFrame.getAttribute('data-sumi-base') : '';
    var vines = overlay.querySelector('.garden-overgrowth-vines');
    var spores = overlay.querySelector('.garden-overgrowth-spores');
    var sequence = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
    var keeperMotions = {
      run: { count: 8, fps: 15, loop: true },
      pounce: { count: 5, fps: 6.2, loop: false },
      strike: { count: 4, fps: 7, loop: false },
      hold: { count: 6, fps: 5, loop: true }
    };
    var position = 0;
    var timers = [];
    var active = false;
    var pointerFrame = 0;
    var pointerX = 0;
    var pointerY = 0;
    var keeperAnimation = 0;
    var keeperMotion = null;
    var keeperFrameIndex = -1;

    function keeperFrameUrl(name, index) {
      return keeperBase + name + '/' + String(index).padStart(2, '0') + '.webp';
    }

    function preloadKeeper() {
      if (!keeperFrame || !keeperBase) return;
      Object.keys(keeperMotions).forEach(function (name) {
        for (var index = 0; index < keeperMotions[name].count; index += 1) {
          var image = new Image();
          image.decoding = 'async';
          image.src = keeperFrameUrl(name, index);
        }
      });
    }

    function stopKeeperMotion() {
      if (keeperAnimation) window.cancelAnimationFrame(keeperAnimation);
      keeperAnimation = 0;
      keeperMotion = null;
      keeperFrameIndex = -1;
    }

    function renderKeeperFrame(now) {
      if (!keeperMotion || !keeperFrame) return;
      var elapsed = Math.max(0, now - keeperMotion.startedAt);
      var rawIndex = Math.floor(elapsed * keeperMotion.mode.fps / 1000);
      var index = keeperMotion.mode.loop
        ? rawIndex % keeperMotion.mode.count
        : Math.min(rawIndex, keeperMotion.mode.count - 1);
      if (index !== keeperFrameIndex) {
        keeperFrame.src = keeperFrameUrl(keeperMotion.name, index);
        keeperFrameIndex = index;
      }
      if (!keeperMotion.mode.loop && rawIndex >= keeperMotion.mode.count - 1) {
        keeperAnimation = 0;
        return;
      }
      keeperAnimation = window.requestAnimationFrame(renderKeeperFrame);
    }

    function setKeeperMotion(name, staticFrame) {
      if (!keeperFrame || !keeperMotions[name]) return;
      stopKeeperMotion();
      keeperFrame.dataset.motion = name;
      if (typeof staticFrame === 'number') {
        keeperFrame.src = keeperFrameUrl(name, Math.max(0, Math.min(staticFrame, keeperMotions[name].count - 1)));
        return;
      }
      keeperMotion = { name: name, mode: keeperMotions[name], startedAt: performance.now() };
      keeperAnimation = window.requestAnimationFrame(renderKeeperFrame);
    }

    function clearTimers() {
      timers.forEach(function (timer) { window.clearTimeout(timer); });
      timers = [];
    }

    function later(callback, delay) {
      timers.push(window.setTimeout(callback, delay));
    }

    function setStatus(message) {
      if (status) status.textContent = message;
    }

    function finish() {
      if (!active || overlay.classList.contains('is-receding')) return;
      clearTimers();
      overlay.classList.add('is-receding');
      document.documentElement.classList.remove('garden-overrun', 'garden-root-impact');
      setStatus('FIELD RESTORED // ROOTS WITHDRAWING');
      later(function () {
        overlay.classList.remove('is-active', 'is-receding', 'is-pouncing', 'is-striking', 'is-contained');
        overlay.setAttribute('aria-hidden', 'true');
        if (vines) vines.style.removeProperty('transform');
        if (spores) spores.style.removeProperty('transform');
        stopKeeperMotion();
        active = false;
      }, gardenMotionIsLite() ? 20 : 780);
    }

    function awaken() {
      clearTimers();
      overlay.classList.remove('is-active', 'is-receding', 'is-pouncing', 'is-striking', 'is-contained');
      document.documentElement.classList.remove('garden-root-impact');
      void overlay.offsetWidth;
      active = true;
      overlay.classList.add('is-active');
      overlay.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('garden-overrun');
      setStatus('ACCESS CODE ACCEPTED // ROOT WAKE');
      if (keeperLabel) keeperLabel.textContent = 'SUMI / INTERCEPTING';
      document.dispatchEvent(new CustomEvent('garden:pet', { detail: '暗号正确。它们正在从页面背面长出来。' }));

      if (gardenMotionIsLite()) {
        overlay.classList.add('is-contained');
        setKeeperMotion('hold', 2);
        later(finish, 4200);
        return;
      }

      setKeeperMotion('run');
      later(function () { setStatus('ROOT NETWORK // 37% // SIGNAL SPREADING'); }, 950);
      later(function () { setStatus('SUMI // INTERCEPT COURSE LOCKED'); }, 1950);
      later(function () {
        overlay.classList.add('is-pouncing');
        setKeeperMotion('pounce');
        if (keeperLabel) keeperLabel.textContent = 'SUMI / POUNCE VECTOR';
      }, 2200);
      later(function () {
        overlay.classList.add('is-striking');
        setKeeperMotion('strike');
        if (keeperLabel) keeperLabel.textContent = 'SUMI / PAW COMMITTED';
        setStatus('SUMI // PAW STRIKE ARMED');
      }, 3100);
      later(function () {
        document.documentElement.classList.add('garden-root-impact');
        setStatus('IMPACT CONFIRMED // NODE COLLAPSING');
      }, 3460);
      later(function () {
        document.documentElement.classList.remove('garden-root-impact');
        overlay.classList.add('is-contained');
        setKeeperMotion('hold');
        if (keeperLabel) keeperLabel.textContent = 'SUMI / NODE PINNED';
        setStatus('OVERGROWTH CONTAINED // RETURNING CONTROL');
        document.dispatchEvent(new CustomEvent('garden:pet', { detail: '抓住了。屏幕很快还你。' }));
      }, 3860);
      later(finish, 6900);
    }

    function renderParallax() {
      pointerFrame = 0;
      if (!active || gardenMotionIsLite()) return;
      var nx = pointerX / Math.max(1, window.innerWidth) - .5;
      var ny = pointerY / Math.max(1, window.innerHeight) - .5;
      if (vines) vines.style.transform = 'translate3d(' + (nx * 22).toFixed(1) + 'px,' + (ny * 16).toFixed(1) + 'px,0)';
      if (spores) spores.style.transform = 'translate3d(' + (nx * -10).toFixed(1) + 'px,' + (ny * -7).toFixed(1) + 'px,0)';
    }

    function createBurst(event) {
      if (!active || gardenMotionIsLite() || event.target.closest('button')) return;
      if (keeper && overlay.classList.contains('is-contained')) {
        var rect = keeper.getBoundingClientRect();
        var hitKeeper = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        if (hitKeeper) {
          overlay.classList.remove('is-contained', 'is-striking');
          void keeper.offsetWidth;
          overlay.classList.add('is-striking');
          setKeeperMotion('strike');
          document.documentElement.classList.add('garden-root-impact');
          setStatus('SUMI // SECONDARY PRESS');
          later(function () {
            document.documentElement.classList.remove('garden-root-impact');
            overlay.classList.add('is-contained');
            setKeeperMotion('hold');
            setStatus('NODE STILL PINNED // GOOD CAT');
          }, 760);
          return;
        }
      }
      var burst = document.createElement('i');
      burst.className = 'garden-root-burst';
      burst.style.left = event.clientX + 'px';
      burst.style.top = event.clientY + 'px';
      burst.setAttribute('aria-hidden', 'true');
      overlay.appendChild(burst);
      burst.addEventListener('animationend', function () { burst.remove(); }, { once: true });
    }

    document.addEventListener('keydown', function (event) {
      var target = event.target;
      if (target && (target.matches('input, textarea, select') || target.isContentEditable)) return;
      if (active && event.key === 'Escape') {
        finish();
        return;
      }
      var key = event.key.toLowerCase();
      position = key === sequence[position] ? position + 1 : (key === sequence[0] ? 1 : 0);
      if (position < sequence.length) return;
      position = 0;
      awaken();
    });

    if (close) close.addEventListener('click', finish);
    preloadKeeper();
    overlay.addEventListener('click', createBurst);
    overlay.addEventListener('pointermove', function (event) {
      if (!active || gardenMotionIsLite()) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderParallax);
    }, { passive: true });
    overlay.addEventListener('pointerleave', function () {
      if (vines) vines.style.transform = 'translate3d(0,0,0)';
      if (spores) spores.style.transform = 'translate3d(0,0,0)';
    });
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
  setupGardenCursor();
  setupGardenRipples();
  setupGardenScramble();
  setupFolioOutro();
  setupFractureTitle();
  setupGardenParticles();
  setupGardenPet();
  setupGardenEasterEgg();
  setupGardenEntry();
  setupHomeClock();
  setupContributionCalendar();
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
