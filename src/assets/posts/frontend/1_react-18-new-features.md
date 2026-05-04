# React 18 新特性详解：并发模式与 Suspense

## 概述

React 18 引入了革命性的并发特性，包括 Automatic Batching、startTransition、useDeferredValue 以及全新的 Suspense 水合支持。这些特性让 React 应用在保持响应性的同时，能够处理更复杂的数据渲染任务。

## Automatic Batching 自动批处理

React 18 之前，只有 React 事件处理函数中的 setState 会被批处理。在 React 18 中，**所有 setState 都会被自动批处理**，包括 Promise、setTimeout 等异步操作。

```javascript
// React 18 之前
setTimeout(() => {
  setCount(1);  // 触发一次渲染
  setFlag(2);   // 再触发一次渲染（性能问题）
}, 0);

// React 18
setTimeout(() => {
  setCount(1);  // 合并到一次渲染
  setFlag(2);
}, 0);
```

## startTransition 过渡更新

对于耗时的状态更新，可以使用 `startTransition` 标记为非紧急更新：

```javascript
import { startTransition } from 'react';

function SearchResults({ query }) {
  startTransition(() => {
    setSearchQuery(query);  // 被标记为可中断的过渡更新
  });
}
```

## useDeferredValue 延迟值

`useDeferredValue` 用于延迟更新 UI 的特定部分：

```javascript
import { useDeferredValue } from 'react';

function SearchBar({ value }) {
  const deferredValue = useDeferredValue(value);

  return (
    <div>
      <input value={value} />
      <SlowResults query={deferredValue} />
    </div>
  );
}
```

## Suspense 水合

React 18 的 Suspense 支持服务端渲染水合与流式 HTML：

```javascript
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

## 总结

React 18 的并发特性让应用更加流畅，但需要开发者理解哪些更新是紧急的，哪些可以延迟，从而合理使用新的 API 提升用户体验。
