# shiack.github.io

个人技术博客 + AI 内容管理系统，托管于 GitHub Pages。

---

## 项目结构

```
shiack.github.io/
├── index.html                          # 首页（简历卡）
├── src/
│   ├── assets/
│   │   ├── styles/
│   │   │   ├── cyber.css               # 主题变量 & 基础样式
│   │   │   └── effects.css             # 视觉特效层（粒子/扫描线/glitch…）
│   │   └── posts/
│   │       ├── ai/                     # 手写博客 .md 文件
│   │       ├── backend/
│   │       ├── frontend/
│   │       ├── automation/
│   │       ├── testdev/
│   │       └── cms/
│   │           ├── cms-index.json      # CMS 文章索引（由 cms-system 维护）
│   │           └── YYYY-MM-DD/         # CMS 生成的 .md 文章
│   ├── components/
│   │   └── music-player/               # 悬浮音乐播放器组件
│   ├── js/
│   │   ├── core/                       # 共享 ES 模块（所有页面复用）
│   │   │   ├── theme.js                # 主题切换 & 可拖拽悬浮球
│   │   │   ├── nav.js                  # 导航栏渲染
│   │   │   ├── utils.js                # 通用工具函数
│   │   │   ├── effects.js              # 粒子/滚动揭示/卡片倾斜/glitch 等
│   │   │   └── markdown-renderer.js    # Markdown 渲染 & 内容增强
│   │   └── modules/
│   │       ├── blog-data.js            # 手写博客元数据（全局变量 BLOG_POSTS）
│   │       └── music-config.js         # 音乐播放列表配置
│   └── pages/
│       ├── blogs/
│       │   ├── blog-list.html          # 博客列表页
│       │   └── blog-detail.html        # 博客详情页（?file= / ?localId=）
│       └── cms/
│           └── cms.html                # CMS 文章展示页
```

---

## 页面说明

| 页面 | 路径 | 描述 |
|------|------|------|
| 首页 | `/index.html` | 简历卡片，含统计数字动画 |
| 博客列表 | `/src/pages/blogs/blog-list.html` | Tag 过滤 + 卡片网格 |
| 博客详情 | `/src/pages/blogs/blog-detail.html` | Markdown 渲染，支持 TOC、代码高亮、阅读进度 |
| CMS | `/src/pages/cms/cms.html` | AI 生成文章展示，含今日调度状态栏 + 倒计时 + 中/英切换 |

### blog-detail.html URL 参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `?file=` | 加载远程 .md 文件 | `?file=/src/assets/posts/ai/1_xxx.md` |
| `?localId=` | 从 localStorage 加载 CMS 文章 | `?localId=cms/2026-05-08/0900-...` |

---

## 共享核心模块

所有页面通过 `<script type="module">` 按需导入，**零重复代码**。

### `src/js/core/theme.js`
```js
import { injectThemeToggle, initTheme } from '/src/js/core/theme.js';
injectThemeToggle();   // 注入可拖拽主题切换球
initTheme();           // 从 localStorage 恢复上次主题
```
支持三套主题：`workspace`（简约）/ `cyber`（赛博朋克，默认）/ `nature`（清新）。

### `src/js/core/nav.js`
```js
import { mountNav } from '/src/js/core/nav.js';
mountNav('home');   // 'home' | 'blog' | 'cms'
```

### `src/js/core/effects.js`
```js
import { initParticles, initScrollReveal, initCardTilt,
         initGlitchText, initScanLine, initReadingProgress } from '/src/js/core/effects.js';
```

| 函数 | 说明 |
|------|------|
| `initParticles(canvasId)` | 55 粒子网络，跟随主题色 |
| `initScrollReveal(selector)` | IntersectionObserver 滚动揭示 |
| `initCardTilt(selector)` | 鼠标悬停 3D 倾斜效果 |
| `initGlitchText(selector)` | Hover 时字符随机扰动 |
| `initScanLine()` | 全局扫描线动画 |
| `initReadingProgress(selector)` | 顶部阅读进度条 |
| `initNeonLift(selector)` | Hover 上浮 + 霓虹阴影 |

### `src/js/core/utils.js`
```js
import { escapeHtml, showToast, formatRelativeTime } from '/src/js/core/utils.js';
```

### `src/js/core/markdown-renderer.js`
```js
import { fetchMarkdown, renderMarkdownText, enhanceContent, extractTitle } from '/src/js/core/markdown-renderer.js';
```
`enhanceContent(container)` 会自动处理：响应式图片、外链新标签、代码复制按钮、标题锚点、自动 TOC（≥3 个 h2/h3 时）。

---

## 新增手写博客

1. 在 `src/assets/posts/<category>/` 下新建 `N_slug.md`
2. 在 `src/js/modules/blog-data.js` 的对应数组里添加元数据记录：
```js
{
    id: "backend/11_my-new-post",    // 与文件路径对应
    title: "文章标题",
    date: "2026-05-08",
    tags: ["Go", "性能优化"],
    category: "backend",
    weight: 90,                       // 排序权重，越大越靠前
    summary: "文章摘要（约50字）"
}
```

---

## AI 内容管理（CMS）

CMS 文章由独立的 **cms-system** 项目自动生成，本站只负责加载 `cms-index.json` 并渲染。

- **索引文件**：`src/assets/posts/cms/cms-index.json`
- **文章文件**：`src/assets/posts/cms/YYYY-MM-DD/HHMM-slug.md`

每天自动生成 3 篇：09:00 AI/ML · 13:00 前端 · 18:00 后端。

CMS 系统配置及启动方法详见 [cms-system/README.md](../cms-system/README.md)。

---

## 本地开发

无需构建工具，直接用静态文件服务：

```bash
# Python
python3 -m http.server 8080

# Node
npx serve . -p 8080
```

然后访问 `http://localhost:8080`。

> **注意**：必须从根目录启动服务，否则 `/src/...` 绝对路径会 404。

---

## 技术栈

- **纯原生 HTML/CSS/JS**，ES Modules，无构建步骤
- **marked.js** — Markdown 渲染
- **highlight.js** — 代码语法高亮
- **Canvas API** — 粒子网络
- **CSS 自定义属性** — 多主题支持
