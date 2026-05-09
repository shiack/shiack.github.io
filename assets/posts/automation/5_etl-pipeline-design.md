# ETL 流水线设计：数据抽取、转换与加载

> ETL 是数据工程的基础，设计良好的 ETL 流水线需要兼顾正确性、性能、可观测性和容错能力。

---

## 一、ETL vs ELT

```
传统 ETL：                      现代 ELT（云数仓时代）：
Source → Extract → Transform   Source → Extract → Load → Transform
             ↓            ↓                          ↓          ↓
         Staging         DW                         DW      dbt/SQL
  （转换在数据仓库外）        （转换在数据仓库内，利用算力）
```

| 维度 | ETL | ELT |
|------|-----|-----|
| 计算位置 | ETL 服务器 | 数据仓库（BigQuery/Snowflake） |
| 灵活性 | 低（预先定义转换） | 高（随时重跑转换） |
| 原始数据保留 | ❌ | ✅（可回溯）|
| 适用规模 | 中小 | 中大 |

---

## 二、数据抽取（Extract）

### 2.1 全量 vs 增量

```python
import pandas as pd
import sqlalchemy as sa
from datetime import datetime, timedelta

engine = sa.create_engine("postgresql://user:pass@host/db")

# 全量抽取（首次或小表）
def extract_full(table: str) -> pd.DataFrame:
    return pd.read_sql(f"SELECT * FROM {table}", engine)

# 增量抽取（时间戳方式）
def extract_incremental(table: str, last_run: datetime) -> pd.DataFrame:
    sql = f"""
        SELECT * FROM {table}
        WHERE updated_at > :last_run
        ORDER BY updated_at
    """
    return pd.read_sql(sql, engine, params={"last_run": last_run})

# 增量抽取（CDC：基于 binlog/WAL，零延迟）
# 推荐工具：Debezium -> Kafka -> 消费者
```

### 2.2 大表分批抽取

```python
def extract_in_batches(table: str, batch_size: int = 10000):
    offset = 0
    while True:
        chunk = pd.read_sql(
            f"SELECT * FROM {table} ORDER BY id LIMIT {batch_size} OFFSET {offset}",
            engine
        )
        if chunk.empty:
            break
        yield chunk
        offset += batch_size
        print(f"已抽取: {offset} 行")

# 使用
for batch in extract_in_batches("orders", batch_size=50000):
    process_batch(batch)
```

---

## 三、数据转换（Transform）

### 3.1 数据质量验证

```python
import great_expectations as ge

df = ge.from_pandas(raw_df)

# 定义期望
df.expect_column_to_exist("user_id")
df.expect_column_values_to_not_be_null("user_id")
df.expect_column_values_to_be_between("amount", min_value=0, max_value=1_000_000)
df.expect_column_values_to_match_regex("email", r"^[\w.-]+@[\w.-]+\.\w+$")
df.expect_column_values_to_be_in_set("status", ["pending", "paid", "cancelled"])

result = df.validate()
if not result["success"]:
    failed = [r for r in result["results"] if not r["success"]]
    raise ValueError(f"数据质量检查失败: {failed}")
```

### 3.2 常见转换操作

```python
import pandas as pd
import numpy as np

def transform_orders(df: pd.DataFrame) -> pd.DataFrame:
    # 1. 类型转换
    df["created_at"] = pd.to_datetime(df["created_at"])
    df["amount"] = df["amount"].astype(float)

    # 2. 处理缺失值
    df["discount"] = df["discount"].fillna(0)
    df["note"] = df["note"].fillna("")
    df.dropna(subset=["user_id", "amount"], inplace=True)

    # 3. 派生字段
    df["year_month"] = df["created_at"].dt.to_period("M").astype(str)
    df["final_amount"] = df["amount"] * (1 - df["discount"])
    df["is_large_order"] = df["amount"] > 1000

    # 4. 去重（保留最新记录）
    df.sort_values("updated_at", ascending=False)
    df.drop_duplicates(subset=["order_id"], keep="first", inplace=True)

    # 5. 规范化字段名
    df.columns = df.columns.str.lower().str.replace(" ", "_")

    return df[["order_id", "user_id", "amount", "final_amount",
               "status", "year_month", "is_large_order", "created_at"]]
```

---

## 四、数据加载（Load）

```python
from sqlalchemy.dialects.postgresql import insert

def load_to_warehouse(df: pd.DataFrame, target_table: str, mode: str = "upsert"):
    if mode == "append":
        df.to_sql(target_table, engine, if_exists="append", index=False, method="multi")

    elif mode == "truncate_load":
        with engine.begin() as conn:
            conn.execute(sa.text(f"TRUNCATE TABLE {target_table}"))
        df.to_sql(target_table, engine, if_exists="append", index=False, method="multi")

    elif mode == "upsert":
        # PostgreSQL ON CONFLICT DO UPDATE
        records = df.to_dict(orient="records")
        stmt = insert(sa.Table(target_table, sa.MetaData(), autoload_with=engine))
        update_cols = {c: stmt.excluded[c] for c in df.columns if c != "id"}
        on_conflict = stmt.on_conflict_do_update(index_elements=["id"], set_=update_cols)
        with engine.begin() as conn:
            conn.execute(on_conflict, records)

    print(f"已加载 {len(df)} 行到 {target_table}（模式: {mode}）")
```

---

## 五、错误处理与监控

```python
import logging
import time
from dataclasses import dataclass, field
from typing import List

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

@dataclass
class ETLMetrics:
    start_time: float = field(default_factory=time.time)
    rows_extracted: int = 0
    rows_transformed: int = 0
    rows_loaded: int = 0
    errors: List[str] = field(default_factory=list)

def run_pipeline(table: str, metrics: ETLMetrics) -> bool:
    try:
        # Extract
        raw = extract_incremental(table, last_run=get_last_run(table))
        metrics.rows_extracted = len(raw)
        logger.info(f"抽取完成: {metrics.rows_extracted} 行")

        # Transform
        clean = transform_orders(raw)
        metrics.rows_transformed = len(clean)
        logger.info(f"转换完成: {metrics.rows_transformed} 行")

        # Load
        load_to_warehouse(clean, f"dw_{table}", mode="upsert")
        metrics.rows_loaded = metrics.rows_transformed

        save_last_run(table, datetime.utcnow())
        return True

    except Exception as e:
        metrics.errors.append(str(e))
        logger.error(f"Pipeline 失败: {e}", exc_info=True)
        send_alert(table, str(e))
        return False

    finally:
        elapsed = time.time() - metrics.start_time
        logger.info(
            f"Pipeline 结束: 抽取={metrics.rows_extracted} "
            f"转换={metrics.rows_transformed} 加载={metrics.rows_loaded} "
            f"耗时={elapsed:.1f}s 错误={len(metrics.errors)}"
        )
```

---

## 总结

ETL 设计要点：
- **增量抽取** 降低数据库压力，减少传输量
- **数据质量校验**（Great Expectations）在转换前阻断脏数据
- **Upsert** 而非 INSERT 保证幂等性，支持重跑
- **结构化日志** 记录每阶段行数，异常时便于排查
- 大规模场景考虑 Apache Spark 或 dbt + ELT 架构

---

*本文作者：林墨川 | 更新时间：2024年*
