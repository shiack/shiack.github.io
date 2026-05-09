# GitHub Actions 工作流：自动化部署实战

> GitHub Actions 让 CI/CD 直接在代码仓库中配置，无需维护额外的 Jenkins 服务器，是现代开源项目的标准选择。

---

## 一、核心概念

```
Workflow（工作流）
  └── Job（作业，可并行）
       └── Step（步骤，按序执行）
            ├── uses: actions/checkout@v4  ← 使用已有 Action
            └── run: npm test              ← 运行 Shell 命令
```

### 1.1 触发方式

```yaml
on:
  push:
    branches: [main, 'release/**']
    paths: ['src/**', 'package.json']  # 只有这些文件变更才触发
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'   # 每天凌晨 2 点
  workflow_dispatch:        # 手动触发（支持传入参数）
    inputs:
      environment:
        description: '部署环境'
        required: true
        default: 'staging'
        type: choice
        options: [staging, production]
```

---

## 二、完整 CI/CD Pipeline

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ── 代码质量检查 ──────────────────────────────
  lint-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'           # 自动缓存 node_modules

    - run: npm ci
    - run: npm run lint
    - run: npm test -- --coverage

    - name: Upload coverage
      uses: codecov/codecov-action@v4
      with:
        token: ${{ secrets.CODECOV_TOKEN }}

  # ── 构建 Docker 镜像 ──────────────────────────
  build-push:
    needs: lint-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'   # 只在 main 分支执行
    permissions:
      contents: read
      packages: write

    outputs:
      image-digest: ${{ steps.build.outputs.digest }}

    steps:
    - uses: actions/checkout@v4

    - name: Login to GHCR
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}  # 自动提供，无需手动配置

    - name: Docker meta
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=sha,prefix=sha-
          type=raw,value=latest

    - name: Build and push
      id: build
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        cache-from: type=gha      # 利用 GitHub Actions 缓存层
        cache-to: type=gha,mode=max

  # ── 部署到 Kubernetes ─────────────────────────
  deploy:
    needs: build-push
    runs-on: ubuntu-latest
    environment: production   # 需要手动审批（在 Settings > Environments 配置）

    steps:
    - uses: actions/checkout@v4

    - name: Set up kubectl
      uses: azure/setup-kubectl@v4

    - name: Configure kubeconfig
      run: |
        mkdir -p ~/.kube
        echo "${{ secrets.KUBECONFIG }}" | base64 -d > ~/.kube/config

    - name: Deploy
      run: |
        kubectl set image deployment/my-app \
          app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ needs.build-push.outputs.image-digest }} \
          -n production
        kubectl rollout status deployment/my-app -n production --timeout=5m
```

---

## 三、Matrix 矩阵构建

```yaml
jobs:
  test:
    strategy:
      fail-fast: false    # 一个 job 失败不取消其他
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 22]
        exclude:
          - os: macos-latest
            node: 18      # 排除特定组合
    
    runs-on: ${{ matrix.os }}
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node }}
    - run: npm test
```

---

## 四、Secrets 与缓存

```yaml
# Secrets：在 Settings > Secrets 中配置
- name: Deploy to server
  env:
    SSH_KEY:  ${{ secrets.DEPLOY_SSH_KEY }}
    HOST:     ${{ secrets.SERVER_HOST }}
  run: |
    echo "$SSH_KEY" | ssh-add -
    ssh -o StrictHostKeyChecking=no deploy@$HOST "cd /app && git pull && pm2 restart all"

# 缓存：加速 CI（pip/maven/gradle 同理）
- name: Cache npm
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

---

## 五、可复用 Workflow

```yaml
# .github/workflows/reusable-deploy.yml
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      KUBECONFIG:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
    - name: Deploy
      run: echo "Deploying to ${{ inputs.environment }}"
```

```yaml
# 调用可复用 Workflow
jobs:
  deploy-staging:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
    secrets:
      KUBECONFIG: ${{ secrets.STAGING_KUBECONFIG }}
```

---

## 总结

GitHub Actions 关键点：
- `needs` 控制依赖顺序，并行/串行灵活组合
- `environment` + 手动审批确保生产安全
- `cache` 和 Docker layer 缓存大幅提速（通常节省 50%+ 时间）
- 可复用 workflow 避免跨仓库代码重复
- `GITHUB_TOKEN` 自动注入，无需手动配置大多数权限

---

*本文作者：林墨川 | 更新时间：2024年*
