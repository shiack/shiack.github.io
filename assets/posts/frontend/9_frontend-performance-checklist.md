# 前端性能优化清单：从加载到渲染

> Core Web Vitals 是 Google 评估用户体验的核心指标，LCP/FID/CLS 直接影响 SEO 排名和用户留存。

---

## 一、Core Web Vitals

```
LCP (Largest Contentful Paint) — 最大内容绘制时间
  好: < 2.5s | 需改进: 2.5-4s | 差: > 4s
  通常是：首屏大图、视频封面、大段文字块

FID (First Input Delay) → INP (Interaction to Next Paint)
  好: < 200ms | 需改进: 200-500ms | 差: > 500ms
  主线程长任务阻塞导致

CLS (Cumulative Layout Shift) — 累计布局偏移
  好: < 0.1 | 需改进: 0.1-0.25 | 差: > 0.25
  未指定尺寸的图片/广告、动态注入内容导致
```

---

## 二、资源加载优化

### 2.1 关键渲染路径

```html
<!-- ✅ 关键 CSS 内联（避免 FOUC） -->
<style>
  /* 首屏必需样式 */
  body { margin: 0; font-family: system-ui; }
  .hero { min-height: 100vh; background: #000; }
</style>

<!-- ✅ 非关键 CSS 异步加载 -->
<link rel="preload" href="/styles/main.css" as="style"
      onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles/main.css"></noscript>

<!-- ✅ 预连接第三方域名（减少 DNS+TCP+TLS 时间） -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://cdn.example.com">

<!-- ✅ 预加载关键资源 -->
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin>
<link rel="preload" href="/images/hero.webp" as="image">

<!-- ✅ JS 异步（defer 保持顺序，async 无序） -->
<script defer src="/js/app.js"></script>
<script async src="/js/analytics.js"></script>
```

### 2.2 图片优化

```html
<!-- 现代格式 + 响应式 + 懒加载 -->
<picture>
  <source srcset="/img/hero.avif" type="image/avif">
  <source srcset="/img/hero.webp" type="image/webp">
  <img
    src="/img/hero.jpg"
    alt="Hero image"
    width="800" height="600"          <!-- 必须指定，防止 CLS -->
    loading="lazy"                    <!-- 非首屏图片懒加载 -->
    decoding="async"
    fetchpriority="high"              <!-- LCP 图片设为 high -->
  >
</picture>
```

```javascript
// 原生懒加载 + IntersectionObserver 兜底
if ('loading' in HTMLImageElement.prototype) {
    // 浏览器原生支持 loading="lazy"
} else {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target
                img.src = img.dataset.src
                observer.unobserve(img)
            }
        })
    }, { rootMargin: '200px' })

    document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img))
}
```

---

## 三、JavaScript 性能

### 3.1 代码分割

```javascript
// vite / webpack 动态导入（路由级别分割）
const routes = [
    {
        path: '/dashboard',
        component: () => import('./pages/Dashboard.vue'),  // 懒加载
    },
    {
        path: '/editor',
        component: () => import('./pages/Editor.vue'),
    },
]

// 按需加载重型库
async function openChart() {
    const { Chart } = await import('chart.js')
    new Chart(canvas, config)
}
```

### 3.2 避免长任务

```javascript
// ❌ 同步处理大数组阻塞主线程
function processLargeArray(items) {
    return items.map(heavyCompute)  // 10000 条 → 阻塞 500ms
}

// ✅ 分片处理（让浏览器有机会处理用户输入）
async function processInChunks(items, chunkSize = 100) {
    const results = []
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize)
        results.push(...chunk.map(heavyCompute))
        // 让出主线程
        await new Promise(resolve => setTimeout(resolve, 0))
    }
    return results
}

// ✅ 计算密集型任务放 Web Worker
const worker = new Worker('/workers/compute.js')
worker.postMessage({ items: largeArray })
worker.onmessage = (e) => console.log('结果:', e.data)
```

### 3.3 防抖与节流

```javascript
// 防抖：搜索框输入（只在停止输入后执行）
function debounce(fn, delay) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

// 节流：滚动/resize（固定频率执行）
function throttle(fn, interval) {
    let last = 0
    return (...args) => {
        const now = Date.now()
        if (now - last >= interval) {
            last = now
            fn(...args)
        }
    }
}

const onSearch = debounce(fetchResults, 300)
const onScroll = throttle(updateNavbar, 100)
```

---

## 四、渲染性能

### 4.1 避免强制同步布局

```javascript
// ❌ 读写交替：每次读触发重排
elements.forEach(el => {
    const width = el.offsetWidth      // 强制布局
    el.style.width = width * 2 + 'px' // 触发重排
})

// ✅ 批量读，批量写
const widths = elements.map(el => el.offsetWidth)  // 批量读
elements.forEach((el, i) => {
    el.style.width = widths[i] * 2 + 'px'         // 批量写
})
// 或使用 requestAnimationFrame
```

### 4.2 CSS 动画优化

```css
/* ✅ 使用 transform/opacity（不触发重排/重绘，GPU 加速） */
.slide-in {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    will-change: transform;   /* 提示浏览器创建独立图层 */
}

/* ❌ 避免动画 left/top/width/height（触发重排） */
.bad-animation {
    transition: left 0.3s ease;
}

/* 减少重绘范围 */
.loading-spinner {
    contain: strict;   /* 隔离子树的布局/样式/绘制 */
}
```

---

## 五、测量工具

```javascript
// Performance API 精准测量
performance.mark('start-process')
await processData()
performance.mark('end-process')
performance.measure('process-duration', 'start-process', 'end-process')

const [measure] = performance.getEntriesByName('process-duration')
console.log(`耗时: ${measure.duration.toFixed(2)}ms`)

// 监控 LCP
new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lcp = entries[entries.length - 1]
    console.log('LCP:', lcp.startTime, lcp.element)
}).observe({ type: 'largest-contentful-paint', buffered: true })

// 监控 CLS
let clsValue = 0
new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) clsValue += entry.value
    }
    console.log('CLS:', clsValue)
}).observe({ type: 'layout-shift', buffered: true })
```

---

## 总结

性能优化优先级：

| 优先级 | 措施 | 效果 |
|--------|------|------|
| ★★★ | 图片 WebP + 懒加载 + 尺寸声明 | LCP↓, CLS↓ |
| ★★★ | JS 代码分割 + 路由懒加载 | FID↓, 首次加载↓ |
| ★★★ | 关键 CSS 内联 + 非关键异步 | FCP↓ |
| ★★ | 预连接/预加载关键资源 | TTFB↓ |
| ★★ | 分片处理 + Web Worker | INP↓ |
| ★ | CSS transform 动画 | 渲染流畅度↑ |

---

*本文作者：林墨川 | 更新时间：2024年*
