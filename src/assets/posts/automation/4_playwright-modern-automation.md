# Playwright：新一代浏览器自动化工具

> Playwright 由 Microsoft 开发，支持 Chromium/Firefox/WebKit，内置自动等待和强大的调试工具，是当前最优秀的 E2E 测试框架。

---

## 一、Playwright vs Selenium

| 特性 | Playwright | Selenium |
|------|-----------|---------|
| 浏览器支持 | Chromium/Firefox/WebKit | Chrome/Firefox/Edge/Safari |
| 自动等待 | ✅ 内置，基于可操作性 | ❌ 需手动配置 |
| 网络拦截 | ✅ route() API | 需插件 |
| 并行执行 | ✅ 原生支持 | 需 Grid |
| 移动端模拟 | ✅ 内置设备 | 有限支持 |
| 截图/视频 | ✅ 内置 trace viewer | 需额外插件 |
| API 风格 | 异步优先 | 同步为主 |

---

## 二、快速开始（Python）

```bash
pip install playwright
playwright install  # 安装浏览器二进制
```

```python
# 同步 API（适合脚本）
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("https://example.com")
    print(page.title())
    page.screenshot(path="screenshot.png")
    browser.close()
```

```python
# 异步 API（适合测试框架）
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("https://example.com")
        title = await page.title()
        print(title)
        await browser.close()

asyncio.run(main())
```

---

## 三、元素定位与操作

### 3.1 推荐定位策略

```python
# ✅ 优先用语义化定位（对无障碍友好）
page.get_by_role("button", name="登录")
page.get_by_label("用户名")
page.get_by_placeholder("请输入邮箱")
page.get_by_text("提交")
page.get_by_test_id("submit-btn")  # data-testid 属性

# CSS / XPath（次选）
page.locator("input[name='email']")
page.locator("xpath=//button[@type='submit']")

# 链式过滤
page.get_by_role("listitem").filter(has_text="张三").get_by_role("button", name="删除")
```

### 3.2 自动等待机制

```python
# Playwright 自动等待元素"可操作"（可见+启用+稳定）后再执行
page.get_by_role("button", name="提交").click()  # 无需手动 wait

# 自定义等待条件
page.wait_for_selector(".success-toast")
page.wait_for_url("**/dashboard")
page.wait_for_load_state("networkidle")

# 断言（内置重试直到通过）
from playwright.sync_api import expect
expect(page.get_by_text("登录成功")).to_be_visible()
expect(page).to_have_url(re.compile(r"/dashboard"))
```

---

## 四、pytest 集成

```python
# conftest.py
import pytest
from playwright.sync_api import sync_playwright, Page, Browser

@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()

@pytest.fixture
def page(browser: Browser):
    context = browser.new_context(
        base_url="https://staging.example.com",
        viewport={"width": 1280, "height": 720},
        record_video_dir="videos/"   # 录制视频
    )
    page = context.new_page()
    yield page
    context.close()

# tests/test_login.py
class TestLogin:
    def test_valid_login(self, page: Page):
        page.goto("/login")
        page.get_by_label("邮箱").fill("admin@example.com")
        page.get_by_label("密码").fill("secret123")
        page.get_by_role("button", name="登录").click()
        expect(page).to_have_url("/dashboard")
        expect(page.get_by_text("欢迎回来")).to_be_visible()

    def test_invalid_login(self, page: Page):
        page.goto("/login")
        page.get_by_label("邮箱").fill("wrong@email.com")
        page.get_by_label("密码").fill("wrongpass")
        page.get_by_role("button", name="登录").click()
        expect(page.get_by_text("用户名或密码错误")).to_be_visible()
```

---

## 五、网络拦截与调试

### 5.1 Mock API 请求

```python
# 拦截并 mock 响应
page.route("**/api/users", lambda route: route.fulfill(
    status=200,
    content_type="application/json",
    body='[{"id": 1, "name": "测试用户"}]'
))

# 修改请求
page.route("**/api/**", lambda route: route.continue_(
    headers={**route.request.headers, "Authorization": "Bearer test-token"}
))

# 阻止特定请求（如广告）
page.route("**/*ads*/**", lambda route: route.abort())
```

### 5.2 Trace Viewer（可视化调试）

```python
context = browser.new_context()
context.tracing.start(screenshots=True, snapshots=True)

page = context.new_page()
# ... 执行测试步骤 ...

context.tracing.stop(path="trace.zip")
# 打开 trace viewer
# playwright show-trace trace.zip
```

### 5.3 Codegen 自动生成代码

```bash
# 记录操作自动生成测试代码
playwright codegen https://example.com --output=test_recorded.py
```

---

## 总结

Playwright 优势总结：
- **自动等待** 消除 `sleep`，测试更快更稳
- **`get_by_role/label`** 等语义定位器比 CSS/XPath 更健壮
- **Trace Viewer** 让调试失败测试直观高效
- **网络拦截** 轻松 Mock 外部依赖，隔离测试环境
- 对于新项目，Playwright 是 Selenium 的替代首选

---

*本文作者：林墨川 | 更新时间：2024年*
