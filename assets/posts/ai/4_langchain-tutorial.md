# LangChain 实战：构建 LLM 应用程序

> LangChain 提供了构建 LLM 应用的完整工具链，从提示模板到智能代理，LCEL 让链式组合变得极为简洁。

---

## 一、LangChain 核心组件

```
┌─────────────────────────────────────────────────┐
│                   LCEL 管道                       │
│                                                   │
│  prompt | model | output_parser                  │
│    ↓         ↓          ↓                        │
│  格式化    调用 LLM    解析输出                    │
└─────────────────────────────────────────────────┘
```

### 1.1 LCEL 基础

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 定义组件
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个专业的技术顾问，用中文简洁回答。"),
    ("human", "{question}")
])
model  = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = StrOutputParser()

# 用 | 组合成链（LCEL）
chain = prompt | model | parser

# 调用
result = chain.invoke({"question": "什么是微服务架构？"})
print(result)

# 流式输出
for chunk in chain.stream({"question": "解释 Docker 和 K8s 的区别"}):
    print(chunk, end="", flush=True)
```

---

## 二、Prompt Template

### 2.1 动态提示模板

```python
from langchain_core.prompts import PromptTemplate, FewShotPromptTemplate

# 基础模板
template = PromptTemplate.from_template(
    "将以下 {source_lang} 代码翻译为 {target_lang}:\n{code}"
)

# Few-shot 模板（给出示例）
examples = [
    {"input": "Hello", "output": "你好"},
    {"input": "World", "output": "世界"},
]
example_prompt = PromptTemplate.from_template("输入: {input}\n输出: {output}")

few_shot = FewShotPromptTemplate(
    examples=examples,
    example_prompt=example_prompt,
    prefix="翻译以下单词：",
    suffix="输入: {word}\n输出:",
    input_variables=["word"]
)
```

### 2.2 结构化输出

```python
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.pydantic_v1 import BaseModel, Field

class CodeReview(BaseModel):
    score: int = Field(description="代码质量评分 1-10")
    issues: list[str] = Field(description="发现的问题列表")
    suggestions: list[str] = Field(description="改进建议列表")

parser = JsonOutputParser(pydantic_object=CodeReview)

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是代码审查专家。{format_instructions}"),
    ("human", "审查以下代码：\n{code}")
]).partial(format_instructions=parser.get_format_instructions())

chain = prompt | ChatOpenAI() | parser
review = chain.invoke({"code": "def add(a, b): return a+b"})
print(review.score, review.issues)
```

---

## 三、记忆（Memory）

### 3.1 对话历史记忆

```python
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# 存储会话历史
store = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个有帮助的助手。"),
    MessagesPlaceholder("history"),    # 历史消息占位
    ("human", "{input}")
])

chain = prompt | ChatOpenAI()

with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history"
)

# 同一 session_id 保持上下文
config = {"configurable": {"session_id": "user-123"}}
with_history.invoke({"input": "我叫小明"}, config=config)
with_history.invoke({"input": "我叫什么名字？"}, config=config)  # 能记住
```

---

## 四、RAG 链

```python
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.runnables import RunnablePassthrough

vectorstore = Chroma(embedding_function=OpenAIEmbeddings())
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

def format_docs(docs):
    return "\n\n".join(d.page_content for d in docs)

rag_prompt = ChatPromptTemplate.from_template("""
根据以下上下文回答问题，如果不知道就说不知道。

上下文：
{context}

问题：{question}
""")

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt
    | ChatOpenAI()
    | StrOutputParser()
)

answer = rag_chain.invoke("什么是 RAG？")
```

---

## 五、工具调用与 Agent

```python
from langchain_core.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor

@tool
def search_docs(query: str) -> str:
    """搜索技术文档库"""
    return vectorstore.similarity_search(query, k=2)[0].page_content

@tool
def execute_code(code: str) -> str:
    """执行 Python 代码并返回结果"""
    import subprocess
    result = subprocess.run(["python3", "-c", code],
                          capture_output=True, text=True, timeout=10)
    return result.stdout or result.stderr

tools = [search_docs, execute_code]

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个能搜索文档和执行代码的助手。"),
    ("human", "{input}"),
    MessagesPlaceholder("agent_scratchpad")  # Agent 思考过程
])

agent = create_tool_calling_agent(
    llm=ChatOpenAI(model="gpt-4o"),
    tools=tools,
    prompt=prompt
)

executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
result = executor.invoke({"input": "搜索 RAG 相关文档并总结"})
```

---

## 总结

LangChain 最佳实践：
- 用 **LCEL**（`|` 管道）组合组件，代替旧版 `LLMChain`
- 结构化输出用 **Pydantic + JsonOutputParser**，避免手动解析
- 对话应用用 `RunnableWithMessageHistory` 管理多用户会话
- Agent 工具函数保持**幂等**，添加超时防止阻塞

---

*本文作者：林墨川 | 更新时间：2024年*
