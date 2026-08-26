const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const nunjucks = require('nunjucks');

const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, 'themes/garden/source/js', name), 'utf8');
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise(setImmediate); };

function postFixture(t) {
  const dom = new JSDOM(`<div class="article-wrap" data-toc-enabled="true">
    <div class="article-body"><h1 id="title">Title</h1><h2 id="one">One</h2><p>Text</p><h3 id="detail">Detail</h3><h2 id="two">Two</h2>
    <pre><code>const answer = 42;</code></pre><table><tr><td>Data</td></tr></table></div>
    <aside id="article-toc"><nav id="toc-nav"></nav></aside><div id="toc-overlay"></div></div>`,
  { url: 'https://garden.test/article/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const { window } = dom;
  const motion = { matches: false, addEventListener() {} };
  window.matchMedia = query => query.includes('reduced-motion') ? motion : { matches: false, addEventListener() {} };
  const frames = [];
  window.requestAnimationFrame = fn => { frames.push(fn); return frames.length; };
  const scrolls = [];
  window.HTMLElement.prototype.scrollIntoView = function (options) { scrolls.push({ id: this.id, options }); };
  const headings = [...window.document.querySelectorAll('.article-body h2, .article-body h3')];
  let position = 0;
  headings.forEach((heading, index) => { heading.getBoundingClientRect = () => ({ top: 200 + index * 1000 - position }); });
  window.eval(source('post.js'));
  return { window, motion, scrolls, scrollTo(y) {
    position = y;
    window.dispatchEvent(new window.Event('scroll'));
    while (frames.length) frames.shift()();
  } };
}

test('TOC scrollspy never scrolls document ancestors and tracks long sections in either direction', t => {
  const page = postFixture(t);
  page.scrollTo(2300);
  assert.equal(page.window.document.querySelector('#toc-nav [aria-current]').getAttribute('href'), '#two');
  page.scrollTo(1700);
  assert.equal(page.window.document.querySelector('#toc-nav [aria-current]').getAttribute('href'), '#detail');
  assert.equal(page.scrolls.length, 0);
  page.window.document.querySelector('#toc-nav a[href="#two"]').click();
  assert.equal(page.scrolls.length, 1);
  assert.equal(page.scrolls[0].id, 'two');
  assert.equal(page.window.document.activeElement.id, 'two');
  assert.equal(page.window.location.hash, '#two');
});

test('anchor navigation reads current reduced-motion preference and heading names are not duplicated', t => {
  const page = postFixture(t);
  page.motion.matches = true;
  page.window.document.querySelector('#one .h-anchor').click();
  assert.equal(page.scrolls[0].options.behavior, 'instant');
  const heading = page.window.document.querySelector('h1');
  assert.equal(heading.getAttribute('aria-label'), 'Title');
  assert.equal(heading.querySelector('.h-anchor').getAttribute('aria-label'), '跳转到“Title”');
  assert.equal(page.window.document.querySelector('.table-scroll').getAttribute('tabindex'), '0');
});

test('copy denial and exceptions show retry feedback, remove fallback textarea and preserve focus', async t => {
  const { window } = postFixture(t);
  window.document.execCommand = () => { throw new Error('denied'); };
  const button = window.document.querySelector('.code-copy');
  button.focus();
  button.click();
  await settle();
  assert.match(window.document.querySelector('.code-copy-status').textContent, /复制失败/);
  assert.equal(window.document.querySelector('textarea'), null);
  assert.equal(window.document.activeElement, button);
  assert.equal(button.disabled, false);
  window.document.execCommand = () => true;
  button.click();
  await settle();
  assert.equal(window.document.querySelector('.code-copy-status').textContent, '已复制');
});

function searchFixture(t) {
  const dom = new JSDOM(`<div data-search-page data-index-url="/search-index.json">
    <form class="garden-search"><input id="garden-search-input"></form>
    <div id="garden-search-status"></div><ol id="garden-search-results"></ol><div id="garden-search-empty" hidden></div>
    <button data-search-suggestion="UML">UML</button></div>`,
  { url: 'https://garden.test/search/?q=old', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  let resolve, reject;
  dom.window.fetch = () => new Promise((yes, no) => { resolve = yes; reject = no; });
  dom.window.eval(source('search.js'));
  const document = dom.window.document;
  return { window: dom.window, input: document.querySelector('input'), status: document.querySelector('#garden-search-status'),
    results: document.querySelector('ol'), empty: document.querySelector('#garden-search-empty'),
    resolve: posts => resolve({ ok: true, json: async () => ({ posts }) }), reject,
    submit: () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { cancelable: true })) };
}

test('search retains typing during index loading and never reports premature empty results', async t => {
  const page = searchFixture(t);
  assert.equal(page.input.value, 'old');
  page.input.value = 'UML';
  page.submit();
  assert.match(page.status.textContent, /加载完成/);
  assert.equal(page.empty.hidden, true);
  assert.equal(page.results.getAttribute('aria-busy'), 'true');
  page.resolve([{ title: 'UML 笔记', content: 'Diagram', url: '/uml/', date: '2026-08-26' }]);
  await settle();
  assert.equal(page.input.value, 'UML');
  assert.equal(page.results.children.length, 1);
  assert.equal(page.results.getAttribute('aria-busy'), 'false');
  assert.equal(new URL(page.window.location.href).searchParams.get('q'), 'UML');
  page.input.value = 'not-found';
  page.submit();
  assert.equal(page.empty.hidden, false);
  page.input.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(page.empty.hidden, true);
  assert.equal(page.results.children.length, 0);
});

test('search loading failure is explicit and not overwritten by later interactions', async t => {
  const page = searchFixture(t);
  page.reject(new Error('offline'));
  await settle();
  page.window.document.querySelector('button').click();
  assert.match(page.status.textContent, /无法读取/);
  assert.equal(page.results.getAttribute('aria-busy'), 'false');
  assert.equal(page.empty.hidden, true);
});

test('archive pagination exposes reachable prev/next routes and labels filtering as page-local', () => {
  const template = fs.readFileSync(path.join(root, 'themes/garden/layout/archive.njk'), 'utf8').replace("{% extends '_layout.njk' %}", '');
  const env = new nunjucks.Environment(null, { autoescape: true });
  const posts = { toArray: () => [{ title: 'Test', path: 'test/', date: { format: f => f === 'YYYY' ? '2026' : '2026-08-26' }, categories: { toArray: () => [] }, tags: { toArray: () => [] } }] };
  const context = { is_tag: () => false, is_category: () => false, url_for: p => '/' + p,
    site: { posts, tags: { length: 0 }, categories: { length: 0 } }, page: { posts, total: 3, current: 2, prev: 1, prev_link: 'archives/', next: 3, next_link: 'archives/page/3/' } };
  const html = env.renderString(template, context);
  assert.match(html, /href="\/archives\/" rel="prev"/);
  assert.match(html, /href="\/archives\/page\/3\/" rel="next"/);
  assert.match(html, /筛选本页/);
  assert.match(html, /第 2 \/ 3 页/);
  context.page.total = 1;
  assert.doesNotMatch(env.renderString(template, context), /class="archive-pagination"/);
});

test('generated non-home pages have unique IDs and valid local links, fragments and assets', () => {
  const publicDir = path.join(root, 'public');
  const files = fs.readdirSync(publicDir, { recursive: true }).filter(file => file.endsWith('.html'));
  const docs = new Map();
  function documentFor(file) {
    if (!docs.has(file)) docs.set(file, new JSDOM(fs.readFileSync(path.join(publicDir, file), 'utf8')));
    return docs.get(file).window.document;
  }
  const problems = [];
  for (const file of files.filter(file => file !== 'index.html')) {
    const document = documentFor(file);
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    if (ids.length !== new Set(ids).size) problems.push(`${file}: duplicate IDs`);
    for (const element of document.querySelectorAll('a[href], img[src], script[src], link[rel="stylesheet"][href]')) {
      const raw = element.getAttribute('href') || element.getAttribute('src');
      if (!raw || raw === '#') continue;
      const url = new URL(raw, 'https://garden.test/' + file.replaceAll('\\', '/'));
      if (url.origin !== 'https://garden.test') continue;
      let target = decodeURIComponent(url.pathname).slice(1);
      if (!target || target.endsWith('/')) target += 'index.html';
      if (!fs.existsSync(path.join(publicDir, target))) { problems.push(`${file}: missing ${raw}`); continue; }
      if (url.hash && target.endsWith('.html') && !documentFor(target).getElementById(decodeURIComponent(url.hash.slice(1)))) problems.push(`${file}: missing anchor ${raw}`);
    }
  }
  for (const dom of docs.values()) dom.window.close();
  assert.deepEqual(problems, []);
});
