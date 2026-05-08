# Vue 3 Composition API 完全指南

> Composition API 是 Vue 3 的核心特性，将逻辑按功能组织而非按选项类型分散，使复杂组件更易维护和复用。

---

## 一、Options API vs Composition API

### 1.1 问题：逻辑碎片化

Options API 按类型（data/methods/computed/watch）拆分，导致同一功能的代码散落各处：

```javascript
// Options API：搜索逻辑散落在 data、computed、methods、watch 四处
export default {
  data() {
    return { query: '', results: [], loading: false }
  },
  computed: {
    hasResults() { return this.results.length > 0 }
  },
  methods: {
    async search() { /* ... */ }
  },
  watch: {
    query(val) { this.search(val) }
  }
}
```

### 1.2 解决：按功能组织

```javascript
// Composition API：搜索逻辑集中在 useSearch composable
function useSearch() {
  const query   = ref('')
  const results = ref([])
  const loading = ref(false)
  const hasResults = computed(() => results.value.length > 0)

  async function search(q) {
    loading.value = true
    results.value = await api.search(q)
    loading.value = false
  }

  watch(query, (val) => search(val))
  return { query, results, loading, hasResults }
}
```

---

## 二、setup() 与响应式基础

### 2.1 ref 与 reactive

```javascript
import { ref, reactive, toRefs } from 'vue'

// ref：包装任意值（通过 .value 访问）
const count = ref(0)
count.value++

// reactive：响应式对象（直接访问属性）
const state = reactive({ count: 0, name: 'Vue' })
state.count++

// toRefs：解构 reactive 不丢失响应性
const { count, name } = toRefs(state)
```

### 2.2 ref vs reactive 选择指南

| 场景 | 推荐 |
|------|------|
| 单个原始值（数字、字符串、布尔） | `ref` |
| 相关联的多个属性 | `reactive` |
| 模板中需要自动解包 | `ref`（顶层 ref 模板中不需要 .value） |
| 从函数返回响应式数据 | `ref`（保持响应性不丢失） |

### 2.3 computed 与 watch

```javascript
import { computed, watch, watchEffect } from 'vue'

const firstName = ref('张')
const lastName  = ref('三')

// computed：派生值，有缓存
const fullName = computed(() => `${firstName.value}${lastName.value}`)

// watch：监听特定源，可访问新旧值
watch(firstName, (newVal, oldVal) => {
  console.log(`${oldVal} -> ${newVal}`)
})

// watchEffect：立即运行，自动追踪依赖
watchEffect(() => {
  console.log(`姓名变化：${fullName.value}`)
})
```

---

## 三、组合式函数（Composables）

### 3.1 提取复用逻辑

```javascript
// composables/useFetch.js
import { ref } from 'vue'

export function useFetch(url) {
  const data    = ref(null)
  const error   = ref(null)
  const loading = ref(true)

  fetch(url)
    .then(r => r.json())
    .then(json => { data.value = json })
    .catch(err => { error.value = err })
    .finally(() => { loading.value = false })

  return { data, error, loading }
}
```

```vue
<!-- 组件中使用 -->
<script setup>
import { useFetch } from '@/composables/useFetch'
const { data, loading } = useFetch('/api/users')
</script>

<template>
  <div v-if="loading">加载中…</div>
  <ul v-else>
    <li v-for="u in data" :key="u.id">{{ u.name }}</li>
  </ul>
</template>
```

### 3.2 鼠标追踪示例

```javascript
// composables/useMouse.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(event) {
    x.value = event.pageX
    y.value = event.pageY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }
}
```

---

## 四、生命周期与依赖注入

### 4.1 Composition API 生命周期

```javascript
import { onMounted, onUpdated, onUnmounted, onBeforeUnmount } from 'vue'

setup() {
  onMounted(() => console.log('组件已挂载'))
  onUpdated(() => console.log('组件已更新'))
  onBeforeUnmount(() => {
    // 清理定时器、事件监听等
  })
  onUnmounted(() => console.log('组件已卸载'))
}
```

### 4.2 provide / inject

```javascript
// 祖先组件
import { provide, ref } from 'vue'

const theme = ref('dark')
provide('theme', theme)          // 提供响应式值
provide('updateTheme', (t) => { theme.value = t })

// 后代组件（任意层级）
import { inject } from 'vue'

const theme       = inject('theme', 'light')   // 第二个参数为默认值
const updateTheme = inject('updateTheme')
```

---

## 五、\<script setup\> 语法糖

```vue
<script setup>
import { ref, computed } from 'vue'
import MyButton from './MyButton.vue'  // 自动注册，无需 components 选项

// 顶层变量/函数自动暴露给模板
const count = ref(0)
const doubled = computed(() => count.value * 2)

function increment() { count.value++ }

// defineProps 和 defineEmits 是编译宏
const props = defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: 0 }
})

const emit = defineEmits(['update:count', 'reset'])
</script>

<template>
  <h2>{{ props.title }}</h2>
  <p>{{ count }} × 2 = {{ doubled }}</p>
  <MyButton @click="increment">+1</MyButton>
</template>
```

---

## 总结

Composition API 的核心优势：
- 逻辑按**功能**聚合，而非按选项类型分散
- **composables** 是 Vue 3 的复用单元，比 mixin 更透明
- `<script setup>` 提供更简洁的语法，性能更优
- 完整的 TypeScript 类型推断支持

从 Options API 迁移时，优先将可复用逻辑提取为 composables，不必一次性全部重写。

---

*本文作者：林墨川 | 更新时间：2024年*
