(function () {
  'use strict';

  var command = document.querySelector('[data-garden-command]');
  if (!command) return;

  var input = command.querySelector('#folio-command-input');
  var results = command.querySelector('#folio-command-results');
  var status = command.querySelector('[data-command-status]');
  var empty = command.querySelector('[data-command-empty]');
  var closeButton = command.querySelector('[data-command-close]');
  var searchLink = document.querySelector('[data-search-link]');
  var items = Array.prototype.slice.call(command.querySelectorAll('[data-command-item]'));
  var defaults = items.filter(function (item) { return item.hasAttribute('data-command-default'); });
  var visibleItems = [];
  var activeIndex = -1;
  var opener = null;
  var resultLimit = 8;
  var shortcutLabel = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent) ? '⌘ K' : 'Ctrl K';

  items.forEach(function (item, index) {
    item.id = 'folio-command-option-' + index;
    item.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('[data-command-shortcut]').forEach(function (hint) {
    hint.textContent = shortcutLabel;
  });

  function normalize(value) {
    var text = String(value || '');
    if (text.normalize) text = text.normalize('NFKC');
    return text.toLocaleLowerCase('zh-CN').replace(/\s+/g, ' ').trim();
  }

  function scoreItem(item, terms, phrase) {
    var title = normalize(item.querySelector('strong').textContent);
    var haystack = normalize(item.textContent);
    if (!terms.every(function (term) { return haystack.indexOf(term) !== -1; })) return -1;

    var score = item.hasAttribute('data-command-default') ? 5 : 0;
    if (title === phrase) score += 100;
    else if (title.indexOf(phrase) === 0) score += 60;
    else if (title.indexOf(phrase) !== -1) score += 40;
    terms.forEach(function (term) {
      if (title.indexOf(term) !== -1) score += 12;
    });
    return score;
  }

  function setActive(index, shouldScroll) {
    visibleItems.forEach(function (item) {
      item.classList.remove('is-active');
      item.setAttribute('aria-selected', 'false');
    });

    if (!visibleItems.length) {
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }

    activeIndex = (index + visibleItems.length) % visibleItems.length;
    var item = visibleItems[activeIndex];
    item.classList.add('is-active');
    item.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', item.id);
    if (shouldScroll) item.scrollIntoView({ block: 'nearest' });
  }

  function renderResults() {
    var query = normalize(input.value);
    var terms = query ? query.split(' ').filter(Boolean) : [];
    var matches;

    if (!terms.length) {
      matches = defaults.slice();
    } else {
      matches = items.map(function (item, index) {
        return { item: item, index: index, score: scoreItem(item, terms, query) };
      }).filter(function (match) {
        return match.score >= 0;
      }).sort(function (left, right) {
        return right.score - left.score || left.index - right.index;
      }).map(function (match) {
        return match.item;
      });
    }

    items.forEach(function (item) {
      item.hidden = true;
      item.classList.remove('is-active');
      item.setAttribute('aria-selected', 'false');
    });

    visibleItems = matches.slice(0, resultLimit);
    visibleItems.forEach(function (item) {
      results.appendChild(item);
      item.hidden = false;
    });

    empty.hidden = visibleItems.length !== 0;
    if (!query) {
      status.textContent = '快速移动到花园中的任意坐标';
    } else if (matches.length) {
      status.textContent = '找到 ' + matches.length + ' 个与“' + input.value.trim() + '”相关的坐标';
    } else {
      status.textContent = '没有找到与“' + input.value.trim() + '”相关的坐标';
    }
    setActive(0, false);
  }

  function isOpen() {
    return command.hasAttribute('open');
  }

  function openCommand(source) {
    if (isOpen()) return;
    opener = source || document.activeElement;
    input.value = '';
    renderResults();
    if (typeof command.showModal === 'function') command.showModal();
    else command.setAttribute('open', '');
    input.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('garden-command-open');
    window.requestAnimationFrame(function () {
      command.classList.add('is-visible');
      input.focus();
    });
  }

  function closeCommand(options) {
    if (!isOpen()) return;
    command.classList.remove('is-visible');
    input.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('garden-command-open');
    if (typeof command.close === 'function') command.close();
    else command.removeAttribute('open');
    if (!options || options.restoreFocus !== false) {
      if (opener && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
    }
  }

  input.addEventListener('input', renderResults);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex + 1, true);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1, true);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      var link = visibleItems[activeIndex].querySelector('a');
      if (link) link.click();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeCommand();
    }
  });

  results.addEventListener('pointermove', function (event) {
    var item = event.target.closest('[data-command-item]');
    var index = visibleItems.indexOf(item);
    if (index >= 0 && index !== activeIndex) setActive(index, false);
  });
  results.addEventListener('click', function (event) {
    if (event.target.closest('a')) closeCommand({ restoreFocus: false });
  });
  closeButton.addEventListener('click', function () { closeCommand(); });
  command.addEventListener('click', function (event) {
    if (event.target === command) closeCommand();
  });
  command.addEventListener('cancel', function (event) {
    event.preventDefault();
    closeCommand();
  });

  if (searchLink) {
    searchLink.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openCommand(searchLink);
    });
  }

  document.addEventListener('keydown', function (event) {
    var commandKey = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k';
    var slashKey = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
    var target = event.target;
    var isEditing = target && (target.matches('input, textarea, select') || target.isContentEditable);
    if (!commandKey && (!slashKey || isEditing)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (isOpen()) closeCommand();
    else openCommand(target);
  }, true);
})();
