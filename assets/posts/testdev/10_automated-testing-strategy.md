# 自动化测试策略：单元测试到端到端测试

> 测试金字塔告诉我们：单元测试多而快、集成测试适中、E2E 测试少而精——每层职责不同，互相补充。

---

## 一、测试金字塔

```
          /\
         /E2E\         少量（10%）: 核心流程、用户旅程
        /──────\       慢（分钟级）
       /  集成   \
      /──────────\     中量（20%）: 服务边界、数据库交互
     /   单元测试  \
    /──────────────\   大量（70%）: 纯逻辑、快速反馈
   ──────────────────
```

**各层职责：**
- **单元测试**：验证函数/类的逻辑正确性，完全隔离外部依赖
- **集成测试**：验证组件协作（真实 DB/API），不 Mock 关键路径
- **E2E 测试**：从用户角度验证完整流程，模拟真实浏览器

---

## 二、单元测试（pytest）

```python
# src/services/order_service.py
from dataclasses import dataclass
from decimal import Decimal

@dataclass
class Order:
    items: list[dict]
    user_vip: bool = False

    def calculate_total(self) -> Decimal:
        subtotal = sum(Decimal(str(item['price'])) * item['quantity']
                      for item in self.items)
        discount = Decimal('0.9') if self.user_vip else Decimal('1.0')
        return (subtotal * discount).quantize(Decimal('0.01'))

# tests/unit/test_order_service.py
import pytest
from decimal import Decimal
from src.services.order_service import Order

class TestOrderCalculation:
    def test_basic_total(self):
        order = Order(items=[
            {'price': 100, 'quantity': 2},
            {'price': 50,  'quantity': 1},
        ])
        assert order.calculate_total() == Decimal('250.00')

    def test_vip_discount(self):
        order = Order(
            items=[{'price': 100, 'quantity': 1}],
            user_vip=True
        )
        assert order.calculate_total() == Decimal('90.00')

    def test_empty_order(self):
        order = Order(items=[])
        assert order.calculate_total() == Decimal('0.00')

    @pytest.mark.parametrize("price,qty,vip,expected", [
        (100, 1, False, Decimal('100.00')),
        (100, 1, True,  Decimal('90.00')),
        (33.33, 3, False, Decimal('99.99')),
    ])
    def test_various_cases(self, price, qty, vip, expected):
        order = Order(items=[{'price': price, 'quantity': qty}], user_vip=vip)
        assert order.calculate_total() == expected
```

```python
# Mock 外部依赖
from unittest.mock import patch, MagicMock
import pytest

class TestEmailService:
    @patch('src.services.email_service.smtplib.SMTP')
    def test_send_email(self, mock_smtp):
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server

        from src.services.email_service import EmailService
        service = EmailService('smtp.gmail.com', 587)
        service.send('test@example.com', '主题', '内容')

        mock_server.sendmail.assert_called_once()
        args = mock_server.sendmail.call_args[0]
        assert 'test@example.com' in args[1]

    @patch('src.services.payment_service.requests.post')
    def test_payment_timeout(self, mock_post):
        import requests
        mock_post.side_effect = requests.Timeout()

        from src.services.payment_service import PaymentService
        with pytest.raises(PaymentTimeoutError):
            PaymentService().charge(100, 'card_123')
```

---

## 三、集成测试（真实数据库）

```python
# conftest.py
import pytest
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope='session')
def db_engine():
    """测试专用数据库（Docker 启动）"""
    engine = create_engine(
        'postgresql://test:test@localhost:5433/testdb',
        pool_size=5
    )
    yield engine
    engine.dispose()

@pytest.fixture(autouse=True)
def db_session(db_engine):
    """每个测试用独立事务，测试后回滚"""
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    session.close()
    transaction.rollback()  # 回滚，保持测试隔离
    connection.close()

# tests/integration/test_user_repository.py
class TestUserRepository:
    def test_create_and_find_user(self, db_session):
        repo = UserRepository(db_session)

        # 写入
        user = repo.create(email='test@example.com', name='测试用户')
        assert user.id is not None

        # 读取（同一事务内，可见）
        found = repo.find_by_email('test@example.com')
        assert found.name == '测试用户'
        # 测试结束后自动回滚，不污染数据库
```

---

## 四、E2E 测试（Playwright）

```python
# tests/e2e/test_checkout_flow.py
import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(autouse=True)
def reset_db():
    """E2E 测试前重置测试数据"""
    test_db.reset()
    test_db.seed_products()
    yield

def test_complete_purchase_flow(page: Page):
    """完整购买流程 E2E 测试"""
    # 1. 登录
    page.goto('/login')
    page.get_by_label('邮箱').fill('test@example.com')
    page.get_by_label('密码').fill('password123')
    page.get_by_role('button', name='登录').click()
    expect(page).to_have_url('/dashboard')

    # 2. 添加商品到购物车
    page.goto('/products')
    page.get_by_test_id('product-001').get_by_role('button', name='加入购物车').click()
    expect(page.get_by_test_id('cart-count')).to_have_text('1')

    # 3. 结算
    page.goto('/cart')
    page.get_by_role('button', name='去结算').click()
    page.get_by_label('收货地址').fill('北京市朝阳区xxx')
    page.get_by_role('button', name='提交订单').click()

    # 4. 验证订单创建成功
    expect(page.get_by_text('订单提交成功')).to_be_visible()
    order_id = page.get_by_test_id('order-id').text_content()
    assert order_id.startswith('ORD-')

def test_payment_failure_shows_error(page: Page):
    """支付失败场景"""
    # 使用测试用的"必失败"卡号
    page.goto('/checkout')
    page.get_by_label('卡号').fill('4000000000000002')  # Stripe 测试失败卡号
    page.get_by_role('button', name='支付').click()
    expect(page.get_by_role('alert')).to_contain_text('支付失败')
```

---

## 五、CI 集成与测试策略

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements-dev.txt
      - run: pytest tests/unit -x -q --tb=short
        # -x: 第一个失败即停止，快速反馈

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: testdb }
        options: --health-cmd pg_isready
    steps:
      - uses: actions/checkout@v4
      - run: pytest tests/integration -q

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: docker-compose up -d app  # 启动完整应用
      - run: pytest tests/e2e -q
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**测试覆盖率要求：**

```ini
# pytest.ini
[pytest]
addopts = --cov=src --cov-report=term-missing --cov-fail-under=80
```

---

## 总结

测试策略核心原则：
- **快速反馈**：单元测试 < 1分钟，集成 < 5分钟，E2E < 20分钟
- **不 Mock 关键路径**：集成测试用真实 DB（事务回滚保证隔离）
- **E2E 测试黄金路径**：只覆盖最重要的 3-5 个用户流程
- **测试数据隔离**：单元测试 Mock，集成测试回滚，E2E 重置 Seed
- **失败必须调查**：禁止 `@pytest.mark.skip` 跳过失败测试，应修复或删除

---

*本文作者：林墨川 | 更新时间：2024年*
