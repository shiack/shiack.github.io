# RAG 技术实现：检索增强生成实战

> RAG（Retrieval-Augmented Generation）通过在生成前检索相关文档，有效解决 LLM 知识截止和幻觉问题，是企业级 AI 应用的标准架构。

---

## 一、RAG 核心架构

```
┌─────────────────────────────────────────────────────────┐
│                      RAG Pipeline                        │
│                                                          │
│  离线索引阶段：                                           │
│  文档 → 分块(Chunking) → 嵌入(Embedding) → 向量库        │
│                                                          │
│  在线查询阶段：                                           │
│  问题 → 嵌入 → 检索(Retrieve) → 重排序(Rerank)           │
│       → 增强提示(Augment) → LLM → 答案                   │
└─────────────────────────────────────────────────────────┘
```

### 1.1 基础 RAG 流程

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA

# 1. 加载和分块文档
splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", "。", " ", ""]
)
docs = splitter.split_documents(raw_docs)

# 2. 创建向量索引
vectorstore = Chroma.from_documents(
    docs,
    embedding=OpenAIEmbeddings(model="text-embedding-3-small")
)

# 3. 构建 QA 链
qa = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4o-mini"),
    retriever=vectorstore.as_retriever(search_kwargs={"k": 4}),
    return_source_documents=True
)

result = qa.invoke({"query": "什么是 RAG？"})
print(result["result"])
```

---

## 二、分块策略

### 2.1 固定大小分块

```python
# 适合结构均匀的文本
from langchain.text_splitter import CharacterTextSplitter

splitter = CharacterTextSplitter(
    separator="\n",
    chunk_size=1000,
    chunk_overlap=200
)
```

### 2.2 递归语义分块（推荐）

```python
# 按段落→句子→词语逐级拆分，保留语义完整性
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
    separators=["\n\n", "\n", "。", "！", "？", " ", ""]
)
```

### 2.3 基于文档结构分块

```python
# Markdown 文档按标题层级拆分
from langchain.text_splitter import MarkdownHeaderTextSplitter

headers = [("#", "H1"), ("##", "H2"), ("###", "H3")]
splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers)
splits = splitter.split_text(markdown_content)
# 每个 chunk 携带标题元数据，便于来源追踪
```

### 2.4 分块策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 固定大小 | 实现简单 | 可能截断语义单元 | 非结构化纯文本 |
| 递归语义 | 保留语义完整性 | 块大小不均匀 | 通用文档（推荐） |
| 文档结构 | 保留层次信息 | 依赖文档格式 | Markdown/HTML |
| 语义分块 | 按语义边界切分 | 计算开销大 | 高质量知识库 |

---

## 三、Embedding 模型选择

```python
# OpenAI text-embedding-3-small（性价比优）
from langchain_openai import OpenAIEmbeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# BGE-M3（开源多语言，中文表现优秀）
from langchain_community.embeddings import HuggingFaceEmbeddings
embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)
```

| 模型 | 维度 | 中文支持 | 费用 |
|------|------|----------|------|
| text-embedding-3-small | 1536 | 好 | $0.02/1M tokens |
| text-embedding-3-large | 3072 | 好 | $0.13/1M tokens |
| BAAI/bge-m3 | 1024 | 优秀 | 免费（本地） |
| moka-ai/m3e-base | 768 | 优秀 | 免费（本地） |

---

## 四、混合检索与重排序

### 4.1 混合检索（Hybrid Search）

```python
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever

# 关键词检索（BM25）
bm25_retriever = BM25Retriever.from_documents(docs)
bm25_retriever.k = 4

# 向量检索
vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

# 融合检索（Reciprocal Rank Fusion）
ensemble = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.4, 0.6]  # 关键词权重 : 语义权重
)
```

### 4.2 重排序（Reranking）

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain_cohere import CohereRerank

# 先召回较多候选，再用 cross-encoder 精排
compressor = CohereRerank(top_n=3)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=ensemble
)
```

---

## 五、评估与优化

### 5.1 RAG 评估指标

```python
# 使用 RAGAS 框架评估
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_recall

dataset = {
    "question": questions,
    "answer": answers,
    "contexts": retrieved_contexts,
    "ground_truth": ground_truths,
}

result = evaluate(dataset, metrics=[
    faithfulness,      # 答案与文档是否一致（幻觉检测）
    answer_relevancy,  # 答案与问题的相关性
    context_recall,    # 文档是否覆盖了正确答案
])
print(result)
```

### 5.2 常见问题与优化

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 召回不准确 | Embedding 模型不适配 | 换 BGE-M3 / 微调 |
| 答案幻觉 | 无关文档噪声 | 加 Reranker，提高相关性阈值 |
| 答案截断 | Chunk 太小 | 增大 chunk_size，加 overlap |
| 跨文档推理差 | 单 chunk 信息不足 | Parent-child chunk 策略 |

---

## 总结

构建高质量 RAG 系统的关键路径：
1. 选择适合领域的 **Embedding 模型**（中文优先 BGE-M3）
2. 根据文档特征选择 **分块策略**（通用推荐 RecursiveCharacterTextSplitter）
3. 使用 **混合检索** 兼顾精确匹配和语义相关
4. 引入 **Reranker** 提升最终精度
5. 用 **RAGAS** 持续评估，形成迭代闭环

---

*本文作者：林墨川 | 更新时间：2024年*
