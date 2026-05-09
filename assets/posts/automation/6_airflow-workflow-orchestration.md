# Airflow 工作流编排：任务调度与监控

> Apache Airflow 通过 Python 代码定义 DAG（有向无环图），将复杂的数据管道和任务依赖关系可视化管理。

---

## 一、核心概念

```
DAG (Directed Acyclic Graph)
  ├── Task A (Operator)
  │     └── extract_data
  ├── Task B  ← 依赖 Task A
  │     └── transform_data
  └── Task C  ← 依赖 Task B
        └── load_to_warehouse

执行模型：Scheduler → Executor → Worker
```

---

## 二、基础 DAG

```python
# dags/daily_etl.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.sensors.http_sensor import HttpSensor
from datetime import datetime, timedelta

# 默认参数（应用到所有 Task）
default_args = {
    "owner": "data-team",
    "depends_on_past": False,
    "email": ["alert@example.com"],
    "email_on_failure": True,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="daily_sales_etl",
    default_args=default_args,
    description="每日销售数据 ETL",
    schedule="0 2 * * *",   # 每天凌晨 2 点（UTC）
    start_date=datetime(2024, 1, 1),
    catchup=False,           # 不回填历史执行
    tags=["etl", "sales"],
) as dag:

    # 等待 API 可用
    wait_api = HttpSensor(
        task_id="wait_for_api",
        http_conn_id="sales_api",
        endpoint="/health",
        poke_interval=30,
        timeout=600,
    )

    # 抽取数据
    def extract(**context):
        ds = context["ds"]  # 执行日期（YYYY-MM-DD）
        print(f"抽取 {ds} 的销售数据")
        # ... 抽取逻辑
        return {"rows": 5000}   # 返回值存入 XCom

    extract_task = PythonOperator(
        task_id="extract_sales",
        python_callable=extract,
    )

    # Shell 命令
    transform_task = BashOperator(
        task_id="transform_data",
        bash_command="python /opt/scripts/transform.py --date {{ ds }}",
    )

    def load(**context):
        # 从 XCom 获取上游数据
        ti = context["ti"]
        result = ti.xcom_pull(task_ids="extract_sales")
        print(f"加载 {result['rows']} 行")

    load_task = PythonOperator(
        task_id="load_to_warehouse",
        python_callable=load,
    )

    # 定义执行顺序
    wait_api >> extract_task >> transform_task >> load_task
```

---

## 三、TaskFlow API（推荐，Python 3.8+）

```python
from airflow.decorators import dag, task
from datetime import datetime

@dag(
    schedule="@daily",
    start_date=datetime(2024, 1, 1),
    catchup=False,
)
def sales_pipeline():

    @task()
    def extract(ds=None):
        print(f"抽取 {ds} 数据")
        return {"records": [{"id": 1, "amount": 100}]}

    @task()
    def transform(raw_data: dict):
        records = raw_data["records"]
        return [{"id": r["id"], "amount_usd": r["amount"] / 7.2} for r in records]

    @task()
    def load(clean_data: list):
        print(f"加载 {len(clean_data)} 条记录")
        # 写入数据库...

    # XCom 数据传递是自动的（通过返回值和参数）
    raw = extract()
    clean = transform(raw)
    load(clean)

dag_instance = sales_pipeline()
```

---

## 四、动态 Task 映射

```python
from airflow.decorators import dag, task

@dag(schedule="@daily", start_date=datetime(2024, 1, 1), catchup=False)
def dynamic_tasks():

    @task
    def get_tables():
        return ["orders", "users", "products"]  # 动态返回表名列表

    @task
    def process_table(table: str):
        print(f"处理表: {table}")
        return f"完成 {table}"

    @task
    def summarize(results: list):
        print(f"所有表处理完毕: {results}")

    tables = get_tables()
    # 自动为每个表创建一个 Task 实例（并行执行）
    results = process_table.expand(table=tables)
    summarize(results)

dag_instance = dynamic_tasks()
```

---

## 五、连接与变量管理

```python
# 使用 Airflow Connections（在 UI 或 CLI 配置）
from airflow.hooks.base import BaseHook
from airflow.providers.postgres.hooks.postgres import PostgresHook

# 从 Connection 获取数据库连接
pg_hook = PostgresHook(postgres_conn_id="my_postgres")
records = pg_hook.get_records("SELECT * FROM orders WHERE date = %s", parameters=["2024-01-01"])

# 使用 Airflow Variables（键值存储）
from airflow.models import Variable

api_url = Variable.get("SALES_API_URL")
threshold = Variable.get("ALERT_THRESHOLD", default_var="1000", deserialize_json=False)

# CLI 设置
# airflow variables set SALES_API_URL https://api.example.com
# airflow connections add my_postgres --conn-type postgres --conn-host db.example.com
```

---

## 六、监控与告警

```python
from airflow.utils.email import send_email

def on_failure_callback(context):
    """Task 失败时触发"""
    task_id = context["task_instance"].task_id
    dag_id  = context["dag"].dag_id
    log_url = context["task_instance"].log_url
    
    send_email(
        to=["oncall@example.com"],
        subject=f"[Airflow] 任务失败: {dag_id}.{task_id}",
        html_content=f"""
        <p>任务 <b>{dag_id}.{task_id}</b> 执行失败</p>
        <p>执行时间: {context['execution_date']}</p>
        <a href="{log_url}">查看日志</a>
        """
    )

# 在 Task 或 DAG 级别配置回调
@dag(on_failure_callback=on_failure_callback)
```

---

## 总结

Airflow 最佳实践：
- 用 **TaskFlow API** (`@task` 装饰器)，代码更 Pythonic
- **catchup=False** 防止历史回填导致资源爆炸
- `expand()` 动态 Task 替代手写循环创建 Task
- 凭据统一存入 **Connections**，不要硬编码在 DAG 里
- 生产环境用 **Celery Executor** 或 **Kubernetes Executor** 实现分布式执行

---

*本文作者：林墨川 | 更新时间：2024年*
