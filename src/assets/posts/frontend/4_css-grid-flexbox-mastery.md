# CSS Grid 与 Flexbox 精通指南

> Flexbox 解决一维布局，Grid 解决二维布局，二者互补而非替代关系，掌握两者才能应对现代 Web 所有布局场景。

---

## 一、Flexbox 核心模型

```
容器（flex container）

  主轴（main axis）────────────────────►
  ┌────┬────┬────┬────┐
  │ 1  │ 2  │ 3  │ 4  │  ▲ 交叉轴（cross axis）
  └────┴────┴────┴────┘  ▼

  flex-direction: row（默认）| column | row-reverse | column-reverse
```

### 1.1 容器属性

```css
.container {
    display: flex;
    flex-direction: row;          /* 主轴方向 */
    flex-wrap: wrap;              /* 换行 */
    justify-content: space-between; /* 主轴对齐 */
    align-items: center;          /* 交叉轴对齐（单行） */
    align-content: flex-start;    /* 交叉轴对齐（多行） */
    gap: 1rem 1.5rem;             /* 行间距 列间距 */
}
```

### 1.2 flex-grow / shrink / basis

```css
/* flex: grow shrink basis */
.item {
    flex: 1 1 0;       /* 等比分配，可缩放 */
    flex: 0 0 200px;   /* 固定 200px，不伸缩 */
    flex: 1 0 auto;    /* 可增长，不缩小，基于内容尺寸 */
}

/* 实用场景：侧边栏固定，主内容自适应 */
.layout { display: flex; }
.sidebar { flex: 0 0 240px; }
.main    { flex: 1; min-width: 0; } /* min-width:0 防止内容溢出 */
```

### 1.3 常见对齐方式

```css
/* 水平垂直居中（最简单的方法） */
.center {
    display: flex;
    justify-content: center;
    align-items: center;
}

/* 单个子元素自对齐 */
.special-item {
    align-self: flex-end;
    margin-left: auto; /* 推到右侧 */
}
```

---

## 二、CSS Grid 核心模型

### 2.1 定义网格

```css
.grid {
    display: grid;
    grid-template-columns: 240px 1fr 1fr; /* 3列：固定+弹性 */
    grid-template-rows: auto 1fr auto;    /* 3行：header+main+footer */
    gap: 1rem;
    min-height: 100vh;
}

/* repeat + minmax：响应式列 */
.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
}
```

### 2.2 命名区域布局

```css
.layout {
    display: grid;
    grid-template-areas:
        "header  header  header"
        "sidebar main    main  "
        "footer  footer  footer";
    grid-template-columns: 240px 1fr 1fr;
    grid-template-rows: 60px 1fr 40px;
    min-height: 100vh;
}

header  { grid-area: header;  }
.sidebar{ grid-area: sidebar; }
main    { grid-area: main;    }
footer  { grid-area: footer;  }
```

### 2.3 跨轨道放置

```css
/* 通过行列线编号 */
.hero {
    grid-column: 1 / -1;    /* 跨越所有列 */
    grid-row: 1 / 3;        /* 跨越1-2行 */
}

/* 简写 */
.feature { grid-area: 2 / 2 / 4 / 4; } /* row-start/col-start/row-end/col-end */
```

---

## 三、响应式布局

### 3.1 不用 media query 的响应式网格

```css
/* auto-fill：尽量填满，可能留空列 */
/* auto-fit：自动合并空列，item 撑满容器 */
.responsive-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
    gap: 1rem;
}
```

### 3.2 圣杯布局（三栏自适应）

```css
.holy-grail {
    display: grid;
    grid-template-columns: minmax(150px, 200px) 1fr minmax(150px, 200px);
    grid-template-rows: auto 1fr auto;
    min-height: 100vh;
}

@media (max-width: 768px) {
    .holy-grail {
        grid-template-columns: 1fr;
        grid-template-areas:
            "header"
            "main"
            "left"
            "right"
            "footer";
    }
}
```

---

## 四、Grid vs Flexbox 选择指南

| 场景 | 推荐 | 原因 |
|------|------|------|
| 导航栏 | Flexbox | 一维横向排列 |
| 卡片列表 | Grid | 二维对齐更整齐 |
| 表单行内对齐 | Flexbox | label + input 一维 |
| 整体页面布局 | Grid | 区域划分清晰 |
| 按钮组 | Flexbox | 一维，需要 gap/wrap |
| 图片画廊 | Grid | 行列同时控制 |
| 居中单个元素 | 任意（Flexbox 更简单） | — |

---

## 五、实用技巧

```css
/* 1. 等高卡片（Grid 天然支持） */
.card-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 1fr; /* 所有行等高 */
}

/* 2. 粘性侧边栏 */
.sidebar {
    position: sticky;
    top: 1rem;
    align-self: start;  /* 关键：防止 Flexbox/Grid 拉伸 */
}

/* 3. 瀑布流布局（columns） */
.masonry {
    columns: 3 280px;
    column-gap: 1rem;
}
.masonry > * {
    break-inside: avoid; /* 避免卡片被截断 */
    margin-bottom: 1rem;
}
```

---

## 总结

- **Flexbox**：一维布局的首选，适合组件内部排列
- **Grid**：二维布局的利器，适合页面级区域划分
- `auto-fit + minmax` 是无 media query 响应式的利器
- Grid 命名区域让布局意图一目了然
- 两者可以嵌套使用：Grid 做外层，Flexbox 做 Grid item 内部

---

*本文作者：林墨川 | 更新时间：2024年*
