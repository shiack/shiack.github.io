# Kafka 流式处理：从消息队列到实时计算

> Kafka 已从消息队列演进为流式数据平台，Kafka Streams 让应用程序直接在消息流上进行实时计算。

---

## 一、核心架构

```
┌─────────────────────────────────────────────────────────┐
│                      Kafka Cluster                       │
│                                                          │
│  Topic: orders (3 Partitions)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ Partition0│ │ Partition1│ │ Partition2│               │
│  │ [0][1][2] │ │ [0][1][2] │ │ [0][1][2] │               │
│  └──────────┘ └──────────┘ └──────────┘                │
│       ↑              ↑              ↑                   │
│  Broker 1       Broker 2       Broker 3                 │
└─────────────────────────────────────────────────────────┘
       ↑                                ↓
  Producer                        Consumer Group
  (order-service)                  ├── Consumer A (P0)
                                   ├── Consumer B (P1)
                                   └── Consumer C (P2)
```

**核心概念：**
- **Topic**：消息分类，类似数据库的表
- **Partition**：Topic 的分片，是并行度的单位
- **Offset**：消息在分区内的位置，消费者自己管理
- **Consumer Group**：同一 Group 内各消费者分摊分区

---

## 二、Producer 可靠性配置

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['kafka1:9092', 'kafka2:9092'],
    value_serializer=lambda v: json.dumps(v, ensure_ascii=False).encode('utf-8'),
    key_serializer=lambda k: k.encode('utf-8') if k else None,

    # 可靠性配置
    acks='all',              # 等待所有 ISR 副本确认（最强保证）
    retries=3,               # 失败重试次数
    max_in_flight_requests_per_connection=1,  # 保证顺序
    enable_idempotence=True, # 幂等生产者（避免重复）
)

# 发送消息（带回调）
def on_send_success(metadata):
    print(f"发送成功: topic={metadata.topic} partition={metadata.partition} offset={metadata.offset}")

def on_send_error(e):
    print(f"发送失败: {e}")

future = producer.send(
    topic='orders',
    key='user-123',           # 相同 key 发到同一分区（保证顺序）
    value={'order_id': 1, 'amount': 99.9},
)
future.add_callback(on_send_success).add_errback(on_send_error)

producer.flush()
```

---

## 三、Consumer 消费策略

```python
from kafka import KafkaConsumer
from kafka.errors import CommitFailedError

consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['kafka1:9092'],
    group_id='order-processor',
    value_deserializer=lambda v: json.loads(v.decode('utf-8')),

    # 偏移量管理
    enable_auto_commit=False,  # 手动提交，避免消息丢失
    auto_offset_reset='earliest',  # 无偏移量时从最早开始

    # 性能调优
    max_poll_records=100,
    fetch_max_bytes=52428800,  # 50MB
)

try:
    for message in consumer:
        try:
            process_order(message.value)
            consumer.commit()          # 处理成功后提交
        except Exception as e:
            print(f"处理失败，跳过: {e}")
            consumer.commit()          # 避免无限重试阻塞
finally:
    consumer.close()
```

### 3.1 消费语义对比

| 语义 | 配置 | 可能结果 |
|------|------|----------|
| At most once | 消费前提交 | 消息可能丢失 |
| At least once | 消费后提交 | 消息可能重复（推荐，配合幂等处理） |
| Exactly once | Kafka Transactions | 最强保证，性能开销大 |

---

## 四、Kafka Streams 实时计算

```java
// 统计每分钟各商品的订单数
StreamsBuilder builder = new StreamsBuilder();

KStream<String, Order> orders = builder.stream("orders");

orders
    .groupBy((key, order) -> order.getProductId())
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(1)))
    .count()
    .toStream()
    .map((windowedKey, count) -> KeyValue.pair(
        windowedKey.key(),
        new OrderStats(windowedKey.key(), count, windowedKey.window().startTime())
    ))
    .to("order-stats", Produced.with(Serdes.String(), orderStatsSerde));

KafkaStreams streams = new KafkaStreams(builder.build(), props);
streams.start();
```

---

## 五、生产环境最佳实践

```bash
# Topic 创建（分区数 = 消费者最大并行度）
kafka-topics.sh --create \
  --topic orders \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=604800000 \  # 7天保留
  --config min.insync.replicas=2     # 至少2副本同步才接受写入

# 监控消费延迟（lag）
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --group order-processor
```

**关键监控指标：**
- `consumer-group-lag`：消费延迟，告警阈值根据业务定
- `under-replicated-partitions`：副本不足，需立即处理
- `request-latency-avg`：Producer/Consumer 延迟

---

## 总结

- **acks=all + 幂等生产者** 提供端到端的 at-least-once 保证
- **手动提交 offset** 比自动提交更安全
- **业务层幂等** 是处理重复消息的正确方式（数据库唯一键等）
- **Kafka Streams** 让流式计算无需引入 Spark/Flink

---

*本文作者：林墨川 | 更新时间：2024年*
