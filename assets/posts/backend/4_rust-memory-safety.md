# Rust 内存安全：所有权、借用与生命周期

> Rust 在编译期通过所有权系统和借用检查器消除数据竞争和悬垂指针，实现零成本抽象的内存安全。

---

## 一、所有权规则

### 1.1 三条核心规则

1. 每个值都有一个**所有者（owner）**
2. 同一时刻只能有**一个所有者**
3. 所有者离开作用域时，值被**自动释放（drop）**

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;           // s1 的所有权移动到 s2
    // println!("{}", s1); // 编译错误：s1 已被移动
    println!("{}", s2);    // OK
}
```

### 1.2 移动（Move）vs 复制（Copy）

```rust
// Copy 类型（存储在栈上）：整数、bool、char、元组（若元素都是 Copy）
let x = 5;
let y = x;   // 复制，x 仍然有效

// 非 Copy 类型（堆上数据）：String、Vec、Box 等
let s1 = String::from("hello");
let s2 = s1.clone();  // 显式深拷贝
println!("{} {}", s1, s2);
```

### 1.3 函数中的所有权

```rust
fn take_ownership(s: String) -> String {
    println!("got: {}", s);
    s  // 返回所有权
}

fn main() {
    let s = String::from("world");
    let s = take_ownership(s);  // 移动后接收返回值
    println!("{}", s);
}
```

---

## 二、借用（Borrowing）

### 2.1 不可变借用

```rust
fn calculate_length(s: &String) -> usize {
    s.len()   // 只读，不获取所有权
}

fn main() {
    let s = String::from("hello");
    let len = calculate_length(&s);
    println!("{} 的长度是 {}", s, len);
}
```

### 2.2 可变借用

```rust
fn append_world(s: &mut String) {
    s.push_str(", world");
}

fn main() {
    let mut s = String::from("hello");
    append_world(&mut s);
    println!("{}", s);
}
```

### 2.3 借用规则

| 场景 | 允许数量 | 备注 |
|------|----------|------|
| 不可变借用 `&T` | 任意多个 | 不能与可变借用共存 |
| 可变借用 `&mut T` | **仅一个** | 同时无其他任何借用 |

```rust
let mut s = String::from("hello");
let r1 = &s;     // OK
let r2 = &s;     // OK，可以有多个不可变借用
// let r3 = &mut s; // 编译错误：已有不可变借用存在
println!("{} {}", r1, r2);
// r1, r2 在此后不再使用，可变借用在这里才允许
let r3 = &mut s;
println!("{}", r3);
```

---

## 三、生命周期（Lifetimes）

### 3.1 为什么需要生命周期

```rust
// 编译错误：返回值生命周期不明确
// fn longest(x: &str, y: &str) -> &str {
//     if x.len() > y.len() { x } else { y }
// }

// 正确：显式标注生命周期
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

生命周期标注 `'a` 表示：返回值的存活时间不超过 `x` 和 `y` 中较短的那个。

### 3.2 结构体中的生命周期

```rust
struct ImportantExcerpt<'a> {
    part: &'a str,  // 引用必须比结构体存活更长
}

impl<'a> ImportantExcerpt<'a> {
    fn level(&self) -> i32 { 3 }
    
    fn announce_and_return(&self, announcement: &str) -> &str {
        println!("注意：{}", announcement);
        self.part
    }
}
```

### 3.3 生命周期省略规则

编译器能在满足以下规则时自动推断：

1. 每个引用参数获得独立生命周期
2. 若只有一个输入生命周期，它赋给所有输出
3. 若有 `&self` 或 `&mut self`，`self` 的生命周期赋给所有输出

---

## 四、智能指针

### 4.1 Box\<T\>

```rust
// 将数据放到堆上，常用于递归类型
enum List {
    Cons(i32, Box<List>),
    Nil,
}

let list = List::Cons(1, Box::new(List::Cons(2, Box::new(List::Nil))));
```

### 4.2 Rc\<T\> 与 Arc\<T\>

```rust
use std::rc::Rc;
use std::sync::Arc;

// Rc：单线程引用计数
let a = Rc::new(5);
let b = Rc::clone(&a);  // 引用计数 +1
println!("引用计数: {}", Rc::strong_count(&a));  // 2

// Arc：多线程安全的引用计数
let c = Arc::new(vec![1, 2, 3]);
let c2 = Arc::clone(&c);
std::thread::spawn(move || println!("{:?}", c2));
```

### 4.3 智能指针对比

| 类型 | 所有权 | 线程安全 | 可变性 |
|------|--------|----------|--------|
| `Box<T>` | 唯一 | 是（T: Send） | 是 |
| `Rc<T>` | 共享 | **否** | 只读 |
| `Arc<T>` | 共享 | 是 | 只读 |
| `RefCell<T>` | 唯一 | 否 | 运行时借用检查 |
| `Mutex<T>` | 共享 | 是 | 互斥写 |

---

## 五、常见错误与修复

### 5.1 悬垂引用

```rust
// 编译器阻止：返回对局部变量的引用
// fn dangle() -> &String {
//     let s = String::from("hello");
//     &s   // s 在函数结束后被释放
// }

// 修复：返回所有权
fn no_dangle() -> String {
    String::from("hello")
}
```

### 5.2 数据竞争

```rust
use std::sync::{Arc, Mutex};
use std::thread;

let counter = Arc::new(Mutex::new(0));
let mut handles = vec![];

for _ in 0..10 {
    let counter = Arc::clone(&counter);
    handles.push(thread::spawn(move || {
        let mut num = counter.lock().unwrap();
        *num += 1;
    }));
}
for h in handles { h.join().unwrap(); }
println!("结果: {}", *counter.lock().unwrap()); // 10
```

---

## 总结

Rust 的内存安全体系在编译期完成：
- **所有权** 确保资源只有一个所有者，自动释放
- **借用** 规则防止读写冲突，无需运行时 GC
- **生命周期** 确保引用不会比被引用的数据存活更长
- **智能指针** 提供灵活的所有权模型（共享、内部可变等）

---

*本文作者：林墨川 | 更新时间：2024年*
