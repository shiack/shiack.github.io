/**
 * @file effects.js
 * @description 全站视觉特效库。
 *
 * 包含以下特效模块：
 *   - Matrix Rain        — 仿黑客帝国字符雨背景（DOM 列方案）
 *   - Particle Network   — Canvas 粒子网络 + 扫描线（requestAnimationFrame 驱动）
 *   - Scroll Reveal      — IntersectionObserver 滚动入场动画
 *   - 3-D Card Tilt      — 鼠标悬停卡片 3D 倾斜
 *   - Glitch Text        — 悬停时字符噪声 → 逐字解码动画
 *   - Typewriter         — 逐字打印文本
 *   - Reading Progress   — 文章阅读进度条
 *   - Neon Lift          — 为选中元素批量添加霓虹悬浮类
 *   - Stagger Children   — 子元素错开延迟入场
 *
 * 所有函数均为命名导出，按需引入即可。
 */

// ─── Matrix Rain ────────────────────────────────────────────────────────────
/**
 * 字符雨可用字符集：英文大小写 + 数字 + 符号 + 片假名。
 * 列渲染时随机从中取字符生成视觉噪声。
 */
const MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
    '0123456789@#$%^&*()アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ';

/**
 * 在指定容器内渲染 Matrix 字符雨背景。
 * 每列为独立 <div class="matrix-col">，通过 CSS animation 实现下落。
 * 约 40% 的列位置会被跳过，制造稀疏感。
 * @param {string} [containerId='matrix-bg'] - 目标容器的 id 属性值
 */
export function initMatrixRain(containerId = 'matrix-bg') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const colW = 18;                                       // 每列宽度（px）
    const cols = Math.ceil(window.innerWidth / colW);      // 总列数
    const frag = document.createDocumentFragment();

    for (let i = 0; i < cols; i++) {
        if (Math.random() > 0.6) continue;                 // ~40% 列跳过，制造稀疏效果
        const col = document.createElement('div');
        col.className = 'matrix-col';
        col.style.left            = `${i * colW}px`;
        col.style.animationDuration  = `${Math.random() * 5 + 5}s`;   // 5–10s 随机速度
        col.style.animationDelay     = `${Math.random() * 8}s`;       // 0–8s 随机延迟错开

        // 每列生成 12–36 个字符 span，按亮度分级（bright > medium > dim > faint）
        const count = Math.floor(Math.random() * 25 + 12);
        col.innerHTML = Array.from({ length: count }, (_, j) => {
            const ratio = j / count;
            const cls = ratio > 0.9 ? 'bright' : ratio > 0.7 ? 'medium' : ratio > 0.4 ? 'dim' : 'faint';
            const ch = Math.random() > 0.1 ? MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)] : '';
            return `<span class="matrix-char ${cls}">${ch}</span>`;
        }).join('');
        frag.appendChild(col);
    }
    container.appendChild(frag);
}

// ─── Particle Network Canvas ─────────────────────────────────────────────────
/**
 * 在指定 <canvas> 上渲染粒子网络动画，并包含一条周期性扫描线。
 *
 * 粒子网络：
 *   - 55 个随机运动粒子，颜色跟随当前主题的 --primary-color CSS 变量
 *   - 距离 < 110px 的粒子对之间绘制半透明连线
 *   - 粒子超出边界时从对侧重新出现（wrap 循环）
 *
 * 扫描线（已内置于 Canvas，保证在所有页面内容之后渲染）：
 *   - scanY ≥ 0：正在从上到下扫描
 *   - scanY < 0：处于随机等待间隔（2–9s），下次扫描前倒计时
 *   - 扫描线为横向渐变：两端透明，中间峰值不透明度 0.22–0.50
 *
 * @param {string} [canvasId='particles-canvas'] - 目标 <canvas> 元素的 id
 * @returns {Function|undefined} 返回 cancelAnimationFrame 的清理函数，容器不存在时返回 undefined
 */
export function initParticles(canvasId = 'particles-canvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');

    // 窗口尺寸变化时重置 canvas 分辨率（防止拉伸）
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', debounceLocal(resize, 200));

    const N = 55;   // 粒子总数
    const particles = Array.from({ length: N }, () => ({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,   // 水平速度 [-0.25, 0.25] px/frame
        vy: (Math.random() - 0.5) * 0.5,   // 垂直速度 [-0.25, 0.25] px/frame
        r:  Math.random() * 1.5 + 0.5,     // 半径 0.5–2px
        a:  Math.random() * 0.45 + 0.1,    // 基础不透明度 0.1–0.55
    }));

    // Scan line — drawn on canvas, guaranteed behind all page content
    // State: scanY >= 0 means actively sweeping; scanY < 0 means in pause phase
    let scanY       = -1;
    let scanSpeed   = 0;   // px per ms
    let scanAlpha   = 0;   // peak opacity this pass
    let scanPause   = (Math.random() * 6000 + 2000); // ms until first scan
    let lastTime    = 0;

    function _nextScan() {
        scanY     = 0;
        scanSpeed = canvas.height / (Math.random() * 7000 + 3500);
        scanAlpha = Math.random() * 0.28 + 0.22;
    }

    let raf;
    function draw(ts) {
        const dt = lastTime ? ts - lastTime : 16;
        lastTime = ts;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const primary = getCssVar('--primary-color') || '#00FFCC';
        const rgb = hexToRgb(primary) || { r: 0, g: 255, b: 204 };

        particles.forEach(p => {
            p.x = wrap(p.x + p.vx, 0, canvas.width);
            p.y = wrap(p.y + p.vy, 0, canvas.height);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${p.a})`;
            ctx.fill();
        });

        for (let i = 0; i < N - 1; i++) {
            for (let j = i + 1; j < N; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const d  = Math.hypot(dx, dy);
                if (d < 110) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.09 * (1 - d / 110)})`;
                    ctx.lineWidth   = 0.6;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        if (scanY < 0) {
            scanPause -= dt;
            if (scanPause <= 0) _nextScan();
        } else {
            scanY += scanSpeed * dt;
            if (scanY > canvas.height) {
                scanY     = -1;
                scanPause = Math.random() * 9000 + 3000;
            } else {
                const a = scanAlpha;
                const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
                grad.addColorStop(0,    'transparent');
                grad.addColorStop(0.12, `rgba(${rgb.r},${rgb.g},${rgb.b},${(a * 0.4).toFixed(3)})`);
                grad.addColorStop(0.5,  `rgba(${rgb.r},${rgb.g},${rgb.b},${a.toFixed(3)})`);
                grad.addColorStop(0.88, `rgba(${rgb.r},${rgb.g},${rgb.b},${(a * 0.4).toFixed(3)})`);
                grad.addColorStop(1,    'transparent');
                ctx.beginPath();
                ctx.strokeStyle = grad;
                ctx.lineWidth   = 1.5;
                ctx.moveTo(0, scanY);
                ctx.lineTo(canvas.width, scanY);
                ctx.stroke();
            }
        }

        raf = requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    // Return cleanup function
    return () => cancelAnimationFrame(raf);
}

// ─── Scroll Reveal ───────────────────────────────────────────────────────────
/**
 * 为页面中所有匹配 selector 的元素注册 IntersectionObserver，
 * 当元素滚动进入视口超过 12% 时添加 .revealed 类触发 CSS 入场动画，
 * 并立即 unobserve（每个元素只触发一次）。
 * @param {string} [selector='.reveal'] - CSS 选择器，匹配需要入场动画的元素
 * @returns {IntersectionObserver} 可手动调用 disconnect() 停止观察的 Observer 实例
 */
export function initScrollReveal(selector = '.reveal') {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('revealed');
                obs.unobserve(e.target);
            }
        });
    }, { threshold: 0.12 });
    document.querySelectorAll(selector).forEach(el => obs.observe(el));
    return obs;
}

// ─── 3-D Card Tilt ───────────────────────────────────────────────────────────
/**
 * 为匹配 selector 的所有卡片元素添加鼠标悬停 3D 倾斜效果。
 * 鼠标移动时根据相对卡片中心的偏移计算 rotateX / rotateY（最大 ±6deg），
 * 鼠标离开时重置 transform。
 * @param {string} [selector='.blog-card'] - 需要倾斜效果的元素 CSS 选择器
 */
export function initCardTilt(selector = '.blog-card') {
    document.querySelectorAll(selector).forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width  - 0.5) * 12;
            const y = ((e.clientY - r.top)  / r.height - 0.5) * -12;
            card.style.transform = `perspective(700px) rotateX(${y}deg) rotateY(${x}deg) translateZ(6px)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
}

// ─── Glitch Text Effect ──────────────────────────────────────────────────────
/** Glitch 动画可用噪声字符集 */
const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#@~|';

/**
 * 为匹配 selector 的元素绑定鼠标悬停字符 Glitch 动画。
 *
 * 动画分两阶段（总时长 360ms）：
 *   1. 混沌阶段（0–22%）：所有字符随机替换为噪声符号，产生爆炸感
 *   2. 解码阶段（22–100%）：从左到右逐字"锁定"还原，前沿保留一个随机噪声符
 *
 * 鼠标离开时立即取消动画帧并还原原文。
 * @param {string} [selector='.glitch'] - 需要 Glitch 效果的元素 CSS 选择器
 */
export function initGlitchText(selector = '.glitch') {
    document.querySelectorAll(selector).forEach(el => {
        const orig = el.dataset.text || el.textContent.trim();
        el.dataset.text = orig;
        let rafId = null;

        function runGlitch() {
            if (rafId) cancelAnimationFrame(rafId);
            // Phase 1 (0–25%): brief full-chaos burst
            // Phase 2 (25–100%): clean left-to-right decode, single frontier char
            const DURATION   = 360;
            const CHAOS_FRAC = 0.22;
            const start = performance.now();

            function tick(now) {
                const t = Math.min((now - start) / DURATION, 1);
                if (t >= 1) { el.textContent = orig; rafId = null; return; }

                if (t < CHAOS_FRAC) {
                    // All chars random — brief burst of noise
                    el.textContent = orig.split('').map(c =>
                        c === ' ' ? ' ' : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
                    ).join('');
                } else {
                    // Sweep decode: chars before frontier locked, single scramble at frontier
                    const sweep    = (t - CHAOS_FRAC) / (1 - CHAOS_FRAC);
                    const frontier = Math.floor(sweep * orig.length);
                    el.textContent = orig.split('').map((c, i) => {
                        if (c === ' ')    return ' ';
                        if (i < frontier) return orig[i];
                        if (i === frontier) return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
                        return orig[i];
                    }).join('');
                }
                rafId = requestAnimationFrame(tick);
            }
            rafId = requestAnimationFrame(tick);
        }

        el.addEventListener('mouseenter', runGlitch);
        el.addEventListener('mouseleave', () => {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            el.textContent = orig;
        });
    });
}

// ─── Typewriter ──────────────────────────────────────────────────────────────
/**
 * 以打字机效果将文本逐字写入指定元素。
 * 写入前会先清空元素现有内容。
 * @param {HTMLElement} el    - 目标 DOM 元素
 * @param {string}      text  - 要打印的文本内容
 * @param {number}      [speed=48] - 每个字符的打印间隔（毫秒）
 * @returns {Promise<void>} 文本全部打印完成后 resolve
 */
export function typeText(el, text, speed = 48) {
    el.textContent = '';
    let i = 0;
    return new Promise(resolve => {
        const iv = setInterval(() => {
            el.textContent += text[i++];
            if (i >= text.length) { clearInterval(iv); resolve(); }
        }, speed);
    });
}

// ─── Scan Line ───────────────────────────────────────────────────────────────
/**
 * 扫描线现已内置于粒子 Canvas（initParticles）中绘制，
 * 保证渲染层级在所有页面内容之后。此函数保留为 API 兼容占位。
 */
export function initScanLine() {}

// ─── Reading Progress Bar ────────────────────────────────────────────────────
/**
 * 在页面顶部插入阅读进度条（.reading-progress），
 * 监听 scroll 事件，根据文章元素在视口中的滚动比例动态更新进度条宽度。
 * @param {string} [articleSelector='article, .markdown-content'] - 文章容器 CSS 选择器
 */
export function initReadingProgress(articleSelector = 'article, .markdown-content') {
    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    document.body.appendChild(bar);

    const article = document.querySelector(articleSelector);
    if (!article) return;

    window.addEventListener('scroll', () => {
        const rect   = article.getBoundingClientRect();
        const total  = article.offsetHeight - window.innerHeight;
        const scrolled = -rect.top;
        const pct    = Math.max(0, Math.min(100, (scrolled / total) * 100));
        bar.style.width = `${pct}%`;
    }, { passive: true });
}

// ─── Neon Hover Lift ─────────────────────────────────────────────────────────
/**
 * 为匹配 selector 的所有元素批量添加 .neon-lift CSS 类，
 * 从而启用霓虹发光悬浮动效（具体样式由 main.css 定义）。
 * @param {string} [selector='.cyber-card'] - 目标元素 CSS 选择器
 */
export function initNeonLift(selector = '.cyber-card') {
    document.querySelectorAll(selector).forEach(el => {
        el.classList.add('neon-lift');
    });
}

// ─── Stagger Children ────────────────────────────────────────────────────────
/**
 * 为父元素下的所有子元素依次设置递增的 animationDelay，制造错开入场效果，
 * 然后调用 initScrollReveal 启动滚动触发。
 * @param {string} parentSelector          - 父元素 CSS 选择器
 * @param {string} [childSelector=':scope > *'] - 子元素 CSS 选择器（默认直接子节点）
 * @param {number} [delayMs=80]            - 相邻子元素间的延迟增量（毫秒）
 */
export function staggerChildren(parentSelector, childSelector = ':scope > *', delayMs = 80) {
    document.querySelectorAll(parentSelector).forEach(parent => {
        parent.querySelectorAll(childSelector).forEach((child, i) => {
            child.style.animationDelay = `${i * delayMs}ms`;
            child.classList.add('reveal');
        });
    });
    initScrollReveal('.reveal');
}

// ─── Private helpers ─────────────────────────────────────────────────────────
/**
 * 读取 document.body 上的 CSS 自定义属性值（去除前后空白）。
 * @param {string} name - CSS 变量名，如 '--primary-color'
 * @returns {string} 变量值字符串，不存在时返回空字符串
 */
function getCssVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
}

/**
 * 将 6 位 HEX 颜色字符串解析为 {r, g, b} 对象。
 * @param {string} hex - 如 '#00FFCC' 或 '00FFCC'
 * @returns {{r:number, g:number, b:number}|null} 解析失败返回 null
 */
function hexToRgb(hex) {
    const m = hex.replace('#', '').match(/.{2}/g);
    if (!m) return null;
    return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}

/**
 * 将数值 v 约束在 [min, max] 范围内，超出边界时从对侧出现（循环）。
 * 用于粒子越界后从反方向重新进入画布。
 * @param {number} v   - 当前值
 * @param {number} min - 最小边界
 * @param {number} max - 最大边界
 * @returns {number}
 */
function wrap(v, min, max) {
    if (v < min) return max;
    if (v > max) return min;
    return v;
}

/**
 * 模块内部专用防抖函数（不对外暴露），避免循环依赖 utils.js。
 * @param {Function} fn - 原函数
 * @param {number}   ms - 延迟毫秒数
 * @returns {Function}
 */
function debounceLocal(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
