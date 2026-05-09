/**
 * @file utils.js
 * @description 全站共享工具函数库。
 *
 * 职责：
 *   - 字符串转义与格式化（HTML 安全、日期、时间、相对时间）
 *   - 唯一 ID 生成
 *   - 防抖包装器
 *   - Toast 消息提示 UI
 *   - 数字动画计数器
 *
 * 所有函数均以 ES Module 命名导出，可在任意页面直接按需引入。
 */

/**
 * 将字符串中的 HTML 特殊字符转义为 HTML 实体，防止 XSS 注入。
 * 覆盖字符：& < > " '
 * @param {string} str - 待转义的原始字符串
 * @returns {string} 转义后的安全字符串
 * @example escapeHtml('<script>') // → '&lt;script&gt;'
 */
export function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/**
 * 将 Date 对象或日期字符串格式化为中文本地化日期（YYYY/MM/DD）。
 * @param {string|Date} d - 日期字符串（ISO 8601）或 Date 实例
 * @returns {string} 格式化后的日期，如 "2025/03/01"
 */
export function formatDate(d) {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * 将秒数格式化为 MM:SS 字符串，供音乐播放器等使用。
 * 若输入为非有限数值（NaN / Infinity），返回 '00:00'。
 * @param {number} seconds - 总秒数
 * @returns {string} 格式化时长，如 "03:45"
 */
export function formatTime(seconds) {
    if (!isFinite(seconds) || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

/**
 * 生成一个基于时间戳 + 随机数的短唯一 ID（36 进制）。
 * 适用于临时 DOM id、本地缓存 key 等低碰撞场景。
 * @returns {string} 唯一 ID 字符串，如 "lf3kx2abc9d"
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * 将日期字符串转换为友好的相对时间描述（中文）。
 * 规则：今天 → "今天"；1天 → "昨天"；<7天 → "N天前"；
 *        <30天 → "N周前"；<365天 → "N个月前"；其余 → "N年前"
 * @param {string} dateStr - ISO 格式日期字符串，如 "2025-03-01"
 * @returns {string} 相对时间描述
 */
export function formatRelativeTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return '今天';
    if (d === 1) return '昨天';
    if (d < 7)  return `${d}天前`;
    if (d < 30) return `${Math.floor(d / 7)}周前`;
    if (d < 365) return `${Math.floor(d / 30)}个月前`;
    return `${Math.floor(d / 365)}年前`;
}

/**
 * 返回一个防抖版本的函数，在最后一次调用后等待 ms 毫秒再执行。
 * 常用于 input 搜索、window resize 等高频事件。
 * @param {Function} fn  - 需要防抖的原函数
 * @param {number}   ms  - 防抖延迟毫秒数（默认 300ms）
 * @returns {Function} 防抖包装后的函数
 */
export function debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ─── Toast 消息提示 ──────────────────────────────────────────────────────────
/** 全局 Toast 容器（懒创建，仅挂载一次）。 */
let _toastContainer = null;

/**
 * 在页面右下角弹出一条短暂的消息提示（Toast）。
 * 首次调用时自动在 <body> 末尾创建 .toast-container 容器。
 * @param {string} message              - 提示文本
 * @param {'info'|'success'|'error'|'warning'} [type='info'] - 消息类型，对应不同配色
 * @param {number} [duration=3000]      - 显示时长（毫秒），之后自动淡出并移除 DOM
 */
export function showToast(message, type = 'info', duration = 3000) {
    if (!_toastContainer) {
        _toastContainer = document.createElement('div');
        _toastContainer.className = 'toast-container';
        document.body.appendChild(_toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    _toastContainer.appendChild(toast);
    // 下一帧加 visible 类触发 CSS 淡入动画
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        // 等待 CSS 淡出过渡（320ms）后再从 DOM 删除
        setTimeout(() => toast.remove(), 320);
    }, duration);
}

// ─── 动画计数器 ──────────────────────────────────────────────────────────────
/**
 * 以缓动动画将 DOM 元素的文本内容从 0 递增到目标数值。
 * 利用 requestAnimationFrame 实现流畅渐变，适用于统计数字展示。
 * @param {HTMLElement} el       - 需要更新文本的 DOM 元素
 * @param {number}      target   - 目标数值（正整数）
 * @param {number}      [duration=1500] - 动画总时长（毫秒）
 */
export function animateCounter(el, target, duration = 1500) {
    const start = performance.now();
    const tick = now => {
        const p = Math.min((now - start) / duration, 1);
        el.textContent = Math.floor(p * target).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
