/**
 * theme.js — Shared theme management for all pages.
 */

const VALID_THEMES = ['workspace', 'cyber', 'nature'];

// ── Cyber: terminal hex ──────────────────────────────────────────────────────
const CYBER_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
  <defs>
    <radialGradient id="cyAvGrd" cx="38%" cy="32%" r="62%">
      <stop offset="0%" stop-color="#003322"/>
      <stop offset="100%" stop-color="#010d1e"/>
    </radialGradient>
  </defs>
  <polygon points="60,6 107,33 107,87 60,114 13,87 13,33" fill="url(#cyAvGrd)"/>
  <polygon points="60,6 107,33 107,87 60,114 13,87 13,33" fill="none" stroke="#00FFCC" stroke-width="1.5" opacity="0.88"/>
  <polygon points="60,2 111,30 111,90 60,118 9,90 9,30" fill="none" stroke="#00FFCC" stroke-width="0.75" stroke-dasharray="5,11" opacity="0.42">
    <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="15s" repeatCount="indefinite"/>
  </polygon>
  <g stroke="#00FFCC" stroke-width="1.5" opacity="0.6">
    <line x1="56" y1="6"   x2="64" y2="6"/><line x1="60" y1="2"   x2="60" y2="10"/>
    <line x1="103" y1="33" x2="111" y2="33"/><line x1="107" y1="29" x2="107" y2="37"/>
    <line x1="103" y1="87" x2="111" y2="87"/><line x1="107" y1="83" x2="107" y2="91"/>
    <line x1="56" y1="114" x2="64" y2="114"/><line x1="60" y1="110" x2="60" y2="118"/>
    <line x1="9"  y1="87"  x2="17" y2="87"/><line x1="13" y1="83"  x2="13" y2="91"/>
    <line x1="9"  y1="33"  x2="17" y2="33"/><line x1="13" y1="29"  x2="13" y2="37"/>
  </g>
  <text x="60" y="70" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="28" fill="#00FFCC" font-weight="600">&gt;_</text>
  <rect x="79" y="65" width="7" height="3" fill="#00FFCC" rx="1">
    <animate attributeName="opacity" values="1;1;0;0;1" dur="1.2s" repeatCount="indefinite"/>
  </rect>
  <g fill="#00FFCC">
    <rect x="34" y="93" width="10" height="2" opacity="0.55" rx="1"/>
    <rect x="47" y="93" width="7"  height="2" opacity="0.38" rx="1"/>
    <rect x="57" y="93" width="14" height="2" opacity="0.5"  rx="1"/>
    <rect x="74" y="93" width="5"  height="2" opacity="0.28" rx="1"/>
    <rect x="82" y="93" width="9"  height="2" opacity="0.42" rx="1"/>
  </g>
</svg>`;

// ── Workspace: same hex frame, </> code symbol ───────────────────────────────
const WORKSPACE_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
  <defs>
    <radialGradient id="wsAvGrd" cx="38%" cy="32%" r="62%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#EFF6FF"/>
    </radialGradient>
  </defs>
  <polygon points="60,6 107,33 107,87 60,114 13,87 13,33" fill="url(#wsAvGrd)"/>
  <polygon points="60,6 107,33 107,87 60,114 13,87 13,33" fill="none" stroke="#3B82F6" stroke-width="1.5" opacity="0.88"/>
  <polygon points="60,2 111,30 111,90 60,118 9,90 9,30" fill="none" stroke="#3B82F6" stroke-width="0.75" stroke-dasharray="5,11" opacity="0.42">
    <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="18s" repeatCount="indefinite"/>
  </polygon>
  <g stroke="#3B82F6" stroke-width="1.5" opacity="0.6">
    <line x1="56" y1="6"   x2="64" y2="6"/><line x1="60" y1="2"   x2="60" y2="10"/>
    <line x1="103" y1="33" x2="111" y2="33"/><line x1="107" y1="29" x2="107" y2="37"/>
    <line x1="103" y1="87" x2="111" y2="87"/><line x1="107" y1="83" x2="107" y2="91"/>
    <line x1="56" y1="114" x2="64" y2="114"/><line x1="60" y1="110" x2="60" y2="118"/>
    <line x1="9"  y1="87"  x2="17" y2="87"/><line x1="13" y1="83"  x2="13" y2="91"/>
    <line x1="9"  y1="33"  x2="17" y2="33"/><line x1="13" y1="29"  x2="13" y2="37"/>
  </g>
  <!-- </> code symbol drawn as SVG paths -->
  <path d="M51,45 L38,60 L51,75" fill="none" stroke="#60A5FA" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="57" y1="78" x2="63" y2="42" stroke="#93C5FD" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M69,45 L82,60 L69,75" fill="none" stroke="#60A5FA" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="#3B82F6">
    <rect x="34" y="93" width="10" height="2" opacity="0.55" rx="1"/>
    <rect x="47" y="93" width="7"  height="2" opacity="0.38" rx="1"/>
    <rect x="57" y="93" width="14" height="2" opacity="0.50" rx="1"/>
    <rect x="74" y="93" width="5"  height="2" opacity="0.28" rx="1"/>
    <rect x="82" y="93" width="9"  height="2" opacity="0.42" rx="1"/>
  </g>
</svg>`;

// ── Nature: same hex frame, 🌿 emoji center ───────────────────────────────────
const NATURE_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
  <defs>
    <radialGradient id="ntAvGrd" cx="38%" cy="32%" r="62%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F0F5EC"/>
    </radialGradient>
  </defs>
  <polygon points="60,6 107,33 107,87 60,114 13,87 13,33" fill="url(#ntAvGrd)"/>
  <polygon points="60,6 107,33 107,87 60,114 13,87 13,33" fill="none" stroke="#7CB87C" stroke-width="1.5" opacity="0.88"/>
  <polygon points="60,2 111,30 111,90 60,118 9,90 9,30" fill="none" stroke="#7CB87C" stroke-width="0.75" stroke-dasharray="5,11" opacity="0.42">
    <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="22s" repeatCount="indefinite"/>
  </polygon>
  <g stroke="#7CB87C" stroke-width="1.5" opacity="0.6">
    <line x1="56" y1="6"   x2="64" y2="6"/><line x1="60" y1="2"   x2="60" y2="10"/>
    <line x1="103" y1="33" x2="111" y2="33"/><line x1="107" y1="29" x2="107" y2="37"/>
    <line x1="103" y1="87" x2="111" y2="87"/><line x1="107" y1="83" x2="107" y2="91"/>
    <line x1="56" y1="114" x2="64" y2="114"/><line x1="60" y1="110" x2="60" y2="118"/>
    <line x1="9"  y1="87"  x2="17" y2="87"/><line x1="13" y1="83"  x2="13" y2="91"/>
    <line x1="9"  y1="33"  x2="17" y2="33"/><line x1="13" y1="29"  x2="13" y2="37"/>
  </g>
  <text x="60" y="72" text-anchor="middle" font-size="38">🌿</text>
  <g fill="#7CB87C">
    <rect x="34" y="93" width="10" height="2" opacity="0.45" rx="1"/>
    <rect x="47" y="93" width="7"  height="2" opacity="0.30" rx="1"/>
    <rect x="57" y="93" width="14" height="2" opacity="0.42" rx="1"/>
    <rect x="74" y="93" width="5"  height="2" opacity="0.22" rx="1"/>
    <rect x="82" y="93" width="9"  height="2" opacity="0.35" rx="1"/>
  </g>
</svg>`;

const AVATAR_SVGS = { cyber: CYBER_AVATAR_SVG, workspace: WORKSPACE_AVATAR_SVG, nature: NATURE_AVATAR_SVG };

export function injectThemeToggle() {
    const html = `
    <div class="theme-toggle" id="themeToggle">
        <button class="theme-btn" data-theme="workspace" title="简约工作风">&lt;/&gt;</button>
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
    const avatar = document.querySelector('.avatar');
    if (avatar) {
        avatar.innerHTML = AVATAR_SVGS[t] ?? CYBER_AVATAR_SVG;
    }
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
