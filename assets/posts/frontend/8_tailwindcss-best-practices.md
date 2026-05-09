# Tailwind CSS 最佳实践：原子化 CSS 设计

> Tailwind 用工具类组合取代语义化 CSS，消除命名负担，但需要规范约束才能避免类名膨胀。

---

## 一、原子化 CSS 的设计哲学

```
传统 CSS（语义化）:            Tailwind（原子化）:
.card {                        <div class="
  background: white;               bg-white
  border-radius: 8px;              rounded-lg
  padding: 16px;                   p-4
  box-shadow: 0 1px 3px ...;       shadow-md
}                                  hover:shadow-lg
                                   transition-shadow
                               ">
```

**为什么有效：**
- 不再为"该叫 `.card` 还是 `.product-card`"争论
- CSS 文件大小恒定（工具类有限），HTML 按需增长
- 修改不影响其他组件（局部性）

---

## 二、核心配置

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,ts,jsx,tsx,vue}'],

    theme: {
        extend: {
            // 扩展颜色品牌色（不覆盖默认色板）
            colors: {
                brand: {
                    50:  '#eff6ff',
                    500: '#3b82f6',
                    900: '#1e3a8a',
                },
            },
            // 自定义间距
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
            },
            // 自定义字体
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            // 自定义动画
            keyframes: {
                'fade-in': {
                    '0%':   { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                'fade-in': 'fade-in 0.3s ease-out',
            },
        },
    },

    plugins: [
        require('@tailwindcss/typography'),   // prose 排版
        require('@tailwindcss/forms'),         // 表单美化
    ],
}
```

---

## 三、组件模式

### 3.1 用 @apply 抽取重复样式

```css
/* styles/components.css */
/* 只在 3+ 处重复时才抽取，不要提前抽象 */
@layer components {
    .btn {
        @apply inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium
               transition-colors duration-150 focus:outline-none focus:ring-2;
    }

    .btn-primary {
        @apply btn bg-brand-500 text-white hover:bg-brand-600
               focus:ring-brand-500 focus:ring-offset-2;
    }

    .btn-ghost {
        @apply btn bg-transparent text-gray-700 hover:bg-gray-100
               focus:ring-gray-400;
    }

    .card {
        @apply bg-white rounded-xl shadow-sm border border-gray-100
               overflow-hidden;
    }

    .input {
        @apply w-full px-3 py-2 rounded-md border border-gray-300
               text-sm placeholder-gray-400
               focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent;
    }
}
```

### 3.2 响应式设计

```html
<!-- Tailwind 移动优先：无前缀=移动，sm/md/lg/xl=断点 -->
<div class="
    grid grid-cols-1          /* 移动端：单列 */
    sm:grid-cols-2            /* ≥640px：两列 */
    lg:grid-cols-3            /* ≥1024px：三列 */
    gap-4 lg:gap-6
">
    <!-- 卡片在移动端全宽，桌面端1/3宽 -->
    <article class="
        col-span-1
        p-4 lg:p-6
        text-sm lg:text-base
    ">...</article>
</div>
```

---

## 四、暗色模式

```javascript
// tailwind.config.js
export default {
    darkMode: 'class',   // 通过 .dark class 切换（vs 'media'）
    // ...
}
```

```html
<!-- 在根元素添加 dark class 即可激活 -->
<html class="dark">
    <div class="
        bg-white dark:bg-gray-900
        text-gray-900 dark:text-gray-100
        border border-gray-200 dark:border-gray-700
    ">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
            标题
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
            内容
        </p>
    </div>
</html>
```

```javascript
// 暗色模式切换
function toggleDark() {
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme',
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    )
}

// 初始化（避免闪烁）
if (localStorage.theme === 'dark' || (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
}
```

---

## 五、性能优化

### 5.1 生产构建裁剪

```bash
# Tailwind 会扫描 content 配置的文件，只保留使用的工具类
# 开发时: ~3MB | 生产时: ~5-50KB
npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify
```

### 5.2 避免动态类名拼接

```javascript
// ❌ 错误：Tailwind 静态扫描找不到 text-red-500
const color = 'red'
const cls = `text-${color}-500`

// ✅ 正确：完整类名保留在代码中，方便扫描
const colorMap = {
    red:    'text-red-500',
    green:  'text-green-500',
    blue:   'text-blue-500',
}
const cls = colorMap[color]
```

### 5.3 使用 cva（class-variance-authority）管理变体

```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const button = cva(
    // 基础类
    'inline-flex items-center rounded-md font-medium transition-colors',
    {
        variants: {
            intent: {
                primary: 'bg-blue-600 text-white hover:bg-blue-700',
                danger:  'bg-red-600 text-white hover:bg-red-700',
                ghost:   'bg-transparent text-gray-700 hover:bg-gray-100',
            },
            size: {
                sm: 'px-3 py-1.5 text-sm',
                md: 'px-4 py-2 text-base',
                lg: 'px-6 py-3 text-lg',
            },
        },
        defaultVariants: { intent: 'primary', size: 'md' },
    }
)

type ButtonProps = VariantProps<typeof button>

function Button({ intent, size, children }: ButtonProps) {
    return <button class={button({ intent, size })}>{children}</button>
}
```

---

## 总结

Tailwind 使用规范：
- **配置扩展而非覆盖**（用 `extend`，保留默认设计系统）
- **`@apply` 保守使用**（3+ 重复才抽取，避免回到传统 CSS 的命名问题）
- **完整类名**（不动态拼接，让 PurgeCSS 正确扫描）
- **cva/clsx** 管理复杂变体，比手动字符串拼接更安全
- **移动优先**，先写基础样式，再用断点前缀覆盖

---

*本文作者：林墨川 | 更新时间：2024年*
