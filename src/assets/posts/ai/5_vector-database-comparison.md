# 向量数据库对比：Pinecone vs Weaviate vs Milvus

> 向量数据库是 RAG 和语义搜索的基础设施，不同产品在托管方式、性能、功能上差异显著，选型需结合团队规模和数据量。

---

## 一、向量相似度基础

```python
import numpy as np

# 三种距离度量
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def euclidean_distance(a, b):
    return np.linalg.norm(a - b)

def dot_product(a, b):
    return np.dot(a, b)

v1 = np.array([0.2, 0.8, 0.5])
v2 = np.array([0.1, 0.9, 0.4])
print(f"余弦相似度: {cosine_similarity(v1, v2):.4f}")  # 接近1表示相似
```

| 度量 | 公式 | 适用场景 |
|------|------|----------|
| 余弦相似度 | cos(θ) | 文本语义（忽略量级，只看方向） |
| 欧氏距离 | √Σ(a-b)² | 图像特征（量级有意义） |
| 点积 | Σ(a×b) | 归一化向量（推荐系统） |

---

## 二、索引算法

### 2.1 HNSW（推荐）

```
可导航小世界图（Hierarchical NSW）：
层0（底层）: 所有节点，短程连接
层1:        采样节点，中程连接
层2（顶层）: 少量节点，长程连接

查询：从顶层入口快速定位区域，逐层细化到底层
性能：O(log n) 查询，内存占用高
```

### 2.2 IVF（倒排文件索引）

适合超大规模数据集，将向量空间分成 `nlist` 个聚类，查询时只搜索最近的 `nprobe` 个聚类。

---

## 三、主流向量数据库详解

### 3.1 Chroma（本地/小规模，快速上手）

```python
import chromadb
from chromadb.utils import embedding_functions

client = chromadb.PersistentClient(path="./chroma_db")
ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key="sk-...", model_name="text-embedding-3-small"
)

collection = client.get_or_create_collection("docs", embedding_function=ef)

# 插入
collection.add(
    documents=["Rust 是系统编程语言", "Python 适合数据科学"],
    metadatas=[{"category": "backend"}, {"category": "ai"}],
    ids=["doc1", "doc2"]
)

# 查询
results = collection.query(query_texts=["性能最好的语言"], n_results=2)
print(results['documents'])
```

### 3.2 Qdrant（开源自托管，生产级）

```python
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

client = QdrantClient(url="http://localhost:6333")

# 创建集合
client.create_collection(
    collection_name="articles",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
)

# 批量插入
client.upsert(
    collection_name="articles",
    points=[
        PointStruct(id=1, vector=[0.1]*1536, payload={"title": "RAG 入门", "date": "2024-01"}),
        PointStruct(id=2, vector=[0.2]*1536, payload={"title": "LLM 调优", "date": "2024-02"}),
    ]
)

# 带过滤条件的查询
from qdrant_client.models import Filter, FieldCondition, MatchValue

results = client.search(
    collection_name="articles",
    query_vector=[0.15]*1536,
    query_filter=Filter(must=[FieldCondition(key="date", match=MatchValue(value="2024-01"))]),
    limit=5,
    with_payload=True,
)
```

### 3.3 Milvus（大规模，支持万亿向量）

```python
from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType

connections.connect("default", host="localhost", port="19530")

fields = [
    FieldSchema(name="id",      dtype=DataType.INT64, is_primary=True),
    FieldSchema(name="vector",  dtype=DataType.FLOAT_VECTOR, dim=1536),
    FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=2000),
]
schema = CollectionSchema(fields, "文章向量库")
collection = Collection("articles", schema)

# 创建 HNSW 索引
collection.create_index("vector", {
    "index_type": "HNSW",
    "metric_type": "COSINE",
    "params": {"M": 16, "efConstruction": 200}
})

# 查询
collection.load()
results = collection.search(
    data=[[0.1]*1536],
    anns_field="vector",
    param={"metric_type": "COSINE", "params": {"ef": 64}},
    limit=10,
    output_fields=["content"]
)
```

---

## 四、全面对比

| 特性 | Chroma | Qdrant | Milvus | Pinecone | Weaviate |
|------|--------|--------|--------|----------|----------|
| 部署方式 | 本地/Docker | Docker/云 | Docker/K8s | SaaS | Docker/SaaS |
| 向量规模 | <100万 | <1亿 | <万亿 | 中等 | 中等 |
| 混合检索 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 多向量 | ❌ | ✅ | ✅ | ✅ | ✅ |
| Python SDK | ✅ | ✅ | ✅ | ✅ | ✅ |
| 开源 | ✅ | ✅ | ✅ | ❌ | ✅ |
| 适合场景 | 开发/原型 | 中小规模生产 | 大规模生产 | 快速上线 | 知识图谱 |

---

## 五、选型建议

```
数据量 < 100万 向量，开发阶段？
  └── Chroma（最简单，pip install 即用）

需要生产部署，数据量 100万-1亿？
  └── Qdrant（性能好，运维简单）

超大规模（>1亿），需要分布式？
  └── Milvus（最强水平扩展能力）

不想维护基础设施？
  └── Pinecone（全托管，按量付费）
```

---

## 总结

向量数据库选型三要素：**数据规模、运维能力、功能需求**。对于大多数 RAG 应用，Qdrant 是性价比最高的开源选择；快速验证 Proof of Concept 用 Chroma；超大规模生产用 Milvus。

---

*本文作者：林墨川 | 更新时间：2024年*
