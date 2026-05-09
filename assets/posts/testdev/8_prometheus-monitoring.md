# Prometheus 监控：指标采集与告警配置

> Prometheus 以拉取模式采集时序数据，PromQL 提供强大的聚合查询，配合 Alertmanager 实现完整的告警闭环。

---

## 一、架构概览

```
┌──────────────────────────────────────────────────────────┐
│                      Prometheus Server                    │
│                                                           │
│  Time Series DB  ◄── Scraper ──► Service Discovery       │
│       ↕                         (k8s / consul / static)   │
│  PromQL Engine                                            │
└──────────┬────────────────────┬─────────────────────────┘
           │                    │
           ▼                    ▼
      Alertmanager          Grafana
    (路由/分组/静默)        (可视化)
           │
    ┌──────┴──────┐
    ▼             ▼
  PagerDuty    Slack/钉钉
```

**四种指标类型：**
- **Counter**：单调递增（请求总数、错误总数）
- **Gauge**：可增可减（内存用量、连接数）
- **Histogram**：采样分布（请求延迟分桶）
- **Summary**：分位数（P50/P95/P99）

---

## 二、应用埋点（Python）

```python
from prometheus_client import Counter, Gauge, Histogram, start_http_server
import time
import functools

# 定义指标
http_requests_total = Counter(
    'http_requests_total',
    '总请求数',
    ['method', 'endpoint', 'status_code']   # labels
)

request_duration_seconds = Histogram(
    'request_duration_seconds',
    '请求处理时间',
    ['method', 'endpoint'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)

active_connections = Gauge(
    'active_connections',
    '当前活跃连接数'
)

def track_request(method: str, endpoint: str):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            active_connections.inc()
            start = time.time()
            status = '200'
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                status = '500'
                raise
            finally:
                duration = time.time() - start
                http_requests_total.labels(method, endpoint, status).inc()
                request_duration_seconds.labels(method, endpoint).observe(duration)
                active_connections.dec()
        return wrapper
    return decorator

# 启动指标暴露端点（/metrics）
start_http_server(8000)

# 使用
@track_request('GET', '/api/users')
def get_users():
    pass
```

---

## 三、prometheus.yml 配置

```yaml
global:
  scrape_interval:     15s   # 采集频率
  evaluation_interval: 15s   # 规则评估频率
  external_labels:
    cluster: 'production'
    region: 'cn-north-1'

# 告警规则文件
rule_files:
  - "rules/service_alerts.yml"
  - "rules/infra_alerts.yml"

# Alertmanager 地址
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  # 采集 Prometheus 自身
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # 采集 Node Exporter（主机指标）
  - job_name: 'node'
    static_configs:
      - targets: ['10.0.0.1:9100', '10.0.0.2:9100']

  # Kubernetes Pod 自动发现
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # 只采集标注了 prometheus.io/scrape=true 的 Pod
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: '${1}'
```

---

## 四、PromQL 查询

```promql
# ── 错误率 ─────────────────────────────────────────────
# 过去 5 分钟 5xx 错误率
rate(http_requests_total{status_code=~"5.."}[5m])
/
rate(http_requests_total[5m])

# ── 延迟 P99 ───────────────────────────────────────────
# 按服务分组的 P99 请求延迟
histogram_quantile(0.99,
    sum(rate(request_duration_seconds_bucket[5m])) by (le, service)
)

# ── 资源利用 ───────────────────────────────────────────
# CPU 使用率（百分比）
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[2m])) * 100)

# 内存可用率
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100

# ── 聚合 ──────────────────────────────────────────────
# 各服务 QPS
sum(rate(http_requests_total[1m])) by (service)
```

---

## 五、告警规则与 Alertmanager

```yaml
# rules/service_alerts.yml
groups:
  - name: service.rules
    rules:
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status_code=~"5.."}[5m])
          / rate(http_requests_total[5m]) > 0.05
        for: 2m       # 持续 2 分钟才触发
        labels:
          severity: critical
        annotations:
          summary: "服务 {{ $labels.service }} 错误率过高"
          description: "错误率 {{ $value | humanizePercentage }}，超过 5% 阈值"

      - alert: HighLatencyP99
        expr: |
          histogram_quantile(0.99,
            sum(rate(request_duration_seconds_bucket[5m])) by (le, service)
          ) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 延迟超过 1 秒"
```

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'service']
  group_wait:      30s    # 同组等待时间（收集更多告警一起发）
  group_interval:  5m     # 同组下次发送间隔
  repeat_interval: 4h     # 未解决告警重复发送间隔
  receiver: 'slack-ops'

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true

receivers:
  - name: 'slack-ops'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts'
        title: '{{ .CommonAnnotations.summary }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '<key>'

inhibit_rules:
  # critical 告警触发时，抑制同服务的 warning 告警
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['service']
```

---

## 总结

Prometheus 生产配置要点：
- **标签设计**：method/endpoint/status_code，支持多维聚合
- **记录规则**：预计算高频查询（`recording rules`），降低查询负载
- **告警 `for` 字段**：避免毛刺触发，持续 2-5 分钟再告警
- **Alertmanager 分组**：减少告警风暴，同类告警合并发送
- **数据保留**：默认 15 天，长期存储用 Thanos/Cortex/VictoriaMetrics

---

*本文作者：林墨川 | 更新时间：2024年*
