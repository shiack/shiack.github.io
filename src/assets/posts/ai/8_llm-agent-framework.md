# LLM Agent 框架：构建智能代理系统

> Agent 让 LLM 从"问答机器"升级为"自主执行者"——通过工具调用、规划和记忆，完成复杂多步骤任务。

---

## 一、Agent 核心架构

```
                    ┌─────────────────────────────┐
                    │           Agent              │
                    │                              │
  用户输入 ─────────►│  Planning (ReAct/CoT)        │
                    │      ↕                       │
                    │  Memory (短期/长期)            │
                    │      ↕                       │
                    │  Tool Use (函数调用)           │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────────┐
              ▼                ▼                    ▼
        Web Search         Code Exec           Database
        Calculator         File I/O            Email
```

**ReAct 循环：**

```
Thought: 需要查询今天的股价
Action: search_stock({"symbol": "AAPL"})
Observation: AAPL 当前价格 $182.50，涨幅 +1.2%
Thought: 已获取数据，计算用户持仓市值
Action: calculate({"price": 182.50, "quantity": 100})
Observation: 市值 $18,250
Answer: 您的 AAPL 持仓当前市值为 $18,250
```

---

## 二、工具调用（Function Calling）

```python
import anthropic
import json

client = anthropic.Anthropic()

# 定义工具
tools = [
    {
        "name": "search_web",
        "description": "搜索互联网获取实时信息",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜索关键词"},
                "num_results": {"type": "integer", "default": 5}
            },
            "required": ["query"]
        }
    },
    {
        "name": "execute_python",
        "description": "执行 Python 代码并返回结果",
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Python 代码字符串"}
            },
            "required": ["code"]
        }
    }
]

def run_tool(tool_name: str, tool_input: dict) -> str:
    if tool_name == "search_web":
        # 实际实现连接搜索 API
        return f"搜索结果: {tool_input['query']} 的相关信息..."
    elif tool_name == "execute_python":
        import io, contextlib
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exec(tool_input['code'], {})
        return output.getvalue()

def agent_loop(user_message: str, max_iterations: int = 10) -> str:
    messages = [{"role": "user", "content": user_message}]

    for _ in range(max_iterations):
        response = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=4096,
            tools=tools,
            messages=messages,
        )

        # 无工具调用 → 完成
        if response.stop_reason == "end_turn":
            return response.content[0].text

        # 处理工具调用
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = run_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        # 将工具结果加入对话
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user",      "content": tool_results})

    return "达到最大迭代次数"
```

---

## 三、记忆系统

```python
from dataclasses import dataclass, field
from typing import Any
import json

@dataclass
class AgentMemory:
    # 短期记忆：当前对话历史
    conversation: list = field(default_factory=list)
    # 工作记忆：当前任务的中间结果
    working: dict = field(default_factory=dict)
    # 长期记忆：向量数据库存储（此处用列表模拟）
    long_term: list = field(default_factory=list)

    def add_message(self, role: str, content: Any):
        self.working['last_action'] = content if role == 'assistant' else None
        self.conversation.append({"role": role, "content": content})
        # 超过 20 轮自动摘要压缩（生产中用 LLM 摘要）
        if len(self.conversation) > 40:
            self.compress_history()

    def compress_history(self):
        kept = self.conversation[-20:]
        summary = f"[历史摘要: {len(self.conversation)-20} 条消息已压缩]"
        self.long_term.append(summary)
        self.conversation = [{"role": "system", "content": summary}] + kept

    def get_context(self) -> list:
        context = []
        # 注入长期记忆
        if self.long_term:
            context.append({
                "role": "user",
                "content": f"背景信息: {'; '.join(self.long_term[-3:])}"
            })
            context.append({"role": "assistant", "content": "已了解背景。"})
        return context + self.conversation
```

---

## 四、多 Agent 协作

```python
from enum import Enum

class AgentRole(Enum):
    PLANNER   = "planner"    # 拆解任务
    RESEARCHER = "researcher" # 信息检索
    CODER     = "coder"      # 代码实现
    REVIEWER  = "reviewer"   # 质量检查

class MultiAgentOrchestrator:
    def __init__(self):
        self.agents = {role: SpecializedAgent(role) for role in AgentRole}

    def execute(self, task: str) -> str:
        # 1. Planner 拆解任务
        plan = self.agents[AgentRole.PLANNER].run(
            f"将以下任务拆解为步骤: {task}"
        )

        # 2. 根据步骤分配给专业 Agent
        results = []
        for step in self._parse_steps(plan):
            if "搜索" in step or "查询" in step:
                result = self.agents[AgentRole.RESEARCHER].run(step)
            elif "代码" in step or "实现" in step:
                result = self.agents[AgentRole.CODER].run(step)
            else:
                result = self.agents[AgentRole.PLANNER].run(step)
            results.append(result)

        # 3. Reviewer 整合和审核
        final = self.agents[AgentRole.REVIEWER].run(
            f"整合以下结果并给出最终答案:\n" + "\n".join(results)
        )
        return final
```

---

## 五、评估与可观测性

```python
import time
from dataclasses import dataclass

@dataclass
class AgentTrace:
    task: str
    iterations: int = 0
    tool_calls: list = None
    total_tokens: int = 0
    latency_ms: float = 0
    success: bool = False
    error: str = None

    def __post_init__(self):
        self.tool_calls = []

def traced_agent(task: str) -> tuple[str, AgentTrace]:
    trace = AgentTrace(task=task)
    start = time.time()

    try:
        result = agent_loop(task)
        trace.success = True
        return result, trace
    except Exception as e:
        trace.error = str(e)
        raise
    finally:
        trace.latency_ms = (time.time() - start) * 1000
        # 上报到监控系统
        metrics.record(trace)
```

---

## 总结

LLM Agent 关键设计点：
- **ReAct 循环**：Thought → Action → Observation 迭代直到完成
- **工具设计**：描述清晰、输入有 JSON Schema、输出结构化
- **记忆压缩**：超过上下文限制时自动摘要，保留关键信息
- **错误恢复**：工具执行失败时让 Agent 自动重试或换策略
- **多 Agent**：Planner/Researcher/Coder/Reviewer 分工，避免单 Agent 能力瓶颈

---

*本文作者：林墨川 | 更新时间：2024年*
