# shiack.github.io

个人技术博客 + AI 内容管理系统，托管于 GitHub Pages。

---

## 项目结构

```
shiack.github.io/
├── index.html                              # 首页（简历卡）
├── pages/
│   ├── blog/
│   │   ├── index.html                      # 博客列表页
│   │   └── post.html                       # 博客详情页（?file= / ?localId=）
│   └── cms/
│       └── index.html                      # CMS 文章展示页
├── assets/
│   ├── css/
│   │   ├── main.css                        # 主题变量、全局基础样式、动画
│   │   ├── base/
│   │   │   └── effects.css                 # 视觉特效层（粒子/reveal/glitch…）
│   │   ├── components/
│   │   │   ├── music-player.css            # 悬浮音乐播放器
│   │   │   └── email-subscribe.css         # 邮件订阅面板
│   │   └── layouts/                        # （预留，暂空）
│   ├── js/
│   │   ├── core/                           # 共享 ES 模块（所有页面复用）
│   │   │   ├── theme.js                    # 主题切换 & 可拖拽悬浮球
│   │   │   ├── nav.js                      # 导航栏渲染
│   │   │   ├── utils.js                    # 通用工具函数
│   │   │   ├── effects.js                  # 粒子/滚动揭示/卡片倾斜/glitch 等
│   │   │   └── markdown-renderer.js        # Markdown 渲染 & 内容增强
│   │   ├── modules/
│   │   │   ├── blog-data.js                # 手写博客元数据（全局变量 BLOG_POSTS）
│   │   │   ├── music-config.js             # 音乐播放列表配置
│   │   │   ├── email-subscribe.js          # 邮件订阅组件逻辑
│   │   │   └── router.js                   # 全站路由配置
│   │   ├── components/
│   │   │   └── music-player.js             # 音乐播放器组件
│   │   └── lib/                            # （预留第三方库，暂空）
│   ├── posts/
│   │   ├── ai/                             # AI/ML 类博客 .md
│   │   ├── backend/                        # 后端类博客 .md
│   │   ├── frontend/                       # 前端类博客 .md
│   │   ├── automation/                     # 自动化类博客 .md
│   │   ├── testdev/                        # 测试/DevOps 类博客 .md
│   │   └── cms/
│   │       ├── cms-index.json              # CMS 文章索引（由 cms-system 维护）
│   │       └── YYYY-MM-DD/                 # CMS 生成的 .md 文章
│   ├── music/                              # 背景音乐文件
│   ├── fonts/                              # 字体文件（预留）
│   └── images/                             # 图片资源
├── docs/
│   └── theme-spec.md                       # 三套主题配色规范文档
└── scripts/
    ├── server.sh                           # 本地开发服务器 PID 管理脚本
    └── http_server.py                      # 支持 Range 请求的静态文件服务器
```

---

## 页面说明

| 页面 | 路径 | 描述 |
|------|------|------|
| 首页 | `/index.html` | 简历卡片，含统计数字动画、头像、社交链接 |
| 博客列表 | `/pages/blog/index.html` | Tag 过滤 + 卡片网格 |
| 博客详情 | `/pages/blog/post.html` | Markdown 渲染，TOC、代码高亮、阅读进度 |
| CMS | `/pages/cms/index.html` | AI 生成文章展示，今日排期栏 + 倒计时 + 邮件订阅 + 中/英切换 |

### post.html URL 参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `?file=` | 加载远程 .md 文件 | `?file=/assets/posts/ai/1_langchain-rag.md` |
| `?localId=` | 从 localStorage 加载 CMS 文章 | `?localId=cms/2026-05-08/0900-slug` |

---

## 核心模块

所有页面通过 `<script type="module">` 按需导入，**零重复代码**。

### `assets/js/core/theme.js`
```js
import { injectThemeToggle, initTheme } from '/assets/js/core/theme.js';
injectThemeToggle();   // 注入可拖拽主题切换球
initTheme();           // 从 localStorage 恢复上次主题
```
三套主题：`workspace`（简约浅色）/ `cyber`（赛博朋克深色，默认）/ `nature`（清新暖白）。

### `assets/js/core/nav.js`
```js
import { mountNav } from '/assets/js/core/nav.js';
mountNav('home');   // 'home' | 'blog' | 'cms'
```

### `assets/js/core/effects.js`
```js
import { initParticles, initScrollReveal, initCardTilt,
         initGlitchText, initScanLine, initReadingProgress } from '/assets/js/core/effects.js';
```

| 函数 | 说明 |
|------|------|
| `initParticles(canvasId)` | 粒子网络，跟随主题色 |
| `initScrollReveal(selector)` | IntersectionObserver 滚动揭示 |
| `initCardTilt(selector)` | 鼠标悬停 3D 倾斜效果 |
| `initGlitchText(selector)` | Hover 时字符随机扰动 |
| `initScanLine()` | 全局扫描线（兼容性存根） |
| `initReadingProgress(selector)` | 顶部阅读进度条 |
| `initNeonLift(selector)` | Hover 上浮 + 霓虹阴影 |

### `assets/js/core/utils.js`
```js
import { escapeHtml, showToast, formatRelativeTime } from '/assets/js/core/utils.js';
```

### `assets/js/core/markdown-renderer.js`
```js
import { fetchMarkdown, renderMarkdownText, enhanceContent, extractTitle } from '/assets/js/core/markdown-renderer.js';
```
`enhanceContent(container)` 自动处理：响应式图片、外链新标签、代码复制按钮、标题锚点、自动 TOC（≥3 个 h2/h3 时生成）。

### `assets/js/modules/email-subscribe.js`
```js
import { mountEmailSubscribe } from '/assets/js/modules/email-subscribe.js';
mountEmailSubscribe(document.getElementById('es-container'));
```
当前为离线模式（`OFFLINE_MODE = true`），订阅状态存入 `localStorage`。上线后端后将 `OFFLINE_MODE` 改为 `false` 并设置 `ENDPOINT`。

---

## 新增手写博客

1. 在 `assets/posts/<category>/` 下新建 `N_slug.md`
2. 在 `assets/js/modules/blog-data.js` 的对应数组里添加元数据：

```js
{
    id: "backend/11_my-new-post",    // 对应文件路径（不含 assets/posts/ 前缀和 .md 后缀）
    title: "文章标题",
    date: "2026-05-09",
    tags: ["Go", "性能优化"],
    category: "backend",
    weight: 90,                       // 排序权重，越大越靠前
    summary: "文章摘要（约50字）"
}
```

文章分类对应目录：

| category | 目录 | 描述 |
|---|---|---|
| `ai` | `assets/posts/ai/` | AI / 机器学习 |
| `frontend` | `assets/posts/frontend/` | 前端开发 |
| `backend` | `assets/posts/backend/` | 后端开发 |
| `automation` | `assets/posts/automation/` | 自动化 / Python |
| `testdev` | `assets/posts/testdev/` | 测试 / DevOps |

---

## AI 内容管理（CMS）

CMS 文章由独立的 **cms-system** 项目自动生成，本站只负责读取索引并渲染。

- **索引文件**：`assets/posts/cms/cms-index.json`
- **文章文件**：`assets/posts/cms/YYYY-MM-DD/HHMM-slug.md`

每天自动生成 3 篇：09:00 AI/ML · 13:00 前端 · 18:00 后端。

### cms-index.json 字段说明

```json
{
  "articles": [
    {
      "id": "cms/2026-05-09/0900-xxx",
      "title": "标题（中文）",
      "titleEn": "Title (English)",
      "summary": "摘要（中文）",
      "summaryEn": "Summary (English)",
      "date": "2026-05-09",
      "slot": "09:00",
      "category": "ai",
      "tags": ["LLM", "RAG"],
      "lang": "zh",
      "file": "/assets/posts/cms/2026-05-09/0900-xxx.md",
      "generatedAt": "2026-05-09T09:01:23Z"
    }
  ]
}
```

---

## 主题系统

三套主题定义在 `assets/css/main.css`，每套包含 25 个 CSS 变量：

| Token | 用途 |
|---|---|
| `--primary-color` | 主强调色（链接/边框/图标） |
| `--secondary-color` | 次要强调色（渐变/装饰） |
| `--accent-color` | 第三色（播放按钮/特殊徽章） |
| `--interactive-bg` | 按钮/标签 hover 背景 |
| `--interactive-bg-active` | 按钮/标签 active/pressed 背景 |
| `--neon-shadow` | 卡片 hover 阴影 |
| `--tag-shadow` | 标签 hover 光晕 |
| `--focus-ring` | Input/Button focus 环 |
| `--danger-color` | 错误/删除操作 |
| `--success-color` | 成功反馈 |
| `--warn-color` | 警告提示 |
| `--overlay-bg` | 浮层/推荐卡片背景 |
| `--code-bg` | 行内代码背景 |

详细配色规范见 [`docs/theme-spec.md`](docs/theme-spec.md)。

---

## 字体系统

全站采用三层字体栈：

| 角色 | 字体栈 | 应用 |
|------|--------|------|
| **正文** | Inter, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif | body, p, li |
| **标题** | Sora, PingFang SC, Hiragino Sans GB, sans-serif | h1-h6, .blog-title |
| **代码** | JetBrains Mono, Fira Code, Cascadia Code, Consolas, monospace | code, pre |

### 字号基准

- **cyber / workspace**：16px
- **nature**：16.5px（略大，提升阅读舒适度）

### 字体加载

默认通过 Google Fonts CDN 加载 Sora 和 JetBrains Mono。若需离线部署，可切换至本地字体文件（需下载 woff2 到 `assets/fonts/` 并取消注释 `main.css` 中的 `@font-face` 规则）。

详细字号体系、行高规则、主题差异见 [`docs/typography.md`](docs/typography.md)。

---

## 本地开发

```bash
# 推荐：支持 Range 请求（音频无报错）+ PID 管理
./scripts/server.sh start     # 启动  http://0.0.0.0:7861
./scripts/server.sh stop      # 停止
./scripts/server.sh restart   # 重启
./scripts/server.sh status    # 查看状态

# 快速启动（等同旧 start.sh，不推荐）
python3 -m http.server 7861 --bind 0.0.0.0
```

> **注意**：必须从项目根目录启动服务，否则 `/assets/...` 绝对路径会 404。

---

## 技术栈

- **纯原生 HTML/CSS/JS**，ES Modules，无构建步骤
- **marked.js** — Markdown 渲染
- **highlight.js** — 代码语法高亮
- **Canvas API** — 粒子网络背景
- **CSS 自定义属性** — 多主题支持（25 token / 主题）
- **localStorage** — 主题持久化、订阅状态、博客草稿
