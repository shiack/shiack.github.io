# Kubernetes 基础：Pod、Service 与 Deployment

> Kubernetes 是容器编排的事实标准，理解其核心资源对象是构建云原生应用的基础。

---

## 一、K8s 架构概览

```
┌──────────────────────────────────────────────────────┐
│                    Control Plane                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │kube-api  │ │  etcd    │ │scheduler │ │ctrl-mgr│  │
│  │  server  │ │(键值存储) │ │(调度决策)│ │(控制器)│  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
├──────────────────────────────────────────────────────┤
│                    Worker Nodes                       │
│  ┌──────────────────────┐ ┌──────────────────────┐  │
│  │  Node 1               │ │  Node 2               │  │
│  │  ┌──────┐ ┌──────┐   │ │  ┌──────┐ ┌──────┐   │  │
│  │  │ Pod  │ │ Pod  │   │ │  │ Pod  │ │ Pod  │   │  │
│  │  └──────┘ └──────┘   │ │  └──────┘ └──────┘   │  │
│  │  kubelet  kube-proxy  │ │  kubelet  kube-proxy  │  │
│  └──────────────────────┘ └──────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## 二、Pod

### 2.1 基本 Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 80
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
    readinessProbe:
      httpGet:
        path: /
        port: 80
      initialDelaySeconds: 5
      periodSeconds: 10
    livenessProbe:
      httpGet:
        path: /healthz
        port: 80
      initialDelaySeconds: 15
```

### 2.2 多容器 Pod 模式

```yaml
# Sidecar 模式：日志收集
spec:
  volumes:
  - name: shared-logs
    emptyDir: {}
  containers:
  - name: app
    image: my-app:latest
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/app
  - name: log-collector
    image: fluentd:latest
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/app
      readOnly: true
```

| Pod 模式 | 用途 | 示例 |
|----------|------|------|
| Sidecar | 辅助主容器 | 日志采集、服务网格代理 |
| Init Container | 启动前初始化 | 等待依赖、初始化配置 |
| Adapter | 标准化输出格式 | 日志格式转换 |

---

## 三、Deployment

### 3.1 创建 Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # 更新时最多多出 1 个 Pod
      maxUnavailable: 0  # 更新时不允许不可用 Pod
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
```

### 3.2 常用 Deployment 操作

```bash
# 查看 Deployment 状态
kubectl get deployment nginx-deployment
kubectl rollout status deployment/nginx-deployment

# 更新镜像（触发滚动更新）
kubectl set image deployment/nginx-deployment nginx=nginx:1.26

# 查看更新历史
kubectl rollout history deployment/nginx-deployment

# 回滚到上一版本
kubectl rollout undo deployment/nginx-deployment

# 回滚到指定版本
kubectl rollout undo deployment/nginx-deployment --to-revision=2

# 扩缩容
kubectl scale deployment/nginx-deployment --replicas=5
```

---

## 四、Service

### 4.1 Service 类型

```yaml
# ClusterIP（默认）：集群内部访问
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
spec:
  selector:
    app: nginx
  ports:
  - protocol: TCP
    port: 80        # Service 端口
    targetPort: 80  # Pod 端口
  type: ClusterIP
```

```yaml
# NodePort：节点端口暴露（开发测试用）
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080   # 30000-32767

# LoadBalancer：云厂商 LB（生产环境）
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
```

### 4.2 Service 与 Pod 发现

```bash
# Service 的 DNS 格式：
# <service-name>.<namespace>.svc.cluster.local
# 同 namespace 内可直接用 <service-name>

# 示例：在 Pod 中访问 nginx-svc
curl http://nginx-svc/          # 同 namespace
curl http://nginx-svc.default/  # 跨 namespace
```

---

## 五、ConfigMap 与 Secret

```yaml
# ConfigMap：非敏感配置
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: production
  LOG_LEVEL: info
  config.yaml: |
    server:
      port: 8080
      timeout: 30s

# Secret：敏感数据（base64 编码）
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  username: YWRtaW4=      # echo -n "admin" | base64
  password: cGFzc3dvcmQ=  # echo -n "password" | base64
```

```yaml
# 在 Pod 中使用
spec:
  containers:
  - name: app
    envFrom:
    - configMapRef:
        name: app-config
    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: password
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    configMap:
      name: app-config
```

---

## 总结

Kubernetes 核心对象关系：
- **Pod** 是最小调度单位，通常不直接创建
- **Deployment** 管理 Pod 的副本、更新和回滚
- **Service** 为 Pod 提供稳定的网络入口（Pod IP 会变）
- **ConfigMap/Secret** 分离配置与代码

掌握这四类资源，能覆盖 80% 的日常 K8s 使用场景。

---

*本文作者：林墨川 | 更新时间：2024年*
