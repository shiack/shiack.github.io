# Celery 任务队列：异步任务处理

> Celery 将耗时操作（发邮件、生成报告、调用第三方 API）从请求链路中解耦，Web 服务秒级响应，后台慢慢处理。

---

## 一、架构模型

```
Web 应用 (Producer)
    │
    │ delay() / apply_async()
    ▼
消息队列 (Broker)
  Redis / RabbitMQ
    │
    │ 任务分发
    ├────────────────────────┐
    ▼                        ▼
Worker 1                 Worker 2
  └── task_send_email      └── task_generate_report
         │                          │
         └──────────┬───────────────┘
                    ▼
            结果存储 (Backend)
              Redis / DB
```

---

## 二、基础配置

```python
# celery_app.py
from celery import Celery
from kombu import Queue

app = Celery('myapp')

app.conf.update(
    # Broker（任务队列）
    broker_url='redis://localhost:6379/0',
    # Backend（存储任务结果）
    result_backend='redis://localhost:6379/1',

    # 序列化
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='Asia/Shanghai',

    # 任务路由：不同任务进不同队列
    task_routes={
        'tasks.send_email':     {'queue': 'email'},
        'tasks.generate_report':{'queue': 'heavy'},
        'tasks.*':              {'queue': 'default'},
    },

    # 队列声明
    task_queues=(
        Queue('default', routing_key='default'),
        Queue('email',   routing_key='email'),
        Queue('heavy',   routing_key='heavy', queue_arguments={'x-max-priority': 10}),
    ),

    # Worker 并发（CPU 密集型用进程，IO 密集型用线程/协程）
    worker_concurrency=4,
    worker_prefetch_multiplier=1,  # 每次只取 1 个任务，避免大任务饿死小任务

    # 任务超时
    task_soft_time_limit=300,   # 软限制：发 SoftTimeLimitExceeded
    task_time_limit=360,        # 硬限制：强制 kill
)
```

---

## 三、任务定义

```python
# tasks.py
from celery_app import app
from celery import shared_task
from celery.utils.log import get_task_logger
import time

logger = get_task_logger(__name__)

@app.task(
    bind=True,                    # 第一个参数为 self (task 实例)
    max_retries=3,
    default_retry_delay=60,       # 重试等待 60 秒
    autoretry_for=(ConnectionError, TimeoutError),  # 自动重试的异常
    acks_late=True,               # 任务成功后才确认（防消息丢失）
    reject_on_worker_lost=True,   # Worker 崩溃时重新入队
)
def send_email(self, to: str, subject: str, body: str):
    logger.info(f"发送邮件至 {to}: {subject}")
    try:
        email_client.send(to, subject, body)
        return {"status": "sent", "to": to}
    except RateLimitError as exc:
        # 指数退避重试
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)

@app.task(bind=True)
def generate_report(self, report_type: str, params: dict):
    # 更新任务进度（供前端轮询）
    self.update_state(state='PROGRESS', meta={'current': 0, 'total': 100})

    result = []
    for i, item in enumerate(get_data(params)):
        result.append(process_item(item))
        if i % 10 == 0:
            self.update_state(
                state='PROGRESS',
                meta={'current': i, 'total': 100, 'result': len(result)}
            )

    return {"rows": len(result), "file": save_report(result)}
```

---

## 四、任务调用与结果

```python
# 异步调用（立即返回 AsyncResult）
result = send_email.delay("user@example.com", "你好", "内容")
print(result.id)   # 任务 ID

# 带参数的调用
result = generate_report.apply_async(
    args=["monthly"],
    kwargs={"params": {"month": "2024-01"}},
    countdown=10,           # 10 秒后执行
    eta=datetime(2024, 1, 1, 9, 0),  # 指定执行时间
    priority=8,             # 优先级（需队列支持）
    queue='heavy',          # 指定队列
    expires=3600,           # 1 小时内未执行则丢弃
)

# 查询结果（用于长任务轮询）
def check_task(task_id: str):
    result = app.AsyncResult(task_id)
    return {
        "state":   result.state,        # PENDING/PROGRESS/SUCCESS/FAILURE
        "info":    result.info,         # 进度或结果
        "ready":   result.ready(),      # 是否完成
        "success": result.successful(), # 是否成功
    }

# 任务编排：链式执行（前一个结果传给下一个）
from celery import chain, group, chord

pipeline = chain(
    extract_data.s(source="db"),
    transform_data.s(),
    load_data.s(target="warehouse"),
)
pipeline.delay()

# 并行执行后汇总
parallel_job = chord(
    group(process_shard.s(i) for i in range(10)),
    aggregate_results.s()
)
parallel_job.delay()
```

---

## 五、定时任务（Beat）

```python
# celery_app.py（添加定时任务配置）
from celery.schedules import crontab

app.conf.beat_schedule = {
    # 每天 9:00 发送日报
    'daily-report': {
        'task': 'tasks.generate_report',
        'schedule': crontab(hour=9, minute=0),
        'args': ('daily', {}),
    },
    # 每 5 分钟清理过期 session
    'cleanup-sessions': {
        'task': 'tasks.cleanup_expired_sessions',
        'schedule': 300,  # 秒
    },
    # 每周一早 8 点发周报
    'weekly-digest': {
        'task': 'tasks.send_weekly_digest',
        'schedule': crontab(hour=8, minute=0, day_of_week=1),
    },
}
```

```bash
# 启动 Worker（监听指定队列）
celery -A celery_app worker -l info -Q default,email -c 4

# 启动重量级任务专用 Worker（单并发，避免占用所有资源）
celery -A celery_app worker -l info -Q heavy -c 1

# 启动 Beat 调度器
celery -A celery_app beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

# 监控界面（Flower）
celery -A celery_app flower --port=5555
```

---

## 总结

Celery 生产实践：
- **队列分级**：email/default/heavy，不同 Worker 数量应对不同负载
- **`acks_late=True`**：Worker 崩溃时任务不丢失
- **指数退避重试**：`countdown=2 ** retries * 30`
- **软/硬超时**：防止任务永久挂起
- **Flower 监控**：实时查看 Worker 状态、任务成功率、延迟

---

*本文作者：林墨川 | 更新时间：2024年*
