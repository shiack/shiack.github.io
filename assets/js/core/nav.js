/**
 * nav.js — Shared navigation renderer.
 * Call renderNav(activePage) to get the nav HTML string,
 * then set it on your #site-nav placeholder.
 */

const NAV_LINKS = [
    { id: 'home', path: '/index.html',                               icon: '⌾', label: '简历' },
    { id: 'blog', path: '/pages/blog/index.html',           icon: '◉', label: '博客' },
    { id: 'cms',  path: '/pages/cms/index.html',                   icon: '⊕', label: 'CMS'  },
];

/**
 * @param {'home'|'blog'|'cms'} activePage
 * @returns {string} HTML for the full nav bar
 */
export function renderNav(activePage = 'home') {
    const links = NAV_LINKS.map(l => {
        const active = l.id === activePage ? ' class="active"' : '';
        return `<a href="${l.path}"${active}>${l.icon} ${l.label}</a>`;
    }).join('');

    return `
    <div class="nav-bar animate-fade-in">
        <a href="/index.html" class="logo-link">
            <div class="logo glitch" data-text="✦ shiack ✦">✦ shiack ✦</div>
        </a>
        <div class="nav-links">${links}</div>
    </div>`;
}

/** Inject nav into element with id="site-nav". */
export function mountNav(activePage) {
    const el = document.getElementById('site-nav');
    if (el) el.innerHTML = renderNav(activePage);
}
