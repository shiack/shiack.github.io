/**
 * @file markdown-renderer.js
 * @description 共享 Markdown 加载与渲染工具模块。
 *
 * 职责：
 *   - 通过 fetch 异步获取 Markdown 文件
 *   - 从 localStorage 读取 CMS 草稿内容
 *   - 调用全局 marked.js 将 Markdown 解析为 HTML
 *   - 对渲染结果进行后处理增强（图片、链接、代码复制、锚点、TOC）
 *   - 从 Markdown 文本中提取标题与摘要
 *
 * 依赖：
 *   - marked.js（须在页面中全局加载，如 <script src="...marked.min.js">）
 *
 * 使用方的页面：pages/blog/post.html、pages/cms/index.html
 */

/**
 * 异步获取指定 URL 的 Markdown 文本内容。
 * 网络失败或 HTTP 非 2xx 时打印错误并返回 null，调用方需自行处理 null 情况。
 * @param {string} url - Markdown 文件的绝对或相对 URL
 * @returns {Promise<string|null>} Markdown 文本，失败时返回 null
 */
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

/**
 * 从 localStorage 读取 CMS 编辑器保存的文章草稿。
 * 存储键格式为 "cms_article_{articleId}"，值为 JSON 序列化的文章对象。
 * @param {string} articleId - 文章唯一标识符
 * @returns {Object|null} 文章对象，不存在或解析失败时返回 null
 */
export function loadFromLocalStorage(articleId) {
    try {
        const raw = localStorage.getItem(`cms_article_${articleId}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/**
 * 使用全局 marked.js 将 Markdown 文本解析为 HTML 字符串。
 * 启用 GFM（GitHub Flavored Markdown）和软换行支持。
 * 若 marked.js 未加载，回退为 <pre> 原文显示并打印错误。
 * @param {string} text - 原始 Markdown 文本
 * @returns {string} 解析后的 HTML 字符串
 */
export function renderMarkdownText(text) {
    if (typeof marked === 'undefined') {
        console.error('[markdown-renderer] marked.js not loaded');
        return `<pre class="raw-fallback">${text}</pre>`;
    }
    marked.setOptions({ gfm: true, breaks: true });
    return marked.parse(text);
}

/**
 * 对已渲染的 Markdown 容器进行后处理增强，包括：
 *   1. **图片懒加载**：添加 loading="lazy"，错误时隐藏，并用 <figure>/<figcaption> 包裹
 *   2. **外部链接**：href 以 http 开头的链接自动添加 target="_blank" 和 rel="noopener noreferrer"
 *   3. **代码复制按钮**：每个 <pre><code> 块右上角插入"复制 / Copy"按钮，点击后 2s 内显示"✓ Copied"
 *   4. **标题锚点**：h1–h4 自动生成 id 并追加 "#" 锚点链接，支持页内跳转
 *   5. **自动目录（TOC）**：h2/h3 数量 ≥ 3 且页面含 #toc-container 时，生成嵌套导航
 * @param {HTMLElement|null} container - 包含渲染后 HTML 的 DOM 容器；为 null 时静默跳过
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

/**
 * 从 Markdown 文本中提取第一个 H1 标题内容。
 * 匹配格式：行首 "# " 后跟任意字符。
 * @param {string} md - 原始 Markdown 文本
 * @returns {string|null} 标题文字（已去除首尾空白），无 H1 时返回 null
 */
export function extractTitle(md) {
    const m = md.match(/^#\s+(.+)$/m);
    return m ? m[1].trim() : null;
}

/**
 * 从 Markdown 文本中提取纯文本摘要（去除标题、代码块和 Markdown 语法）。
 * 结果超过 maxLen 时截断并追加 "…"。
 * @param {string} md          - 原始 Markdown 文本
 * @param {number} [maxLen=160] - 最大字符数
 * @returns {string} 纯文本摘要
 */
export function extractSummary(md, maxLen = 160) {
    const body = md
        .replace(/^#+.+$/gm, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[*_`#\[\]]/g, '')
        .replace(/\n+/g, ' ')
        .trim();
    return body.length > maxLen ? body.slice(0, maxLen) + '…' : body;
}
