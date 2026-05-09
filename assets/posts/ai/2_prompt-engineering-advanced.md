# Prompt Engineering 进阶：思维链与结构化输出

## 概述

在大模型应用实践中，Prompt Engineering 是提升效果的关键技能。本文介绍两种高级技巧：Chain of Thought（思维链）推理和 Structured Output（结构化输出），帮助开发者构建更可靠、更精确的 AI 应用。

## Chain of Thought 思维链

### 基本原理

通过引导模型"展示思考过程"，显著提升复杂推理任务的准确率：

```python
# 普通 Prompt
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "一个商店有 15 个苹果，吃了 8 个，又买了 22 个，现在有多少个？"}
    ]
)

# CoT Prompt
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": """一个商店有 15 个苹果，吃了 8 个，又买了 22 个，现在有多少个？

请按以下步骤思考：
1. 初始苹果数量
2. 吃掉后的数量
3. 买入后的最终数量"""}
    ]
)
```

### Zero-Shot CoT

无需示例，直接通过特定指令触发思维链：

```
请先思考这个问题（Think step by step），然后给出答案。
```

### Few-Shot CoT

提供多个推理示例：

```python
examples = [
    {
        "question": "小明有 5 块钱，买了 2 块钱的橡皮，剩下多少钱？",
        "reasoning": "初始: 5元 → 消费: 2元 → 剩余: 5-2=3元",
        "answer": "3 块钱"
    },
    {
        "question": "小红有 3 个球，又买了 4 盒，每盒 2 个球，一共多少个？",
        "reasoning": "原有: 3个 → 新买: 4×2=8个 → 总计: 3+8=11个",
        "answer": "11 个球"
    }
]
```

## Structured Output 结构化输出

### JSON Mode

强制模型输出符合特定 JSON Schema：

```python
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": """你是一个电影信息提取助手。
必须返回有效的 JSON，格式如下：
{
    "title": "电影名称",
    "year": 发行年份,
    "rating": 评分,
    "genres": ["类型1", "类型2"],
    "director": "导演姓名"
}"""},
        {"role": "user", "content": "介绍一下《肖申克的救赎》这部电影"}
    ]
)
```

### Function Calling

使用 Function Calling 确保输出结构化：

```python
functions = [
    {
        "name": "extract_movie_info",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "year": {"type": "integer"},
                "rating": {"type": "number"},
                "genres": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["title", "year", "rating"]
        }
    }
]

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "《盗梦空间》的信息"}],
    functions=functions,
    function_call={"name": "extract_movie_info"}
)
```

## 高级组合技巧

### CoT + Structured Output

```python
system_prompt = """你是一个数学解题助手。解题时必须：
1. 先写出解题思路（step_by_step）
2. 再给出最终答案（answer）
3. 最终答案必须是可以直接使用的数值

返回格式：
{
    "thinking": "解题思路...",
    "answer": 42
}"""
```

## 最佳实践

1. **保持指令简洁**：避免过多约束干扰模型理解
2. **使用明确格式**：清晰的格式指引减少解析错误
3. **分离思考与答案**：让模型先推理再回答
4. **错误处理**：添加 fallback 机制处理异常输出
5. **迭代优化**：根据实际输出持续调整 Prompt

## 总结

思维链推理提升复杂任务的准确率，结构化输出确保结果可解析。两者结合使用，可以构建出生产级别可靠的 AI 应用系统。
