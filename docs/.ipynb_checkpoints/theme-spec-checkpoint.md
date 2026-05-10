# 三套主题配色规范

> 文件生成时间：2026-05-09  
> 覆盖范围：全站所有页面（index / blog-list / post / cms）

---

## 1. CSS Token 规范表

### 1.1 现有变量值

| Token | workspace | cyber | nature |
|---|---|---|---|
| `--primary-color` | `#0D1117` | `#00FFCC` | `#3D4E36` |
| `--secondary-color` | `#1F2937` | `#FF007F` | `#8B6914` |
| `--accent-color` | `#1D4ED8` | `#A855F7` | `#4A5E42` |
| `--bg-gradient-start` | `#FFFFFF` | `#000000` | `#FAF8F5` |
| `--bg-gradient-mid` | `#F3F4F6` | `#050508` | `#F5F2ED` |
| `--bg-gradient-end` | `#E5E7EB` | `#000000` | `#FAF8F5` |
| `--card-bg` | `rgba(255,255,255,0.99)` | `rgba(5,8,15,0.98)` | `rgba(245,242,237,0.95)` |
| `--text-color` | `#000000` | `#FFFFFF` | `#2D352A` |
| `--text-secondary` | `#1F2937` | `#CBD5E1` | `#5C6B57` |
| `--text-muted` | `#4B5563` | `#64748B` | `#8A9A85` |
| `--border-color` | `rgba(0,0,0,0.2)` | `rgba(0,255,204,0.6)` | `rgba(61,78,54,0.2)` |
| `--grid-color` | `rgba(0,0,0,0.05)` | `rgba(0,255,204,0.12)` | `rgba(61,78,54,0.05)` |
| `--shadow-color` | `0 1px 3px rgba(0,0,0,0.15)` | `0 0 10px rgba(0,255,204,0.5)` | `0 2px 8px rgba(0,0,0,0.06)` |
| `--radius` | `6px` | `4px` | `16px` |

### 1.2 新增 Token（补丁写入 main.css 三个主题块）

| Token | workspace | cyber | nature | 用途 |
|---|---|---|---|---|
| `--focus-ring` | `rgba(29,78,216,0.35)` | `rgba(0,255,204,0.35)` | `rgba(61,78,54,0.25)` | input/button focus ring |
| `--danger-color` | `#DC2626` | `#FF4466` | `#B45309` | 错误 / 删除操作 |
| `--success-color` | `#16A34A` | `#00FFCC` | `#3D7A3D` | 成功反馈 |
| `--warn-color` | `#D97706` | `#F5A623` | `#8B6914` | 警告提示 |
| `--interactive-bg` | `rgba(29,78,216,0.06)` | `rgba(0,255,204,0.07)` | `rgba(61,78,54,0.06)` | 按钮/标签 hover 背景 |
| `--interactive-bg-active` | `rgba(29,78,216,0.12)` | `rgba(0,255,204,0.13)` | `rgba(61,78,54,0.11)` | 按钮/标签 active 背景 |
| `--overlay-bg` | `rgba(0,0,0,0.05)` | `rgba(0,0,0,0.3)` | `rgba(0,0,0,0.04)` | 浮层/推荐卡片背景 |
| `--overlay-bg-hover` | `rgba(0,0,0,0.08)` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.07)` | 浮层 hover 背景 |
| `--neon-shadow` | `0 4px 14px rgba(29,78,216,0.18)` | `0 8px 32px rgba(0,255,204,0.22)` | `0 4px 14px rgba(61,78,54,0.14)` | neon-lift hover shadow |
| `--tag-shadow` | `0 0 8px rgba(29,78,216,0.25)` | `0 0 8px rgba(0,255,204,0.5)` | `0 0 6px rgba(61,78,54,0.2)` | tag/mini-tag hover glow |
| `--code-bg` | `rgba(0,0,0,0.04)` | `rgba(0,255,204,0.06)` | `rgba(61,78,54,0.06)` | inline code 背景 |

---

## 2. 组件配色细节（按页面）

### 2.0 全站通用组件

#### 导航栏 `.nav-bar` / `.nav-links a`

| 态 | workspace | cyber | nature |
|---|---|---|---|
| 默认 | `text-color` 80% opacity | `text-color` 80% | `text-color` 80% |
| hover / active | `primary-color` + 下划线 | `primary-color` + 下划线 | `primary-color` + 下划线 |
| 当前页 active | bold + `primary-color` | bold + `primary-color` | bold + `primary-color` |

**问题**：无，变量驱动，已正确。

---

#### 卡片 `.cyber-card`

| 态 | workspace | cyber | nature |
|---|---|---|---|
| 默认 border | `border-color` (黑20%) | `border-color` (绿60%) | `border-color` (绿20%) |
| hover border | `primary-color` | `primary-color` | `primary-color` |
| box-shadow | `shadow-color` | `shadow-color` | `shadow-color` |

**问题**：`box-shadow` 第三项 `0 0 30px rgba(0,255,255,0.05)` 硬编码青色，workspace/nature 下有轻微视觉偏差。  
**修复**：改用 `var(--neon-shadow)` 或删掉第三项。

---

#### 标签 `.tag` / `.mini-tag`

| 态 | workspace | cyber | nature |
|---|---|---|---|
| 默认 bg | `card-bg`（白） | `card-bg`（深色） | `card-bg`（暖白） |
| hover bg | ❌ `rgba(0,0,0,0.1)` → 灰，偏暗 | ✅ OK | `rgba(0,0,0,0.1)` → 偏暗 |
| hover border | `primary-color` | `primary-color` | `primary-color` |
| hover shadow | ❌ `0 0 15px var(--primary-color)` → workspace 深色强光 | ✅ OK | 偏重 |
| active | 同 hover | 同 hover | 同 hover |

**修复**：hover bg 改 `var(--interactive-bg)`；shadow 改 `var(--tag-shadow)`。

---

#### Neon lift `.neon-lift:hover`

| 态 | workspace | cyber | nature |
|---|---|---|---|
| box-shadow | ❌ 硬编码 `rgba(0,255,204,0.22)` | ✅ | ❌ 应为森林绿 |

**修复**：改 `var(--neon-shadow)`。

---

#### 博客卡片 `.blog-card`

| 态 | workspace | cyber | nature |
|---|---|---|---|
| hover bg | `bg-gradient-mid` | `bg-gradient-mid` | `bg-gradient-mid` |
| hover border | `primary-color` | `primary-color` | `primary-color` |
| 侧条渐变 `::before` | 黑→深灰 | 绿→洋红 | 深绿→棕金 |

**问题**：侧条用变量 OK；`.read-more:hover` 的 `background: rgba(0,255,255,0.15)` 硬编码青色。  
**修复**：改 `var(--interactive-bg)`。

---

#### 按钮 `.btn-blog`

| 态 | workspace | cyber | nature |
|---|---|---|---|
| border | ❌ `#0ff` 硬编码 | ❌ `#0ff` | ❌ `#0ff` |
| hover bg | ❌ `rgba(0,255,255,0.3)` | ❌ | ❌ |

**修复**：border 改 `var(--primary-color)`；hover bg 改 `var(--interactive-bg-active)`。

---

#### Toast `.toast`

| 状态 | workspace | cyber | nature |
|---|---|---|---|
| success border | `primary-color` (黑) | `primary-color` (绿) | `primary-color` (深绿) |
| error border | `secondary-color` (深灰) | `secondary-color` (洋红) | `secondary-color` (棕金) |
| warn border | ❌ `#f5a623` 硬编码 | ❌ | ❌ |

**修复**：warn border 改 `var(--warn-color)`。

---

#### 推荐列表 `.recommend-item`

| 态 | workspace | cyber | nature |
|---|---|---|---|
| 默认 bg | ❌ `rgba(0,0,0,0.3)` → 浅色主题深灰块 | ✅ | ❌ |
| hover bg | ❌ `rgba(0,0,0,0.5)` | ✅ | ❌ |
| hover border | `accent-color` | `accent-color` | `accent-color` |

**修复**：bg 改 `var(--overlay-bg)`；hover bg 改 `var(--overlay-bg-hover)`。

---

#### 音乐播放器 `.music-player`

| 组件 | workspace | cyber | nature |
|---|---|---|---|
| `.music-btn` hover bg | `bg-gradient-mid` ✅ | ✅ | ✅ |
| `.music-btn.play` border/color | `accent-color` (蓝) ✅ | `accent-color` (紫) ✅ | `accent-color` (深绿) — 偏暗 |
| `.music-progress` bg | ❌ `rgba(255,255,255,0.2)` → workspace 不可见 | ✅ | ❌ |
| `.music-drag-handle` hover shadow | `0 0 10px var(--primary-color)` — workspace 黑色光晕 ❌ | ✅ | ❌ |

**修复**：
- `.music-progress` bg 改 `var(--border-color)`
- drag-handle hover shadow 改 `var(--tag-shadow)`
- nature 主题 `.music-btn.play`：用 `--primary-color` 代替 `--accent-color`

---

#### 邮件订阅 `.es-panel`

| 组件 | workspace | cyber | nature |
|---|---|---|---|
| `.es-btn` hover bg | ❌ `rgba(0,255,204,0.06)` 硬编码 | ✅ | 已有覆盖 ✅ |
| `.es-input` bg | `rgba(0,0,0,0.04)` → 覆盖 OK | ✅ | `rgba(255,255,255,0.6)` OK |
| `.es-input:focus` shadow | 蓝色覆盖 ✅ | ✅ | 深绿覆盖 ✅ |
| `.es-hint.info` bg | ❌ `rgba(255,255,255,0.03)` 几乎不可见 | OK | ❌ |
| `.es-footnote` color | `text-muted` ✅ | ✅ | ✅ |

**修复**：`.es-btn` 基础 hover bg 改 `var(--interactive-bg)`；`.es-hint.info` bg 改 `var(--overlay-bg)`。

---

### 2.1 首页 `index.html`

| 组件 | workspace 问题 | cyber | nature 问题 |
|---|---|---|---|
| `.stat-value` | ✅ | ✅ | ✅ |
| `.avatar` | 蓝色光晕 ✅ | 绿色光晕 ✅ | 绿色光晕 ✅ |
| `.ex-part` 左边框 | 黑色 `primary-color` ✅ | 绿 ✅ | 深绿 ✅ |
| `.social-link:hover` | ❌ hover bg `bg-gradient-mid` 几乎无感知 | ✅ | ✅ |
| `.resume-info h1` | `text-color`（黑）— 在白背景上 ✅ | ✅ | ✅ |

**新增规则**：`.theme-workspace .social-link:hover { background: var(--interactive-bg); }`

---

### 2.2 博客列表页 `blog/index.html`

| 组件 | 问题 |
|---|---|
| `.tag-cloud .tag` | hover 用 `rgba(0,0,0,0.1)` + `0 0 15px var(--primary-color)` — workspace/nature 效果差 |
| `.blog-card:hover` | `border-color: var(--primary-color)` — workspace 为黑，hover 感不明显，需加 `box-shadow` |

**修复**：博客列表 `.blog-card:hover` 追加 `box-shadow: var(--neon-shadow)`

---

### 2.3 博客详情页 `post.html`

| 组件 | 问题 |
|---|---|
| `.toc a:hover` | `primary-color` ✅ |
| `.code-copy-btn:hover` | `background: var(--primary-color); color: #000` — workspace 为黑底黑字 ❌ |
| `.heading-anchor` | `primary-color` ✅ |
| `.related-item:hover` | `box-shadow: 0 0 15px var(--primary-color)` — workspace 为黑色光 ❌ |
| `blockquote` | ✅ |
| `.markdown-content code` inline | background `bg-gradient-mid` ✅ |

**修复**：
- `.code-copy-btn:hover { color: var(--bg-gradient-start); }` (白→白/黑适应)
- `.related-item:hover { box-shadow: var(--neon-shadow); }`

---

### 2.4 CMS 页 `cms/index.html`

| 组件 | 问题 |
|---|---|
| `.schedule-slot.s-next` | `border-color: var(--accent-color)` ✅ |
| `.countdown-line em` | `primary-color` ✅ |
| `.lang-btn.active` | `border/color: primary-color` ✅ |
| `.cms-filter-btn.active` | ❌ `background: rgba(0,255,204,0.07)` 硬编码 | 
| `.slot-badge` 背景 | `.s-done: rgba(0,255,204,0.12)` ❌ `.s-next: rgba(168,85,247,0.15)` ❌ |

**修复**：
- `.cms-filter-btn.active/hover bg` 改 `var(--interactive-bg)`
- `.s-done .slot-badge bg` 改 `var(--interactive-bg)`；`.s-next .slot-badge bg` 改 `rgba` from `accent-color`

---

## 3. 实施文件列表

所有修复集中写入一个新文件：`assets/css/base/theme-overrides.css`，在每个页面的所有 link 标签最后引入。

修改点汇总：
1. **main.css** — 三主题各追加 11 个新 Token
2. **theme-overrides.css**（新建）— 包含所有跨主题覆盖规则，约 120 条
3. **email-subscribe.css** — 修 `.es-btn` hover bg、`.es-hint.info` bg
4. **effects.css** — 修 `.neon-lift`、`.tag`/`.mini-tag` hover、`.toast.toast-warn`
5. **main.css 组件规则** — 修 `.btn-blog`、`.read-more:hover`、`.recommend-item`、`.code-copy-btn:hover`

---

## 4. 变量使用速查

```
交互反馈：
  hover背景    → --interactive-bg
  active背景   → --interactive-bg-active
  浮层/覆盖    → --overlay-bg / --overlay-bg-hover

阴影效果：
  卡片 hover   → --neon-shadow
  标签 hover   → --tag-shadow
  focus ring   → --focus-ring

语义色：
  成功         → --success-color
  错误/危险    → --danger-color
  警告         → --warn-color
```
