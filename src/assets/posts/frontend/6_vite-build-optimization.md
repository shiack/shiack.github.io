# Vite 构建优化：从开发到生产

> Vite 利用浏览器原生 ESM 实现毫秒级热更新，生产环境基于 Rollup 打包，是当前前端构建工具的最优选择。

---

## 一、Vite 工作原理

```
开发环境（Dev Server）：
  浏览器请求 main.js
       ↓
  Vite 按需编译（ESM + esbuild）
       ↓                    ↓
  返回转换后的模块     依赖预构建（node_modules → bundle）

生产环境（Build）：
  vite build
       ↓
  Rollup 打包 → 代码分割 → Tree-shaking → 输出 dist/
```

### 1.1 Dev vs Webpack 速度对比

| 指标 | Vite | Webpack（CRA） |
|------|------|----------------|
| 冷启动 | < 300ms | 30-60s |
| HMR | < 50ms | 1-3s |
| 生产构建 | 中（Rollup） | 慢（Webpack） |
| 配置复杂度 | 低 | 高 |

---

## 二、配置基础

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
      }
    },

    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },

    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: mode !== 'production',
    }
  }
})
```

---

## 三、代码分割策略

### 3.1 自动分割（路由级）

```typescript
// React + React Router 懒加载路由
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'

const Home    = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))

const router = createBrowserRouter([
  { path: '/', element: <Suspense fallback={<Loading />}><Home /></Suspense> },
  { path: '/dashboard', element: <Suspense fallback={<Loading />}><Dashboard /></Suspense> },
])
```

### 3.2 手动分割（vendor chunks）

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // 第三方库单独打包（长期缓存）
        'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
        'ui-vendor':     ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
        'chart-vendor':  ['recharts', 'd3'],
        'utils-vendor':  ['lodash-es', 'dayjs', 'zod'],
      }
    }
  }
}
```

```
优化效果：
  优化前: app.js 2.4MB（单文件）
  优化后:
    app.js         120KB（业务代码）
    react-vendor.js 130KB（基本不变，长期缓存）
    ui-vendor.js    95KB（偶尔变化）
```

---

## 四、Tree-shaking 优化

```typescript
// ❌ 全量引入（引入整个 lodash 4MB）
import _ from 'lodash'
_.debounce(fn, 300)

// ✅ 按需引入 ES module 版本（tree-shaking 有效）
import debounce from 'lodash-es/debounce'

// ✅ 或使用更小的替代
import debounce from 'just-debounce-it'  // 仅 200 bytes

// 检查是否有效：
// vite build --analyzer
// 或 rollup-plugin-visualizer
```

### 4.1 Bundle 分析

```bash
npm install -D rollup-plugin-visualizer
```

```typescript
import { visualizer } from 'rollup-plugin-visualizer'

plugins: [
  react(),
  visualizer({ open: true, gzipSize: true })  // build 后自动打开分析图
]
```

---

## 五、插件开发基础

```typescript
// plugins/auto-import-antd.ts
import type { Plugin } from 'vite'

export function autoImportAntd(): Plugin {
  return {
    name: 'auto-import-antd',
    transform(code, id) {
      if (!id.endsWith('.tsx') && !id.endsWith('.ts')) return
      // 将 `import { Button } from 'antd'` 转换为按需引入
      return code.replace(
        /import\s+\{([^}]+)\}\s+from\s+'antd'/g,
        (_, components) => {
          return components.split(',').map(c => c.trim()).map(name =>
            `import ${name} from 'antd/es/${name.toLowerCase()}'`
          ).join('\n')
        }
      )
    }
  }
}
```

---

## 总结

Vite 优化路径：
1. **路由懒加载** — 最容易实现，减少首屏体积
2. **manualChunks** — 将 vendor 拆离，提高缓存命中率
3. **lodash-es 替代 lodash** — 让 tree-shaking 生效
4. **rollup-plugin-visualizer** 分析包，找体积大的依赖
5. 生产环境开启 **gzip/brotli**（Nginx 或 vite-plugin-compression）

---

*本文作者：林墨川 | 更新时间：2024年*
