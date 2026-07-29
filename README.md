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
│   ├── about/index.md       # About/Contact 页面内容
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
│   │   ├── about.njk        # About/Contact 专用页面
│   │   ├── post.njk         # 文章页
│   │   ├── page.njk         # 独立页面
│   │   ├── archive.njk      # 归档页
│   │   └── _partial/        # 组件（head/nav/footer）
│   └── source/
│       ├── css/style.css    # 设计系统 + 页面样式 + 响应式
│       └── js/
│           ├── site.js      # 全站导航与回到顶部
│           └── post.js      # TOC、标题锚点、代码复制、表格增强
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

### 使用 Obsidian

将以下目录作为 Obsidian Vault 打开（不要只打开 `_posts`）：

```text
D:\code\yzh-01.github.io\source
```

推荐流程：

1. 在 Obsidian 中新建笔记。配置会自动把新文件放入 `_drafts/`。
2. 按 `Ctrl/Cmd + Shift + T`，选择「Hexo 文章」模板。
3. 填写 `title`、`tags`、`categories`、`description`，发布前补充稳定的英文 `permalink`。
4. 草稿预览：

   ```bash
   npm run draft:preview
   ```

5. 发布草稿（文件名不含 `.md`）：

   ```bash
   npm run draft:publish -- "文章文件名"
   ```

6. 运行 `npm run build` 检查，然后提交并推送到 `main`。

图片统一放到 `source/images/posts/<文章-slug>/`，文章中使用站点根路径：

```markdown
![图片说明](/images/posts/my-article-slug/example.webp)
```

Obsidian 已配置为优先创建标准 Markdown 链接。文章之间也应使用普通 Markdown 链接，例如
`[相关文章](/another-article/)`；不要使用 Hexo 无法直接解析的 `[[双链语法]]`。

## 更新首页数据

- **Now** → 编辑 `source/_data/now.yml`
- **Tech Stack** → 编辑 `source/_data/stack.yml`
- **About/Contact** → 编辑 `source/about/index.md` 的 front matter

## 主题设计

- 浅色为主 + `prefers-color-scheme: dark` 自动暗色
- 系统字体栈，零外部字体依赖
- 灰 + moss 绿品牌配色
- 首页模块由 `themes/garden/_config.yml` 控制
- 移动端目录使用底部抽屉；桌面目录支持鼠标、触控笔和键盘调宽
- 归档页同时提供分类/标签入口与零依赖的当前页筛选

## 部署

Push 到 `main` 分支，GitHub Actions 自动构建部署到 GitHub Pages。

## License

MIT
