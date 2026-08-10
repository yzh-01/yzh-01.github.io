# CLAUDE.md

## 项目概要

yzh-01.github.io — 个人数字花园（Digital Garden），记录技术学习、生活随笔、读书笔记。Hexo 8.x 静态站点，自有 Garden 极简主题，GitHub Actions 部署到 GitHub Pages。

## 设计系统

- **配色**: 灰 + moss 绿 (`#5c8a63`)，CSS 自定义属性 `--g-*` 前缀
- **浅色/深色**: `prefers-color-scheme` 自动切换，所有 token 在 `:root` 和 `@media (prefers-color-scheme: dark)` 中分别定义

## 关键约定

- 所有数据在**构建时**用 Nunjucks 预计算（`site.posts` 遍历），客户端 JavaScript 零依赖、只做交互增强
- 页面 title/description/OG/canonical 统一由 `_partial/head.njk` 根据页面类型解析
- 标签、分类和时间归档共用 `archive.njk`，但必须使用 `page.posts`，不能遍历全站文章
- 总归档页承担内容索引：构建时生成分类/标签入口，`site.js` 只在当前页做标题/标签/分类筛选
- 桌面 TOC 用 Pointer Events + 键盘调宽；移动端使用底部抽屉，不使用右侧 drawer
- Nunjucks 模板引擎**不支持 `set` filter**，字典/分组用 tracking 变量 + 线性迭代实现
- 设计方向：Apple/Linear/Vercel 式极简，微交互（hover 过渡），禁用 flashy 动画
- 尊重 `prefers-reduced-motion`，动画用户选择 reduce 时全部禁用
- 文章 front matter：必须有 `title`, `date`, `tags`, `categories`, `description`；`featured: true` 标记精选
- Permalink: `:year/:month/:day/:title/`，中文标题手动添加英文 permalink slug

## 部署

Push 到 `main` 分支 → GitHub Actions 触发 → `hexo generate` → `upload-pages-artifact` → GitHub Pages 部署。构建产物检查 `public/css/style.css`（不是 NexT 时代的 main.css）。
