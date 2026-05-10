# JS 模块功能文档

> 本站所有页面使用 ES Modules（`type="module"`），按需导入，无构建步骤。

---

## 目录

- [core/theme.js](#corethemejs)
- [core/nav.js](#corenavjs)
- [core/utils.js](#coreutilsjs)
- [core/effects.js](#coreeffectsjs)
- [core/markdown-renderer.js](#coremarkdown-rendererjs)
- [modules/blog-data.js](#modulesblog-datajs)
- [modules/music-config.js](#modulesmusic-configjs)
- [modules/email-subscribe.js](#modulesemail-subscribejs)
- [modules/router.js](#modulesrouterjs)
- [components/music-player.js](#componentsmusic-playerjs)
- [模块数据流](#模块数据流)

---

## core/theme.js

**职责**：主题切换 + 可拖拽悬浮球。

### 导出

| 函数 | 签名 | 说明 |
|------|------|------|
| `initTheme` | `() → void` | 从 localStorage 读取 `theme` key，写入 `<body>` class |
| `injectThemeToggle` | `() → void` | 创建可拖拽悬浮球，注册点击切换逻辑 |

### 主题标识

| class | 名称 | 特征 |
|-------|------|------|
| `theme-cyber` | 赛博朋克（默认） | 深色背景，霓虹绿主色 |
| `theme-workspace` | 简约工作区 | 浅色背景，蓝色主色 |
| `theme-nature` | 清新自然 | 暖白背景，森林绿主色 |

### 使用

```js
import { injectThemeToggle, initTheme } from '/assets/js/core/theme.js';
injectThemeToggle();  // 注入悬浮球（需在 DOM ready 后调用）
initTheme();          // 恢复主题（在 injectThemeToggle 之前调用亦可）
```

### localStorage key

- `theme`：`"cyber"` | `"workspace"` | `"nature"`

---

## core/nav.js

**职责**：渲染全站统一导航栏。

### 导出

| 函数 | 签名 | 说明 |
|------|------|------|
| `mountNav` | `(activePage: string) → void` | 向 `#site-nav` 写入导航 HTML，并高亮当前页 |

### activePage 值

| 值 | 高亮项 |
|----|--------|
| `"home"` | 首页 |
| `"blog"` | 博客 |
| `"cms"` | CMS |

### 使用

```js
import { mountNav } from '/assets/js/core/nav.js';
mountNav('blog');  // 在博客页调用
```

---

## core/utils.js

**职责**：全站通用工具函数。

### 导出

| 函数 | 签名 | 说明 |
|------|------|------|
| `escapeHtml` | `(str: string) → string` | 转义 HTML 特殊字符，防止 XSS |
| `showToast` | `(msg: string, type?: string, duration?: number) → void` | 显示底部右侧 toast 通知 |
| `formatRelativeTime` | `(dateStr: string) → string` | 将 ISO 日期转为"3 天前"相对时间 |
| `debounce` | `(fn: Function, ms: number) → Function` | 防抖包装 |

### showToast type 值

`"success"` | `"error"` | `"warn"` | `""（默认）`

### 使用

```js
import { escapeHtml, showToast, formatRelativeTime } from '/assets/js/core/utils.js';

showToast('订阅成功！', 'success');
const safe = escapeHtml('<script>alert(1)</script>');
const rel  = formatRelativeTime('2025-03-01');  // "约 60 天前"
```

---

## core/effects.js

**职责**：视觉特效初始化。

### 导出

| 函数 | 签名 | 说明 |
|------|------|------|
| `initParticles` | `(canvasId: string) → void` | 粒子网络背景，跟随当前主题色 |
| `initScrollReveal` | `(selector: string) → void` | IntersectionObserver 触发 `.reveal → .revealed` |
| `initCardTilt` | `(selector: string) → void` | 鼠标悬停 3D 倾斜效果 |
| `initGlitchText` | `(selector: string) → void` | Hover 时字符随机扰动 |
| `initScanLine` | `() → void` | 全局扫描线（在粒子 canvas 上绘制） |
| `initReadingProgress` | `(selector: string) → void` | 顶部阅读进度条（需传入滚动容器） |
| `initNeonLift` | `(selector: string) → void` | Hover 上浮 + 霓虹阴影 |

### 使用

```js
import { initParticles, initScrollReveal, initCardTilt,
         initGlitchText, initScanLine, initReadingProgress } from '/assets/js/core/effects.js';

initParticles('particles-canvas');
initScanLine();
initScrollReveal('.reveal');
initCardTilt('.blog-card');
initGlitchText('.glitch');
initReadingProgress('.post-content');
```

### 注意

- `initScrollReveal` 在动态插入 DOM 后需再次调用（如文章列表渲染完成后）。
- `initParticles` 会监听主题切换事件自动更新粒子颜色。

---

## core/markdown-renderer.js

**职责**：Markdown 文件加载、渲染与内容增强。

### 导出

| 函数 | 签名 | 说明 |
|------|------|------|
| `fetchMarkdown` | `(url: string) → Promise<string>` | 获取远程 .md 文件原始文本 |
| `renderMarkdownText` | `(md: string) → string` | 使用 marked.js 将 Markdown 转为 HTML |
| `enhanceContent` | `(container: Element) → void` | 对渲染后的 HTML 容器进行一键增强 |
| `extractTitle` | `(md: string) → string` | 从 Markdown 文本中提取第一个 `# 标题` |

### enhanceContent 处理内容

1. 响应式图片（`loading="lazy"` + `max-width: 100%`）
2. 外链添加 `target="_blank" rel="noopener noreferrer"`
3. 代码块添加复制按钮（`.code-copy-btn`）
4. 标题添加锚点链接（`.heading-anchor`）
5. 自动生成 TOC（≥3 个 h2/h3 时插入在第一个 h2 前）
6. 图片包裹为 `<figure>` + `<figcaption>`（alt 文本作为说明）

### 使用

```js
import { fetchMarkdown, renderMarkdownText,
         enhanceContent, extractTitle } from '/assets/js/core/markdown-renderer.js';

const md  = await fetchMarkdown('/assets/posts/ai/1_langchain-rag.md');
const title = extractTitle(md);
document.title = title;
container.innerHTML = renderMarkdownText(md);
enhanceContent(container);
```

---

## modules/blog-data.js

**职责**：全站博客元数据配置中心（非模块，通过 `<script src>` 加载为全局变量）。

### 全局变量

| 变量 | 类型 | 说明 |
|------|------|------|
| `BLOG_POSTS` | `Array<PostMeta>` | 所有博客元数据，按 weight 降序排列 |
| `BLOG_CONFIG` | `object` | 路径配置（BLOG_FOLDER、POSTS_FOLDER 等） |
| `TAG_CATEGORIES` | `object` | 分类定义（name、priority、tags 列表） |
| `TAG_TO_CATEGORY` | `object` | 标签 → 分类 id 的查询表 |

### PostMeta 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | `"{category}/{N}_{slug}"` |
| `title` | `string` | 文章标题 |
| `date` | `string` | ISO 日期 `"YYYY-MM-DD"` |
| `tags` | `string[]` | 标签列表（值需在 TAG_TO_CATEGORY 中注册） |
| `category` | `string` | 分类 id |
| `weight` | `number` | 排序权重，越大越靠前 |
| `summary` | `string` | 摘要（约 50 字，用于列表卡片） |

### 新增文章

1. 在对应 `*_POSTS` 数组末尾添加记录
2. 在 `assets/posts/{category}/` 下创建同名 `.md` 文件
3. 若使用了新标签，在 `TAG_TO_CATEGORY` 中添加映射

---

## modules/music-config.js

**职责**：音乐播放列表配置（非模块，通过 `<script src>` 加载为全局变量）。

### 全局变量

| 变量 | 类型 | 说明 |
|------|------|------|
| `MUSIC_LIST` | `Array<TrackConfig>` | 播放列表 |

### TrackConfig 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | `string` | 曲目名称（UI 显示） |
| `file` | `string` | 文件名（相对于 `assets/music/`） |
| `artist` | `string?` | 艺术家（可选） |

### 新增音乐

1. 将音频文件放入 `assets/music/`
2. 在 `MUSIC_LIST` 添加一条记录

---

## modules/email-subscribe.js

**职责**：邮件订阅组件逻辑。

### 导出

| 函数 | 签名 | 说明 |
|------|------|------|
| `mountEmailSubscribe` | `(container: Element) → void` | 渲染订阅面板并绑定交互 |

### 配置常量

| 常量 | 默认值 | 说明 |
|------|--------|------|
| `OFFLINE_MODE` | `true` | true = 纯前端模拟，状态存 localStorage |
| `ENDPOINT` | `""` | 上线后端后设置 POST 地址 |

### localStorage key

- `emailSubscription`：`{ email, subscribedAt }` | 无 key = 未订阅

### 使用

```js
import { mountEmailSubscribe } from '/assets/js/modules/email-subscribe.js';
mountEmailSubscribe(document.getElementById('es-container'));
```

### 上线后端

将 `OFFLINE_MODE` 改为 `false`，设置 `ENDPOINT` 为后端接收邮件订阅的 POST URL。
期望响应格式：`{ success: boolean, message?: string }`。

---

## modules/router.js

**职责**：全站路由配置（客户端路由辅助）。

> 当前为静态路由表，用于生成导航链接和面包屑。具体 API 参见源文件。

---

## components/music-player.js

**职责**：可拖拽悬浮背景音乐播放器。

### 使用方式

页面需先以 `<script src>` 引入 `music-config.js`（提供 `MUSIC_LIST`）和本文件：

```html
<script src="/assets/js/modules/music-config.js"></script>
<script src="/assets/js/components/music-player.js"></script>
<!-- 或在 module 脚本中手动初始化 -->
```

`music-player.js` 在 DOMContentLoaded 时自动创建 `MusicPlayer` 实例并调用 `init()`。
若需手动控制：

```js
const player = new MusicPlayer();
document.getElementById('musicPlayerContainer').innerHTML = player.playerHTML;
player.init();
```

### 类方法速览

| 方法 | 说明 |
|------|------|
| `constructor()` | 读取配置、生成 HTML、恢复持久化状态 |
| `generatePlayerHTML()` | 返回播放器完整 HTML 字符串 |
| `getTracks()` | 从 MUSIC_LIST 格式化并过滤曲目列表 |
| `validateTracks()` | 异步 HEAD 请求过滤不可访问文件 |
| `fileExists(url)` | 单文件可访问性检查 |
| `getMusicPath(filename)` | 文件名 → 绝对路径 |
| `loadPlaybackState()` | 从 localStorage 恢复曲目索引 / 进度 / 播放状态 |
| `savePlaybackState()` | 持久化当前播放状态 |
| `init()` | 公共初始化入口，代理至 initWithValidation() |
| `initWithValidation()` | 验证 → 渲染 → 绑定事件 → 自动播放 |
| `tryAutoPlay()` | 触发自动播放（处理浏览器策略限制） |
| `resetAutoPlayState()` | 清除自动播放尝试标记 |
| `loadTrack(index)` | 加载指定曲目（含状态恢复） |
| `loadAndPlayTrack(index)` | 加载并立即播放指定曲目 |
| `disableAllButtons()` | 禁用所有控制按钮 |
| `render()` | 将 playerHTML 写入 #musicPlayerContainer |
| `createAudioElement()` | 创建 `<audio>` 元素并绑定核心事件 |
| `setupEventListeners()` | 绑定所有 UI 交互事件 |
| `togglePlay()` | 播放/暂停切换 |
| `play()` | 开始播放 |
| `pause()` | 暂停播放 |
| `prevTrack()` | 上一首（循环） |
| `nextTrack()` | 下一首（循环） |
| `seekTo(time)` | 跳转到指定秒数 |
| `updateProgress(currentTime)` | 更新进度条 UI |
| `updateTimeDisplay(current, duration)` | 更新时间文本 |
| `updateTrackInfo()` | 刷新曲目标题/艺术家 DOM |
| `formatTime(seconds)` | 秒数 → "MM:SS" |
| `startProgressDrag(e)` | 开始进度条拖拽 |
| `startPlayerDrag(e)` | 开始播放器位置拖拽 |
| `onMouseMove(e)` | 处理拖拽中的 mousemove |
| `stopDrag()` | 结束所有拖拽 |

### localStorage key

- `musicPlayerState`：`{ currentTrackIndex, currentTime, isPlaying }`
- `musicPlayerAutoPlayTried`：`"true"` — 记录是否已尝试过自动播放

### 键盘快捷键

| 按键 | 行为 | 条件 |
|------|------|------|
| `Space` | 播放/暂停 | 焦点不在 INPUT/TEXTAREA |
| `←` | 后退 5 秒 | 任意 |
| `→` | 前进 5 秒 | 任意 |

---

## 模块数据流

```
music-config.js (MUSIC_LIST)
        │
        ▼
components/music-player.js ── localStorage (musicPlayerState)
        │
        ▼
   #musicPlayerContainer

blog-data.js (BLOG_POSTS)
        │
        ├─ pages/blog/index.html ── core/effects.js (initScrollReveal, initCardTilt)
        │                        └─ core/utils.js (escapeHtml, formatRelativeTime)
        │
        └─ pages/blog/post.html ── core/markdown-renderer.js (fetchMarkdown, enhanceContent)
                                └─ core/effects.js (initReadingProgress)

pages/cms/index.html ── fetch('/assets/posts/cms/cms-index.json')
                      └─ modules/email-subscribe.js ── localStorage (emailSubscription)

All pages ─── core/theme.js ── localStorage (theme)
          └── core/nav.js
```
