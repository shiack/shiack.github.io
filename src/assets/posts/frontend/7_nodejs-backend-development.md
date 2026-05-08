# Node.js 后端开发：Express 与 Koa 实战

> Node.js 基于事件循环的非阻塞 I/O 使其在高并发 API 服务场景表现出色，Express 和 Koa 是最主流的两个框架。

---

## 一、事件循环模型

```
Node.js 单线程事件循环：
                                            
  同步代码执行 → 微任务(Promise) → 宏任务(setTimeout/I/O)
       ↑                                    ↓
       └─────────────── 事件循环 ────────────┘

I/O 回调注册到 libuv 线程池（非阻塞）：
  读文件 → 交给 libuv → 主线程继续执行 → 文件读完 → 回调进入事件队列
```

---

## 二、Express 实战

### 2.1 基本结构

```javascript
// src/app.js
import express from 'express'
import { json } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

const app = express()

// 中间件
app.use(json({ limit: '10mb' }))
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }))
app.use(helmet())
app.use(morgan('combined'))

// 路由
app.use('/api/v1/users',  userRouter)
app.use('/api/v1/orders', orderRouter)

// 错误处理中间件（必须 4 个参数）
app.use((err, req, res, next) => {
    const status = err.status || 500
    const message = err.message || 'Internal Server Error'
    console.error(`[${new Date().toISOString()}] ${status} ${req.method} ${req.url}: ${message}`)
    res.status(status).json({ success: false, message, ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) })
})

export default app
```

### 2.2 Router 与控制器

```javascript
// routes/users.js
import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as UserController from '../controllers/user.js'

const router = Router()

router.get('/',      authenticate, UserController.list)
router.get('/:id',   authenticate, UserController.getById)
router.post('/',     UserController.create)
router.put('/:id',   authenticate, UserController.update)
router.delete('/:id',authenticate, UserController.remove)

export default router

// controllers/user.js
export async function getById(req, res, next) {
    try {
        const user = await UserService.findById(req.params.id)
        if (!user) return res.status(404).json({ message: '用户不存在' })
        res.json({ success: true, data: user })
    } catch (err) {
        next(err)  // 传给错误中间件
    }
}
```

### 2.3 JWT 认证中间件

```javascript
// middleware/auth.js
import jwt from 'jsonwebtoken'

export function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ message: '未提供 Token' })

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET)
        next()
    } catch (err) {
        res.status(401).json({ message: 'Token 无效或已过期' })
    }
}

// 生成 Token
export function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    )
}
```

---

## 三、Koa vs Express

| 特性 | Koa | Express |
|------|-----|---------|
| 中间件模型 | 洋葱模型（async/await） | 线性回调 |
| 错误处理 | try/catch（自然） | err 参数（4个参数中间件） |
| 内置功能 | 最小化（无路由/解析） | 含路由、静态文件等 |
| 版本 | 2.x（现代） | 4.x（老牌） |
| 生态 | 较小 | 庞大 |

```javascript
// Koa 洋葱模型（中间件请求进出都执行）
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'

const app = new Koa()
const router = new Router()

// 日志中间件（请求前后都执行）
app.use(async (ctx, next) => {
    const start = Date.now()
    await next()  // ← 执行后续中间件
    const ms = Date.now() - start
    console.log(`${ctx.method} ${ctx.url} ${ctx.status} ${ms}ms`)
})

// 错误处理（全局 try/catch）
app.use(async (ctx, next) => {
    try {
        await next()
    } catch (err) {
        ctx.status = err.status || 500
        ctx.body = { message: err.message }
    }
})

router.get('/users/:id', async (ctx) => {
    const user = await UserService.findById(ctx.params.id)
    if (!user) ctx.throw(404, '用户不存在')
    ctx.body = { success: true, data: user }
})

app.use(bodyParser())
app.use(router.routes())
app.listen(3000)
```

---

## 四、数据库连接池

```javascript
// db/postgres.js
import pg from 'pg'

const pool = new pg.Pool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    max:      20,    // 最大连接数
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
})

pool.on('error', (err) => {
    console.error('数据库连接池错误:', err)
})

export async function query(sql, params) {
    const client = await pool.connect()
    try {
        const result = await client.query(sql, params)
        return result.rows
    } finally {
        client.release()
    }
}

// 事务
export async function transaction(callback) {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        const result = await callback(client)
        await client.query('COMMIT')
        return result
    } catch (err) {
        await client.query('ROLLBACK')
        throw err
    } finally {
        client.release()
    }
}
```

---

## 总结

Node.js 后端最佳实践：
- 所有路由处理器包裹 `try/catch` 并 `next(err)` 传递给错误中间件
- 数据库操作使用**连接池**，不要每次 new 连接
- **JWT** 做无状态认证，refresh token 存 Redis
- 生产环境用 **PM2** 做进程守护和集群模式

---

*本文作者：林墨川 | 更新时间：2024年*
