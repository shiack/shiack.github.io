# MySQL 性能优化完全指南：索引与查询调优

> 索引是 MySQL 性能优化的核心，理解 B+ Tree 结构和查询执行计划，才能写出真正高效的 SQL。

---

## 一、B+ Tree 索引原理

```
B+ Tree 结构（order=3）：

                  [30 | 60]              ← 非叶子节点（只存键）
                 /    |    \
          [10|20]  [40|50]  [70|80]      ← 非叶子节点
         /  |  \    ...       ...
      [1-9][10-19][20-29]...             ← 叶子节点（存键+数据/主键）
         ↔  叶子节点双向链表  ↔           ← 支持范围查询
```

- **聚簇索引（主键索引）**：叶子节点存储完整行数据
- **二级索引（辅助索引）**：叶子节点存储主键值，需回表查询
- **覆盖索引**：查询字段全在索引中，无需回表

---

## 二、索引设计原则

### 2.1 选择高基数列

```sql
-- 查看列基数
SELECT COUNT(DISTINCT status) / COUNT(*) AS cardinality
FROM orders;
-- status 取值少（pending/done/cancelled），基数低，不适合单独建索引

-- user_id 基数高，适合建索引
SELECT COUNT(DISTINCT user_id) / COUNT(*) AS cardinality FROM orders;
```

### 2.2 联合索引最左前缀

```sql
-- 建立联合索引 (a, b, c)
ALTER TABLE t ADD INDEX idx_abc (a, b, c);

-- 能用到索引的查询
WHERE a = 1               -- ✅ 用 a
WHERE a = 1 AND b = 2     -- ✅ 用 a, b
WHERE a = 1 AND b = 2 AND c = 3  -- ✅ 全用
WHERE a = 1 AND c = 3     -- ✅ 只用 a（c 跳过了 b）

-- 不能用到索引
WHERE b = 2               -- ❌ 跳过了最左列 a
WHERE b = 2 AND c = 3     -- ❌ 同上
```

### 2.3 索引列不做函数运算

```sql
-- ❌ 索引失效：对索引列做函数
WHERE YEAR(create_time) = 2024
WHERE LEFT(phone, 3) = '138'

-- ✅ 等价改写，保持索引可用
WHERE create_time >= '2024-01-01' AND create_time < '2025-01-01'
WHERE phone LIKE '138%'
```

---

## 三、EXPLAIN 分析执行计划

```sql
EXPLAIN SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id;
```

| 字段 | 关键值 | 说明 |
|------|--------|------|
| type | ALL | ❌ 全表扫描，需优化 |
| type | ref/range | ✅ 使用了索引 |
| type | const/eq_ref | ✅✅ 最优 |
| key | NULL | 未使用索引 |
| rows | 大数字 | 扫描行数多，需关注 |
| Extra | Using filesort | 额外排序，考虑加索引 |
| Extra | Using index | 覆盖索引，最佳 |

```sql
-- 更详细的分析（MySQL 8.0+）
EXPLAIN ANALYZE SELECT ...;
```

---

## 四、慢查询识别与优化

### 4.1 开启慢查询日志

```ini
# my.cnf
slow_query_log = ON
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1       # 超过 1s 记录
log_queries_not_using_indexes = ON
```

```bash
# 用 pt-query-digest 分析慢查询日志
pt-query-digest /var/log/mysql/slow.log | head -100
```

### 4.2 常见慢查询模式

```sql
-- ❌ N+1 查询：循环中逐条查询
-- Python 代码：for user in users: db.query("SELECT * FROM orders WHERE user_id=?", user.id)

-- ✅ 改为 IN 批量查询
SELECT * FROM orders WHERE user_id IN (1, 2, 3, ..., 100);

-- ❌ SELECT *（回表，传输多余数据）
SELECT * FROM products WHERE category_id = 5;

-- ✅ 只查需要的字段
SELECT id, name, price FROM products WHERE category_id = 5;

-- ❌ 分页深度翻页（OFFSET 大时极慢）
SELECT * FROM logs ORDER BY id LIMIT 10000000, 10;

-- ✅ 游标分页
SELECT * FROM logs WHERE id > 10000000 ORDER BY id LIMIT 10;
```

---

## 五、InnoDB 参数调优

```ini
# my.cnf 关键参数

# 缓冲池：设置为可用内存的 70-80%
innodb_buffer_pool_size = 8G

# 多实例缓冲池（> 1G 时建议设为 CPU 核数）
innodb_buffer_pool_instances = 8

# 日志文件大小（影响崩溃恢复时间和写入性能）
innodb_log_file_size = 1G

# 事务提交刷盘策略
# 1 = 每次提交都刷盘（最安全）
# 2 = 每次提交写 OS cache（性能好，极端故障可能丢1s数据）
innodb_flush_log_at_trx_commit = 1
```

---

## 总结

MySQL 优化路径：
1. **用 EXPLAIN** 找出全表扫描和高 rows 的查询
2. **针对性建索引**：高基数列、联合索引遵循最左前缀
3. **改写 SQL**：消除函数运算、深翻页、SELECT *、N+1
4. **调整 InnoDB 参数**：buffer_pool_size 是最重要的单一参数
5. **监控慢查询**：定期分析，形成优化闭环

---

*本文作者：林墨川 | 更新时间：2024年*
