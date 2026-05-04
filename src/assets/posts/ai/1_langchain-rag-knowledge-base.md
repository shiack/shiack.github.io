# LangChain 与 RAG：构建企业级知识库问答系统

## 概述

Retrieval Augmented Generation (RAG) 结合 LangChain 框架，已成为构建企业级知识库问答系统的标准方案。本文详细介绍如何从零构建一个支持私有知识库的智能问答系统。

## 核心架构

```
用户问题 → 向量化检索 → 上下文增强 → LLM 生成 → 返回答案
     ↓
文档切片 → 向量存储 → 相似度匹配 → 文档召回
```

## 文档处理流程

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import PDFPlumberLoader

# 加载文档
loader = PDFPlumberLoader("knowledge_base.pdf")
documents = loader.load()

# 文档切片
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", "。", "！"]
)
chunks = text_splitter.split_documents(documents)
```

## 向量存储与检索

```python
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings

# 创建向量存储
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="vector_store"
)

# 检索相关文档
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)
```

## RAG 链式调用

```python
from langchain.chains import RetrievalQA
from langchain.chat_models import ChatOpenAI

llm = ChatOpenAI(model="gpt-4", temperature=0)
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever
)

# 问答
result = qa_chain({"query": "公司的年假政策是什么？"})
print(result["result"])
```

## 高级优化策略

### 1. 混合检索

结合稀疏检索（BM25）和稠密检索（向量相似度）：

```python
from langchain.retrievers import EnsembleRetriever

ensemble_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, vectorstore.as_retriever()],
    weights=[0.3, 0.7]
)
```

### 2. 重排序

使用 Cross-Encoder 对召回结果进行重排序：

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain.document_compressors import CohereRerank

compressor = CohereRerank(model="rerank-multilingual-v2.0")
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=retriever
)
```

## 部署建议

- 使用 Docker 容器化部署
- 配置 GPU 加速向量推理
- 实现缓存机制减少 API 调用
- 添加访问控制和审计日志

## 总结

RAG + LangChain 方案成熟度高，适用于大多数企业知识库场景。通过混合检索、重排序等优化策略，可以显著提升问答准确率。
