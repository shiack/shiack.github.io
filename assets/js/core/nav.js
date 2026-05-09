/**
 * @file nav.js
 * @description 全站共享导航栏渲染模块。
 *
 * 职责：
 *   - 维护顶部导航的链接配置（路径、图标、文案）
 *   - 根据当前激活页名称生成带高亮的导航 HTML
 *   - 将导航注入页面中 id="site-nav" 的占位元素
 *
 * 使用方式（每个页面顶部）：
 *   import { mountNav } from '/assets/js/core/nav.js';
 *   mountNav('blog');   // 传入当前页 id，对应链接会自动加 active 类
 */

/**
 * 导航链接配置表
 * - id:    页面唯一标识，供 mountNav 匹配激活项
 * - path:  页面绝对路径（相对站点根）
 * - icon:  Unicode 装饰符号
 * - label: 导航文字
 */
const NAV_LINKS = [
    { id: 'home', path: '/index.html',              icon: '⌾', label: '简历' },
    { id: 'blog', path: '/pages/blog/index.html',   icon: '◉', label: '博客' },
    { id: 'cms',  path: '/pages/cms/index.html',    icon: '⊕', label: 'CMS'  },
];

/**
 * 生成完整导航栏的 HTML 字符串。
 * @param {'home'|'blog'|'cms'} activePage - 当前页面 id，对应项会加 class="active"
 * @returns {string} 导航栏 HTML
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

/**
 * 将导航栏注入页面中 id="site-nav" 的元素。
 * 若元素不存在则静默跳过（兼容无导航页面）。
 * @param {'home'|'blog'|'cms'} activePage - 当前页面 id
 */
export function mountNav(activePage) {
    const el = document.getElementById('site-nav');
    if (el) el.innerHTML = renderNav(activePage);
}
