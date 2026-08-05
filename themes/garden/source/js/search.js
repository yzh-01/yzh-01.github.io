(function () {
  'use strict';

  var page = document.querySelector('[data-search-page]');
  if (!page) return;

  var form = page.querySelector('.garden-search');
  var input = document.getElementById('garden-search-input');
  var status = document.getElementById('garden-search-status');
  var results = document.getElementById('garden-search-results');
  var empty = document.getElementById('garden-search-empty');
  var suggestions = page.querySelectorAll('[data-search-suggestion]');
  var records = [];
  var timer = 0;

  function normalize(value) {
    return String(value || '')
      .toLocaleLowerCase('zh-CN')
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function termsFor(query) {
    var normalized = normalize(query);
    if (!normalized) return [];
    return normalized.split(' ').filter(Boolean);
  }

  function scoreRecord(record, query) {
    var terms = termsFor(query);
    if (!terms.length) return -1;

    var title = normalize(record.title);
    var description = normalize(record.description);
    var tags = normalize((record.tags || []).join(' '));
    var categories = normalize((record.categories || []).join(' '));
    var content = normalize(record.content);
    var score = 0;

    for (var index = 0; index < terms.length; index += 1) {
      var term = terms[index];
      var matched = false;
      if (title.indexOf(term) !== -1) { score += 12; matched = true; }
      if (tags.indexOf(term) !== -1) { score += 8; matched = true; }
      if (categories.indexOf(term) !== -1) { score += 6; matched = true; }
      if (description.indexOf(term) !== -1) { score += 5; matched = true; }
      if (content.indexOf(term) !== -1) { score += 1; matched = true; }
      if (!matched) return -1;
    }

    var phrase = normalize(query);
    if (title === phrase) score += 24;
    else if (title.indexOf(phrase) !== -1) score += 10;
    return score;
  }

  function createMeta(record) {
    var meta = document.createElement('div');
    meta.className = 'search-result-meta';

    if (record.date) {
      var time = document.createElement('time');
      time.dateTime = record.date;
      time.textContent = record.date;
      meta.appendChild(time);
    }

    (record.categories || []).slice(0, 1).forEach(function (category) {
      var span = document.createElement('span');
      span.textContent = category;
      meta.appendChild(span);
    });

    (record.tags || []).slice(0, 3).forEach(function (tag) {
      var span = document.createElement('span');
      span.textContent = '#' + tag;
      meta.appendChild(span);
    });

    return meta;
  }

  function createResult(record) {
    var item = document.createElement('li');
    var link = document.createElement('a');
    var title = document.createElement('h2');
    var description = document.createElement('p');

    link.href = record.url;
    title.textContent = record.title;
    description.textContent = record.description || record.content.slice(0, 140) + (record.content.length > 140 ? '…' : '');
    link.appendChild(title);
    link.appendChild(createMeta(record));
    if (description.textContent) link.appendChild(description);
    item.appendChild(link);
    return item;
  }

  function updateUrl(query) {
    var url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function runSearch(options) {
    var query = input.value.trim();
    if (!options || options.updateUrl !== false) updateUrl(query);
    results.replaceChildren();
    empty.hidden = true;

    if (!query) {
      status.textContent = '索引已就绪，共 ' + records.length + ' 篇文章。输入关键词开始搜索。';
      return;
    }

    var matches = records
      .map(function (record) { return { record: record, score: scoreRecord(record, query) }; })
      .filter(function (item) { return item.score >= 0; })
      .sort(function (left, right) {
        return right.score - left.score || String(right.record.date).localeCompare(String(left.record.date));
      })
      .slice(0, 50);

    matches.forEach(function (match) { results.appendChild(createResult(match.record)); });
    status.textContent = matches.length
      ? '找到 ' + matches.length + ' 条与“' + query + '”相关的路径。'
      : '没有找到与“' + query + '”相关的路径。';
    empty.hidden = matches.length !== 0;
  }

  function scheduleSearch() {
    window.clearTimeout(timer);
    timer = window.setTimeout(runSearch, 90);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    runSearch();
  });
  input.addEventListener('input', scheduleSearch);
  input.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    input.value = '';
    runSearch();
  });

  suggestions.forEach(function (button) {
    button.addEventListener('click', function () {
      input.value = button.dataset.searchSuggestion || '';
      input.focus();
      runSearch();
    });
  });

  fetch(page.dataset.indexUrl, { credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) throw new Error('Search index request failed');
      return response.json();
    })
    .then(function (data) {
      records = Array.isArray(data.posts) ? data.posts : [];
      var initialQuery = new URL(window.location.href).searchParams.get('q') || '';
      input.value = initialQuery;
      runSearch({ updateUrl: false });
    })
    .catch(function () {
      status.textContent = '搜索索引暂时无法读取，请刷新页面后重试。';
      form.classList.add('is-unavailable');
      input.disabled = true;
    });
})();
