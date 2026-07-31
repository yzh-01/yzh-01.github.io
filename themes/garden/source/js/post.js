(function () {
  'use strict';

  var wrap = document.querySelector('.article-wrap');
  var articleBody = document.querySelector('.article-body');
  if (!wrap || !articleBody) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileQuery = window.matchMedia('(max-width: 1023px)');
  var tocEnabled = wrap.dataset.tocEnabled === 'true';
  var toc = document.getElementById('article-toc');
  var tocNav = document.getElementById('toc-nav');
  var tocHandle = document.getElementById('toc-handle');
  var tocToggle = document.getElementById('toc-toggle');
  var tocClose = document.getElementById('toc-close');
  var tocOverlay = document.getElementById('toc-overlay');
  var headings = Array.prototype.slice.call(articleBody.querySelectorAll('h2, h3'));
  var lastFocused = null;

  function scrollToHeading(id) {
    var target = document.getElementById(id);
    if (!target) return;
    history.replaceState(null, '', '#' + id);
    target.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start'
    });
  }

  function getHeadingText(heading) {
    var clone = heading.cloneNode(true);
    clone.querySelectorAll('.headerlink, .h-anchor').forEach(function (anchor) {
      anchor.remove();
    });
    return clone.textContent.trim();
  }

  headings.forEach(function (heading, index) {
    var headingText = getHeadingText(heading);
    heading.dataset.tocText = headingText;

    if (!heading.id) {
      var slug = headingText
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u4e00-\u9fff-]/g, '')
        .toLowerCase();
      heading.id = slug || 'section-' + (index + 1);
    }

    var anchor = heading.querySelector('.headerlink') || document.createElement('a');
    anchor.className = 'h-anchor';
    anchor.href = '#' + heading.id;
    anchor.setAttribute('aria-label', '跳转到“' + headingText + '”');
    anchor.textContent = '#';
    anchor.addEventListener('click', function (event) {
      event.preventDefault();
      scrollToHeading(heading.id);
    });
    if (!anchor.parentElement) heading.appendChild(anchor);
  });

  function closeToc(options) {
    if (!toc || !tocToggle || !tocOverlay) return;
    toc.classList.remove('mobile-open');
    tocOverlay.classList.remove('open');
    tocOverlay.hidden = true;
    tocToggle.setAttribute('aria-expanded', 'false');
    tocToggle.setAttribute('aria-label', '打开文章目录');
    document.body.classList.remove('toc-open');
    if (!options || options.restoreFocus !== false) {
      (lastFocused || tocToggle).focus();
    }
  }

  function openToc() {
    if (!toc || !tocToggle || !tocOverlay) return;
    lastFocused = document.activeElement;
    tocOverlay.hidden = false;
    toc.classList.add('mobile-open');
    tocOverlay.classList.add('open');
    tocToggle.setAttribute('aria-expanded', 'true');
    tocToggle.setAttribute('aria-label', '关闭文章目录');
    document.body.classList.add('toc-open');
    var firstLink = tocNav && tocNav.querySelector('a');
    (firstLink || toc).focus();
  }

  function setupToc() {
    if (!tocEnabled || !toc || !tocNav || !headings.length) {
      wrap.classList.add('no-toc');
      if (tocToggle) tocToggle.hidden = true;
      return;
    }

    wrap.classList.add('has-toc');
    document.body.classList.add('has-toc-page');
    if (tocToggle) tocToggle.hidden = false;

    headings.forEach(function (heading) {
      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.dataset.tocText || getHeadingText(heading);
      if (heading.tagName.toLowerCase() === 'h3') link.className = 'toc-h3';
      link.addEventListener('click', function (event) {
        event.preventDefault();
        scrollToHeading(heading.id);
        if (mobileQuery.matches) closeToc({ restoreFocus: false });
      });
      tocNav.appendChild(link);
    });

    if ('IntersectionObserver' in window) {
      var tocLinks = tocNav.querySelectorAll('a');
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          tocLinks.forEach(function (link) { link.classList.remove('active'); });
          var active = tocNav.querySelector('a[href="#' + CSS.escape(entry.target.id) + '"]');
          if (active) {
            active.classList.add('active');
            active.scrollIntoView({ block: 'nearest' });
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      headings.forEach(function (heading) { observer.observe(heading); });
    }

    if (tocToggle) {
      tocToggle.addEventListener('click', function () {
        toc.classList.contains('mobile-open') ? closeToc() : openToc();
      });
    }
    if (tocClose) tocClose.addEventListener('click', closeToc);
    if (tocOverlay) tocOverlay.addEventListener('click', closeToc);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toc.classList.contains('mobile-open')) {
        closeToc();
        return;
      }
      if (event.key !== 'Tab' || !toc.classList.contains('mobile-open')) return;

      var focusable = toc.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    mobileQuery.addEventListener('change', function (event) {
      if (!event.matches) closeToc({ restoreFocus: false });
    });
  }

  function setupResize() {
    if (!tocEnabled || !tocHandle) return;

    var minWidth = 140;
    var maxWidth = 360;
    var startX = 0;
    var startWidth = 200;

    function setWidth(width, persist) {
      var next = Math.max(minWidth, Math.min(maxWidth, width));
      wrap.style.setProperty('--toc-w', next + 'px');
      tocHandle.setAttribute('aria-valuenow', String(next));
      if (persist) {
        try { localStorage.setItem('toc-width', String(next)); } catch (_) {}
      }
    }

    try {
      var saved = parseInt(localStorage.getItem('toc-width'), 10);
      if (saved) setWidth(saved, false);
    } catch (_) {}

    tocHandle.addEventListener('pointerdown', function (event) {
      if (mobileQuery.matches) return;
      event.preventDefault();
      startX = event.clientX;
      startWidth = parseInt(getComputedStyle(wrap).getPropertyValue('--toc-w'), 10) || 200;
      tocHandle.setPointerCapture(event.pointerId);
      document.body.classList.add('toc-resizing');
    });

    tocHandle.addEventListener('pointermove', function (event) {
      if (!tocHandle.hasPointerCapture(event.pointerId)) return;
      setWidth(startWidth + startX - event.clientX, false);
    });

    function finishResize(event) {
      if (!tocHandle.hasPointerCapture(event.pointerId)) return;
      tocHandle.releasePointerCapture(event.pointerId);
      document.body.classList.remove('toc-resizing');
      setWidth(parseInt(getComputedStyle(wrap).getPropertyValue('--toc-w'), 10) || 200, true);
    }

    tocHandle.addEventListener('pointerup', finishResize);
    tocHandle.addEventListener('pointercancel', finishResize);
    tocHandle.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var current = parseInt(getComputedStyle(wrap).getPropertyValue('--toc-w'), 10) || 200;
      setWidth(current + (event.key === 'ArrowLeft' ? 10 : -10), true);
    });
  }

  function setupCodeBlocks() {
    function copyCodeText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).catch(function () {
          return fallbackCopy(text);
        });
      }
      return fallbackCopy(text);
    }

    function fallbackCopy(text) {
      return new Promise(function (resolve, reject) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.select();
        var copied = document.execCommand('copy');
        textarea.remove();
        if (copied) resolve();
        else reject(new Error('Copy command failed'));
      });
    }

    function addWindowControls(container, languageName, getCodeText) {
      if (container.classList.contains('mac-code-block')) return;
      container.classList.add('mac-code-block');

      var controls = document.createElement('span');
      controls.className = 'code-window-controls';
      controls.setAttribute('aria-hidden', 'true');
      controls.innerHTML = '<i></i><i></i><i></i>';
      container.appendChild(controls);

      var language = document.createElement('span');
      language.className = 'code-lang';
      language.textContent = languageName || 'text';
      container.appendChild(language);

      var button = document.createElement('button');
      button.className = 'code-copy';
      button.type = 'button';
      button.setAttribute('aria-label', '复制代码');
      button.title = '复制代码';
      button.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
      button.addEventListener('click', function () {
        copyCodeText(getCodeText()).then(function () {
          button.classList.add('copied');
          button.setAttribute('aria-label', '代码已复制');
          button.title = '代码已复制';
          window.setTimeout(function () {
            button.classList.remove('copied');
            button.setAttribute('aria-label', '复制代码');
            button.title = '复制代码';
          }, 1800);
        });
      });
      container.appendChild(button);
    }

    articleBody.querySelectorAll('figure.highlight').forEach(function (figure) {
      var languageName = Array.prototype.find.call(figure.classList, function (className) {
        return className !== 'highlight';
      }) || 'text';
      var codeCell = figure.querySelector('td.code') || figure.querySelector('.code');
      if (!codeCell) return;

      addWindowControls(figure, languageName, function () {
        var lines = codeCell.querySelectorAll('.line');
        if (!lines.length) return codeCell.textContent || '';
        return Array.prototype.map.call(lines, function (line) {
          return line.textContent || '';
        }).join('\n');
      });
    });

    articleBody.querySelectorAll('pre').forEach(function (pre) {
      if (pre.closest('figure.highlight')) return;
      var code = pre.querySelector('code');
      if (!code) return;

      var languageMatch = (code.className || '').match(/language-([\w-]+)/);
      addWindowControls(pre, languageMatch ? languageMatch[1] : 'text', function () {
        return code.textContent || '';
      });
    });

    articleBody.querySelectorAll('table').forEach(function (table) {
      if (table.closest('figure.highlight')) return;
      if (table.parentElement && table.parentElement.classList.contains('table-scroll')) return;
      var wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', '可横向滚动的表格');
      wrapper.tabIndex = 0;
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  setupToc();
  setupResize();
  setupCodeBlocks();
})();
