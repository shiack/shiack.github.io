# 微服务架构设计：服务拆分与治理策略

> 微服务不是银弹，它用分布式复杂性换取独立部署和扩展能力。正确的拆分粒度和完善的治理是成功的关键。

---

## 一、单体 vs 微服务

```
单体应用：                    微服务：
┌──────────────────┐         ┌──────┐ ┌──────┐ ┌──────┐
│ UI Layer          │         │ User  │ │Order │ │Payment│
│ Business Logic    │   →     │Service│ │Service│ │Service│
│ Data Access       │         └──────┘ └──────┘ └──────┘
│ Database          │             │       │        │
└──────────────────┘         ┌──────────────────────┐
                             │    API Gateway         │
                             └──────────────────────┘
```

| 维度 | 单体 | 微服务 |
|------|------|--------|
| 部署复杂度 | 低 | 高 |
| 技术栈 | 统一 | 灵活（多语言） |
| 独立扩展 | ❌ | ✅ |
| 本地开发 | 简单 | 需 Docker Compose |
| 适合阶段 | 初期/小团队 | 规模化/多团队 |

---

## 二、服务拆分：领域驱动设计

### 2.1 限界上下文（Bounded Context）

```
电商系统拆分示例：

用户上下文          订单上下文           支付上下文
┌──────────┐       ┌──────────┐        ┌──────────┐
│ User      │       │ Order    │        │ Payment  │
│ Profile   │       │ OrderItem│        │ Invoice  │
│ Address   │       │ Cart     │        │ Refund   │
└──────────┘       └──────────┘        └──────────┘
     │                   │                   │
     └───────────────────┴───────────────────┘
               通过事件/API 通信，不共享数据库
```

### 2.2 拆分原则

- **单一职责**：一个服务只做一件事
- **高内聚低耦合**：服务内部紧密，服务间松耦合
- **独立数据库**：每个服务拥有自己的数据存储
- **团队对齐**（康威定律）：服务边界 ≈ 团队边界

---

## 三、服务发现与负载均衡

### 3.1 Spring Cloud 服务注册

```yaml
# application.yml (Eureka Server)
server:
  port: 8761
eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
```

```java
// 服务提供方
@SpringBootApplication
@EnableEurekaClient
public class OrderServiceApplication { ... }

// application.yml
spring:
  application:
    name: order-service
eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/
```

```java
// 服务调用方（负载均衡）
@Configuration
public class WebClientConfig {
    @Bean
    @LoadBalanced
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
}

// 调用时用服务名替代 IP
WebClient client = webClientBuilder.build();
client.get().uri("http://order-service/api/orders/{id}", orderId).retrieve()...
```

---

## 四、熔断器（Circuit Breaker）

### 4.1 Resilience4j 配置

```java
@Bean
public CircuitBreakerConfig circuitBreakerConfig() {
    return CircuitBreakerConfig.custom()
        .failureRateThreshold(50)           // 失败率 >50% 触发熔断
        .waitDurationInOpenState(Duration.ofSeconds(30)) // 熔断持续 30s
        .slidingWindowSize(10)              // 统计最近 10 次请求
        .build();
}

// 使用
@CircuitBreaker(name = "payment-service", fallbackMethod = "paymentFallback")
public PaymentResult processPayment(Order order) {
    return paymentClient.pay(order);
}

public PaymentResult paymentFallback(Order order, Exception e) {
    log.warn("支付服务熔断，使用降级处理: {}", e.getMessage());
    return PaymentResult.pending(order.getId());  // 降级：返回待处理
}
```

### 4.2 熔断器状态机

```
            失败率超阈值
  CLOSED ──────────────► OPEN
    ▲                      │
    │    请求成功           │ 等待 waitDuration
    │                      ▼
  HALF_OPEN ◄─────────────
     (允许少量试探请求)
```

---

## 五、分布式链路追踪

```yaml
# pom.xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>

# application.yml
management:
  tracing:
    sampling:
      probability: 0.1   # 采样率 10%（生产环境不要 100%）
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

```
请求链路可视化（Zipkin/Jaeger）：
GET /checkout
  ├── order-service: 创建订单 [5ms]
  │     └── user-service: 获取用户信息 [2ms]
  ├── inventory-service: 扣减库存 [3ms]
  └── payment-service: 处理支付 [120ms]  ← 性能瓶颈
```

---

## 总结

微服务治理核心：
- **拆分** 遵循限界上下文，不过度拆分（微型单体更糟）
- **服务发现** 解耦 IP，支持动态扩缩容
- **熔断器** 防止级联失败，提供降级保护
- **链路追踪** 是分布式系统的"X光机"，必须配置
- 没有 DevOps 能力，不要轻易上微服务

---

*本文作者：林墨川 | 更新时间：2024年*
