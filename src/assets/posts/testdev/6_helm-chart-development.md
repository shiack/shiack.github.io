# Helm Chart 开发：K8s 应用包管理

> Helm 是 Kubernetes 的包管理器，通过 Chart 将复杂的 K8s 资源模板化，实现一条命令部署完整应用。

---

## 一、Chart 目录结构

```
my-app/
├── Chart.yaml         # Chart 元信息（名称/版本/依赖）
├── values.yaml        # 默认配置值
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── hpa.yaml
│   ├── _helpers.tpl   # 可复用模板（命名模板）
│   └── NOTES.txt      # 安装成功后显示的提示
└── charts/            # 依赖的子 Chart
```

```yaml
# Chart.yaml
apiVersion: v2
name: my-app
description: 我的微服务应用
type: application
version: 0.1.0         # Chart 版本
appVersion: "1.2.0"    # 应用程序版本

dependencies:
- name: postgresql
  version: "13.x.x"
  repository: https://charts.bitnami.com/bitnami
  condition: postgresql.enabled
```

---

## 二、模板语法

### 2.1 values.yaml 默认值

```yaml
# values.yaml
replicaCount: 2

image:
  repository: registry.example.com/my-app
  tag: "1.2.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

ingress:
  enabled: false
  host: myapp.example.com
  tls: true

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

config:
  logLevel: info
  dbUrl: ""   # 由 Secret 注入，不在此配置
```

### 2.2 Deployment 模板

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "my-app.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - containerPort: {{ .Values.service.targetPort }}
        env:
        - name: LOG_LEVEL
          value: {{ .Values.config.logLevel | quote }}
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: {{ include "my-app.fullname" . }}-secret
              key: db-url
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
        readinessProbe:
          httpGet:
            path: /health
            port: {{ .Values.service.targetPort }}
          initialDelaySeconds: 10
```

### 2.3 命名模板（_helpers.tpl）

```yaml
# templates/_helpers.tpl
{{- define "my-app.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "my-app.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

---

## 三、多环境部署

```bash
# 创建环境专属 values 文件
values/
├── values-dev.yaml
├── values-staging.yaml
└── values-prod.yaml
```

```yaml
# values-prod.yaml（覆盖默认值）
replicaCount: 5
image:
  tag: "1.2.0"
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi
autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 20
ingress:
  enabled: true
  host: api.example.com
  tls: true
```

```bash
# 部署命令
helm install my-app ./my-app -f values/values-prod.yaml -n production

# 升级
helm upgrade my-app ./my-app -f values/values-prod.yaml \
  --set image.tag=1.3.0 \
  -n production

# 回滚
helm rollback my-app 1 -n production

# 查看历史
helm history my-app -n production
```

---

## 四、Hook（部署前后操作）

```yaml
# templates/db-migrate-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "my-app.fullname" . }}-db-migrate
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install      # 在安装/升级前执行
    "helm.sh/hook-weight": "-5"                  # 权重（越小越先执行）
    "helm.sh/hook-delete-policy": hook-succeeded  # 成功后删除 Job
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        command: ["python", "manage.py", "migrate"]
```

---

## 五、Chart 测试

```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "my-app.fullname" . }}-test"
  annotations:
    "helm.sh/hook": test
spec:
  restartPolicy: Never
  containers:
  - name: test
    image: curlimages/curl:latest
    command: ['curl', '--fail', 'http://{{ include "my-app.fullname" . }}:{{ .Values.service.port }}/health']
```

```bash
helm test my-app -n production
```

---

## 总结

- `_helpers.tpl` 中定义命名模板，避免重复代码
- `values.yaml` 只放安全默认值，敏感配置通过 `--set` 或外部 Secret 传入
- **Hook** 实现数据库迁移、配置预检等部署前置操作
- `helm test` 验证部署是否成功，纳入 CI/CD 流程

---

*本文作者：林墨川 | 更新时间：2024年*
