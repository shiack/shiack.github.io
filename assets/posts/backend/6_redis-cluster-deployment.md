# Redis 集群部署与高可用方案设计

> Redis 提供三种部署模式：单机、哨兵和集群，根据业务规模和可用性要求选择合适的方案。

---

## 一、三种部署模式对比

| 模式 | 高可用 | 水平扩展 | 复杂度 | 适用场景 |
|------|--------|----------|--------|----------|
| 单机 | ❌ | ❌ | 低 | 开发/测试 |
| 主从复制 | 手动切换 | 读扩展 | 低 | 简单生产 |
| Sentinel 哨兵 | ✅ 自动切换 | 读扩展 | 中 | 中小规模 |
| Cluster 集群 | ✅ | ✅ 写扩展 | 高 | 大规模 |

---

## 二、主从复制

```bash
# redis-replica.conf
replicaof 192.168.1.100 6379   # 主节点地址
replica-read-only yes
replica-lazy-flush no

# 验证复制状态
redis-cli -h 192.168.1.100 INFO replication
```

```
主节点 ──── 全量同步（RDB）──►  从节点1
     └──── 增量同步（AOF）──►  从节点2
```

---

## 三、Sentinel 哨兵模式

```
              ┌─────────────┐
              │  Sentinel 1  │
              └──────┬──────┘
                     │
Sentinel 2 ──────── Master ────── Replica 1
              │               └── Replica 2
              └─────────────┘
               Sentinel 3
```

```ini
# sentinel.conf
sentinel monitor mymaster 192.168.1.100 6379 2   # 需要2个哨兵同意才切换
sentinel down-after-milliseconds mymaster 5000    # 5s 无响应判定下线
sentinel failover-timeout mymaster 60000          # 故障转移超时
sentinel parallel-syncs mymaster 1               # 每次同步的从节点数
```

```python
# Python 连接哨兵
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ('sentinel1', 26379),
    ('sentinel2', 26379),
    ('sentinel3', 26379),
], socket_timeout=0.1)

master = sentinel.master_for('mymaster', password='secret')
slave  = sentinel.slave_for('mymaster',  password='secret')

master.set('key', 'value')
slave.get('key')
```

---

## 四、Redis Cluster

### 4.1 分片原理

```
Hash Slot: 0 ~ 16383（共 16384 个槽）

节点1: slot 0    ~ 5460
节点2: slot 5461 ~ 10922
节点3: slot 10923~ 16383

CRC16(key) % 16384 → 确定所在槽 → 路由到对应节点
```

### 4.2 集群搭建

```bash
# 启动 6 个节点（3主3从）
for port in 7001 7002 7003 7004 7005 7006; do
  redis-server --port $port \
    --cluster-enabled yes \
    --cluster-config-file nodes-$port.conf \
    --cluster-node-timeout 5000 \
    --daemonize yes
done

# 创建集群
redis-cli --cluster create \
  127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \
  127.0.0.1:7004 127.0.0.1:7005 127.0.0.1:7006 \
  --cluster-replicas 1

# 检查集群状态
redis-cli -p 7001 cluster info
redis-cli -p 7001 cluster nodes
```

---

## 五、持久化策略

### 5.1 RDB vs AOF

```ini
# RDB：定时快照，文件小，恢复快
save 900 1      # 900s 内有1次写操作则保存
save 300 10     # 300s 内有10次写操作则保存
save 60 10000

# AOF：记录每条命令，数据最完整
appendonly yes
appendfsync everysec  # 每秒刷盘（推荐）
# appendfsync always  # 每次写都刷盘（最安全，性能低）
# appendfsync no      # 由OS决定（性能最好，可能丢数据）

# AOF 重写：压缩 AOF 文件
auto-aof-rewrite-percentage 100  # 文件增长100%时重写
auto-aof-rewrite-min-size 64mb
```

### 5.2 生产推荐配置

```ini
# 同时开启 RDB + AOF（Redis 7.0+ 支持 AOF + RDB 混合持久化）
aof-use-rdb-preamble yes

# 内存策略
maxmemory 4gb
maxmemory-policy allkeys-lru   # 内存满时淘汰最近最少使用

# 延迟释放（避免 DEL 大 key 阻塞）
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
```

---

## 总结

- 小规模用 **Sentinel**，中大规模用 **Cluster**
- 使用 RDB + AOF 混合持久化兼顾性能和数据安全
- 大 Key（>10KB）要警惕：删除用 UNLINK，遍历用 SCAN 代替 KEYS
- 热 Key 问题：本地缓存（Guava/Caffeine）+ Redis 双层缓存

---

*本文作者：林墨川 | 更新时间：2024年*
