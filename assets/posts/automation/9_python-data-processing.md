# Python 数据处理：Pandas 与 NumPy 实战

> Pandas 提供结构化数据处理能力，NumPy 提供高性能数值计算，两者是 Python 数据工程的核心工具链。

---

## 一、NumPy 核心操作

```python
import numpy as np

# ── 数组创建 ──────────────────────────────────────────
arr = np.array([1, 2, 3, 4, 5])
matrix = np.array([[1, 2, 3], [4, 5, 6]])
zeros = np.zeros((3, 4))          # 3行4列全零矩阵
ones  = np.ones((2, 3), dtype=np.float32)
range_arr = np.arange(0, 10, 2)   # [0, 2, 4, 6, 8]
linspace  = np.linspace(0, 1, 5)  # [0, 0.25, 0.5, 0.75, 1.0]
random_arr = np.random.randn(100, 3)  # 100行3列正态分布

# ── 广播运算（避免 Python 循环）─────────────────────
prices = np.array([100, 200, 300])
quantities = np.array([[1, 2, 3],
                        [4, 5, 6]])
totals = prices * quantities   # 广播相乘，shape: (2, 3)

# ── 向量化操作 vs 循环──────────────────────────────
# ❌ 慢（Python 循环）
result = [x**2 + 2*x + 1 for x in range(100000)]  # ~20ms

# ✅ 快（NumPy 向量化）
x = np.arange(100000)
result = x**2 + 2*x + 1  # ~0.1ms，200x 加速

# ── 矩阵运算 ──────────────────────────────────────
A = np.random.rand(100, 50)
B = np.random.rand(50, 30)
C = A @ B              # 矩阵乘法 (100, 30)
eigenvalues, _ = np.linalg.eig(A @ A.T)  # 特征值分解
```

---

## 二、Pandas 数据处理

### 2.1 数据读取与检查

```python
import pandas as pd

# 读取多种格式
df = pd.read_csv('data.csv', encoding='utf-8', parse_dates=['date'])
df = pd.read_excel('report.xlsx', sheet_name='Sheet1')
df = pd.read_json('data.json', orient='records')
df = pd.read_parquet('data.parquet')  # 推荐大数据场景

# 快速检查
print(df.shape)         # (行数, 列数)
print(df.dtypes)        # 每列数据类型
print(df.describe())    # 数值列统计摘要
print(df.isnull().sum()) # 每列缺失值数量
print(df.nunique())     # 每列唯一值数量

# 内存优化
df['category'] = df['category'].astype('category')  # 高基数字符串列
df['int_col']  = pd.to_numeric(df['int_col'], downcast='integer')
df['float_col'] = pd.to_numeric(df['float_col'], downcast='float')
print(f"内存使用: {df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")
```

### 2.2 数据清洗

```python
# 缺失值处理
df.dropna(subset=['user_id', 'amount'])          # 关键列不能缺失
df['age'].fillna(df['age'].median(), inplace=True)  # 中位数填充
df['category'].fillna('unknown', inplace=True)

# 重复值处理
df.drop_duplicates(subset=['order_id'], keep='first', inplace=True)

# 异常值处理（IQR 方法）
def remove_outliers(df, col):
    Q1, Q3 = df[col].quantile([0.25, 0.75])
    IQR = Q3 - Q1
    lower, upper = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
    return df[(df[col] >= lower) & (df[col] <= upper)]

df = remove_outliers(df, 'amount')

# 类型转换
df['date']   = pd.to_datetime(df['date'], format='%Y-%m-%d')
df['amount'] = pd.to_numeric(df['amount'].str.replace(',', ''), errors='coerce')
```

### 2.3 数据聚合

```python
# GroupBy 聚合
monthly_stats = (
    df.groupby([pd.Grouper(key='date', freq='ME'), 'category'])
    .agg(
        revenue=('amount', 'sum'),
        orders=('order_id', 'count'),
        avg_order=('amount', 'mean'),
        p90_amount=('amount', lambda x: x.quantile(0.9)),
    )
    .reset_index()
    .sort_values(['date', 'revenue'], ascending=[True, False])
)

# Pivot Table
pivot = df.pivot_table(
    values='amount',
    index='date',
    columns='category',
    aggfunc='sum',
    fill_value=0,
    margins=True,        # 添加总计行/列
    margins_name='总计'
)

# 滚动窗口（7日移动平均）
df = df.sort_values('date')
df['revenue_ma7'] = df['revenue'].rolling(window=7, min_periods=1).mean()
df['revenue_yoy'] = df['revenue'].pct_change(periods=365)  # 同比
```

---

## 三、高性能处理技巧

### 3.1 向量化代替 apply

```python
# ❌ 慢：apply 逐行处理（Python 级别循环）
df['discount'] = df.apply(
    lambda row: row['amount'] * 0.1 if row['vip'] else 0, axis=1
)  # 100万行 ~30s

# ✅ 快：向量化条件赋值
df['discount'] = np.where(df['vip'], df['amount'] * 0.1, 0)  # ~0.1s

# ✅ 快：多条件用 np.select
conditions = [
    df['amount'] > 1000,
    df['amount'] > 500,
    df['amount'] > 0,
]
choices = [df['amount'] * 0.15, df['amount'] * 0.1, df['amount'] * 0.05]
df['discount'] = np.select(conditions, choices, default=0)
```

### 3.2 大文件分块处理

```python
def process_large_csv(filepath: str, chunksize: int = 100_000):
    results = []
    for chunk in pd.read_csv(filepath, chunksize=chunksize):
        # 每块独立处理
        chunk = chunk[chunk['status'] == 'completed']
        chunk['amount'] = pd.to_numeric(chunk['amount'], errors='coerce')
        stats = chunk.groupby('category')['amount'].sum()
        results.append(stats)

    # 合并所有块的结果
    return pd.concat(results).groupby(level=0).sum()
```

### 3.3 并行处理

```python
from multiprocessing import Pool
import pandas as pd

def process_group(args):
    key, group_df = args
    # 对每个分组做计算
    return {
        'key': key,
        'total': group_df['amount'].sum(),
        'p99': group_df['amount'].quantile(0.99),
    }

def parallel_groupby(df, group_col, n_workers=4):
    groups = list(df.groupby(group_col))
    with Pool(n_workers) as pool:
        results = pool.map(process_group, groups)
    return pd.DataFrame(results)
```

---

## 四、数据导出

```python
# CSV（通用）
df.to_csv('output.csv', index=False, encoding='utf-8-sig')  # utf-8-sig 支持 Excel 中文

# Parquet（推荐：列存储，压缩比高，读写快）
df.to_parquet('output.parquet', compression='snappy', index=False)

# Excel（多 Sheet）
with pd.ExcelWriter('report.xlsx', engine='openpyxl') as writer:
    df_summary.to_excel(writer, sheet_name='汇总', index=False)
    df_detail.to_excel(writer, sheet_name='明细', index=False)

# 写入数据库
from sqlalchemy import create_engine
engine = create_engine('postgresql://user:pass@host/db')
df.to_sql('table_name', engine, if_exists='append', index=False, method='multi',
          chunksize=10000)
```

---

## 总结

Pandas 性能优化要点：
- **向量化优先**：`np.where/select` 替代 `apply`，百倍速度差
- **数据类型**：字符串列用 `category`，数值用 `downcast`，节省 50%+ 内存
- **分块读取**：超过内存的文件用 `chunksize` 参数
- **Parquet 格式**：列存储 + 压缩，比 CSV 快 10x+，文件小 5x+
- **并行分组**：CPU 密集的 groupby 用 `multiprocessing` 或 `Dask`

---

*本文作者：林墨川 | 更新时间：2024年*
