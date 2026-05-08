/**
 * utils.js — Shared utility functions used across all pages.
 */

export function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

export function formatDate(d) {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatTime(seconds) {
    if (!isFinite(seconds) || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

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

export function debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---- Toast notification ----
let _toastContainer = null;

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
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 320);
    }, duration);
}

// ---- Animated counter ----
export function animateCounter(el, target, duration = 1500) {
    const start = performance.now();
    const tick = now => {
        const p = Math.min((now - start) / duration, 1);
        el.textContent = Math.floor(p * target).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
