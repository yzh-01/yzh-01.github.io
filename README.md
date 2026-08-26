# yzh-01.github.io

一个长期维护的个人数字花园（Digital Garden），用于记录技术探索、学习过程、项目实践与普通生活。

[在线访问](https://yzh-01.github.io)

## 当前特性

- 自有 Garden 主题，不依赖第三方 Hexo 主题
- 首页以 `WINTEROMEN`（凛冬之兆）为视觉核心：冬季废墟、风偏光丝、雨幕、粒子与低饱和 HUD 共同组成连续的观测场
- 进入首页时播放约两秒的凛冬之兆显影序列，可立即进入、切换安静模式，也可通过 `?skip-boot` 跳过；键盘和低动态偏好均有对应回退
- 巨型断裂字标中的 `O` 是九界石阵入口：展开后可查看九个世界的英文名、中文名和叙事含义，支持点击、键盘焦点与 `Esc` 收起
- Hero 内置思想摘录档案，支持自动轮换、手动切换，并保留作者、出处与原文来源
- 首页内容改为 `SYS.EXPLORE → RECENT_LOG → THE END`：个人状态、归档、最新笔记、Garden Log 与 About 入口保持明确分区
- RECENT_LOG 同时展示最近文章、GitHub 近二十八周贡献、当月日历与年度进度
- 页面底部是一幅可交互的像素雨夜；花园伙伴还连接到按需加载的 `LOW TIDE` 单关卡程序化小游戏，支持键鼠和触控操作
- 可在设置中选择浅色、深色或跟随 `prefers-color-scheme`
- 浅色与深色模式使用同构的花园场景与对应猫咪影像；void、bone、moss 与 rust 构成统一品牌色
- 响应式布局，覆盖桌面、平板与移动端
- 文章页提供成长状态、更新时间、相关笔记、反向链接、TOC、标题锚点、阅读时间和代码复制
- macOS 风格代码块，使用本地 Maple Mono 字体
- 桌面 TOC 支持鼠标、触控笔和键盘调宽，并只展开当前二级章节下的三级标题；移动端目录并入统一底部工具栏
- 归档页支持分类、标签入口、分页导航和当前页面即时筛选
- 全站搜索覆盖文章标题、摘要、标签、分类与正文，按相关度排序并支持 `/` 快捷键
- Garden Log 按月记录花园的新增、修整与重新思考
- 同源页面使用渐进增强的 View Transition，文章标题在首页与正文之间保持视觉连续
- 尊重 `prefers-reduced-motion`，关闭非必要动画并保留静态内容
- 动效性能支持自动 / 完整 / 节能；支持电池状态 API 的浏览器在电池供电时自动节能，无法检测时可手动选择；只在本地读取充电状态，不上传电池数据
- 离屏和后台场景暂停；Canvas 共用限帧时钟，节能模式降低流线数量与像素密度、停止重复粒子层，并保留月亮切换、树心共鸣和立体互动
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
│   ├── search/index.md          # 全站搜索页面
│   ├── garden-log/index.md      # Garden Log 页面
│   ├── _data/
│   │   ├── now.yml              # 首页 Now 状态
│   │   ├── stack.yml            # 首页“当前工作台”
│   │   ├── garden-log.yml       # 月度 Garden Log 数据
│   │   └── friends.yml          # 友链预留数据
│   ├── images/                  # 站点与文章图片
│   ├── fonts/                   # Maple Mono 等本地字体资源
│   ├── .obsidian/               # Obsidian Vault 配置
│   └── 404.html                 # 404 静态兜底页面
├── themes/garden/
│   ├── _config.yml              # 首页模块与文章功能开关
│   ├── layout/
│   │   ├── _layout.njk          # 全站 HTML 骨架、导航与全局控件
│   │   ├── index.njk            # WINTEROMEN 首页、九界石阵与内容终章
│   │   ├── post.njk             # 文章页
│   │   ├── archive.njk          # 归档 / 内容索引
│   │   ├── about.njk            # About 专用页面
│   │   ├── search.njk           # 全站搜索页面
│   │   ├── garden-log.njk       # 月度 Garden Log 时间线
│   │   ├── page.njk             # 普通独立页面
│   │   ├── 404.njk              # 主题 404 页面
│   │   └── _partial/            # Head、导航和页脚组件
│   └── source/
│       ├── css/style.css        # 全站 Token、组件、动效与响应式样式
│       ├── css/home.css         # 首页凛冬之兆场景、石阵、HUD 与像素终章
│       └── js/
│           ├── motion.js        # 本地电源策略、共享限帧时钟与离屏暂停
│           ├── site.js          # 全站交互、首页环境、贡献墙与渐进增强
│           ├── ninefold-seal.js # 九界石阵定位、展开与无障碍交互
│           ├── garden-game.js   # LOW TIDE 程序化单关卡（按需加载）
│           ├── search.js        # 全文搜索、排序与结果渲染
│           └── post.js          # TOC、锚点、代码复制和表格增强
├── scripts/
│   └── search-index.js          # 构建时生成 search-index.json
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
npm run test:inner    # 构建并回归检查内页目录、搜索、复制、分页及本地链接
npm run test:motion   # 检查电源切换、限帧、离屏/后台暂停、Canvas 绘制与减弱动态
```

正式提交前建议运行：

```bash
npm run clean
npm run build
npm run test:inner
npm run test:motion
```

内页自动测试复用现有 Hexo 依赖中的 JSDOM 与 Nunjucks，不增加客户端依赖；桌面排版仍需在浏览器中检查深浅色主题、长文目录跳转和表格/代码横向滚动。

### 动效性能

右下角设置 → 动效性能：默认“自动”，也可强制“完整”或“节能”，选择会保存在当前浏览器。节能不等于安静模式：前者降低背景开销，后者遵循减少动态的阅读偏好。

- 完整模式：流场空闲最高 24fps、互动最高 60fps；首屏粒子最高 24fps，离屏即停。
- 节能模式：停用独立粒子层，流场空闲最高 12fps、互动最高 30fps，DPR 上限为 1；滚动期间暂停背景绘制，观看像素场景时停掉两张背景 Canvas。
- 像素场景鼠标事件按帧合并，立体层次和重复点击仍可用；离屏动画和后台循环暂停，恢复时不补跑积压帧。
- 自动检测采用 [Battery Status API](https://www.w3.org/TR/battery-status/)，仅在接口可用且允许访问时使用。浏览器自身的[节能限帧](https://developer.chrome.com/blog/memory-and-energy-saver-mode)仍可能影响实际刷新率；网页不会修改系统或浏览器的电源设置。

`test:motion` 使用可控时钟模拟 144Hz 屏幕、电源状态切换和后台恢复，验证实际 Canvas 代码的绘制次数；它不是实际硬件的耗电量或 FPS 基准测试。

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
status: growing
---
```

`featured` 是可选字段；设置为 `true` 后，文章会进入首页“长期维护”模块。`status` 支持 `seedling`（萌芽）、`growing`（生长中）和 `evergreen`（常青），未填写时默认为 `growing`。中文标题建议设置稳定的英文 `permalink`，避免文章重命名时 URL 发生变化。

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
- 当前工作台：编辑 `source/_data/stack.yml`，同时写明工具的实际用途
- About / Contact：编辑 `source/about/index.md`
- 首页介绍文字与模块结构：编辑 `themes/garden/layout/index.njk`
- 首页模块开关：编辑 `themes/garden/_config.yml`
- 首页视觉：编辑 `themes/garden/source/css/home.css`
- 九界石阵交互：编辑 `themes/garden/source/js/ninefold-seal.js`
- 全站视觉与交互：编辑 `themes/garden/source/css/style.css` 与 `themes/garden/source/js/site.js`

## 更新 Garden Log

编辑 `source/_data/garden-log.yml`，按照月份从新到旧追加记录：

```yaml
- month: "2026-09"
  label: "2026 年 9 月"
  title: "本月记录标题"
  summary: "一句话概括这个月的变化。"
  added:
    - text: "新增的内容或功能"
      href: "/optional-path/"
  revised:
    - text: "重新整理或修订的内容"
  reconsidered:
    - text: "这个月重新思考的问题"
```

`href` 可省略。搜索索引由 `scripts/search-index.js` 在每次 Hexo 构建时自动生成，不需要手动维护。

首页显影序列只在首页生成。它以冬季猫咪场景为底图，在约两秒内完成雾层校准、标题显影和进度反馈；访客可以提前进入，或将安静模式保存在本地。进入正文后，页面由一张连续的雨后废墟背景贯穿：首屏展示 `WINTEROMEN`、思想摘录与九界石阵，随后进入个人目录、贡献记录、日历、最近文章和交互像素终章。移动端会缩减粒子、景深和大范围位移；`prefers-reduced-motion` 或安静模式下会关闭非必要动画，但保留全部内容、导航与石阵说明。

## 设计系统

- 品牌色：void 黑、bone 白、moss 绿与少量 rust 棕
- 首页字体：Big Shoulders Display / Unbounded 负责标题，JetBrains Mono 负责系统信息，Noto Sans SC 负责中文正文
- 内页字体：系统正文字体栈；品牌字与文章标题使用本地 Caveat / Kalam，并保留系统字体回退
- 代码字体：本地 Maple Mono
- 动效：集中于凛冬之兆显影、环境景深、九界石阵、思想摘录、像素终章与同源页面转场
- 响应式断点：桌面、平板和移动端分层适配
- 无障碍：跳转正文、键盘焦点、语义化标签和减少动态效果支持
- 阅读偏好：首页与文章页提供返回首页介绍区和外观设置；文章页移动端将目录、回到顶部、首页与设置合并为同一工具栏；主题选择保存在浏览器中并跨页面生效

修改静态资源后，需要同步更新 `themes/garden/_config.yml` 中的 `asset_version`，以刷新浏览器缓存。

## 部署

推送到 `main` 分支后，GitHub Actions 会自动执行：

```text
npm ci → hexo clean → hexo generate → upload-pages-artifact → deploy-pages
```

工作流会检查 `public/index.html` 与 `public/css/style.css` 是否成功生成，然后部署到 GitHub Pages。也可以在 GitHub Actions 页面通过 `workflow_dispatch` 手动触发部署。

## License

MIT
