# Kubernetes 核心原理与生产环境集群搭建

## 概述

Kubernetes（K8s）已成为容器编排的事实标准。本文深入解析 K8s 核心概念与架构，并提供生产环境集群的搭建指南，涵盖高可用、监控、日志等关键配置。

## Kubernetes 架构

```
┌─────────────────────────────────────────────────────┐
│                    Control Plane                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │  API    │  │Scheduler│  │Controller│  │   ETCD  ││
│  │ Server  │  │         │  │ Manager  │  │         ││
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘│
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│                      Worker Nodes                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │  kubelet│  │  kube   │  │Container│  │  Pods   ││
│  │         │  │ proxy   │  │ Runtime │  │         ││
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘│
└─────────────────────────────────────────────────────┘
```

## 核心概念

### Pod

K8s 最小调度单元，通常包含一个或多个容器：

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
    image: nginx:1.24
    ports:
    - containerPort: 80
```

### Deployment

声明式更新，管理 Pod 副本数：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.24
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
```

### Service

提供稳定的网络访问入口：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

## 生产环境集群搭建

### 初始化控制平面

```bash
# 使用 kubeadm 初始化（单节点测试用）
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# 高可用配置（生产环境）
sudo kubeadm init --control-plane-endpoint "lb.example.com:6443" \
                  --upload-certs \
                  --pod-network-cidr=10.244.0.0/16
```

### 部署网络插件（Calico）

```bash
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml
```

### 部署 Metrics Server

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## 资源配额与限制

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
---
apiVersion: v1
kind: LimitRange
metadata:
  name: limit-range
spec:
  limits:
  - max:
      cpu: "2"
      memory: 1Gi
    min:
      cpu: "100m"
      memory: 128Mi
    default:
      cpu: "500m"
      memory: 512Mi
    defaultRequest:
      cpu: "200m"
      memory: 256Mi
```

## 监控方案

使用 Prometheus + Grafana：

```bash
# 部署 Prometheus Operator
kubectl apply -f https://prometheus-operator.dev/

# 部署 kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack
```

## 总结

Kubernetes 提供了强大的容器编排能力，生产环境部署需要重点关注高可用配置、资源配额、监控告警等方面。建议使用 GitOps 方式（如 ArgoCD）管理集群配置，实现声明式部署。
