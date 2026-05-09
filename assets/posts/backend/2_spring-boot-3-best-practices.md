# Spring Boot 3 最佳实践

> 基于Spring Boot 3.x的企业级应用开发指南

---

## 一、项目结构设计

### 1.1 推荐目录结构

```
backend/
├── src/
│   └── main/
│       ├── java/
│       │   └── com/example/app/
│       │       ├── controller/     # REST API控制层
│       │       ├── service/        # 业务逻辑层
│       │       ├── repository/     # 数据访问层
│       │       ├── entity/         # 数据库实体
│       │       ├── dto/            # 数据传输对象
│       │       ├── config/         # 配置类
│       │       ├── exception/      # 异常处理
│       │       └── Application.java
│       └── resources/
│           ├── application.yml     # 应用配置
│           └── schema.sql          # 数据库初始化脚本
└── pom.xml
```

### 1.2 分层职责

| 层级 | 职责 | 说明 |
|------|------|------|
| Controller | 处理HTTP请求 | 参数校验、调用Service、返回响应 |
| Service | 业务逻辑处理 | 事务管理、业务规则实现 |
| Repository | 数据访问 | 数据库CRUD操作 |
| Entity | 数据库映射 | JPA实体类 |
| DTO | 数据传输 | 请求/响应数据结构 |

---

## 二、配置管理

### 2.1 YAML配置示例

```yaml
server:
  port: 8080

spring:
  application:
    name: example-app
  datasource:
    url: jdbc:mysql://localhost:3306/example_db
    username: ${DB_USERNAME:admin}
    password: ${DB_PASSWORD:password}
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false

logging:
  level:
    com.example.app: DEBUG
    org.hibernate.SQL: WARN
```

### 2.2 多环境配置

通过`spring.profiles.active`切换环境：

```yaml
# application-dev.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/dev_db

# application-prod.yml
spring:
  datasource:
    url: jdbc:mysql://prod-db:3306/prod_db
```

---

## 三、REST API设计

### 3.1 Controller示例

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(userService.findAll(page, size));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody UserCreateDTO dto) {
        return ResponseEntity.ok(userService.create(dto));
    }
}
```

### 3.2 统一响应格式

```java
public class ApiResponse<T> {
    private int code;
    private String message;
    private T data;
    private long timestamp;
    
    // 成功响应
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(200, "success", data);
    }
    
    // 错误响应
    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}
```

---

## 四、异常处理

### 4.1 全局异常处理器

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(404, ex.getMessage()));
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(400, message));
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(500, "Internal server error"));
    }
}
```

---

## 五、性能优化

### 5.1 数据库连接池配置

```yaml
spring:
  datasource:
    hikari:
      minimum-idle: 5
      maximum-pool-size: 20
      idle-timeout: 30000
      connection-timeout: 20000
      max-lifetime: 1800000
```

### 5.2 启用响应式编程

对于高并发场景，考虑使用Spring WebFlux：

```java
@RestController
@RequestMapping("/api/stream")
public class StreamController {
    
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<Event> streamEvents() {
        return Flux.interval(Duration.ofSeconds(1))
                .map(i -> new Event("event-" + i, LocalDateTime.now()));
    }
}
```

---

## 六、总结

Spring Boot 3带来了许多新特性和改进，合理利用这些特性可以显著提升应用的性能和可维护性。

**核心要点：**
- 遵循清晰的项目结构和分层设计
- 合理管理配置，支持多环境切换
- 设计RESTful API，统一响应格式
- 实现全局异常处理
- 关注性能优化和资源管理

---

*本文作者：林墨川 | 更新时间：2024年1月*
