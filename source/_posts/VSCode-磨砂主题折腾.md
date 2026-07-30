---
title: 调教 VSCode：Maple Mono、磨砂透明与亚克力背景
date: 2026-07-30 18:30:00
permalink: vscode-maple-mono-acrylic/
tags:
  - VSCode
  - 字体
  - 主题
  - 工具
  - 折腾
categories:
  - 学习笔记
description: 一口气把字体、磨砂透明、亚克力背景三件事都装上，顺便记下踩到的几个坑。
---

某个下午，盯着 VSCode 发愣了几分钟，忽然意识到三件事我想改很久了：

1. 编辑器里的字符跟终端里长得不一样
2. 编辑器整片黑，想看壁纸也看不到
3. 「磨砂玻璃」效果已经馋了好久

于是花了一些时间把它一次性做完。记录一下，方便未来的我回看，也方便偶然路过的你。

---

## 字体：让终端、编辑器、Markdown 预览说同一种话

之前终端用 `Menlo for powerline`（凑合，但 Mac 旧时代审美），编辑器用默认等宽，三处字体三家话，看久了总觉得割裂。

挑了一圈，最后落在 **Maple Mono NF CN**：

- `NF` = Nerd Font 变体，自带 Powerline / 文件图标 / Git 分支符号
- `CN` = 内置中文字符（打中文不会 fallback 到默认字体）

一处配好，三处复用：

```jsonc
// settings.json
{
  "terminal.integrated.fontFamily": "Maple Mono NF CN",
  "terminal.integrated.fontSize": 14,
  "terminal.integrated.fontLigatures": true,
  "terminal.integrated.lineHeight": 1.25,

  "editor.fontFamily": "Maple Mono NF CN",
  "editor.fontSize": 15,
  "editor.fontLigatures": true,
  "editor.lineHeight": 1.5
}
```

第三处是 Markdown 预览。我用 `markdown-preview-enhanced`，它不带直接改字体的键，只能塞 CSS 进去：

```jsonc
"markdown-preview-enhanced.previewStyle": "body { font-family: \"Maple Mono NF CN\", ...; } code,pre,kbd,samp { font-family: \"Maple Mono NF CN\", ...; font-feature-settings: \"calt\" 1, \"liga\" 1; } blockquote { border-left: 3px solid #5c8a63; ...; }"
```

> 题外话：Maple Mono 自带的连字让 `=>` `!=` `>=` 这种符号变成漂亮的图样，写代码幸福感 +1。
>
> 顺手把 `blockquote` 的左边框染成了 Garden 主题里的 moss 绿 `#5c8a63`，算是博客内外的一个小呼应。

---

## 磨砂透明：两件事，两个扩展

「磨砂透明」听起来一个扩展能搞定，其实拆成两件事：

| 想要的效果 | 谁来做 |
|---|---|
| 整片窗口透出来 + Windows 自己模糊标题栏 | GlassIt-VSC |
| 编辑器里塞一张自定义背景图 | shalldie.background |

### GlassIt：让整片窗口半透明

GitHub 上还能下到，但 Microsoft Marketplace 不知道什么时候把它下掉了——CLI 装不上，浏览器装没试。我直接 `curl` 它的 GitHub release，下载 `.vsix` 手动装：

```bash
# /tmp/vsix/glassit.vsix 是我下载下来的 105KB 包
code --install-extension /tmp/vsix/glassit.vsix
```

真正在用的就两行：

```jsonc
"glassit.alpha": 250,   // 1-255，越大越不透明
"glassit.step": 5       // Ctrl+Alt+Z / Ctrl+Alt+C 单次调整步长
```

`250` 留了一点透——纯不透明 (`255`) 看着闷，纯透明 (`1`) 又什么都看不见。这个数字我反复试探了好几轮才定下来。

### shalldie.background：把图塞进编辑器

这个扩展做的是「在编辑器里塞一张自定义背景图」。装上之后 settings 里冒出一堆 `background.*` 键，看着吓人，其实只有这五个核心区域：

- `background.editor` — 编辑器区域
- `background.sidebar` — 资源管理器
- `background.panel` — 底部面板（终端等）
- `background.fullscreen` / `background.auxiliarybar` — 其余

我用一张 Unsplash 的风景图：

```
d:\Edge\iuliu-illes-jt2qFluLxsE-unsplash.jpg
```

---

## 半屏设计：背景图只在编辑器

最初给五个区域都铺了背景图，结果：

- 资源管理器里「文件树」变得很花，看不清字
- 终端在底部也飘着背景，命令和图搅在一起
- 全屏模式还跳出来另一张图，吓一跳

后来只在 `background.editor` 里放了图，其它四个区域 `images: []`。**只让编辑器这一片承担「美化」的责任**，其它区域老老实实保持主题色。

视觉上反而更聚焦：视线进编辑器，背景悄悄托底；视线出编辑器，立刻回到清爽的工具栏。

---

## 亚克力：30px 模糊 + 1.6 倍饱和度

搞定上面后图片还是太「实」，跟代码抢戏。给它加一组 `filter`：

```jsonc
"background.editor": {
  "useFront": false,                          // 图放编辑器背景层，不在代码上方
  "images": ["d:\\Edge\\iuliu-illes-...jpg"],
  "style": {
    "opacity": 0.5,
    "background-size": "cover",
    "background-position": "center",
    "filter": "blur(30px) saturate(1.6)"      // ← 亚克力的魔法
  }
}
```

- `blur(30px)` — 高斯模糊半径 30px，跟 Windows 11 Acrylic 的参数同档
- `saturate(1.6)` — 颜色饱和度 +60%，让模糊之后还能看出主色调，不至于糊成一片灰
- `opacity: 0.5` — 整体半透，不抢戏

最终效果：编辑器里飘着一层柔焦、过饱和、半透明的风景；代码仍锐利在前。这就是 Windows 11 那种「压克力」的味道。

> 「亚克力」（Acrylic）是 Windows 10/11 的 Fluent Design 系统级材质，特征是背后透出 + 模糊 + 微饱和——这套 `blur + saturate + 半透明 opacity` 的组合，是它的 CSS 近似。

---

## 踩坑清单
1. **`background.editor.opacity` 这种键在新版 2.1.2 已经无效**——新版的 schema 把 `opacity` / `size` / `position` 拆给了 `sidebar` / `panel` 那些区域，`editor` 必须用嵌套 `style` 对象传 CSS。官方 README 没跟上版本，看了过时文档就会踩。
2. **图片路径用双反斜杠**——`d:\\Edge\\foo.jpg`。JSON 里单反斜杠会被吃掉。
3. **`workbench.colorCustomizations.editor.background` 不要设太厚**——之前我用 `#1e1e1eb3`（70% 不透明），结果图被遮得几乎看不见。改成 `00`（完全透明）才让 `useFront: false` 的图能正常浮现。

---

## 附录：完整的 background 相关 settings

```jsonc
"background.enabled": true,
"background.editor": {
  "useFront": false,
  "images": ["d:\\Edge\\iuliu-illes-jt2qFluLxsE-unsplash.jpg"],
  "style": {
    "opacity": 0.5,
    "background-size": "cover",
    "background-position": "center",
    "filter": "blur(30px) saturate(1.6)"
  }
},
"background.sidebar":     { "images": [] },
"background.auxiliarybar":{ "images": [] },
"background.panel":       { "images": [] },
"background.fullscreen":  { "images": [] }
```

---

最后一句：折腾工具的乐趣不在工具本身，而在折腾完之后，**编辑器和它背后的那片风景终于呼吸到一起了**。下次写代码眼睛累了，可以往后退一点，看一眼图片——算是给自己一个偷懒的理由。

---

## 实际效果预览

![VSCode 磨砂主题与亚克力背景效果](/images/posts/vscode-maple-mono-acrylic/preview.webp)