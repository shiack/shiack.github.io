# Selenium 网页自动化：浏览器操作与测试

> Selenium WebDriver 是最广泛使用的浏览器自动化框架，适用于功能测试、数据采集和重复性操作自动化。

---

## 一、WebDriver 架构

```
┌──────────────┐    JSON Wire    ┌─────────────────┐
│  测试脚本     │ ◄────────────► │  WebDriver 服务  │
│  (Python/JS) │    Protocol     │ (ChromeDriver等) │
└──────────────┘                 └────────┬────────┘
                                          │
                                 ┌────────▼────────┐
                                 │   浏览器实例      │
                                 │  (Chrome/Firefox)│
                                 └─────────────────┘
```

---

## 二、快速开始

### 2.1 安装与初始化

```python
# pip install selenium webdriver-manager
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

def create_driver(headless=False):
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    driver.implicitly_wait(10)  # 全局隐式等待
    return driver
```

### 2.2 元素定位

```python
from selenium.webdriver.common.by import By

driver.get("https://example.com")

# 多种定位方式（优先级：ID > CSS > XPath）
element = driver.find_element(By.ID, "username")
element = driver.find_element(By.CSS_SELECTOR, "input[name='email']")
element = driver.find_element(By.XPATH, "//button[@type='submit']")
element = driver.find_element(By.CLASS_NAME, "login-btn")
element = driver.find_element(By.LINK_TEXT, "登录")

# 定位多个元素
items = driver.find_elements(By.CSS_SELECTOR, ".product-card")
```

| 定位方式 | 优点 | 缺点 |
|----------|------|------|
| ID | 最快最稳定 | 不是每个元素都有 |
| CSS Selector | 简洁灵活 | 需了解 CSS 语法 |
| XPath | 最强大 | 语法复杂，性能略低 |
| Class Name | 简单 | class 可能重复 |

---

## 三、等待机制

### 3.1 显式等待（推荐）

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

wait = WebDriverWait(driver, timeout=15)

# 等待元素可点击
btn = wait.until(EC.element_to_be_clickable((By.ID, "submit")))
btn.click()

# 等待元素出现
elem = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".result")))

# 等待文本出现
wait.until(EC.text_to_be_present_in_element((By.ID, "status"), "成功"))

# 等待 URL 变化
wait.until(EC.url_contains("/dashboard"))
```

### 3.2 自定义等待条件

```python
def element_has_value(locator, value):
    def check(driver):
        el = driver.find_element(*locator)
        return el.get_attribute("value") == value
    return check

wait.until(element_has_value((By.ID, "price"), "99.00"))
```

---

## 四、Page Object Model

将页面操作封装为类，隔离定位逻辑与测试逻辑：

```python
# pages/login_page.py
class LoginPage:
    URL = "https://example.com/login"
    
    USERNAME = (By.ID, "username")
    PASSWORD = (By.ID, "password")
    SUBMIT   = (By.CSS_SELECTOR, "button[type=submit]")
    ERROR    = (By.CLASS_NAME, "error-message")

    def __init__(self, driver):
        self.driver = driver
        self.wait   = WebDriverWait(driver, 10)

    def open(self):
        self.driver.get(self.URL)
        return self

    def login(self, username, password):
        self.wait.until(EC.presence_of_element_located(self.USERNAME)).send_keys(username)
        self.driver.find_element(*self.PASSWORD).send_keys(password)
        self.driver.find_element(*self.SUBMIT).click()
        return self

    def error_message(self):
        return self.wait.until(EC.visibility_of_element_located(self.ERROR)).text

# tests/test_login.py
def test_invalid_login(driver):
    page = LoginPage(driver).open()
    page.login("bad@user.com", "wrongpass")
    assert "密码错误" in page.error_message()
```

---

## 五、常见场景处理

### 5.1 处理 iframe

```python
# 切换到 iframe
driver.switch_to.frame("iframe-id")
driver.switch_to.frame(driver.find_element(By.TAG_NAME, "iframe"))

# 操作 iframe 内元素
driver.find_element(By.ID, "inner-btn").click()

# 切回主文档
driver.switch_to.default_content()
```

### 5.2 处理弹窗

```python
# Alert 弹窗
alert = driver.switch_to.alert
print(alert.text)
alert.accept()   # 确认
alert.dismiss()  # 取消
alert.send_keys("输入内容")

# 新标签页
driver.switch_to.window(driver.window_handles[-1])
driver.close()
driver.switch_to.window(driver.window_handles[0])
```

### 5.3 失败截图

```python
import os
from datetime import datetime

def take_screenshot(driver, test_name):
    os.makedirs("screenshots", exist_ok=True)
    filename = f"screenshots/{test_name}_{datetime.now():%Y%m%d_%H%M%S}.png"
    driver.save_screenshot(filename)
    return filename

# pytest conftest.py
@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    if rep.failed and "driver" in item.funcargs:
        take_screenshot(item.funcargs["driver"], item.name)
```

---

## 总结

Selenium 最佳实践：
- 使用**显式等待**替代 `time.sleep`，让测试更快更稳定
- **Page Object Model** 将定位器集中管理，UI 变更只需改一处
- **headless 模式**用于 CI/CD 环境
- 失败自动截图有助于调试

对于新项目，可以考虑 Playwright（更现代的 API，自动等待更智能）。

---

*本文作者：林墨川 | 更新时间：2024年*
