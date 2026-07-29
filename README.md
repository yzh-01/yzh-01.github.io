# yzh-01.github.io

个人数字花园（Digital Garden），记录技术学习、生活随笔、读书笔记。

## 技术栈

- **框架**: [Hexo](https://hexo.io/) 8.x
- **主题**: Garden（自有极简主题，`themes/garden/`）
- **部署**: GitHub Actions → GitHub Pages

## 目录结构

```
├── _config.yml              # Hexo 站点配置
├── source/
│   ├── _posts/              # Markdown 文章
│   ├── _data/
│   │   ├── now.yml          # 首页「Now」模块数据
│   │   ├── stack.yml        # 首页「Tech Stack」模块数据
│   │   └── friends.yml      # 友链（待启用）
│   ├── images/
│   │   └── logo.svg         # 站点 favicon
│   └── 404.html             # 自定义 404 页面
├── themes/garden/           # 自有主题
│   ├── _config.yml          # 主题开关（模块开关）
│   ├── layout/
│   │   ├── _layout.njk      # HTML 骨架
│   │   ├── index.njk        # 首页（8 模块）
│   │   ├── post.njk         # 文章页
│   │   ├── page.njk         # 独立页面
│   │   ├── archive.njk      # 归档页
│   │   └── _partial/        # 组件（head/nav/footer）
│   └── source/css/style.css # 全部样式（设计系统 + 模块 + 响应式 + 暗色）
├── scaffolds/               # 写作模板
├── .github/workflows/       # CI/CD
└── package.json
```

## 本地开发

```bash
npm install
npm run server       # http://localhost:4000
npm run build        # 生成 public/
npm run clean        # 清理 public/
```

## 写作

```bash
npx hexo new "文章标题"
```

文章 front matter 规范：

```yaml
---
title: 文章标题
date: 2026-07-20 19:00:00
tags:
  - 标签1
  - 标签2
categories:
  - 分类
description: 一句话描述
featured: true    # 可选，标记后出现在首页 Featured 模块
---
```

## 更新首页数据

- **Now** → 编辑 `source/_data/now.yml`
- **Tech Stack** → 编辑 `source/_data/stack.yml`

## 主题设计

- 浅色为主 + `prefers-color-scheme: dark` 自动暗色
- 系统字体栈，零外部字体依赖
- 灰 + moss 绿品牌配色
- 模块化 CSS，单文件 `style.css` 约 450 行

## 部署

Push 到 `main` 分支，GitHub Actions 自动构建部署到 GitHub Pages。

## License

MIT
