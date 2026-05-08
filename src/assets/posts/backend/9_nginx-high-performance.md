# Nginx 高性能配置：反向代理与负载均衡

> Nginx 凭借事件驱动架构，单机轻松支撑数万并发连接，是生产环境 Web 服务器和反向代理的首选。

---

## 一、事件驱动模型

```
传统 Apache (每请求一个线程):      Nginx (事件驱动):
  连接1 → Thread 1 (阻塞等IO)      Master Process
  连接2 → Thread 2 (阻塞等IO)        └── Worker 1 (epoll 监听所有连接)
  连接3 → Thread 3 (阻塞等IO)             ├── 连接1 → 处理中
  内存: 每线程 1-8MB                      ├── 连接2 → 等IO（非阻塞）
                                          └── 连接3 → 处理中
                                      内存: 单 worker 约 1MB
```

---

## 二、核心配置优化

```nginx
# /etc/nginx/nginx.conf

# worker 数量 = CPU 核数
worker_processes auto;
worker_cpu_affinity auto;

# 最大文件描述符（需同步调整 ulimit）
worker_rlimit_nofile 65535;

events {
    # 每个 worker 最大连接数
    worker_connections 10240;
    # Linux 下最高效的事件模型
    use epoll;
    # 一次接受所有新连接
    multi_accept on;
}

http {
    # ── 性能优化 ────────────────────────────────
    sendfile        on;   # 零拷贝传输静态文件
    tcp_nopush      on;   # 合并 TCP 包（配合 sendfile）
    tcp_nodelay     on;   # 禁用 Nagle（小包立即发送）

    # ── 超时设置 ────────────────────────────────
    keepalive_timeout  65;
    keepalive_requests 1000;
    client_header_timeout 15s;
    client_body_timeout   15s;
    send_timeout          15s;

    # ── 压缩 ────────────────────────────────────
    gzip on;
    gzip_min_length 1024;
    gzip_comp_level 4;    # 1-9，4 是性能/压缩率平衡点
    gzip_types text/plain text/css application/json application/javascript
               application/xml image/svg+xml;

    # ── Buffer 大小 ──────────────────────────────
    client_body_buffer_size  16k;
    client_max_body_size     50m;
    client_header_buffer_size 1k;
}
```

---

## 三、反向代理与负载均衡

### 3.1 upstream 配置

```nginx
upstream api_backend {
    # 负载均衡算法
    # round-robin（默认）: 轮询
    # least_conn: 最少连接
    # ip_hash: 同 IP 路由到同服务器（Session 亲和）

    least_conn;

    server 10.0.0.1:8080 weight=3 max_fails=3 fail_timeout=30s;
    server 10.0.0.2:8080 weight=2 max_fails=3 fail_timeout=30s;
    server 10.0.0.3:8080 weight=1 backup;   # 备用节点

    keepalive 32;   # 保持到后端的长连接数
}

server {
    listen 80;
    server_name api.example.com;

    location /api/ {
        proxy_pass http://api_backend;

        # 必要的代理头
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 代理超时
        proxy_connect_timeout 5s;
        proxy_read_timeout    60s;
        proxy_send_timeout    60s;

        # 缓冲
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
```

---

## 四、HTTPS 与 SSL 优化

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    # 只允许安全协议
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # SSL Session 缓存（减少 TLS 握手开销）
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    # HSTS（强制 HTTPS）
    add_header Strict-Transport-Security "max-age=63072000" always;

    # OCSP Stapling（证书验证缓存）
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 valid=300s;
}

# HTTP 跳转 HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 五、限流与缓存

```nginx
http {
    # 定义限流区域（基于 IP）
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    # 代理缓存路径
    proxy_cache_path /var/cache/nginx levels=1:2
        keys_zone=api_cache:10m max_size=1g inactive=60m;
}

server {
    location /api/v1/ {
        # 限流：20 req/s，允许 5 个突发请求
        limit_req zone=api_limit burst=5 nodelay;
        limit_conn conn_limit 20;

        # 429 Too Many Requests
        limit_req_status 429;
    }

    location /api/v1/public/ {
        # 缓存 GET 请求 10 分钟
        proxy_cache api_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_methods GET;
        proxy_cache_key "$scheme$host$request_uri";
        add_header X-Cache-Status $upstream_cache_status;

        proxy_pass http://api_backend;
    }
}
```

---

## 总结

生产 Nginx 配置清单：
- `worker_processes auto` + `worker_connections 10240`
- 开启 `sendfile + tcp_nopush + gzip`
- upstream 用 `least_conn` + `keepalive`
- HTTPS 开启 `http2 + ssl_session_cache + OCSP Stapling`
- `limit_req_zone` 防止 API 被刷接口

---

*本文作者：林墨川 | 更新时间：2024年*
