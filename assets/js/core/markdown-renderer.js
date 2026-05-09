/**
 * markdown-renderer.js — Shared markdown loading & rendering utilities.
 * Used by blog-detail.html and cms.html.
 */

/** Fetch markdown text from a URL. Returns null on failure. */
export async function fetchMarkdown(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    } catch (err) {
        console.error('[markdown-renderer] fetch failed:', url, err);
        return null;
    }
}

/** Load CMS-generated markdown from localStorage by article ID. */
export function loadFromLocalStorage(articleId) {
    try {
        const raw = localStorage.getItem(`cms_article_${articleId}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/** Parse markdown text to HTML using marked.js (must be loaded globally). */
export function renderMarkdownText(text) {
    if (typeof marked === 'undefined') {
        console.error('[markdown-renderer] marked.js not loaded');
        return `<pre class="raw-fallback">${text}</pre>`;
    }
    marked.setOptions({ gfm: true, breaks: true });
    return marked.parse(text);
}

/**
 * Post-process a rendered markdown container:
 * - Responsive images with figure/figcaption
 * - External links open in new tab
 * - Copy-to-clipboard buttons on code blocks
 * - Anchor links on headings
 * - Auto TOC if ≥3 headings and #toc-container exists
 */
export function enhanceContent(container) {
    if (!container) return;

    // Images
    container.querySelectorAll('img').forEach(img => {
        img.loading = 'lazy';
        img.style.maxWidth = '100%';
        img.onerror = () => { img.style.display = 'none'; };
        if (!img.closest('figure')) {
            const fig = document.createElement('figure');
            fig.className = 'md-figure';
            img.replaceWith(fig);
            fig.appendChild(img);
            if (img.alt) {
                const cap = document.createElement('figcaption');
                cap.textContent = img.alt;
                fig.appendChild(cap);
            }
        }
    });

    // External links
    container.querySelectorAll('a[href^="http"]').forEach(a => {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
    });

    // Code copy buttons
    container.querySelectorAll('pre > code').forEach(code => {
        const pre = code.parentElement;
        const btn = document.createElement('button');
        btn.className = 'code-copy-btn';
        btn.textContent = '复制 / Copy';
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(code.textContent).then(() => {
                btn.textContent = '✓ Copied';
                setTimeout(() => { btn.textContent = '复制 / Copy'; }, 2000);
            }).catch(() => {});
        });
        pre.style.position = 'relative';
        pre.appendChild(btn);
    });

    // Heading anchors
    container.querySelectorAll('h1, h2, h3, h4').forEach(h => {
        const id = h.textContent.trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w一-鿿-]/g, '');
        h.id = id;
        const anc = document.createElement('a');
        anc.href = `#${id}`;
        anc.className = 'heading-anchor';
        anc.textContent = ' #';
        h.appendChild(anc);
    });

    // Auto-TOC
    const headings = [...container.querySelectorAll('h2, h3')];
    const tocEl = document.getElementById('toc-container');
    if (headings.length >= 3 && tocEl) {
        const items = headings.map(h => {
            const cls = h.tagName === 'H3' ? 'toc-sub' : '';
            return `<li class="${cls}"><a href="#${h.id}">${h.textContent.replace(' #', '')}</a></li>`;
        }).join('');
        tocEl.innerHTML = `
            <nav class="toc">
                <div class="toc-title">📋 目录 / Contents</div>
                <ul>${items}</ul>
            </nav>`;
        tocEl.classList.add('has-toc');
    }
}

/** Extract first H1 title from markdown text. */
export function extractTitle(md) {
    const m = md.match(/^#\s+(.+)$/m);
    return m ? m[1].trim() : null;
}

/** Extract plain-text summary (first 160 chars of body). */
export function extractSummary(md, maxLen = 160) {
    const body = md
        .replace(/^#+.+$/gm, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[*_`#\[\]]/g, '')
        .replace(/\n+/g, ' ')
        .trim();
    return body.length > maxLen ? body.slice(0, maxLen) + '…' : body;
}
