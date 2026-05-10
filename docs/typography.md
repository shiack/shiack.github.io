# 博客字体设计规范

> 本文档定义全站字体栈、字号体系、行高规则及主题差异。

---

## 一、字体栈

### 1. 正文字体（Body Text）

```css
font-family: 'Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
```

- **Inter**：现代无衬线字体，西文优先，支持 OpenType 特性
- **PingFang SC**：苹果系统中文字体，清晰易读
- **Hiragino Sans GB**：macOS 旧版中文字体
- **Microsoft YaHei**：Windows 中文字体
- **sans-serif**：系统默认无衬线字体

### 2. 标题字体（Headings）

```css
font-family: 'Sora', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
```

- **Sora**：几何无衬线字体，字形现代，适合标题
- 中文 fallback 与正文相同

### 3. 代码字体（Code）

```css
font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
```

- **JetBrains Mono**：专为开发者设计，字符区分度高，支持连字
- **Fira Code**：Mozilla 开源等宽字体，支持编程连字
- **Cascadia Code**：微软 Windows Terminal 默认字体
- **Consolas**：Windows 经典等宽字体
- **monospace**：系统默认等宽字体

---

## 二、字号与行高体系

| 元素 | 字号 | 行高 | 字重 | 应用场景 |
|------|------|------|------|----------|
| `h1` | `2rem` (32px) | `1.25` | 800 | 文章标题（仅 post.html） |
| `h2` | `1.45rem` (23.2px) | `1.3` | 700 | 一级章节标题 |
| `h3` | `1.2rem` (19.2px) | `1.35` | 600 | 二级章节标题 |
| `h4` | `1.05rem` (16.8px) | `1.4` | 600 | 三级章节标题 |
| `p` | `1rem` (16px) | `1.8` | 400 | 正文段落 |
| `li` | `1rem` (16px) | `1.75` | 400 | 列表项 |
| 行内 `code` | `0.88em` | — | 400 | 相对父元素缩小 12% |
| 代码块 `pre code` | `0.875rem` (14px) | `1.6` | 400 | 代码块 |
| `.tag` | `0.78rem` (12.48px) | `1.5` | 500 | 标签（大） |
| `.mini-tag` | `0.72rem` (11.52px) | `1.5` | 500 | 标签（小） |
| `.blog-title-link` | `1.05rem` (16.8px) | `1.4` | 700 | 博客列表卡片标题 |
| `.blog-summary` | `0.88rem` (14.08px) | `1.55` | 400 | 博客摘要 |
| `.blog-meta` | `0.8rem` (12.8px) | `1.5` | 400 | 文章元信息（日期/分类） |

### 字号基准

- **cyber / workspace**：`16px`
- **nature**：`16.5px`（略大，提升阅读舒适度）

---

## 三、主题差异

### 1. cyber（赛博朋克）

| 特征 | 值 |
|------|-----|
| 字号基准 | `16px` |
| 标题 letter-spacing | `0.02em`（h1/h2/h3） |
| 代码高亮色 | 霓虹绿 `#00FFCC` |
| 代码背景 | `rgba(0, 255, 204, 0.06)` |

**设计意图**：字母间距稍大，营造科技感；代码块使用霓虹绿高亮。

### 2. workspace（简约工作区）

| 特征 | 值 |
|------|-----|
| 字号基准 | `16px` |
| 标题 letter-spacing | 默认（无额外间距） |
| 代码高亮色 | 蓝色 `#1D4ED8` |
| 代码背景 | `rgba(0, 0, 0, 0.04)` |

**设计意图**：正常间距，专注内容；代码块使用蓝色高亮，与浅色背景对比清晰。

### 3. nature（清新自然）

| 特征 | 值 |
|------|-----|
| 字号基准 | `16.5px` |
| 标题 line-height | `1.85`（h1/h2/h3/p） |
| 代码高亮色 | 森林绿 `#3D4E36` |
| 代码背景 | `rgba(61, 78, 54, 0.06)` |

**设计意图**：字号略大、行高更宽松，适合长时间阅读；代码块使用暖色调绿色。

---

## 四、字体加载方案

### 方案 A：Google Fonts CDN（默认启用）

```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

**优点**：
- 开箱即用，无需手动管理字体文件
- CDN 全球加速，首次加载后浏览器缓存

**缺点**：
- 依赖外部服务（国内访问可能较慢）
- 每次访问需发起外部请求

### 方案 B：本地字体文件（备用）

下载 woff2 文件到 `assets/fonts/`，取消注释 `main.css` 中的 `@font-face` 规则：

```
assets/fonts/
├── Sora-Regular.woff2
├── Sora-SemiBold.woff2
├── Sora-Bold.woff2
├── Sora-ExtraBold.woff2
├── JetBrainsMono-Regular.woff2
├── JetBrainsMono-Medium.woff2
└── JetBrainsMono-SemiBold.woff2
```

**优点**：
- 无外部依赖，适合离线/内网部署
- 首次加载后完全本地化

**缺点**：
- 需手动下载并维护字体文件（约 1.2MB）
- 增加仓库体积

### 切换方法

1. 注释掉 `main.css` 第 8 行的 `@import`
2. 取消注释第 10-58 行的 `@font-face` 规则
3. 下载字体文件到 `assets/fonts/`

---

## 五、CSS 实现位置

| 规则 | 文件 | 行号范围 |
|------|------|----------|
| 字体加载（方案 A + B） | `assets/css/main.css` | 6-60 |
| body 字体栈 + 基准字号 | `assets/css/main.css` | 940-960 |
| 博客字体系统（完整规则） | `assets/css/main.css` | 2139-2290 |

---

## 六、使用示例

### 1. 标题

```html
<h1>这是一级标题</h1>  <!-- Sora, 2rem, 800 -->
<h2>这是二级标题</h2>  <!-- Sora, 1.45rem, 700 -->
<h3>这是三级标题</h3>  <!-- Sora, 1.2rem, 600 -->
```

### 2. 正文

```html
<p>这是正文段落，使用 Inter 字体，行高 1.8。</p>
```

### 3. 代码

```html
<p>行内代码：<code>const x = 42;</code></p>

<pre><code class="language-javascript">
// 代码块使用 JetBrains Mono
function hello() {
  console.log('Hello, World!');
}
</code></pre>
```

### 4. 标签

```html
<span class="tag">#前端开发</span>
<span class="mini-tag">#React</span>
```

---

## 七、可访问性

- **最小字号**：`0.72rem` (11.52px)，符合 WCAG 2.1 AA 标准（≥ 11px）
- **行高**：正文 `1.8`，列表 `1.75`，超过 WCAG 推荐的 `1.5`
- **对比度**：
  - cyber：白色文字 `#FFFFFF` on 黑色背景 `#000000` = 21:1（AAA）
  - workspace：黑色文字 `#000000` on 白色背景 `#FFFFFF` = 21:1（AAA）
  - nature：深绿文字 `#2D352A` on 暖白背景 `#FAF8F5` = 12.8:1（AAA）

---

## 八、性能优化

### 字体加载策略

```css
@font-face {
    font-display: swap;  /* 先显示系统字体，字体加载完成后切换 */
}
```

### 子集化（可选）

若需进一步优化，可使用 `unicode-range` 仅加载常用字符：

```css
@font-face {
    font-family: 'Sora';
    src: url('/assets/fonts/Sora-Regular.woff2') format('woff2');
    unicode-range: U+0020-007F, U+4E00-9FFF;  /* 基本拉丁 + 常用汉字 */
}
```

---

## 九、浏览器兼容性

| 字体格式 | Chrome | Firefox | Safari | Edge |
|----------|--------|---------|--------|------|
| woff2 | ✅ 36+ | ✅ 39+ | ✅ 10+ | ✅ 14+ |
| Google Fonts | ✅ | ✅ | ✅ | ✅ |

**结论**：woff2 + Google Fonts 覆盖所有现代浏览器（2015 年后）。

---

## 十、维护清单

### 新增字重时

1. 在 Google Fonts URL 中添加字重参数
2. 若使用本地字体，下载对应 woff2 文件并添加 `@font-face` 规则

### 新增字体时

1. 更新字体栈 CSS 变量
2. 在 `main.css` 顶部添加 `@import` 或 `@font-face`
3. 更新本文档的字体栈表格

### 调整字号时

1. 修改 `main.css` 中对应选择器的 `font-size` / `line-height`
2. 同步更新本文档的字号表格
3. 在多个主题下测试视觉效果
