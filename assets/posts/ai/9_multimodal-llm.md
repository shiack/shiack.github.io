# 多模态大模型：文本与图像的融合

> 多模态模型让 AI 能同时理解图像与文字，从看图说话到医学影像分析，开辟了全新的应用场景。

---

## 一、多模态架构演进

```
早期 (CLIP, 2021):
  文本编码器 ──► 文本向量 ──┐
                            ├── 对比学习（拉近相似，推远不相似）
  图像编码器 ──► 图像向量 ──┘

GPT-4V / Claude 3 (2023-2024):
  图像 ──► Vision Encoder (ViT) ──► 图像 Token
  文本 ──► Tokenizer           ──► 文本 Token
                                        │
                              统一 Transformer 处理
                                        │
                              自回归生成文本输出
```

**主流多模态模型：**

| 模型 | 厂商 | 特点 |
|------|------|------|
| GPT-4o | OpenAI | 原生多模态，支持图像/音频/视频 |
| Claude 3.5 Sonnet | Anthropic | 图像理解强，文档/图表分析 |
| Gemini 1.5 Pro | Google | 超长上下文（100万 Token），支持视频 |
| LLaVA-Next | 开源 | 轻量，可本地部署 |
| Qwen-VL | 阿里 | 中文多模态最强，支持高分辨率 |

---

## 二、调用图像理解 API

```python
import anthropic
import base64
from pathlib import Path

client = anthropic.Anthropic()

def analyze_image_from_file(image_path: str, question: str) -> str:
    image_data = base64.standard_b64encode(
        Path(image_path).read_bytes()
    ).decode("utf-8")

    ext = Path(image_path).suffix.lower()
    media_type_map = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png',  '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    media_type = media_type_map.get(ext, 'image/jpeg')

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_data,
                    },
                },
                {
                    "type": "text",
                    "text": question
                }
            ],
        }]
    )
    return message.content[0].text

# 使用示例
result = analyze_image_from_file(
    "chart.png",
    "请分析这张图表，提取关键数据点并总结趋势"
)
print(result)
```

---

## 三、实际应用场景

### 3.1 文档智能解析

```python
def extract_table_from_image(image_path: str) -> list[dict]:
    """从截图/扫描件中提取表格数据"""
    prompt = """
    请从图片中提取表格数据，以 JSON 格式返回：
    {
      "headers": ["列1", "列2", ...],
      "rows": [
        {"列1": "值", "列2": "值"},
        ...
      ]
    }
    只返回 JSON，不要其他文字。
    """

    response = analyze_image_from_file(image_path, prompt)
    import json
    return json.loads(response)

def analyze_receipt(image_path: str) -> dict:
    """发票/收据 OCR + 结构化提取"""
    prompt = """
    分析这张发票/收据，提取以下信息（JSON 格式）：
    - vendor: 商家名称
    - date: 日期 (YYYY-MM-DD)
    - total: 总金额 (数字)
    - currency: 货币（CNY/USD）
    - items: [{name, quantity, unit_price, amount}]
    """
    response = analyze_image_from_file(image_path, prompt)
    return json.loads(response)
```

### 3.2 批量图像处理

```python
import asyncio
import anthropic
from pathlib import Path

async def process_images_batch(image_dir: str, task: str) -> list[dict]:
    """并发处理目录下所有图片"""
    client = anthropic.AsyncAnthropic()
    images = list(Path(image_dir).glob("*.{png,jpg,jpeg,webp}"))

    async def process_one(path: Path) -> dict:
        data = base64.standard_b64encode(path.read_bytes()).decode()
        resp = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64",
                     "media_type": "image/jpeg", "data": data}},
                    {"type": "text", "text": task}
                ]
            }]
        )
        return {"file": path.name, "result": resp.content[0].text}

    # 限制并发（避免触发 API 限流）
    semaphore = asyncio.Semaphore(5)
    async def bounded_process(path):
        async with semaphore:
            return await process_one(path)

    results = await asyncio.gather(*[bounded_process(p) for p in images])
    return results
```

---

## 四、本地部署（LLaVA）

```python
from transformers import LlavaNextProcessor, LlavaNextForConditionalGeneration
from PIL import Image
import torch

# 加载模型（需要 ~8GB 显存）
processor = LlavaNextProcessor.from_pretrained("llava-hf/llava-v1.6-mistral-7b-hf")
model = LlavaNextForConditionalGeneration.from_pretrained(
    "llava-hf/llava-v1.6-mistral-7b-hf",
    torch_dtype=torch.float16,
    device_map="auto",
    load_in_4bit=True,         # 量化，降低显存需求
)

def local_image_qa(image_path: str, question: str) -> str:
    image = Image.open(image_path)
    conversation = [{
        "role": "user",
        "content": [
            {"type": "image"},
            {"type": "text", "text": question},
        ],
    }]

    prompt = processor.apply_chat_template(conversation, add_generation_prompt=True)
    inputs = processor(images=image, text=prompt, return_tensors="pt").to("cuda")

    output = model.generate(**inputs, max_new_tokens=512)
    return processor.decode(output[0], skip_special_tokens=True)
```

---

## 五、提示工程技巧

```python
# 1. 结构化输出：明确指定格式
system_prompt = """
你是专业的图像分析助手。
- 回答要简洁、结构化
- 数字数据请精确提取
- 不确定时标注"不确定"而非猜测
- 输出格式：严格遵循用户指定的 JSON Schema
"""

# 2. 多图对比分析
def compare_images(img1_path: str, img2_path: str, aspect: str) -> str:
    def to_base64(path):
        return base64.standard_b64encode(Path(path).read_bytes()).decode()

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64",
                 "media_type": "image/jpeg", "data": to_base64(img1_path)}},
                {"type": "text", "text": "图像1"},
                {"type": "image", "source": {"type": "base64",
                 "media_type": "image/jpeg", "data": to_base64(img2_path)}},
                {"type": "text", "text": f"图像2\n\n请从【{aspect}】角度对比这两张图像的差异。"},
            ]
        }]
    )
    return message.content[0].text
```

---

## 总结

多模态应用选型：
- **文档/图表分析** → Claude 3.5 Sonnet（中英文均强）
- **超长视频/文档** → Gemini 1.5 Pro（百万 Token 上下文）
- **中文图像理解** → Qwen-VL（中文优化最好）
- **本地私有部署** → LLaVA-Next / InternVL2（开源，可量化）
- **成本敏感** → GPT-4o-mini 或 claude-haiku（轻量快速）

关键限制：图像 Token 消耗多（一张图约 800-1600 Token），批量处理需控制并发和成本。

---

*本文作者：林墨川 | 更新时间：2024年*
