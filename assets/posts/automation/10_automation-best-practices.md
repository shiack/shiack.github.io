# 自动化最佳实践：可维护性与扩展性

> 自动化脚本的最大敌人不是技术难题，而是维护成本——今天能跑，三个月后坏了不知道为什么。

---

## 一、可维护性原则

### 1.1 配置与代码分离

```python
# ❌ 硬编码：改动需修改源代码
def process_orders():
    orders = fetch_from_db("postgresql://prod:password@10.0.0.1:5432/orders")
    send_to_email("report@company.com")
    archive_path = "/data/archives/orders"
    ...

# ✅ 配置外置：环境变量 + 配置文件
import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    db_url: str
    report_email: str
    archive_path: Path = Path("/data/archives")
    batch_size: int = 1000
    retry_max: int = 3

    class Config:
        env_file = ".env"

settings = Settings()

def process_orders():
    orders = fetch_from_db(settings.db_url)
    send_to_email(settings.report_email)
    archive_path = settings.archive_path / "orders"
```

```ini
# .env（不提交 Git）
DB_URL=postgresql://prod:password@10.0.0.1:5432/orders
REPORT_EMAIL=report@company.com
ARCHIVE_PATH=/data/archives

# config/production.env（提交 Git，不含密码）
BATCH_SIZE=500
RETRY_MAX=3
```

---

## 二、健壮性设计

### 2.1 幂等性

```python
from datetime import date

def daily_report_task(report_date: date = None):
    """幂等任务：同一天多次执行结果相同"""
    if report_date is None:
        report_date = date.today()

    # 检查是否已执行（幂等键）
    run_id = f"daily_report_{report_date.isoformat()}"
    if execution_log.exists(run_id):
        logger.info(f"任务 {run_id} 已执行，跳过")
        return

    try:
        result = _do_generate_report(report_date)
        execution_log.record(run_id, status='success', result=result)
    except Exception as e:
        execution_log.record(run_id, status='failed', error=str(e))
        raise

class ExecutionLog:
    def __init__(self, db):
        self.db = db

    def exists(self, run_id: str) -> bool:
        row = self.db.fetchone(
            "SELECT status FROM execution_log WHERE run_id = %s AND status = 'success'",
            [run_id]
        )
        return row is not None

    def record(self, run_id: str, **kwargs):
        self.db.execute("""
            INSERT INTO execution_log (run_id, executed_at, status, metadata)
            VALUES (%s, NOW(), %s, %s)
            ON CONFLICT (run_id) DO UPDATE SET
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata
        """, [run_id, kwargs.get('status'), json.dumps(kwargs)])
```

### 2.2 断点续跑

```python
def process_large_dataset(source_path: str, checkpoint_file: str):
    """支持断点续跑的大数据处理"""
    checkpoint = load_checkpoint(checkpoint_file)
    processed_ids = checkpoint.get('processed_ids', set())
    start_offset = checkpoint.get('offset', 0)

    try:
        with open(source_path) as f:
            f.seek(start_offset)
            for line in f:
                item = json.loads(line)
                if item['id'] in processed_ids:
                    continue

                process_item(item)
                processed_ids.add(item['id'])

                # 每 100 条保存一次检查点
                if len(processed_ids) % 100 == 0:
                    save_checkpoint(checkpoint_file, {
                        'processed_ids': list(processed_ids),
                        'offset': f.tell(),
                        'updated_at': datetime.now().isoformat(),
                    })

    except KeyboardInterrupt:
        logger.info("手动中断，已保存检查点，可从断点继续")
        save_checkpoint(checkpoint_file, {
            'processed_ids': list(processed_ids),
            'offset': f.tell() if 'f' in dir() else start_offset,
        })
        raise
```

---

## 三、可观测性

```python
import logging
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime

# 结构化日志（便于日志聚合工具解析）
import structlog

log = structlog.get_logger()

@contextmanager
def task_span(task_name: str, **context):
    """任务执行追踪"""
    start = time.time()
    task_id = f"{task_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    log.info("task_started", task=task_name, task_id=task_id, **context)
    try:
        yield task_id
        duration = time.time() - start
        log.info("task_completed", task=task_name, task_id=task_id,
                 duration_seconds=round(duration, 3), **context)
    except Exception as e:
        duration = time.time() - start
        log.error("task_failed", task=task_name, task_id=task_id,
                  error=str(e), error_type=type(e).__name__,
                  duration_seconds=round(duration, 3), **context)
        raise

# 使用
def sync_orders():
    with task_span("sync_orders", source="erp", target="warehouse") as task_id:
        orders = fetch_new_orders()
        log.info("orders_fetched", task_id=task_id, count=len(orders))
        for order in orders:
            push_to_warehouse(order)
```

---

## 四、模块化与复用

```python
# automation/base.py
from abc import ABC, abstractmethod

class BaseAutomationTask(ABC):
    """所有自动化任务的基类"""

    def __init__(self, config: Settings):
        self.config = config
        self.logger = structlog.get_logger(task=self.__class__.__name__)

    @abstractmethod
    def execute(self) -> dict:
        """执行任务，返回执行报告"""
        ...

    def run(self) -> dict:
        """带重试和日志的统一入口"""
        for attempt in range(1, self.config.retry_max + 1):
            try:
                self.logger.info("attempt_start", attempt=attempt)
                result = self.execute()
                self.logger.info("attempt_success", attempt=attempt)
                return result
            except Exception as e:
                if attempt == self.config.retry_max:
                    self.notify_failure(e)
                    raise
                wait = 2 ** (attempt - 1) * 10
                self.logger.warning("attempt_failed", attempt=attempt,
                                   wait=wait, error=str(e))
                time.sleep(wait)

    def notify_failure(self, error: Exception):
        """失败通知（可重写）"""
        alert_channel.send(
            f"任务 {self.__class__.__name__} 失败: {error}"
        )

# 具体任务
class OrderSyncTask(BaseAutomationTask):
    def execute(self) -> dict:
        orders = self._fetch_pending_orders()
        success, failed = 0, 0
        for order in orders:
            try:
                self._sync_order(order)
                success += 1
            except Exception as e:
                self.logger.error("order_sync_failed", order_id=order.id, error=str(e))
                failed += 1
        return {"success": success, "failed": failed, "total": len(orders)}
```

---

## 五、测试与部署

```python
# 自动化任务的单元测试策略
import pytest
from unittest.mock import MagicMock, patch

class TestOrderSyncTask:
    @pytest.fixture
    def task(self):
        config = Settings(db_url="sqlite:///:memory:", retry_max=1)
        return OrderSyncTask(config)

    def test_successful_sync(self, task):
        task._fetch_pending_orders = MagicMock(return_value=[
            Order(id='1'), Order(id='2')
        ])
        task._sync_order = MagicMock()

        result = task.execute()
        assert result['success'] == 2
        assert result['failed'] == 0

    def test_partial_failure(self, task):
        task._fetch_pending_orders = MagicMock(return_value=[
            Order(id='1'), Order(id='2')
        ])
        task._sync_order = MagicMock(
            side_effect=[None, Exception("网络超时")]
        )

        result = task.execute()
        assert result['success'] == 1
        assert result['failed'] == 1
```

```bash
# 部署为系统服务（systemd）
# /etc/systemd/system/order-sync.service
[Unit]
Description=Order Sync Automation
After=network.target

[Service]
Type=oneshot
User=automation
WorkingDirectory=/opt/automation
EnvironmentFile=/opt/automation/.env
ExecStart=/opt/automation/.venv/bin/python -m tasks.order_sync
StandardOutput=journal
StandardError=journal

# /etc/systemd/system/order-sync.timer
[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true   # 错过时间点后补跑

[Install]
WantedBy=timers.target
```

---

## 总结

自动化代码质量清单：
- **幂等性**：同一任务重跑不产生副作用，用执行日志去重
- **断点续跑**：大任务每 N 条保存检查点，支持中断后继续
- **结构化日志**：JSON 格式，包含 task/attempt/duration 字段
- **配置外置**：环境变量 + .env 文件，密码不进代码库
- **基类复用**：重试/日志/告警逻辑写一次，子类只关注业务
- **测试覆盖**：Mock 外部依赖，覆盖成功/部分失败/全失败场景

---

*本文作者：林墨川 | 更新时间：2024年*
