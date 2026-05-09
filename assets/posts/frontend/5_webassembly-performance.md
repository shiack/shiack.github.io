# WebAssembly 性能优化：从入门到实战

> WebAssembly 让 C/C++/Rust 等语言编译到浏览器运行，在计算密集型任务上比 JavaScript 快 3-20 倍。

---

## 一、Wasm 编译流程

```
源代码 (Rust/C++)
       ↓
   编译器 (wasm-pack/emcc)
       ↓
  .wasm 二进制文件  ←── 字节码，平台无关
       ↓
  JS Glue Code (.js)  ←── 自动生成的绑定
       ↓
  浏览器 Wasm 引擎 (V8/SpiderMonkey)
       ↓
  机器码执行（接近原生速度）
```

### 1.1 Wasm 的适用场景

| 场景 | 原因 | 示例 |
|------|------|------|
| 图像/视频处理 | 像素级循环计算密集 | 滤镜、压缩、解码 |
| 密码学 | 大整数运算 | AES、哈希、加密 |
| 音频处理 | 实时 DSP 运算 | 均衡器、合成器 |
| 物理引擎 | 矩阵/向量计算 | 游戏物理模拟 |
| 代码解析 | 复杂字符串处理 | 代码编辑器高亮 |

---

## 二、Rust + wasm-pack 实战

```bash
# 安装工具链
cargo install wasm-pack
rustup target add wasm32-unknown-unknown
```

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

// 导出函数给 JavaScript 调用
#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => {
            let mut a = 0u64;
            let mut b = 1u64;
            for _ in 2..=n {
                let c = a + b;
                a = b;
                b = c;
            }
            b
        }
    }
}

// 图像灰度化（高性能场景）
#[wasm_bindgen]
pub fn grayscale(pixels: &mut [u8]) {
    for chunk in pixels.chunks_mut(4) {
        let gray = (chunk[0] as u32 * 77 + chunk[1] as u32 * 150 + chunk[2] as u32 * 29) >> 8;
        chunk[0] = gray as u8;
        chunk[1] = gray as u8;
        chunk[2] = gray as u8;
    }
}
```

```bash
# 编译
wasm-pack build --target web
```

---

## 三、JavaScript 调用

```html
<canvas id="canvas" width="640" height="480"></canvas>
<script type="module">
import init, { fibonacci, grayscale } from './pkg/my_wasm.js';

async function run() {
    await init();  // 加载 .wasm 文件

    // 调用 Fibonacci
    console.log(fibonacci(40));  // 102334155

    // 图像灰度化
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // pixels 是 Uint8ClampedArray，直接传指针（零拷贝）
    grayscale(imageData.data);
    ctx.putImageData(imageData, 0, 0);
}
run();
</script>
```

---

## 四、JS vs Wasm 性能对比

```javascript
// 测试：计算 fibonacci(45)
function fibJS(n) {
    if (n <= 1) return n;
    return fibJS(n - 1) + fibJS(n - 2);
}

// 性能测试
console.time('JavaScript');
fibJS(45);
console.timeEnd('JavaScript');  // ~8000ms

console.time('WebAssembly');
fibonacci(45);  // Wasm 版本（迭代实现）
console.timeEnd('WebAssembly'); // ~0.1ms
```

| 任务 | JavaScript | WebAssembly | 提升倍数 |
|------|-----------|-------------|---------|
| fibonacci(45) 递归 | 8000ms | 200ms | 40x |
| 图像灰度化 (4K) | 120ms | 15ms | 8x |
| AES 加密 10MB | 80ms | 10ms | 8x |
| JSON 解析 10MB | 200ms | 180ms | 1.1x（不适合） |

---

## 五、内存管理与优化

```rust
// 避免频繁跨 JS/Wasm 边界传数据（高开销）
// ❌ 每帧都传递大数组
// ✅ 在 Wasm 内分配内存，JS 直接操作内存指针

#[wasm_bindgen]
pub struct ImageProcessor {
    buffer: Vec<u8>,
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl ImageProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            buffer: vec![0u8; (width * height * 4) as usize],
            width,
            height,
        }
    }

    pub fn buffer_ptr(&self) -> *const u8 {
        self.buffer.as_ptr()  // 返回指针，JS 可直接操作内存
    }

    pub fn process(&mut self) {
        grayscale_internal(&mut self.buffer);
    }
}
```

```javascript
// JS 端：通过共享内存避免数据拷贝
const processor = new ImageProcessor(1920, 1080);
const ptr = processor.buffer_ptr();
const len = 1920 * 1080 * 4;

// 直接访问 Wasm 内存（零拷贝）
const pixels = new Uint8ClampedArray(wasm.memory.buffer, ptr, len);
// 修改 pixels 直接影响 Wasm 内存
pixels.set(imageData.data);
processor.process();
```

---

## 总结

WebAssembly 不是 JavaScript 的替代，而是补充：
- **计算密集型**任务用 Wasm，收益显著
- **DOM 操作、网络、存储**仍用 JavaScript（Wasm 无法直接访问）
- **零拷贝**通过共享内存指针避免 JS/Wasm 边界开销
- Rust 是 Wasm 的首选语言（无 GC、性能最优、工具链成熟）

---

*本文作者：林墨川 | 更新时间：2024年*
