# Python 爬虫进阶：反爬策略与异步并发

## 概述

本文介绍 Python 爬虫开发中的高级技巧，包括反反爬策略、异步并发爬取、以及大规模数据存储方案。通过实际案例，帮助你构建高效、稳定的爬虫系统。

## 异步爬虫架构

使用 `aiohttp` + `asyncio` 实现高性能并发：

```python
import asyncio
import aiohttp
import aiofiles
from bs4 import BeautifulSoup
import random
import time

class AsyncCrawler:
    def __init__(self, concurrency=10):
        self.concurrency = concurrency
        self.session = None
        self.headers_list = [
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"},
            {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"},
        ]

    async def fetch(self, session, url):
        headers = random.choice(self.headers_list)
        async with session.get(url, headers=headers, timeout=30) as response:
            if response.status == 200:
                return await response.text()
            return None

    async def parse(self, html):
        soup = BeautifulSoup(html, 'html.parser')
        items = []
        for article in soup.select('article.item'):
            items.append({
                'title': article.select_one('.title').text.strip(),
                'link': article.select_one('a')['href'],
                'price': article.select_one('.price').text.strip()
            })
        return items

    async def crawl(self, urls):
        connector = aiohttp.TCPConnector(limit=self.concurrency)
        async with aiohttp.ClientSession(connector=connector) as session:
            tasks = []
            for url in urls:
                task = asyncio.create_task(self.fetch(session, url))
                tasks.append(task)

            results = await asyncio.gather(*tasks, return_exceptions=True)
            all_items = []
            for html in results:
                if html:
                    items = await self.parse(html)
                    all_items.extend(items)
            return all_items
```

## 反爬应对策略

### 代理池轮换

```python
class ProxyPool:
    def __init__(self):
        self.proxies = []
        self.current = 0

    def add_proxy(self, proxy):
        self.proxies.append(proxy)

    def get_proxy(self):
        if not self.proxies:
            return None
        proxy = self.proxies[self.current]
        self.current = (self.current + 1) % len(self.proxies)
        return proxy

    async def fetch_with_proxy(self, session, url):
        proxy = self.get_proxy()
        proxies = {
            "http": f"http://{proxy}",
            "https": f"http://{proxy}"
        }
        async with session.get(url, proxy=proxies) as response:
            return await response.text()
```

### 请求限速与退避

```python
class RateLimiter:
    def __init__(self, max_per_second=5):
        self.min_interval = 1.0 / max_per_second
        self.last_request = 0

    async def wait(self):
        now = time.time()
        elapsed = now - self.last_request
        if elapsed < self.min_interval:
            await asyncio.sleep(self.min_interval - elapsed)
        self.last_request = time.time()

    async def fetch(self, session, url):
        await self.wait()
        return await session.get(url)
```

### Cookie 池管理

```python
class CookiePool:
    def __init__(self):
        self.cookies = []

    def add_cookies(self, cookie_dict):
        self.cookies.append(cookie_dict)

    def get_cookies(self):
        return random.choice(self.cookies) if self.cookies else {}
```

## 数据存储

### 异步写入 MongoDB

```python
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

class MongoStore:
    def __init__(self, connection_string, database, collection):
        self.client = AsyncIOMotorClient(connection_string)
        self.db = self.client[database]
        self.collection = self.db[collection]

    async def insert_many(self, items):
        if items:
            await self.collection.insert_many(items)

    async def insert_one(self, item):
        await self.collection.insert_one(item)

    async def find_all(self, query=None):
        cursor = self.collection.find(query or {})
        return await cursor.to_list(length=None)
```

### 异步写入 CSV

```python
import csv
import aiofiles
import json

class CSVStore:
    def __init__(self, filename, fieldnames):
        self.filename = filename
        self.fieldnames = fieldnames

    async def write_header(self):
        async with aiofiles.open(self.filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=self.fieldnames)
            await writer.writeheaderAsync()

    async def write_row(self, row):
        async with aiofiles.open(self.filename, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=self.fieldnames)
            await writer.writerowAsync(row)
```

## 完整爬虫示例

```python
async def main():
    urls = [f"https://example.com/page/{i}" for i in range(1, 101)]

    crawler = AsyncCrawler(concurrency=20)
    proxy_pool = ProxyPool()
    rate_limiter = RateLimiter(max_per_second=10)

    # 添加代理
    for proxy in open('proxies.txt').read().splitlines():
        proxy_pool.add_proxy(proxy)

    async with aiohttp.ClientSession() as session:
        all_data = []
        for url in urls:
            await rate_limiter.wait()
            html = await crawler.fetch_with_proxy(session, url, proxy_pool)
            if html:
                items = await crawler.parse(html)
                all_data.extend(items)

    # 存储数据
    store = MongoStore("mongodb://localhost:27017", "crawl", "products")
    await store.insert_many(all_data)
    print(f"Crawled {len(all_data)} items")

if __name__ == "__main__":
    asyncio.run(main())
```

## 法律与伦理提示

1. **遵守 robots.txt**：尊重网站的爬取规则
2. **控制请求频率**：避免对目标网站造成负担
3. **不爬取敏感信息**：包括个人隐私、商业机密等
4. **合理使用数据**：仅用于学习和研究目的

## 总结

通过异步并发、反爬策略和合理的数据存储方案，可以构建高效稳定的爬虫系统。但务必遵守法律法规和网站的使用条款。
