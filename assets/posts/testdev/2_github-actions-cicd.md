# GitHub Actions 进阶：多环境部署与缓存策略

## 概述

GitHub Actions 是现代 CI/CD 的核心工具。本文介绍如何使用 Actions 实现多环境部署、智能缓存策略，以及自定义 action 开发，帮助团队提升开发效率和部署可靠性。

## 多环境部署流程

### 环境矩阵策略

```yaml
name: Multi-Environment Deployment

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

### 多环境配置

```yaml
jobs:
  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Staging
        env:
          API_URL: https://staging-api.example.com
          DATABASE_URL: ${{ secrets.STAGING_DB_URL }}
        run: |
          echo "Deploying to staging..."
          ./deploy.sh staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Production
        env:
          API_URL: https://api.example.com
          DATABASE_URL: ${{ secrets.PROD_DB_URL }}
        run: |
          echo "Deploying to production..."
          ./deploy.sh production
```

## 智能缓存策略

### NPM 缓存

```yaml
- name: Cache node_modules
  uses: actions/cache@v4
  id: npm-cache
  with:
    path: |
      ~/.npm
      node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

### Docker 层缓存

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: user/app:${{ github.sha }}
    cache-from: type=registry,ref=user/app:buildcache
    cache-to: type=registry,ref=user/app:buildcache,mode=max
```

### PyTorch 模型缓存

```yaml
- name: Cache PyTorch models
  uses: actions/cache@v4
  with:
    path: |
      ~/.cache/torch
      ./models
    key: ${{ runner.os }}-torch-${{ hashFiles('requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-torch-
```

## 条件执行与跳过

### 根据文件变更决定是否运行

```yaml
jobs:
  build:
    if: |
      contains(github.event.head_commit.modified, 'src/') ||
      contains(github.event.head_commit.modified, 'package.json')
    steps:
      - name: Build only if source changed
        run: npm run build
```

### 自动版本发布

```yaml
- name: Create Release
  if: startsWith(github.ref, 'refs/tags/')
  uses: actions/create-release@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tag_name: ${{ github.ref }}
    release_name: Release ${{ github.ref }}
    draft: false
    prerelease: ${{ contains(github.ref, 'beta') }}
```

## 自定义 Action 开发

### Docker Container Action

```yaml
# action.yml
name: 'Hello World'
description: 'Greet someone'
inputs:
  name:
    description: 'Who to greet'
    required: true
    default: 'World'
outputs:
  time:
    description: 'The time we greeted you'
runs:
  using: 'docker'
  image: 'Dockerfile'
```

```dockerfile
# Dockerfile
FROM alpine
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

```bash
#!/bin/sh
echo "Hello $INPUT_NAME"
echo "time=$(date)" >> $GITHUB_OUTPUT
```

### JavaScript Action

```yaml
# action.yml
name: 'Cache Restore'
description: 'Restore build cache'
inputs:
  path:
    description: 'Path to cache'
    required: true
outputs:
  cache-hit:
    description: 'Whether cache was found'
runs:
  using: 'node20'
  main: 'index.js'
```

```javascript
// index.js
const core = require('@actions/core');
const cache = require('@actions/cache');

async function run() {
  const path = core.getInput('path');
  const key = core.getInput('key');

  try {
    const cacheHit = await cache.restoreCache([path], key);
    core.setOutput('cache-hit', cacheHit ? 'true' : 'false');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
```

## 最佳实践

1. **使用最新版本 Actions**：及时更新到最新版本获取安全修复
2. **敏感信息使用 Secrets**：绝不将密钥硬编码在 workflow 文件中
3. **合理设置超时时间**：避免因网络问题导致 workflow 挂起
4. **使用 Concurrency 控制**：避免多个部署任务同时运行
5. **添加通知机制**：部署完成后通过钉钉/Slack 通知相关人员

## 总结

GitHub Actions 提供了灵活的 CI/CD 能力，通过多环境配置、智能缓存和自定义 action，可以显著提升团队的开发和部署效率。
