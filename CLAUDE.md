# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 本地开发

```bash
# 推荐方式（支持 Range 请求，音频无报错）
./scripts/server.sh start     # 启动 http://0.0.0.0:7861
./scripts/server.sh stop
./scripts/server.sh restart
./scripts/server.sh status

# 备选（不支持 Range，音频可能报错）
python3 -m http.server 7861 --bind 0.0.0.0
```

**必须从项目根目录启动**，否则 `/assets/...` 绝对路径会 404。  
无构建步骤，无 lint/test 命令，直接刷新浏览器验证改动。

## 架构概览

纯静态站点，**零构建、ES Modules 按需导入**。所有页面通过 `<script type="module">` 直接引用 `/assets/js/` 下的模块，无打包流程。

### 页面层

| 文件 | 路由 | 说明 |
|------|------|------|
| `index.html` | `/` | 首页简历卡 |
| `pages/blog/index.html` | `/pages/blog/` | 博客列表，Tag 过滤 |
| `pages/blog/post.html` | `/pages/blog/post.html?file=...` 或 `?localId=...` | Markdown 文章详情 |
| `pages/cms/index.html` | `/pages/cms/` | AI 生成文章展示，含中/英切换和邮件订阅 |

### JS 模块层

```
assets/js/
├── core/           # 所有页面复用的 ES 模块
│   ├── theme.js          — 主题切换 + 可拖拽悬浮球
│   ├── nav.js            — 统一导航栏渲染
│   ├── utils.js          — escapeHtml / showToast / formatRelativeTime / debounce
│   ├── effects.js        — 粒子/滚动揭示/卡片倾斜/glitch/阅读进度
│   └── markdown-renderer.js — Markdown 加载、渲染与内容增强
├── modules/        # 业务模块（部分为全局变量脚本，非 ES module）
│   ├── blog-data.js      — 全局 BLOG_POSTS / BLOG_CONFIG / TAG_CATEGORIES（<script src> 加载）
│   ├── music-config.js   — 全局 MUSIC_LIST（<script src> 加载）
│   ├── email-subscribe.js — 邮件订阅组件
│   └── router.js         — 路由配置
└── components/
    ├── music-player.js   — 可拖拽悬浮音乐播放器
    ├── parallax-banner.js — 多层视差横幅
    └── pixel-banner.js   — 像素城市横幅
```

**重要区分**：`blog-data.js` 和 `music-config.js` 通过 `<script src>` 注入全局变量（`BLOG_POSTS`、`MUSIC_LIST`），不是 ES 模块，不能 `import`。其余 `core/` 和部分 `modules/` 均为 ES 模块。

### CSS 层

```
assets/css/
├── main.css                — 主题变量（25 token × 3 主题）+ 全局基础样式
├── base/effects.css        — 视觉特效层（粒子/reveal/glitch）
└── components/             — 各组件专属样式
```

### 数据层

- **手写博客**：`assets/posts/{category}/N_slug.md` + `assets/js/modules/blog-data.js` 元数据
- **CMS 文章**：`assets/posts/cms/cms-index.json`（索引）+ `assets/posts/cms/YYYY-MM-DD/HHMM-slug.md`（正文），由外部 cms-system 项目维护，本站只读

## 主题系统

三套主题通过 `<body>` 上的 class 切换：`theme-cyber`（默认，深色霓虹）/ `theme-workspace`（浅色简约）/ `theme-nature`（暖白清新）。

所有颜色通过 CSS 自定义属性引用，**不要硬编码颜色值**，应使用 `var(--primary-color)`、`var(--neon-shadow)` 等 token。完整 token 表见 `docs/theme-spec.md`。

主题持久化于 `localStorage` key `theme`，由 `core/theme.js` 管理。

## 新增手写博客

1. 在 `assets/posts/<category>/` 新建 `N_slug.md`（`N` 为序号）
2. 在 `assets/js/modules/blog-data.js` 对应数组添加元数据（`id` 格式为 `"{category}/{N}_{slug}"`）
3. 若使用了新标签，在 `TAG_TO_CATEGORY` 中添加映射

## 关键约束

- **绝对路径**：所有 `import` 和资源引用使用绝对路径（`/assets/...`），不要用相对路径
- **`initScrollReveal` 时机**：动态渲染 DOM（如文章列表）完成后需再次调用 `initScrollReveal('.reveal')`
- **`enhanceContent` 用途**：渲染 Markdown 后必须调用 `enhanceContent(container)` 才能获得 TOC、代码复制按钮、外链处理等增强
- **邮件订阅离线模式**：`email-subscribe.js` 中 `OFFLINE_MODE = true`，上线后端时改为 `false` 并设置 `ENDPOINT`
