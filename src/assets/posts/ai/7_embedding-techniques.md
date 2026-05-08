# Embedding 技术详解：从 BERT 到 Sentence-BERT

> Embedding 将文本转换为稠密向量，是语义搜索、RAG、推荐系统的基础，理解其原理才能选对模型。

---

## 一、词向量演进

```
Word2Vec (2013)   → 静态词向量，上下文无关
                    "bank" 永远是同一个向量
       ↓
BERT (2018)       → 动态上下文向量
                    "bank" 在金融/河岸语境中向量不同
       ↓
Sentence-BERT     → 句子级语义向量（双塔模型）
(2019)              适合相似度计算，速度快
       ↓
BGE-M3 (2024)     → 多语言多粒度，支持中文
```

---

## 二、BERT 原理

### 2.1 Transformer 架构

```
输入: "我 爱 北 京"
       ↓
  Token Embedding + Position Embedding + Segment Embedding
       ↓
  12层 Transformer (Self-Attention + FFN)
       ↓
  每个 token 的上下文向量 (768维)
  [CLS] "我" "爱" "北" "京" [SEP]
    ↑
  [CLS] 向量用于分类任务
```

### 2.2 为什么不直接用 BERT 做相似度

```python
from transformers import AutoTokenizer, AutoModel
import torch

tokenizer = AutoTokenizer.from_pretrained("bert-base-chinese")
model = AutoModel.from_pretrained("bert-base-chinese")

def get_bert_embedding(text):
    inputs = tokenizer(text, return_tensors="pt", max_length=512, truncation=True)
    with torch.no_grad():
        outputs = model(**inputs)
    # 取 [CLS] token 的输出
    return outputs.last_hidden_state[:, 0, :].squeeze().numpy()

# 问题：BERT 的 [CLS] 向量未针对语义相似度优化
# 随机句对的余弦相似度接近 1，区分度差
```

---

## 三、Sentence-BERT（SBERT）

### 3.1 双塔模型（Bi-Encoder）

```
Sentence A ──► BERT ──► Mean Pooling ──► 向量 A ──┐
                                                    ├──► 余弦相似度
Sentence B ──► BERT ──► Mean Pooling ──► 向量 B ──┘

训练目标：正例对向量相似，负例对向量远离
```

```python
from sentence_transformers import SentenceTransformer, util

# 加载 SBERT 模型（中文推荐 paraphrase-multilingual-MiniLM）
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

sentences = [
    "苹果发布了新款手机",
    "Apple 推出新 iPhone",
    "今天天气真好",
]

# 批量编码（GPU 加速）
embeddings = model.encode(sentences, batch_size=32, show_progress_bar=True)

# 相似度矩阵
cos_sim = util.cos_sim(embeddings, embeddings)
print(cos_sim)
# tensor([[1.00, 0.87, 0.12],
#         [0.87, 1.00, 0.09],
#         [0.12, 0.09, 1.00]])
```

### 3.2 Cross-Encoder（精排）

```python
from sentence_transformers import CrossEncoder

# Cross-Encoder：同时输入两个句子，精度高但慢
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

# 用于 RAG 重排序：先 Bi-Encoder 召回 100 个，再 Cross-Encoder 精排取 top-5
query = "什么是 attention 机制"
candidates = [...100个候选文档...]

scores = reranker.predict([[query, doc] for doc in candidates])
top_docs = [candidates[i] for i in scores.argsort()[-5:][::-1]]
```

---

## 四、中文模型推荐

| 模型 | 维度 | 语言 | 特点 | 适用 |
|------|------|------|------|------|
| BGE-M3 | 1024 | 多语言 | 最强中文，支持多粒度 | 生产首选 |
| m3e-base | 768 | 中文 | 开源，中文效果好 | 中小规模 |
| text-embedding-3-small | 1536 | 多语言 | OpenAI API，性价比高 | 快速接入 |
| bge-large-zh-v1.5 | 1024 | 中文 | BAAI，精度高 | 精度优先 |

```python
# BGE-M3 使用示例
from FlagEmbedding import BGEM3FlagModel

model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)

embeddings = model.encode(
    ["什么是 RAG？", "Retrieval-Augmented Generation 介绍"],
    batch_size=12,
    max_length=8192,    # 支持长文档
    return_dense=True,  # 稠密向量
    return_sparse=True, # 稀疏向量（适合关键词检索）
    return_colbert_vecs=True  # ColBERT 向量（精排）
)
```

---

## 五、Matryoshka 表示学习

```python
# 新一代 Embedding：支持截断维度（越长越精确）
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("nomic-ai/nomic-embed-text-v1.5",
                            trust_remote_code=True)

# 全精度（1024维）
embeddings_full = model.encode(texts, normalize_embeddings=True)

# 截断到 256 维（速度快 4x，精度略降）
embeddings_small = model.encode(texts, normalize_embeddings=True)[:, :256]

# 适合分层检索：先用低维快速召回，再用高维重排序
```

---

## 总结

- **BERT** 适合分类/NER，不适合直接做相似度
- **Sentence-BERT（Bi-Encoder）** 是语义搜索的标准方案
- **Cross-Encoder** 精度更高，用于重排序而非大规模检索
- **中文首选 BGE-M3**（BAAI 出品，多语言多粒度，开源免费）
- 选维度时：存储 > 精度 → 低维；精度优先 → 高维

---

*本文作者：林墨川 | 更新时间：2024年*
