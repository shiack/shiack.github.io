# 视差横幅素材替换指南

## 赛博朋克场景（场景 1）

使用本地 SVG，无需替换。素材位于：

```
assets/images/parallax/cyberpunk/
├── cyber-01-sky.svg          深度 0.05  — 夜空 + 星场
├── cyber-02-moon.svg         深度 0.10  — 月亮（含陨石坑细节）
├── cyber-03-fog.svg          深度 0.15  — 大气雾霾（screen 混合）
├── cyber-04-horizon.svg      深度 0.22  — 远景地平线轮廓
├── cyber-05-buildings-far.svg 深度 0.32 — 中远景建筑群
├── cyber-06-skyline.svg      深度 0.50  — 英雄摩天楼（含 SMIL 警示灯 + 霓虹牌）
├── cyber-07-foreground.svg   深度 0.68  — 前景建筑 + 广告牌
├── cyber-08-street.svg       深度 0.80  — 湿地街道 + 路灯反射
└── cyber-09-debris.svg       深度 1.00  — 近景杂物 + 电线 + 霓虹框
```

---

## 森林场景（场景 2-5）使用 PNG 素材包

### 推荐免费素材来源

| 名称 | 风格 | 链接 | License |
|------|------|------|---------|
| **Free Pixel Art Forest** | 像素风 | itch.io 搜索 "parallax forest" | CC0 / 按作者要求 |
| **Craftpix Free Assets** | 卡通手绘 | craftpix.net/freebies | 商用需署名 |
| **Ansimuz 系列** | 复古像素 | ansimuz.itch.io | CC0 |
| **oco 系列** | 2D 游戏风 | opengameart.org | CC0 / CC-BY |

> 搜索关键词：`parallax background forest layers`，下载后按下表命名即可。

### 目录结构与文件命名

每个季节独立目录，9 层 PNG：

```
assets/images/parallax/forest/
├── spring/
│   ├── 01-sky.png            深度 0.04  — 天空（樱花色调）
│   ├── 02-clouds.png         深度 0.10  — 云层（模糊 1.5px）
│   ├── 03-mountains-far.png  深度 0.18  — 远山（模糊 1px）
│   ├── 04-mountains-near.png 深度 0.28  — 近山
│   ├── 05-trees-back.png     深度 0.40  — 后排树木
│   ├── 06-trees-mid.png      深度 0.56  — 中排树木
│   ├── 07-trees-front.png    深度 0.72  — 前排树木
│   ├── 08-ground.png         深度 0.84  — 地面 / 草地
│   └── 09-animals.png        深度 0.92  — 动物（可选，透明背景）
├── summer/   （同结构）
├── autumn/   （同结构）
└── winter/   （同结构）
```

### 图片规格要求

| 项目 | 要求 |
|------|------|
| 格式 | PNG（支持透明背景）或 WebP |
| 宽度 | ≥ 1800px（视差会拉伸 ±6%） |
| 高度 | ≥ 550px |
| 背景 | 除 `01-sky` 外，其余层应为透明背景 |
| 颜色 | 与对应季节配色协调即可 |

### 替换步骤

1. 下载素材包，解压后找到分层 PNG（通常命名如 `Layer_01.png`、`bg_sky.png`）
2. 按上表重命名
3. 拷贝到对应季节目录，**覆盖** 同名 placeholder 文件
4. 刷新浏览器即可看到效果，无需改动任何 JS/CSS

### 如何调整层深度

编辑 `assets/js/components/parallax-banner.js` 中的 `this.forestLayers` 数组：

```js
this.forestLayers = [
    { file: '01-sky',   depth: 0.04, ... },  // 数值越小，移动越少（最远）
    { file: '09-animals', depth: 0.92, ... }, // 数值越大，移动越多（最近）
];
```

### 仅想替换单个季节

只需替换对应季节目录下的 PNG，其他季节 placeholder 继续显示为空白层（不影响粒子动画效果）。
