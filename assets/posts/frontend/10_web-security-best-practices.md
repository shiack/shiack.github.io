# Web 安全最佳实践：XSS、CSRF 与 CSP

> 前端安全的三大核心威胁：XSS 注入执行、CSRF 跨站伪造、点击劫持。理解攻击原理才能有效防御。

---

## 一、XSS（跨站脚本攻击）

### 1.1 三种类型

```
存储型 XSS（持久化）:
  攻击者 → 恶意脚本存入 DB → 受害者访问页面 → 脚本执行

反射型 XSS（非持久化）:
  攻击者构造 URL → 受害者点击 → 脚本通过响应反射执行
  http://example.com/search?q=<script>steal()</script>

DOM-based XSS:
  攻击者构造 URL → 前端 JS 读取 URL 参数写入 DOM → 脚本执行
  document.innerHTML = location.hash  // ← 危险
```

### 1.2 防御措施

```javascript
// ❌ 危险：直接写入 HTML（DOM XSS）
element.innerHTML = userInput
document.write(userInput)
eval(userInput)

// ✅ 安全：使用 textContent（自动转义）
element.textContent = userInput

// ✅ 必须用 innerHTML 时，先转义
function escapeHtml(str) {
    const div = document.createElement('div')
    div.appendChild(document.createTextNode(str))
    return div.innerHTML
}
element.innerHTML = escapeHtml(userInput)

// ✅ 富文本场景：使用 DOMPurify 白名单过滤
import DOMPurify from 'dompurify'
element.innerHTML = DOMPurify.sanitize(userInput, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
})
```

```python
# 后端（Python Flask）：模板自动转义
# Jinja2 默认开启自动转义 {{ user_input }} 安全
# 需要原始 HTML 时显式标记：{{ content | safe }}（仅对可信内容使用）

from markupsafe import escape
safe_output = escape(user_input)  # 手动转义

# Cookie 设置 HttpOnly（JS 无法读取，防止 XSS 窃取 Cookie）
response.set_cookie('session', token,
    httponly=True,    # 防 XSS 窃取
    secure=True,      # 仅 HTTPS 传输
    samesite='Strict' # 防 CSRF
)
```

---

## 二、CSRF（跨站请求伪造）

### 2.1 攻击原理

```
受害者登录 bank.com → 有合法 Session Cookie
         ↓
访问恶意网站 evil.com
         ↓
evil.com 发起请求: POST https://bank.com/transfer?to=attacker&amount=1000
         ↓
浏览器自动携带 bank.com 的 Cookie → 请求成功
```

### 2.2 CSRF Token 防御

```python
# Flask 后端：使用 Flask-WTF CSRF 保护
from flask_wtf.csrf import CSRFProtect, generate_csrf

csrf = CSRFProtect(app)

@app.route('/transfer', methods=['POST'])
def transfer():
    # flask-wtf 自动验证 CSRF Token
    amount = request.form['amount']
    ...

# 前端：表单中包含 CSRF Token
@app.context_processor
def inject_csrf_token():
    return dict(csrf_token=generate_csrf())
```

```html
<!-- HTML 表单 -->
<form method="POST" action="/transfer">
    <input type="hidden" name="csrf_token" value="{{ csrf_token }}">
    <input type="number" name="amount">
    <button type="submit">转账</button>
</form>
```

```javascript
// AJAX 请求：从 meta 标签读取 CSRF Token
const csrfToken = document.querySelector('meta[name="csrf-token"]').content

fetch('/api/transfer', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,    // 或 X-Requested-With: XMLHttpRequest
    },
    body: JSON.stringify({ amount: 100 }),
})
```

### 2.3 SameSite Cookie

```python
# 现代防御：SameSite=Strict/Lax（浏览器级别阻止跨站携带 Cookie）
response.set_cookie('session', token,
    samesite='Strict',  # 跨站请求不携带 Cookie（最严格）
    # samesite='Lax',   # 允许顶层导航携带（兼容性好）
    secure=True,
    httponly=True,
)
```

---

## 三、CSP（内容安全策略）

```nginx
# Nginx 配置 CSP 响应头
add_header Content-Security-Policy "
    default-src 'self';
    script-src  'self' 'nonce-{NONCE}' https://cdn.trusted.com;
    style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src     'self' data: https:;
    font-src    'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.example.com;
    frame-src   'none';
    object-src  'none';
    base-uri    'self';
    form-action 'self';
    upgrade-insecure-requests;
" always;
```

```javascript
// Nonce-based CSP（允许内联脚本但需要匹配 nonce）
// 后端每次请求生成随机 nonce
const nonce = crypto.randomBytes(16).toString('base64')
res.setHeader('Content-Security-Policy',
    `script-src 'nonce-${nonce}' 'strict-dynamic'`)

// 模板中使用 nonce
// <script nonce="{{nonce}}">/* 内联脚本 */</script>
```

---

## 四、其他安全头

```nginx
# 完整安全响应头配置
server {
    # 防点击劫持（禁止 iframe 嵌入）
    add_header X-Frame-Options "DENY" always;
    # 或允许同源 iframe：add_header X-Frame-Options "SAMEORIGIN" always;

    # 禁止 MIME 嗅探
    add_header X-Content-Type-Options "nosniff" always;

    # XSS 过滤（旧版浏览器）
    add_header X-XSS-Protection "1; mode=block" always;

    # 强制 HTTPS（1 年）
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # 控制 Referer 信息
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 权限策略（禁用不需要的浏览器特性）
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;
}
```

---

## 五、依赖安全

```bash
# 检查已知漏洞
npm audit              # 显示漏洞
npm audit fix          # 自动修复
npm audit fix --force  # 强制修复（可能破坏兼容性）

# Snyk 更全面的扫描
npx snyk test
npx snyk monitor       # 持续监控

# Python 依赖扫描
pip install safety
safety check
```

```yaml
# GitHub Actions：自动化安全扫描
- name: Run security audit
  run: npm audit --audit-level=high

- name: Dependency Review
  uses: actions/dependency-review-action@v3
  with:
    fail-on-severity: high
```

---

## 总结

Web 安全三层防线：

| 层次 | 措施 | 防御的威胁 |
|------|------|-----------|
| 输出转义 | textContent / DOMPurify | XSS |
| HTTP 头 | CSP / X-Frame-Options / HSTS | XSS、点击劫持、降级 |
| Cookie 策略 | HttpOnly + Secure + SameSite | XSS 窃取、CSRF |
| CSRF Token | 表单/AJAX 携带 Token | CSRF |
| 依赖扫描 | npm audit / Snyk | 供应链攻击 |

安全是分层防御：**单一措施不够**，CSP + SameSite + CSRF Token 组合使用。

---

*本文作者：林墨川 | 更新时间：2024年*
