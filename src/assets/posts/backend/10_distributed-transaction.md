# 分布式事务解决方案：理论与实践

> 分布式事务是微服务架构的核心难题，没有银弹——理解 CAP/BASE 理论，选择合适的一致性模型才是关键。

---

## 一、理论基础

### 1.1 CAP 定理

```
        C（一致性）
       /
      /  只能同时满足两个
     /
    P（分区容错）── B（可用性）

CP 系统: ZooKeeper, HBase（网络分区时拒绝写入）
AP 系统: Cassandra, DynamoDB（网络分区时返回旧数据）
CA 系统: 单机关系数据库（不存在分区问题）
```

### 1.2 BASE vs ACID

| 特性 | ACID（强一致） | BASE（最终一致） |
|------|--------------|----------------|
| 一致性 | 强一致性 | 最终一致性 |
| 可用性 | 可能降低 | 高可用 |
| 适用场景 | 金融交易 | 购物车、用户行为 |
| 代表 | MySQL 事务 | Cassandra, Redis |

---

## 二、2PC / 3PC

### 2.1 两阶段提交（2PC）

```
协调者                参与者 A         参与者 B
   │                     │               │
   │── Prepare ─────────►│               │
   │── Prepare ──────────────────────►   │
   │                     │               │
   │◄─ Vote: Yes ────────│               │
   │◄─ Vote: Yes ────────────────────────│
   │                     │               │
   │── Commit ──────────►│               │  ← 全部 Yes → Commit
   │── Commit ───────────────────────►   │
   │                     │               │
   │◄─ ACK ─────────────│               │
   │◄─ ACK ──────────────────────────────│
```

**缺陷：协调者单点故障 → 参与者永久阻塞**

### 2.2 三阶段提交（3PC）

增加 CanCommit 阶段 + 超时机制，解决阻塞问题，但仍无法完全避免数据不一致。

---

## 三、SAGA 模式

```
订单服务    库存服务    支付服务    物流服务
   │           │           │           │
   T1 ────────►│           │           │
               T2 ─────────►│          │
                            T3 ─────────►
                            │           │
               ← 失败        │           │
               C3（补偿）◄──────────────│
   C2（补偿）◄──────────────│
   C1（补偿）◄──────────────
```

```python
from dataclasses import dataclass
from typing import Callable
import logging

logger = logging.getLogger(__name__)

@dataclass
class SagaStep:
    name: str
    action: Callable
    compensate: Callable

class SagaOrchestrator:
    def __init__(self, steps: list[SagaStep]):
        self.steps = steps

    def execute(self, context: dict) -> bool:
        completed = []
        try:
            for step in self.steps:
                logger.info(f"执行步骤: {step.name}")
                step.action(context)
                completed.append(step)
            return True
        except Exception as e:
            logger.error(f"步骤失败: {e}，开始补偿")
            for step in reversed(completed):
                try:
                    step.compensate(context)
                    logger.info(f"补偿步骤: {step.name} 完成")
                except Exception as comp_err:
                    logger.error(f"补偿失败: {step.name}: {comp_err}")
            return False

# 使用示例
saga = SagaOrchestrator([
    SagaStep("扣库存",  inventory_service.deduct,  inventory_service.refund),
    SagaStep("冻结资金", payment_service.freeze,    payment_service.unfreeze),
    SagaStep("创建物流", logistics_service.create,  logistics_service.cancel),
])
success = saga.execute({"order_id": "ORD-001", "amount": 199.0})
```

---

## 四、TCC 模式

```
Try 阶段（资源预留）    Confirm 阶段（确认）    Cancel 阶段（释放）
   冻结库存 100          扣减库存 100            解冻库存 100
   冻结余额 200          扣减余额 200            解冻余额 200
   预创建物流单          确认物流单              取消物流单
```

```java
// TCC 接口定义（Java 示例）
public interface InventoryTccService {
    @TccTransaction
    boolean tryDeduct(String orderId, int quantity);   // Try: 预留

    boolean confirm(String orderId);                   // Confirm: 确认扣减

    boolean cancel(String orderId);                    // Cancel: 释放预留
}

// Try 实现：预留库存（不真正扣减）
public boolean tryDeduct(String orderId, int quantity) {
    // 检查库存是否足够
    int available = inventoryMapper.getAvailable(productId);
    if (available < quantity) return false;

    // 创建预留记录（而非直接扣减）
    inventoryMapper.createReservation(orderId, quantity);
    inventoryMapper.updateFrozen(productId, quantity);
    return true;
}
```

**TCC vs SAGA 对比：**

| 维度 | TCC | SAGA |
|------|-----|------|
| 一致性 | 更强（两阶段预留） | 最终一致 |
| 业务侵入 | 高（需实现3个接口） | 中（需实现补偿） |
| 适用 | 资金类强一致场景 | 长流程业务 |

---

## 五、消息队列最终一致性

```
本地事务 + 消息表（最可靠方案）：

1. 业务操作 + 插入消息表（同一事务）
   BEGIN;
   UPDATE account SET balance = balance - 100 WHERE id = 1;
   INSERT INTO outbox (topic, payload, status) VALUES ('payment', '...', 'PENDING');
   COMMIT;

2. Outbox Poller 异步发送消息
3. 消费方处理 + 幂等去重
```

```python
import json
from datetime import datetime

def transfer_with_outbox(from_id: int, to_id: int, amount: float, db):
    with db.transaction():
        db.execute("UPDATE accounts SET balance = balance - ? WHERE id = ?",
                   [amount, from_id])
        db.execute("""
            INSERT INTO outbox (topic, payload, status, created_at)
            VALUES (?, ?, 'PENDING', ?)
        """, ["account.transfer", json.dumps({
            "from": from_id, "to": to_id, "amount": amount,
            "idempotency_key": f"{from_id}-{to_id}-{datetime.utcnow().isoformat()}"
        }), datetime.utcnow()])

# Outbox Poller（定时任务）
def poll_and_publish(db, mq):
    messages = db.query("SELECT * FROM outbox WHERE status = 'PENDING' LIMIT 100")
    for msg in messages:
        mq.publish(msg['topic'], msg['payload'])
        db.execute("UPDATE outbox SET status = 'SENT' WHERE id = ?", [msg['id']])
```

---

## 总结

分布式事务方案选型：
- **强一致性要求** → TCC（资金转账、库存扣减）
- **长流程业务** → SAGA（订单履约、多系统协作）
- **异步解耦** → 消息队列 + Outbox 模式（最终一致，高可用）
- **尽量避免** 2PC（阻塞、单点故障问题多）

核心原则：**幂等性设计**（每步操作可重试）+ **业务补偿**（失败回滚）。

---

*本文作者：林墨川 | 更新时间：2024年*
