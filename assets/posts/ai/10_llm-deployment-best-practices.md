# LLM 部署最佳实践：性能优化与成本控制

> 大模型部署不是把模型跑起来就完事——推理速度、并发能力、成本控制是生产环境的三大核心挑战。

---

## 一、部署方案对比

| 方案 | 适用场景 | 延迟 | 成本 | 维护 |
|------|---------|------|------|------|
| API（OpenAI/Anthropic） | 快速接入，无 GPU | 中 | 按 Token 计费 | 无 |
| vLLM 自托管 | 高并发，成本敏感 | 低 | 固定 GPU 费 | 高 |
| Ollama 本地 | 开发测试，隐私 | 中 | 0 | 低 |
| TensorRT-LLM | 生产级，NVIDIA GPU | 极低 | 固定 | 极高 |
| AWS Bedrock / Azure OpenAI | 企业合规 | 中 | 按量计费 | 低 |

---

## 二、vLLM 高性能推理

```python
# vLLM 服务启动（OpenAI 兼容接口）
# python -m vllm.entrypoints.openai.api_server \
#   --model meta-llama/Llama-3-8B-Instruct \
#   --tensor-parallel-size 2 \     # 多 GPU 张量并行
#   --max-model-len 8192 \
#   --gpu-memory-utilization 0.9 \ # GPU 显存利用率
#   --max-num-seqs 256 \           # 最大并发请求数
#   --enable-prefix-caching        # 前缀缓存（相同系统提示复用 KV cache）

# 调用（与 OpenAI SDK 完全兼容）
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="http://localhost:8000/v1",
    api_key="not-needed"
)

async def generate(prompt: str) -> str:
    response = await client.chat.completions.create(
        model="meta-llama/Llama-3-8B-Instruct",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
        temperature=0.7,
        stream=True,
    )
    result = []
    async for chunk in response:
        if chunk.choices[0].delta.content:
            result.append(chunk.choices[0].delta.content)
    return "".join(result)
```

---

## 三、量化与模型压缩

```python
# GPTQ 量化（4-bit，显存减少 75%，速度提升 2-3x）
from transformers import AutoModelForCausalLM, AutoTokenizer
from optimum.gptq import GPTQQuantizer

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3-8B")
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3-8B")

quantizer = GPTQQuantizer(bits=4, dataset="wikitext2")
quantized_model = quantizer.quantize_model(model, tokenizer)
quantized_model.save_pretrained("./llama-3-8b-gptq-4bit")

# BitsAndBytes 动态量化（更简单，无需校准数据集）
from transformers import BitsAndBytesConfig
import torch

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
)

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3-8B-Instruct",
    quantization_config=bnb_config,
    device_map="auto",
)
```

**量化效果对比：**

| 精度 | 显存（7B 模型） | 精度损失 | 速度 |
|------|--------------|---------|------|
| FP16 | ~14GB | 无 | 1x |
| INT8 | ~7GB | 极小 | 1.5x |
| INT4 | ~4GB | 小 | 2x |
| INT2 | ~2GB | 较大 | 2.5x |

---

## 四、Prompt 缓存与成本优化

```python
import anthropic
import hashlib
from functools import lru_cache

client = anthropic.Anthropic()

# Prompt Caching（系统提示超过 1024 Token 时效果最显著）
def create_with_cache(system: str, user_message: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=[{
            "type": "text",
            "text": system,
            "cache_control": {"type": "ephemeral"}  # 缓存 5 分钟
        }],
        messages=[{"role": "user", "content": user_message}],
    )
    # 检查缓存命中（命中时 input_tokens 费用降低 90%）
    usage = response.usage
    print(f"读缓存: {usage.cache_read_input_tokens}, "
          f"写缓存: {usage.cache_creation_input_tokens}, "
          f"普通: {usage.input_tokens}")
    return response.content[0].text

# 批处理降低成本（Batch API 50% 折扣）
async def batch_process(prompts: list[str]) -> list[str]:
    batch = await client.messages.batches.create(
        requests=[{
            "custom_id": str(i),
            "params": {
                "model": "claude-haiku-4-5-20251001",  # 轻量模型降成本
                "max_tokens": 512,
                "messages": [{"role": "user", "content": p}]
            }
        } for i, p in enumerate(prompts)]
    )

    # 轮询结果（也可 Webhook 通知）
    import asyncio
    while True:
        result = await client.messages.batches.retrieve(batch.id)
        if result.processing_status == "ended":
            break
        await asyncio.sleep(30)

    results = {}
    async for item in await client.messages.batches.results(batch.id):
        results[item.custom_id] = item.result.message.content[0].text
    return [results[str(i)] for i in range(len(prompts))]
```

---

## 五、并发与限流处理

```python
import asyncio
import time
from collections import deque

class RateLimitedClient:
    """Token 桶算法限流，自动处理 429 重试"""

    def __init__(self, rpm: int = 60, tpm: int = 100_000):
        self.rpm = rpm
        self.tpm = tpm
        self.request_times = deque()
        self.semaphore = asyncio.Semaphore(10)  # 最大并发

    async def chat(self, messages: list, **kwargs) -> str:
        async with self.semaphore:
            await self._wait_for_rate_limit()
            for attempt in range(3):
                try:
                    resp = await client.messages.create(
                        messages=messages, **kwargs
                    )
                    self.request_times.append(time.time())
                    return resp.content[0].text
                except anthropic.RateLimitError:
                    wait = 2 ** attempt * 10  # 10s, 20s, 40s
                    await asyncio.sleep(wait)
            raise RuntimeError("超过最大重试次数")

    async def _wait_for_rate_limit(self):
        now = time.time()
        # 清理 60 秒前的记录
        while self.request_times and now - self.request_times[0] > 60:
            self.request_times.popleft()
        # 超过 RPM 限制则等待
        if len(self.request_times) >= self.rpm:
            wait = 60 - (now - self.request_times[0])
            if wait > 0:
                await asyncio.sleep(wait)
```

---

## 总结

LLM 部署核心策略：
- **选对模型**：简单任务用 Haiku/GPT-4o-mini，复杂任务用 Opus/GPT-4o
- **Prompt Caching**：固定系统提示超过 1024 Token 时，开启缓存省 90%
- **Batch API**：非实时任务批量处理，省 50%
- **量化部署**：自托管用 INT4 量化，显存减 75%，速度翻倍
- **流式输出**：`stream=True` 减少首字节延迟，改善用户体验
- **成本监控**：按 Model × Token 类型设置告警，防止超支

---

*本文作者：林墨川 | 更新时间：2024年*
