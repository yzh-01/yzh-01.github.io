'use strict';

function decodeEntities(value) {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"'
  };

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] || entity);
}

function toPlainText(value) {
  return decodeEntities(String(value || ''))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectionNames(collection) {
  if (!collection || typeof collection.toArray !== 'function') return [];
  return collection.toArray().map(item => item.name);
}

hexo.extend.generator.register('garden-search-index', function generateSearchIndex(locals) {
  const root = String(hexo.config.root || '/').replace(/\/?$/, '/');
  const posts = locals.posts
    .sort('-date')
    .toArray()
    .map(post => ({
      title: toPlainText(post.title),
      url: `${root}${post.path}`.replace(/\/{2,}/g, '/'),
      description: toPlainText(post.description || post.excerpt),
      content: toPlainText(post.content),
      tags: collectionNames(post.tags),
      categories: collectionNames(post.categories),
      date: post.date ? post.date.format('YYYY-MM-DD') : '',
      updated: post.updated ? post.updated.format('YYYY-MM-DD') : '',
      status: toPlainText(post.garden_status || post.status || '')
    }));

  return {
    path: 'search-index.json',
    data: JSON.stringify({ posts })
  };
});
