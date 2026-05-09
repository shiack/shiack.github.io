/**
 * 赛博博客路由配置模块
 * 统一管理所有页面路由，实现参数化配置
 */

// 基础路径配置
const BASE_PATH = '';

// 路由配置对象
export const ROUTES = {
    // 首页
    home: {
        path: `${BASE_PATH}/index.html`,
        name: '首页',
        title: '林墨川 · 赛博简历 | CyberGeek'
    },
    
    // 博客列表页
    blogList: {
        path: `${BASE_PATH}/pages/blog/index.html`,
        name: '博客列表',
        title: '赛博博客 · 技术矩阵'
    },
    
    // 博客详情页（动态路由）
    blogDetail: {
        path: `${BASE_PATH}/pages/blog/post.html`,
        name: '博客详情',
        title: '博客详情 | CyberBlog'
    },

    // CMS 内容管理页
    cms: {
        path: `${BASE_PATH}/pages/cms/index.html`,
        name: 'CMS',
        title: 'CMS · 内容管理 | shiack'
    }
};

/**
 * 获取路由路径
 * @param {string} routeName - 路由名称
 * @param {Object} params - 路由参数（可选）
 * @returns {string} 完整路由路径
 */
export function getRoute(routeName, params = {}) {
    const route = ROUTES[routeName];
    if (!route) {
        console.warn(`路由 ${routeName} 不存在`);
        return '';
    }
    
    let path = route.path;
    
    // 替换动态参数
    for (const key in params) {
        path = path.replace(`:${key}`, params[key]);
    }
    
    return path;
}

/**
 * 跳转到指定路由
 * @param {string} routeName - 路由名称
 * @param {Object} params - 路由参数（可选）
 */
export function navigateTo(routeName, params = {}) {
    const path = getRoute(routeName, params);
    if (path) {
        window.location.href = path;
    }
}

/**
 * 获取当前路由名称
 * @returns {string|null} 当前路由名称
 */
export function getCurrentRoute() {
    const currentPath = window.location.pathname;
    
    for (const [name, route] of Object.entries(ROUTES)) {
        if (currentPath.endsWith(route.path)) {
            return name;
        }
    }
    
    return null;
}

/**
 * 路由链接组件生成器
 * @param {string} routeName - 路由名称
 * @param {Object} options - 链接选项
 * @returns {string} HTML链接字符串
 */
export function routeLink(routeName, options = {}) {
    const path = getRoute(routeName, options.params);
    if (!path) return '';
    
    const className = options.className || '';
    const text = options.text || '';
    const title = options.title || '';
    
    return `<a href="${path}"${className ? ` class="${className}"` : ''}${title ? ` title="${title}"` : ''}>${text}</a>`;
}

// 兼容 CommonJS 导出（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ROUTES,
        getRoute,
        navigateTo,
        getCurrentRoute,
        routeLink
    };
}