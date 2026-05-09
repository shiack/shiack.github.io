# Go 并发编程：Goroutine 与 Channel 深度解析

> Go 的并发模型基于 CSP（Communicating Sequential Processes），通过 goroutine 和 channel 提供简洁而强大的并发能力。

---

## 一、Goroutine 与 GMP 调度模型

### 1.1 GMP 模型概述

```
┌──────────────────────────────────────────────┐
│                  Go Runtime                   │
│                                               │
│  G (Goroutine)   M (OS Thread)   P (Processor)│
│  ┌───┐ ┌───┐    ┌───┐ ┌───┐    ┌───┐ ┌───┐  │
│  │ G │ │ G │    │ M │ │ M │    │ P │ │ P │  │
│  └───┘ └───┘    └───┘ └───┘    └───┘ └───┘  │
│                                               │
│  本地队列 (Local Run Queue): 每个 P 持有      │
│  全局队列 (Global Run Queue): 共享            │
└──────────────────────────────────────────────┘
```

- **G**：goroutine，轻量级协程，初始栈 2KB 可自动扩缩
- **M**：操作系统线程，执行 G 的载体
- **P**：逻辑处理器，数量由 `GOMAXPROCS` 控制（默认 = CPU 核数）

### 1.2 创建和等待 Goroutine

```go
package main

import (
    "fmt"
    "sync"
)

func worker(id int, wg *sync.WaitGroup) {
    defer wg.Done()
    fmt.Printf("worker %d 开始\n", id)
    // 模拟工作
    fmt.Printf("worker %d 结束\n", id)
}

func main() {
    var wg sync.WaitGroup
    for i := 1; i <= 5; i++ {
        wg.Add(1)
        go worker(i, &wg)
    }
    wg.Wait()
    fmt.Println("所有 worker 完成")
}
```

---

## 二、Channel 详解

### 2.1 无缓冲 vs 有缓冲 Channel

```go
// 无缓冲：发送方阻塞直到接收方就绪（同步）
ch := make(chan int)

// 有缓冲：缓冲区未满时发送不阻塞（异步）
ch := make(chan int, 10)
```

### 2.2 单向 Channel

```go
func producer(out chan<- int) {
    for i := 0; i < 5; i++ {
        out <- i
    }
    close(out)
}

func consumer(in <-chan int) {
    for v := range in {
        fmt.Println(v)
    }
}

func main() {
    ch := make(chan int, 5)
    go producer(ch)
    consumer(ch)
}
```

### 2.3 select 多路复用

```go
func fanIn(ch1, ch2 <-chan string) <-chan string {
    out := make(chan string)
    go func() {
        defer close(out)
        for {
            select {
            case v, ok := <-ch1:
                if !ok { ch1 = nil; continue }
                out <- v
            case v, ok := <-ch2:
                if !ok { ch2 = nil; continue }
                out <- v
            }
            if ch1 == nil && ch2 == nil { return }
        }
    }()
    return out
}
```

---

## 三、同步原语

### 3.1 sync.Mutex 与 sync.RWMutex

```go
type SafeCounter struct {
    mu sync.RWMutex
    v  map[string]int
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.v[key]++
}

func (c *SafeCounter) Value(key string) int {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.v[key]
}
```

### 3.2 sync.Once 单例初始化

```go
var (
    instance *Database
    once     sync.Once
)

func GetDB() *Database {
    once.Do(func() {
        instance = &Database{pool: newPool()}
    })
    return instance
}
```

### 3.3 常用原语对比

| 原语 | 用途 | 注意事项 |
|------|------|----------|
| `sync.Mutex` | 互斥锁 | 不可重入，不可复制 |
| `sync.RWMutex` | 读写锁 | 读多写少场景优先 |
| `sync.WaitGroup` | 等待一组 goroutine | Add/Done/Wait 必须配对 |
| `sync.Once` | 仅执行一次 | 常用于懒加载 |
| `sync.Pool` | 对象复用池 | GC 时可能被清空 |
| `atomic` 包 | 原子操作 | 简单计数/标志位首选 |

---

## 四、Context 超时与取消

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func fetchData(ctx context.Context, id int) (string, error) {
    ch := make(chan string, 1)
    go func() {
        time.Sleep(200 * time.Millisecond) // 模拟 IO
        ch <- fmt.Sprintf("data-%d", id)
    }()

    select {
    case result := <-ch:
        return result, nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
    defer cancel()

    result, err := fetchData(ctx, 42)
    if err != nil {
        fmt.Println("超时:", err)
        return
    }
    fmt.Println(result)
}
```

**Context 使用规范：**
- 始终作为第一个参数传入，命名为 `ctx`
- 不存储在 struct 字段中
- 父 context 取消后所有子 context 自动取消

---

## 五、生产场景：Worker Pool

```go
func workerPool(jobs <-chan int, results chan<- int, workerCount int) {
    var wg sync.WaitGroup
    for i := 0; i < workerCount; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- process(job)
            }
        }()
    }
    go func() {
        wg.Wait()
        close(results)
    }()
}

func process(n int) int { return n * n }

func main() {
    const numJobs = 100
    jobs    := make(chan int, numJobs)
    results := make(chan int, numJobs)

    workerPool(jobs, results, 5)

    for i := 0; i < numJobs; i++ {
        jobs <- i
    }
    close(jobs)

    for r := range results {
        _ = r
    }
}
```

---

## 总结

Go 并发的核心理念：**不要通过共享内存来通信，而要通过通信来共享内存**。

- 使用 goroutine + channel 构建数据流水线
- 用 `sync.WaitGroup` 等待一批任务
- 用 `context` 传播取消信号和截止时间
- 用 `sync.Mutex` 保护共享状态（channel 无法解决的场景）
- Worker Pool 模式控制并发度，防止资源耗尽

---

*本文作者：林墨川 | 更新时间：2024年*
