# TypeScript 5.0 装饰器与类型推断增强

## 概述

TypeScript 5.0 带来了全新的装饰器语法、标准化的类型参数默认值以及对 JSDoc 类型推断的显著改进。这些特性让 TypeScript 在保持类型安全的同时，代码更加简洁优雅。

## 全新装饰器语法

TypeScript 5.0 实现了 TC39 装饰器提案的第二阶段：

```typescript
// 装饰器函数签名
function logged(originalMethod: any, context: ClassMethodDecoratorContext) {
  const methodName = String(context.name);

  return function (this: any, ...args: any[]) {
    console.log(`Calling ${methodName}`);
    const result = originalMethod.call(this, ...args);
    console.log(`Called ${methodName}`);
    return result;
  };
}

class Calculator {
  @logged
  add(a: number, b: number): number {
    return a + b;
  }
}
```

## const 类型参数

使用 `const` 修饰符让类型参数推断为最具体的类型：

```typescript
function fn<T extends string>(arg: T): T {
  return arg;
}

// 之前：推断为 string
// 现在：推断为 "hello"
const result = fn("hello");
```

## @ts-expect-error 指令

相比 `@ts-ignore`，`@ts-expect-error` 在代码正确时会报错：

```typescript
// 这行代码是正确的，TypeScript 会报错提示
// @ts-expect-error
const x: number = "hello";  // 错误：类型不匹配
```

## 枚举增强

TypeScript 5.0 对枚举进行了多项改进，包括更好的联合枚举处理：

```typescript
enum Status {
  Pending = "PENDING",
  Active = "ACTIVE",
}

type StatusKey = keyof typeof Status;
```

## 性能优化

TypeScript 5.0 通过重构实现了更快的类型检查和编译速度：

- 改进了 `--build` 模式的增量编译
- 优化了类型推断算法
- 降低了内存占用

## 总结

TypeScript 5.0 的装饰器支持终于标准化，类型推断更加智能，同时性能也有了显著提升。开发者应该尽快迁移以享受这些改进。
