# yzh-01.github.io

一个长期维护的个人数字花园（Digital Garden），用于记录技术探索、学习过程、项目实践与普通生活。

[在线访问](https://yzh-01.github.io)

## 当前特性

- 自有 Garden 主题，不依赖第三方 Hexo 主题
- 首页顶部为可回看的雾窗序章，离开视口后复位，返回顶部时重新播放
- Hero、Garden Map、Latest Posts、Now、Featured、Tech Stack、Journey、Life、About 九个内容模块
- 浅色为主，可在首页设置中选择浅色、深色或跟随 `prefers-color-scheme`
- 灰色与 moss 绿品牌配色，结合雨雾、森林和黑猫视觉元素
- 响应式布局，覆盖桌面、平板与移动端
- 文章页提供 TOC、标题锚点、阅读时间、代码复制、回到顶部和返回首页介绍区入口
- macOS 风格代码块，使用本地 Maple Mono 字体
- 桌面 TOC 支持鼠标、触控笔和键盘调宽，移动端使用目录抽屉
- 归档页支持分类、标签入口和当前页面即时筛选
- 尊重 `prefers-reduced-motion`，关闭非必要动画并保留静态内容
- RSS、Sitemap、Open Graph、Canonical URL 和语义化页面结构
- 支持使用 Obsidian 管理草稿和文章

## 技术栈

- [Hexo](https://hexo.io/) 8.x
- Nunjucks 模板
- 原生 CSS 与 JavaScript，无客户端框架
- GitHub Actions + GitHub Pages

文章、年份、字数和首页内容索引在 Hexo 构建阶段生成；客户端 JavaScript 只负责滚动观察、目录、复制按钮和微交互等渐进增强功能。

## 目录结构

```text
├── _config.yml                  # Hexo 站点、URL、文章和生成器配置
├── source/
│   ├── _posts/                  # 已发布 Markdown 文章
│   ├── _drafts/                 # Obsidian / Hexo 草稿
│   ├── about/index.md           # About / Contact 页面内容
│   ├── _data/
│   │   ├── now.yml              # 首页 Now 状态
│   │   ├── stack.yml            # 首页 Tech Stack
│   │   └── friends.yml          # 友链预留数据
│   ├── images/                  # 站点与文章图片
│   ├── fonts/                   # Maple Mono 等本地字体资源
│   ├── .obsidian/               # Obsidian Vault 配置
│   └── 404.html                 # 404 静态兜底页面
├── themes/garden/
│   ├── _config.yml              # 首页模块与文章功能开关
│   ├── layout/
│   │   ├── _layout.njk          # 全站 HTML 骨架与首页序章
│   │   ├── index.njk            # 首页九个内容模块
│   │   ├── post.njk             # 文章页
│   │   ├── archive.njk          # 归档 / 内容索引
│   │   ├── about.njk            # About 专用页面
│   │   ├── page.njk             # 普通独立页面
│   │   ├── 404.njk              # 主题 404 页面
│   │   └── _partial/            # Head、导航和页脚组件
│   └── source/
│       ├── css/style.css        # Token、组件、动效与响应式样式
│       └── js/
│           ├── site.js          # 首页动效、滚动路径与全站交互
│           └── post.js          # TOC、锚点、代码复制和表格增强
├── scaffolds/                   # Post、Draft、Page 写作模板
├── .github/workflows/deploy.yml # GitHub Pages 构建部署
└── package.json
```

## 本地开发

建议使用 Node.js 20。

```bash
npm install
npm run server        # 本地预览：http://localhost:4000
npm run clean         # 清理 public/ 与 Hexo 缓存
npm run build         # 生成 public/
```

正式提交前建议运行：

```bash
npm run clean
npm run build
```

## 新建文章

```bash
npx hexo new "文章标题"
```

文章 front matter 示例：

```yaml
---
title: 文章标题
date: 2026-07-20 19:00:00
permalink: stable-english-slug/
tags:
  - 标签1
  - 标签2
categories:
  - 分类
description: 用一句话概括文章内容
featured: true
---
```

`featured` 是可选字段；设置为 `true` 后，文章会进入首页 Featured 模块。中文标题建议设置稳定的英文 `permalink`，避免文章重命名时 URL 发生变化。

文章图片统一放在：

```text
source/images/posts/<文章-slug>/
```

Markdown 中使用站点根路径引用：

```markdown
![图片说明](/images/posts/my-article-slug/example.webp)
```

## 使用 Obsidian 写作

将整个 `source` 目录作为 Vault 打开，不要只打开 `_posts`：

```text
D:\code\yzh-01.github.io\source
```

推荐流程：

1. 在 Obsidian 中新建笔记，新文件默认进入 `_drafts/`。
2. 使用快捷键 `Ctrl/Cmd + Shift + T`，选择“Hexo 文章”模板。
3. 填写 `title`、`tags`、`categories`、`description` 和英文 `permalink`。
4. 使用 `npm run draft:preview` 预览包含草稿的站点。
5. 发布前执行以下命令，文件名不包含 `.md`：

   ```bash
   npm run draft:publish -- "文章文件名"
   ```

6. 运行 `npm run clean && npm run build`，确认构建成功后提交并推送。

文章之间使用普通 Markdown 链接，例如 `[相关文章](/another-article/)`。不要使用 Hexo 默认无法解析的 Obsidian `[[双链语法]]`。

## 更新首页内容

- Now 状态：编辑 `source/_data/now.yml`
- Tech Stack：编辑 `source/_data/stack.yml`
- About / Contact：编辑 `source/about/index.md`
- 首页介绍文字与模块结构：编辑 `themes/garden/layout/index.njk`
- 首页模块开关：编辑 `themes/garden/_config.yml`
- 全站视觉与动效：编辑 `themes/garden/source/css/style.css`

首页序章只在首页生成。它占据顶部一屏，向下滚动进入正文；序章离开视口后自动复位，重新向上滚动时再次播放。低动态偏好下保留静态序章，不执行窗格动画。

## 设计系统

- 品牌色：灰 + moss 绿
- 正文字体：系统字体栈
- 品牌字与文章标题：手写字体，并保留系统字体回退
- 代码字体：本地 Maple Mono
- 动效：集中于雾窗序章、视差雾气、内容渐入、卡片聚光和状态呼吸
- 响应式断点：桌面、平板和移动端分层适配
- 无障碍：跳转正文、键盘焦点、语义化标签和减少动态效果支持
- 阅读偏好：首页与文章页右下角均提供返回首页介绍区和外观设置，文章页额外提供回到顶部；主题选择保存在浏览器中并跨页面生效

修改静态资源后，需要同步更新 `themes/garden/_config.yml` 中的 `asset_version`，以刷新浏览器缓存。

## 部署

推送到 `main` 分支后，GitHub Actions 会自动执行：

```text
npm ci → hexo clean → hexo generate → upload-pages-artifact → deploy-pages
```

工作流会检查 `public/index.html` 与 `public/css/style.css` 是否成功生成，然后部署到 GitHub Pages。也可以在 GitHub Actions 页面通过 `workflow_dispatch` 手动触发部署。

## License

MIT
