# Istio 服务网格：微服务治理实战

> Istio 在应用层之下提供流量管理、安全通信和可观测性，让微服务治理对业务代码完全透明。

---

## 一、Istio 架构

```
┌───────────────────────────────────────────────────────┐
│                    Control Plane                       │
│    istiod (Pilot + Citadel + Galley)                  │
│    ├── 服务发现与路由规则下发                           │
│    ├── 证书管理（mTLS）                                │
│    └── 配置验证                                       │
└───────────────────────┬───────────────────────────────┘
                        │ xDS 协议下发配置
┌───────────────────────▼───────────────────────────────┐
│                    Data Plane                          │
│                                                        │
│  Pod A                    Pod B                        │
│  ┌─────────────────┐      ┌─────────────────┐         │
│  │ App Container   │      │ App Container   │         │
│  │ [Envoy Sidecar] │─────►│ [Envoy Sidecar] │         │
│  └─────────────────┘      └─────────────────┘         │
│   所有流量经过 Envoy 代理                               │
└───────────────────────────────────────────────────────┘
```

---

## 二、安装与 Sidecar 注入

```bash
# 安装 Istio（推荐 istioctl）
istioctl install --set profile=production

# 为 namespace 开启自动注入
kubectl label namespace default istio-injection=enabled

# 验证注入（Pod 应有 2/2 Ready：app + istio-proxy）
kubectl get pods -n default
# NAME                     READY   STATUS    RESTARTS
# my-app-7d9f6b-xk2p9      2/2     Running   0
```

---

## 三、流量管理

### 3.1 VirtualService（路由规则）

```yaml
# 金丝雀发布：90% 流量到 v1，10% 到 v2
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
  - reviews
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: reviews
        subset: v2
      weight: 100
  - route:
    - destination:
        host: reviews
        subset: v1
      weight: 90
    - destination:
        host: reviews
        subset: v2
      weight: 10
```

```yaml
# DestinationRule：定义 subset 和负载均衡
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  trafficPolicy:
    connectionPool:
      http:
        http2MaxRequests: 1000
    loadBalancer:
      simple: LEAST_CONN
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

### 3.2 熔断器

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: payment-circuit-breaker
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutiveGatewayErrors: 5   # 连续 5 次错误触发熔断
      interval: 30s                  # 检测间隔
      baseEjectionTime: 30s         # 最小熔断时间
      maxEjectionPercent: 50        # 最多熔断 50% 的实例
```

---

## 四、mTLS 双向认证

```yaml
# PeerAuthentication：严格模式（所有服务间通信必须 mTLS）
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT   # STRICT | PERMISSIVE（过渡期）

# AuthorizationPolicy：访问控制
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-order-to-payment
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/order-service"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/v1/payment"]
```

---

## 五、可观测性

```bash
# 安装可观测性组件
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# 打开 Kiali 拓扑图（服务依赖关系可视化）
istioctl dashboard kiali

# 打开 Jaeger（链路追踪）
istioctl dashboard jaeger
```

**Istio 自动采集的指标：**
- 请求成功率（`istio_requests_total`）
- 请求延迟分位数（`istio_request_duration_milliseconds`）
- 连接数（`istio_tcp_connections_opened_total`）

---

## 总结

Istio 带来的价值：
- **零代码修改**实现 mTLS、链路追踪、流量管理
- **金丝雀发布**通过权重配置完成，无需修改 Deployment
- **细粒度访问控制**精确到服务账号级别
- 代价是增加了运维复杂度和约 5% 的延迟开销（Envoy sidecar）

---

*本文作者：林墨川 | 更新时间：2024年*
