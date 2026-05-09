# Grafana 仪表盘：可视化监控数据

> Grafana 将 Prometheus、Loki、InfluxDB 等多数据源的数据统一可视化，通过仪表盘让系统状态一目了然。

---

## 一、架构与数据源

```
数据源                    Grafana                   用户
────────────────────────────────────────────────────────
Prometheus  ──────────────►                          
Loki        ──────────────► Dashboard (JSON)  ──────► 浏览器
InfluxDB    ──────────────►   Panels           
Elasticsearch ────────────►   Variables       
PostgreSQL  ──────────────►   Alerts          
                              Annotations     
```

**连接 Prometheus 数据源：**

```
Configuration → Data Sources → Add data source → Prometheus
URL: http://prometheus:9090
Scrape interval: 15s
```

---

## 二、核心面板类型

```
Time series  → 时间序列折线图（CPU/内存趋势）
Stat         → 单值指标（当前 QPS、错误率）
Gauge        → 仪表盘（使用率百分比）
Bar chart    → 柱状图（各服务请求分布）
Table        → 表格（TopN 慢查询）
Heatmap      → 热力图（延迟分布随时间变化）
Logs         → 日志面板（配合 Loki）
Node Graph   → 拓扑图（服务依赖关系）
```

---

## 三、Dashboard as Code

```json
// dashboard.json（核心结构）
{
  "title": "服务监控概览",
  "uid": "service-overview",
  "time": { "from": "now-1h", "to": "now" },
  "refresh": "30s",

  "templating": {
    "list": [
      {
        "name": "service",
        "type": "query",
        "datasource": "Prometheus",
        "query": "label_values(http_requests_total, service)",
        "multi": true,
        "includeAll": true
      },
      {
        "name": "interval",
        "type": "interval",
        "options": ["1m", "5m", "10m", "30m"]
      }
    ]
  },

  "panels": [
    {
      "type": "timeseries",
      "title": "QPS - $service",
      "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
      "targets": [{
        "datasource": "Prometheus",
        "expr": "sum(rate(http_requests_total{service=~\"$service\"}[$interval])) by (service)"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "reqps",
          "custom": { "lineWidth": 2, "fillOpacity": 10 }
        }
      }
    }
  ]
}
```

---

## 四、关键仪表盘设计

### 4.1 服务 SLO 仪表盘

```promql
# 错误率（Stat 面板，阈值着色）
sum(rate(http_requests_total{status_code=~"5..",service="$service"}[$interval]))
/ sum(rate(http_requests_total{service="$service"}[$interval])) * 100

# 配置阈值：
# 绿色: 0-1%  黄色: 1-5%  红色: >5%

# P99 延迟（Gauge 面板）
histogram_quantile(0.99,
  sum(rate(request_duration_seconds_bucket{service="$service"}[$interval])) by (le)
) * 1000   # 转换为毫秒

# 可用性 SLO（过去 30 天）
(1 - (
  sum(rate(http_requests_total{status_code=~"5.."}[30d]))
  / sum(rate(http_requests_total[30d]))
)) * 100
```

### 4.2 基础设施仪表盘

```promql
# CPU 使用率（按主机）
100 - avg(rate(node_cpu_seconds_total{mode="idle"}[$interval])) by (instance) * 100

# 内存使用率
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# 磁盘 IO 等待
rate(node_disk_io_time_seconds_total[$interval]) * 100

# 网络吞吐（入/出）
rate(node_network_receive_bytes_total{device!="lo"}[$interval])
rate(node_network_transmit_bytes_total{device!="lo"}[$interval])
```

---

## 五、告警规则（Grafana Alerting）

```yaml
# 通过 Grafana API 或 UI 配置告警
# 在 Panel 中点击 "Alert" 标签创建

# 告警规则示例（YAML 格式，供 Terraform/GitOps 管理）
apiVersion: 1
groups:
  - orgId: 1
    name: Service Alerts
    folder: Production
    interval: 1m
    rules:
      - uid: high-error-rate
        title: 错误率过高
        condition: C
        data:
          - refId: A
            datasourceUid: prometheus
            model:
              expr: |
                sum(rate(http_requests_total{status_code=~"5.."}[5m]))
                / sum(rate(http_requests_total[5m])) * 100
          - refId: C
            datasourceUid: '__expr__'
            model:
              type: threshold
              conditions:
                - evaluator: { params: [5], type: gt }  # > 5%
        noDataState: NoData
        execErrState: Error
        for: 2m
        annotations:
          summary: 错误率 {{ $values.A }}% 超过阈值
        labels:
          severity: critical
```

---

## 六、Provisioning（自动化部署）

```yaml
# /etc/grafana/provisioning/datasources/prometheus.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      timeInterval: 15s
      exemplarTraceIdDestinations:
        - name: trace_id
          datasourceUid: jaeger

# /etc/grafana/provisioning/dashboards/default.yml
apiVersion: 1
providers:
  - name: default
    type: file
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

```bash
# Docker Compose 挂载预置配置
services:
  grafana:
    image: grafana/grafana:10.0.0
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secret
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./provisioning:/etc/grafana/provisioning
      - ./dashboards:/var/lib/grafana/dashboards
    ports:
      - "3000:3000"
```

---

## 总结

Grafana 最佳实践：
- **变量驱动**（`$service`, `$interval`）：一个仪表盘适配所有服务
- **Dashboard as Code**：JSON 存入 Git，CI 自动同步
- **分层设计**：概览 → 服务 → 实例，逐层下钻
- **Provisioning**：避免手工配置，启动即就绪
- **注解（Annotations）**：在图表上标记部署事件，快速关联异常

---

*本文作者：林墨川 | 更新时间：2024年*
