/**
 * @file email-subscribe.js
 * @description CMS 页邮件订阅面板模块。
 *
 * 功能：
 *   - 渲染"订阅推送"面板 HTML，挂载到指定容器
 *   - 邮件格式校验
 *   - 本地持久化（localStorage），跨页面保留订阅状态
 *   - 展开/折叠表单动画（max-height CSS 过渡）
 *   - 提交时调用后端 API（可配置 ENDPOINT）；
 *     后端未就绪时自动降级为纯本地保存（OFFLINE_MODE = true）
 *   - 三种状态：idle / submitting / subscribed
 *   - 已订阅状态显示邮箱 + 取消订阅入口
 *   - RSS 订阅直链
 *
 * 存储键（localStorage）：
 *   - "es:email"     — 已订阅邮箱，有值即视为已订阅
 *   - "es:subAt"     — 订阅时间 ISO 字符串（用于调试/后续功能）
 *
 * 使用：
 *   import { mountEmailSubscribe } from '/assets/js/modules/email-subscribe.js';
 *   mountEmailSubscribe(document.getElementById('es-container'));
 */

// ── 配置 ─────────────────────────────────────────────────────────────────────

/**
 * 后端订阅接口地址。
 * 设为空字符串或 OFFLINE_MODE=true 时跳过网络请求，仅本地保存。
 * 后端实现参考：Cloudflare Workers POST /api/email/subscribe
 * 期望请求体：{ email: string }
 * 期望响应体：{ ok: true } 或 { ok: false, message: string }
 */
const ENDPOINT = '';

/**
 * true  = 离线模式：仅本地保存，不发送网络请求（后端未就绪时使用）
 * false = 在线模式：发送到 ENDPOINT（需后端配合）
 */
const OFFLINE_MODE = true;

/** localStorage 键名 */
const LS_EMAIL = 'es:email';
const LS_SUB_AT = 'es:subAt';

/** RSS 订阅文件路径 */
const RSS_HREF = '/feed.xml';

// ── 工具函数 ─────────────────────────────────────────────────────────────────

/** 简单 Email 格式校验 */
function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/** 读取已订阅邮箱，无则返回 null */
function getSavedEmail() {
    try { return localStorage.getItem(LS_EMAIL) || null; }
    catch { return null; }
}

/** 持久化订阅信息 */
function saveEmail(email) {
    try {
        localStorage.setItem(LS_EMAIL, email);
        localStorage.setItem(LS_SUB_AT, new Date().toISOString());
    } catch { /* 私有浏览模式可能不可写 */ }
}

/** 清除订阅信息 */
function clearEmail() {
    try {
        localStorage.removeItem(LS_EMAIL);
        localStorage.removeItem(LS_SUB_AT);
    } catch { /* ignore */ }
}

/** HTML 转义，防止 XSS */
function esc(s) {
    return String(s).replace(/[&<>"']/g,
        m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ── API 调用 ─────────────────────────────────────────────────────────────────

/**
 * 向后端发送订阅请求。
 * @param {string} email
 * @returns {Promise<{ok:boolean, message?:string}>}
 */
async function apiSubscribe(email) {
    if (OFFLINE_MODE || !ENDPOINT) {
        // 离线模式：模拟网络延迟后返回成功
        await new Promise(r => setTimeout(r, 650));
        return { ok: true };
    }
    try {
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();
        return res.ok ? { ok: true } : { ok: false, message: data.message || `HTTP ${res.status}` };
    } catch (err) {
        return { ok: false, message: '网络异常，请稍后重试' };
    }
}

// ── HTML 生成 ────────────────────────────────────────────────────────────────

/**
 * 生成面板 HTML 字符串。
 * @param {'idle'|'subscribed'} initState - 初始状态
 * @param {string|null} savedEmail        - 已保存的邮箱（subscribed 状态使用）
 */
function buildPanelHTML(initState, savedEmail) {
    const subscribedBlock = savedEmail ? `
        <div class="es-subscribed-row" id="es-subscribed-row">
            <span>✅</span>
            <span>已订阅：</span>
            <span class="es-subscribed-email">${esc(savedEmail)}</span>
            <button class="es-unsub-btn" id="es-unsub-btn">取消订阅</button>
        </div>` : '';

    const actionsBlock = `
        <div class="es-actions" id="es-actions" ${initState === 'subscribed' ? 'style="display:none"' : ''}>
            <button class="es-btn" id="es-email-btn">
                <span>📧</span><span>邮件订阅</span>
            </button>
            <a class="es-btn es-btn-rss" href="${RSS_HREF}" target="_blank" rel="noopener noreferrer">
                <span>📡</span><span>RSS</span>
            </a>
        </div>`;

    const formBlock = `
        <div class="es-form-wrap" id="es-form-wrap">
            <div class="es-form-inner">
                <div class="es-input-row">
                    <input
                        class="es-input"
                        id="es-input"
                        type="email"
                        placeholder="your@email.com"
                        autocomplete="email"
                        inputmode="email"
                        maxlength="120"
                    />
                    <button class="es-submit" id="es-submit">订阅</button>
                </div>
                <div class="es-hint" id="es-hint" style="display:none"></div>
                <div class="es-footnote">每天 09:00 · 13:00 · 18:00 准时推送，随时可退订。</div>
            </div>
        </div>`;

    return `
    <div class="es-panel" id="es-panel">
        <div class="es-header">
            <span class="es-icon">🔔</span>
            <div class="es-title-wrap">
                <div class="es-title">订阅推送 / Subscribe</div>
                <div class="es-desc">每天三档 AI 技术精选准时送达</div>
            </div>
        </div>
        ${initState === 'subscribed' ? subscribedBlock : ''}
        ${actionsBlock}
        ${formBlock}
    </div>`;
}

// ── 组件挂载与逻辑绑定 ───────────────────────────────────────────────────────

/**
 * 将邮件订阅面板挂载到指定容器元素。
 * @param {HTMLElement} container - 面板将 innerHTML 注入的父元素
 */
export function mountEmailSubscribe(container) {
    if (!container) return;

    const savedEmail = getSavedEmail();
    const initState  = savedEmail ? 'subscribed' : 'idle';

    container.innerHTML = buildPanelHTML(initState, savedEmail);

    // ── DOM 引用 ───────────────────────────────────────────────
    const emailBtn    = container.querySelector('#es-email-btn');
    const formWrap    = container.querySelector('#es-form-wrap');
    const input       = container.querySelector('#es-input');
    const submitBtn   = container.querySelector('#es-submit');
    const hint        = container.querySelector('#es-hint');
    const actionsRow  = container.querySelector('#es-actions');
    const unsubBtn    = container.querySelector('#es-unsub-btn');

    // ── 展开/折叠表单 ──────────────────────────────────────────
    function openForm() {
        formWrap.classList.add('open');
        emailBtn?.classList.add('active');
        // 下一帧 focus，让 max-height 动画先启动
        requestAnimationFrame(() => requestAnimationFrame(() => input?.focus()));
    }

    function closeForm() {
        formWrap.classList.remove('open');
        emailBtn?.classList.remove('active');
        clearHint();
    }

    function toggleForm() {
        formWrap.classList.contains('open') ? closeForm() : openForm();
    }

    emailBtn?.addEventListener('click', toggleForm);

    // ── Hint helpers ───────────────────────────────────────────
    function showHint(msg, type = 'info') {
        if (!hint) return;
        hint.className = `es-hint ${type}`;
        hint.textContent = msg;
        hint.style.display = '';
    }

    function clearHint() {
        if (!hint) return;
        hint.style.display = 'none';
        hint.textContent   = '';
    }

    // ── Submit ─────────────────────────────────────────────────
    async function handleSubmit() {
        if (!input || !submitBtn) return;

        const email = input.value.trim();

        if (!email) {
            showHint('请输入邮箱地址', 'error');
            input.focus();
            return;
        }
        if (!isValidEmail(email)) {
            showHint('邮箱格式不正确，请检查后重试', 'error');
            input.focus();
            return;
        }

        // submitting 状态
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="es-spinner"></span>订阅中…';
        clearHint();

        const result = await apiSubscribe(email);

        if (result.ok) {
            saveEmail(email);
            closeForm();
            // 渲染已订阅状态
            _renderSubscribedState(email, container, actionsRow);
        } else {
            showHint(result.message || '订阅失败，请稍后重试', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = '订阅';
        }
    }

    submitBtn?.addEventListener('click', handleSubmit);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });

    // ── Input 实时清除错误提示 ─────────────────────────────────
    input?.addEventListener('input', () => {
        if (hint?.classList.contains('error')) clearHint();
    });

    // ── 取消订阅 ───────────────────────────────────────────────
    unsubBtn?.addEventListener('click', () => _handleUnsubscribe(container, actionsRow));
}

// ── 状态渲染辅助（模块私有）────────────────────────────────────────────────

/**
 * 订阅成功后，切换到"已订阅"状态视图。
 */
function _renderSubscribedState(email, container, actionsRow) {
    // 隐藏按钮行
    if (actionsRow) actionsRow.style.display = 'none';

    // 插入已订阅行（在 es-actions 前面）
    const row = document.createElement('div');
    row.className = 'es-subscribed-row';
    row.id = 'es-subscribed-row';
    row.innerHTML = `
        <span>✅</span>
        <span>已订阅：</span>
        <span class="es-subscribed-email">${esc(email)}</span>
        <button class="es-unsub-btn" id="es-unsub-btn">取消订阅</button>`;

    actionsRow?.before(row);

    // 重新绑定取消订阅
    row.querySelector('#es-unsub-btn')
        ?.addEventListener('click', () => _handleUnsubscribe(container, actionsRow));
}

/**
 * 取消订阅：清除本地存储并恢复初始状态。
 */
function _handleUnsubscribe(container, actionsRow) {
    clearEmail();
    // 移除已订阅行
    container.querySelector('#es-subscribed-row')?.remove();
    // 恢复按钮行
    if (actionsRow) actionsRow.style.display = '';
}
