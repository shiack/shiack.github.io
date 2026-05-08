/**
 * theme.js — Shared theme management for all pages.
 * Eliminates per-page duplication of setTheme / drag logic.
 */

const VALID_THEMES = ['workspace', 'cyber', 'nature'];

// Avatar icon per theme — swapped whenever the theme changes
const AVATAR_ICONS = {
    workspace: '💻',
    cyber:     '🤖',
    nature:    '🌿',
};

export function injectThemeToggle() {
    const html = `
    <div class="theme-toggle" id="themeToggle">
        <button class="theme-btn" data-theme="workspace" title="简约工作风">💻</button>
        <button class="theme-btn" data-theme="cyber"     title="赛博朋克">💫</button>
        <button class="theme-btn" data-theme="nature"    title="小清新自然">🌿</button>
    </div>`;
    document.body.insertAdjacentHTML('afterbegin', html);
}

export function applyTheme(theme) {
    const t = VALID_THEMES.includes(theme) ? theme : 'cyber';
    document.body.className = `theme-${t}`;
    localStorage.setItem('theme', t);
    document.querySelectorAll('.theme-btn[data-theme]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === t);
    });
    // Swap avatar icon if the element exists (home page only)
    const avatar = document.querySelector('.avatar');
    if (avatar) avatar.textContent = AVATAR_ICONS[t] ?? AVATAR_ICONS.cyber;
}

export function initTheme() {
    const saved = localStorage.getItem('theme') || 'cyber';
    applyTheme(saved);
    _bindButtons();
    _bindDrag();
}

function _bindButtons() {
    document.querySelectorAll('.theme-btn[data-theme]').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });
}

function _bindDrag() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    let dragging = false, ox = 0, oy = 0;

    toggle.addEventListener('mousedown', e => {
        if (e.target.classList.contains('theme-btn')) return;
        dragging = true;
        toggle.classList.add('dragging');
        const r = toggle.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    function onMove(e) {
        if (!dragging) return;
        const maxX = window.innerWidth  - toggle.offsetWidth  - 10;
        const maxY = window.innerHeight - toggle.offsetHeight - 10;
        toggle.style.left  = `${Math.max(10, Math.min(maxX, e.clientX - ox))}px`;
        toggle.style.top   = `${Math.max(10, Math.min(maxY, e.clientY - oy))}px`;
        toggle.style.right = 'auto';
    }

    function onUp() {
        dragging = false;
        toggle.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    }
}
