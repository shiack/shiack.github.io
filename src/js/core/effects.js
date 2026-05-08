/**
 * effects.js — Visual effects library.
 * Matrix rain · Particle canvas · Scroll reveal · Card tilt
 * Glitch text · Scan line · Reading progress · Typing effect
 */

// ─── Matrix Rain ────────────────────────────────────────────────────────────
const MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
    '0123456789@#$%^&*()アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ';

export function initMatrixRain(containerId = 'matrix-bg') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const colW = 18;
    const cols = Math.ceil(window.innerWidth / colW);
    const frag = document.createDocumentFragment();

    for (let i = 0; i < cols; i++) {
        if (Math.random() > 0.6) continue;
        const col = document.createElement('div');
        col.className = 'matrix-col';
        col.style.left            = `${i * colW}px`;
        col.style.animationDuration  = `${Math.random() * 5 + 5}s`;
        col.style.animationDelay     = `${Math.random() * 8}s`;

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
export function initParticles(canvasId = 'particles-canvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', debounceLocal(resize, 200));

    const N = 55;
    const particles = Array.from({ length: N }, () => ({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r:  Math.random() * 1.5 + 0.5,
        a:  Math.random() * 0.45 + 0.1,
    }));

    let raf;
    function draw() {
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
        raf = requestAnimationFrame(draw);
    }
    draw();
    // Return cleanup function
    return () => cancelAnimationFrame(raf);
}

// ─── Scroll Reveal ───────────────────────────────────────────────────────────
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
const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#@~|';
export function initGlitchText(selector = '.glitch') {
    document.querySelectorAll(selector).forEach(el => {
        const orig = el.dataset.text || el.textContent;
        el.dataset.text = orig;
        let iv;
        el.addEventListener('mouseenter', () => {
            let step = 0;
            iv = setInterval(() => {
                el.textContent = orig.split('').map((c, i) =>
                    i < step ? orig[i] : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
                ).join('');
                step += 1.8;
                if (step >= orig.length) { clearInterval(iv); el.textContent = orig; }
            }, 28);
        });
        el.addEventListener('mouseleave', () => { clearInterval(iv); el.textContent = orig; });
    });
}

// ─── Typewriter ──────────────────────────────────────────────────────────────
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
export function initScanLine() {
    if (document.querySelector('.scan-line')) return;
    const line = document.createElement('div');
    line.className = 'scan-line';
    document.body.appendChild(line);
}

// ─── Reading Progress Bar ────────────────────────────────────────────────────
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
export function initNeonLift(selector = '.cyber-card') {
    document.querySelectorAll(selector).forEach(el => {
        el.classList.add('neon-lift');
    });
}

// ─── Stagger Children ────────────────────────────────────────────────────────
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
function getCssVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function hexToRgb(hex) {
    const m = hex.replace('#', '').match(/.{2}/g);
    if (!m) return null;
    return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}

function wrap(v, min, max) {
    if (v < min) return max;
    if (v > max) return min;
    return v;
}

function debounceLocal(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
