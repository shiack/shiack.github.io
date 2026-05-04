const fs = require('fs');
const path = require('path');

const BLOG_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | CyberNavi</title>
    <link rel="stylesheet" href="../../css/cyber.css">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="../../js/blog-data.js"></script>
</head>
<body class="theme-cyber">
<!-- 主题切换按钮 -->
<div class="theme-toggle">
    <button class="theme-btn cyber active" id="themeCyber" title="Cyber 主题">🤖</button>
    <button class="theme-btn sakura" id="themeSakura" title="Sakura 主题">🌸</button>
</div>

<div class="container">
    <div class="nav-bar animate-fade-in">
        <div class="logo">✦ CYBER_NAVI ✦</div>
        <div class="nav-links">
            <a href="../../index.html">⌾ 简历</a>
            <a href="../blog-list.html">◉ 博客矩阵</a>
        </div>
    </div>

    <div class="cyber-card article-panel animate-fade-in delay-1">
        <a href="../blog-list.html" class="back-link">← 返回博客列表</a>
        
        <h1 class="article-title">{title}</h1>
        
        <div class="article-meta">
            <span class="meta-item">📅 {date}</span>
            <div class="tags">
                {tags_html}
            </div>
        </div>

        <div class="article-content" id="articleContent">
            {content}
        </div>
    </div>

    <!-- 同类标签博客列表 -->
    <div id="related-posts" class="related-section animate-fade-in delay-2"></div>
    
    <!-- 推荐博客 -->
    <div id="recommendations" class="related-section animate-fade-in delay-3"></div>
</div>

<script>
    const POST_ID = "{post_id}";
    
    // ========== 主题切换功能 ==========
    function setTheme(theme) {
        const body = document.body;
        const cyberBtn = document.getElementById('themeCyber');
        const sakuraBtn = document.getElementById('themeSakura');
        
        if (theme === 'cyber') {
            body.className = 'theme-cyber';
            cyberBtn.classList.add('active');
            sakuraBtn.classList.remove('active');
            localStorage.setItem('theme', 'cyber');
        } else {
            body.className = 'theme-sakura';
            sakuraBtn.classList.add('active');
            cyberBtn.classList.remove('active');
            localStorage.setItem('theme', 'sakura');
        }
    }

    // ========== 获取当前博客数据 ==========
    function getCurrentPost() {
        return BLOG_POSTS.find(p => p.id === POST_ID);
    }

    // ========== 获取同类标签博客 ==========
    function getRelatedPosts(excludeId, maxCount = 5) {
        const currentPost = getCurrentPost();
        if (!currentPost) return [];
        
        return BLOG_POSTS
            .filter(p => p.id !== excludeId && 
                        p.tags.some(tag => currentPost.tags.includes(tag)))
            .slice(0, maxCount);
    }

    // ========== 获取推荐博客 ==========
    function getRecommendations(excludeId, maxCount = 3) {
        const currentPost = getCurrentPost();
        if (!currentPost) return [];
        
        return BLOG_POSTS
            .filter(p => p.id !== excludeId)
            .sort((a, b) => b.weight - a.weight)
            .slice(0, maxCount);
    }

    // ========== 渲染同类博客列表 ==========
    function renderRelatedPosts() {
        const related = getRelatedPosts(POST_ID);
        const container = document.getElementById('related-posts');
        
        if (related.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = \`
            <div class="cyber-card">
                <h3>📚 同类标签博客</h3>
                <ul class="related-list">
                    \${related.map(p => \`
                        <li><a href="\${p.id}.html">\${p.title}</a></li>
                    \`).join('')}
                </ul>
            </div>
        \`;
    }

    // ========== 渲染推荐博客列表 ==========
    function renderRecommendations() {
        const recommendations = getRecommendations(POST_ID);
        const container = document.getElementById('recommendations');
        
        if (recommendations.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = \`
            <div class="cyber-card">
                <h3>⭐ 推荐阅读</h3>
                <ul class="related-list">
                    \${recommendations.map(p => \`
                        <li><a href="\${p.id}.html">\${p.title}</a></li>
                    \`).join('')}
                </ul>
            </div>
        \`;
    }

    document.addEventListener('DOMContentLoaded', function() {
        // 初始化主题
        const savedTheme = localStorage.getItem('theme') || 'cyber';
        setTheme(savedTheme);
        
        // 设置主题切换按钮事件
        document.getElementById('themeCyber').addEventListener('click', () => setTheme('cyber'));
        document.getElementById('themeSakura').addEventListener('click', () => setTheme('sakura'));
        
        // 渲染同类博客和推荐
        renderRelatedPosts();
        renderRecommendations();
    });
</script>
</body>
</html>
`;

const CONTENT_TEMPLATES = [
    `## 概述

{summary}

## 核心概念

### 概念一
这是文章的核心概念之一，深入理解这个概念对于掌握整个主题至关重要。

### 概念二
另一个重要概念，与概念一相辅相成，共同构成了完整的知识体系。

## 实现原理

\\`\\`\\`python
# 示例代码
def example_function(param):
    """这是一个示例函数"""
    return param * 2
\\`\\`\\`

## 实战技巧

1. **技巧一**：掌握基本操作，打好基础
2. **技巧二**：理解底层原理，深入本质
3. **技巧三**：多实践多总结，积累经验

## 总结

通过本文的学习，相信你已经对{title}有了深入的理解。继续探索，不断进步！`,
    
    `## 引言

{summary}

## 技术背景

随着技术的不断发展，{title}已经成为现代开发中不可或缺的一部分。

## 核心技术点

### 技术点 A
详细介绍技术点 A 的原理和应用场景。

### 技术点 B
深入分析技术点 B 的实现机制和最佳实践。

\\`\\`\\`javascript
// JavaScript 示例代码
const example = () => {
    console.log('Hello, World!');
};
\\`\\`\\`

## 实践案例

通过实际案例，我们可以更好地理解如何应用这些技术。

## 总结

希望本文能够帮助你更好地理解和应用{title}相关技术。`,
    
    `## 简介

{summary}

## 基础知识

在深入学习之前，我们需要掌握一些基础知识。

### 基础概念
理解这些基础概念是后续学习的前提。

### 准备工作
做好准备工作，确保学习顺利进行。

## 深入学习

\\`\\`\\`go
// Go 语言示例
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}
\\`\\`\\`

## 进阶技巧

掌握进阶技巧，可以让你的技能更上一层楼。

## 总结

学习是一个持续的过程，保持好奇心，不断探索！`,
    
    `## 前言

{summary}

## 核心原理

深入理解核心原理，才能真正掌握这项技术。

### 原理剖析
详细剖析技术背后的原理和机制。

### 工作流程
了解完整的工作流程，从输入到输出的全过程。

\\`\\`\\`java
// Java 示例代码
public class Example {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
\\`\\`\\`

## 应用场景

探讨技术的实际应用场景，帮助你更好地理解其价值。

## 总结

通过本文的学习，相信你已经掌握了{title}的核心知识。`,
    
    `## 介绍

{summary}

## 关键知识点

### 知识点一
深入讲解第一个关键知识点。

### 知识点二
详细介绍第二个关键知识点。

\\`\\`\\`rust
// Rust 示例代码
fn main() {
    println!("Hello, Rust!");
}
\\`\\`\\`

## 实践指南

提供详细的实践指南，帮助你快速上手。

## 常见问题

解答常见问题，帮助你避免踩坑。

## 总结

希望本文对你有所帮助，祝你学习愉快！`
];

const BLOG_DATA = [
    // ========== 后端技术博客 (10篇) ==========
    { id: "backend/1_java-virtual-machine-deep-dive", title: "深入理解 Java 虚拟机：内存模型与垃圾回收", date: "2025-03-01", tags: ["Java", "JVM", "性能优化"], summary: "深入剖析 JVM 内存结构、GC 算法原理，以及如何通过调优提升应用性能。" },
    { id: "backend/2_spring-boot-3-best-practices", title: "Spring Boot 3.x 最佳实践：从入门到精通", date: "2025-03-05", tags: ["Spring Boot", "Java", "微服务"], summary: "涵盖依赖管理、配置优化、安全加固、性能监控等企业级开发要点。" },
    { id: "backend/3_go-concurrent-programming", title: "Go 并发编程：Goroutine 与 Channel 深度解析", date: "2025-03-10", tags: ["Go", "分布式", "高并发"], summary: "系统学习 Go 并发模型，掌握 Goroutine 调度机制和 Channel 通信模式。" },
    { id: "backend/4_rust-memory-safety", title: "Rust 内存安全：所有权、借用与生命周期", date: "2025-03-15", tags: ["Rust", "系统编程", "内存安全"], summary: "深入理解 Rust 的核心特性，掌握零成本抽象下的内存安全保证。" },
    { id: "backend/5_mysql-optimization-guide", title: "MySQL 性能优化完全指南：索引与查询调优", date: "2025-03-20", tags: ["MySQL", "数据库", "性能优化"], summary: "从索引设计到查询优化，全面提升数据库性能的实战技巧。" },
    { id: "backend/6_redis-cluster-deployment", title: "Redis 集群部署与高可用方案设计", date: "2025-03-25", tags: ["Redis", "缓存", "分布式"], summary: "详解 Redis Cluster 架构、哨兵模式以及数据持久化策略。" },
    { id: "backend/7_kafka-stream-processing", title: "Kafka 流式处理：从消息队列到实时计算", date: "2025-04-01", tags: ["Kafka", "消息队列", "大数据"], summary: "深入 Kafka 核心概念，掌握流式处理和消息传递最佳实践。" },
    { id: "backend/8_microservices-architecture", title: "微服务架构设计：服务拆分与治理策略", date: "2025-04-05", tags: ["微服务", "架构", "Spring Cloud"], summary: "探讨微服务拆分原则、服务发现、负载均衡和熔断降级策略。" },
    { id: "backend/9_nginx-high-performance", title: "Nginx 高性能配置：反向代理与负载均衡", date: "2025-04-10", tags: ["Nginx", "服务器", "性能优化"], summary: "优化 Nginx 配置，实现高并发场景下的高性能服务。" },
    { id: "backend/10_distributed-transaction", title: "分布式事务解决方案：理论与实践", date: "2025-04-15", tags: ["分布式", "事务", "架构"], summary: "分析分布式事务的 CAP 理论，对比各种解决方案的优缺点。" },
    
    // ========== 前端技术博客 (10篇) ==========
    { id: "frontend/1_react-18-new-features", title: "React 18 新特性详解：并发模式与 Suspense", date: "2025-03-02", tags: ["React", "前端", "性能优化"], summary: "深入理解 React 18 的并发特性、自动批处理和 Suspense 新能力。" },
    { id: "frontend/2_typescript-advanced-types", title: "TypeScript 高级类型：从基础到类型体操", date: "2025-03-07", tags: ["TypeScript", "前端", "类型系统"], summary: "掌握条件类型、映射类型、模板字面量类型等高级特性。" },
    { id: "frontend/3_vue-3-composition-api", title: "Vue 3 Composition API 完全指南", date: "2025-03-12", tags: ["Vue", "前端", "响应式"], summary: "深入学习组合式 API 的设计理念和最佳实践。" },
    { id: "frontend/4_css-grid-flexbox-mastery", title: "CSS Grid 与 Flexbox 精通指南", date: "2025-03-17", tags: ["CSS", "前端", "布局"], summary: "掌握现代 CSS 布局技术，构建灵活响应式界面。" },
    { id: "frontend/5_webassembly-performance", title: "WebAssembly 性能优化：从入门到实战", date: "2025-03-22", tags: ["WebAssembly", "前端", "性能优化"], summary: "利用 WebAssembly 提升前端应用性能的实践指南。" },
    { id: "frontend/6_vite-build-optimization", title: "Vite 构建优化：从开发到生产", date: "2025-03-27", tags: ["Vite", "前端", "构建工具"], summary: "深入 Vite 核心原理，优化构建速度和产物体积。" },
    { id: "frontend/7_nodejs-backend-development", title: "Node.js 后端开发：Express 与 Koa 实战", date: "2025-04-02", tags: ["Node.js", "前端", "后端"], summary: "使用 Node.js 构建高性能 RESTful API 的最佳实践。" },
    { id: "frontend/8_tailwindcss-best-practices", title: "Tailwind CSS 最佳实践：原子化 CSS 设计", date: "2025-04-07", tags: ["Tailwind", "CSS", "UI/UX"], summary: "掌握 Tailwind CSS 的设计模式和组件化开发技巧。" },
    { id: "frontend/9_frontend-performance-checklist", title: "前端性能优化清单：从加载到渲染", date: "2025-04-12", tags: ["前端性能", "性能优化", "Web Vitals"], summary: "全面的前端性能优化指南，涵盖加载优化、运行时优化等方面。" },
    { id: "frontend/10_web-security-best-practices", title: "Web 安全最佳实践：XSS、CSRF 与 CSP", date: "2025-04-17", tags: ["前端", "安全", "防护"], summary: "深入理解常见 Web 安全威胁及其防护策略。" },
    
    // ========== 大模型技术博客 (10篇) ==========
    { id: "ai/1_llm-fundamentals", title: "大语言模型基础：Transformer 架构详解", date: "2025-03-03", tags: ["LLM", "深度学习", "Transformer"], summary: "深入理解 Transformer 架构的核心组件和工作原理。" },
    { id: "ai/2_prompt-engineering-guide", title: "Prompt 工程完全指南：从基础到高级", date: "2025-03-08", tags: ["Prompt Engineering", "LLM", "GPT"], summary: "掌握有效的提示词设计技巧，提升 LLM 应用效果。" },
    { id: "ai/3_rag-implementation", title: "RAG 技术实现：检索增强生成实战", date: "2025-03-13", tags: ["RAG", "LLM", "向量数据库"], summary: "构建基于 RAG 的问答系统，实现知识库增强。" },
    { id: "ai/4_langchain-tutorial", title: "LangChain 实战：构建 LLM 应用程序", date: "2025-03-18", tags: ["LangChain", "LLM", "Agent"], summary: "利用 LangChain 框架快速构建复杂的 LLM 应用。" },
    { id: "ai/5_vector-database-comparison", title: "向量数据库对比：Pinecone vs Weaviate vs Milvus", date: "2025-03-23", tags: ["向量数据库", "RAG", "Embedding"], summary: "分析主流向量数据库的特性、性能和适用场景。" },
    { id: "ai/6_llm-fine-tuning", title: "LLM 微调实战：从数据准备到部署", date: "2025-03-28", tags: ["微调", "LLM", "深度学习"], summary: "完整的 LLM 微调流程，包括数据准备、训练和部署。" },
    { id: "ai/7_embedding-techniques", title: "Embedding 技术详解：从 BERT 到 Sentence-BERT", date: "2025-04-03", tags: ["Embedding", "LLM", "NLP"], summary: "深入理解文本嵌入技术及其在语义搜索中的应用。" },
    { id: "ai/8_llm-agent-framework", title: "LLM Agent 框架：构建智能代理系统", date: "2025-04-08", tags: ["Agent", "LLM", "自动化"], summary: "学习如何构建能够自主完成任务的 LLM Agent。" },
    { id: "ai/9_multimodal-llm", title: "多模态大模型：文本与图像的融合", date: "2025-04-13", tags: ["多模态", "LLM", "计算机视觉"], summary: "探索多模态大模型的架构设计和应用场景。" },
    { id: "ai/10_llm-deployment-best-practices", title: "LLM 部署最佳实践：性能优化与成本控制", date: "2025-04-18", tags: ["LLM", "部署", "优化"], summary: "掌握 LLM 部署的关键技术，平衡性能与成本。" },
    
    // ========== 测试开发技术博客 (10篇) ==========
    { id: "testdev/1_ci-cd-pipeline-design", title: "CI/CD 流水线设计：从概念到实践", date: "2025-03-04", tags: ["CI/CD", "DevOps", "自动化"], summary: "设计高效的持续集成和持续部署流水线。" },
    { id: "testdev/2_docker-containerization", title: "Docker 容器化实战：从入门到精通", date: "2025-03-09", tags: ["Docker", "容器", "DevOps"], summary: "掌握 Docker 镜像构建、容器编排和最佳实践。" },
    { id: "testdev/3_kubernetes-fundamentals", title: "Kubernetes 基础：Pod、Service 与 Deployment", date: "2025-03-14", tags: ["Kubernetes", "容器编排", "DevOps"], summary: "深入理解 K8s 核心概念和资源对象。" },
    { id: "testdev/4_github-actions-workflow", title: "GitHub Actions 工作流：自动化部署实战", date: "2025-03-19", tags: ["GitHub Actions", "CI/CD", "自动化"], summary: "利用 GitHub Actions 实现自动化构建和部署。" },
    { id: "testdev/5_jenkins-pipeline", title: "Jenkins 流水线：企业级 CI/CD 解决方案", date: "2025-03-24", tags: ["Jenkins", "CI/CD", "DevOps"], summary: "构建企业级 Jenkins 流水线，实现自动化运维。" },
    { id: "testdev/6_helm-chart-development", title: "Helm Chart 开发：K8s 应用包管理", date: "2025-03-29", tags: ["Helm", "Kubernetes", "DevOps"], summary: "学习 Helm Chart 的设计模式和最佳实践。" },
    { id: "testdev/7_istio-service-mesh", title: "Istio 服务网格：微服务治理实战", date: "2025-04-04", tags: ["Istio", "服务网格", "Kubernetes"], summary: "利用 Istio 实现微服务的流量管理和安全控制。" },
    { id: "testdev/8_prometheus-monitoring", title: "Prometheus 监控：指标采集与告警配置", date: "2025-04-09", tags: ["Prometheus", "监控", "DevOps"], summary: "构建全面的监控体系，实现智能化告警。" },
    { id: "testdev/9_grafana-dashboard", title: "Grafana 仪表盘：可视化监控数据", date: "2025-04-14", tags: ["Grafana", "监控", "可视化"], summary: "创建美观的监控仪表盘，实时掌握系统状态。" },
    { id: "testdev/10_automated-testing-strategy", title: "自动化测试策略：单元测试到端到端测试", date: "2025-04-19", tags: ["自动化测试", "测试开发", "质量保障"], summary: "制定全面的自动化测试策略，保障软件质量。" },
    
    // ========== 自动化技术博客 (10篇) ==========
    { id: "automation/1_python-automation-basics", title: "Python 自动化基础：脚本编写与执行", date: "2025-03-05", tags: ["Python", "自动化", "脚本"], summary: "学习 Python 自动化脚本的编写方法和最佳实践。" },
    { id: "automation/2_web-scraping-with-python", title: "Python 网络爬虫：从基础到高级", date: "2025-03-10", tags: ["爬虫", "Python", "数据采集"], summary: "掌握 Scrapy、BeautifulSoup 等爬虫框架的使用。" },
    { id: "automation/3_selenium-web-automation", title: "Selenium 网页自动化：浏览器操作与测试", date: "2025-03-15", tags: ["Selenium", "自动化", "测试"], summary: "利用 Selenium 实现网页自动化操作和测试。" },
    { id: "automation/4_playwright-modern-automation", title: "Playwright：新一代浏览器自动化工具", date: "2025-03-20", tags: ["Playwright", "自动化", "测试"], summary: "体验 Playwright 的强大功能，实现可靠的端到端测试。" },
    { id: "automation/5_etl-pipeline-design", title: "ETL 流水线设计：数据抽取、转换与加载", date: "2025-03-25", tags: ["ETL", "数据处理", "自动化"], summary: "设计高效的 ETL 流程，实现数据自动化处理。" },
    { id: "automation/6_airflow-workflow-orchestration", title: "Airflow 工作流编排：任务调度与监控", date: "2025-03-30", tags: ["Airflow", "工作流", "自动化"], summary: "利用 Airflow 编排复杂的数据流和任务依赖。" },
    { id: "automation/7_rpa-introduction", title: "RPA 机器人流程自动化：概念与实践", date: "2025-04-05", tags: ["RPA", "自动化", "工作流"], summary: "了解 RPA 技术，实现重复性工作的自动化。" },
    { id: "automation/8_celery-task-queue", title: "Celery 任务队列：异步任务处理", date: "2025-04-10", tags: ["Celery", "Python", "异步"], summary: "构建分布式任务队列，处理耗时操作。" },
    { id: "automation/9_python-data-processing", title: "Python 数据处理：Pandas 与 NumPy 实战", date: "2025-04-15", tags: ["Python", "数据处理", "Pandas"], summary: "掌握 Pandas 和 NumPy 的数据处理技巧。" },
    { id: "automation/10_automation-best-practices", title: "自动化最佳实践：可维护性与扩展性", date: "2025-04-20", tags: ["自动化", "最佳实践", "架构"], summary: "设计可维护、可扩展的自动化系统的关键原则。" }
];

function generateBlog(post) {
    const tags_html = post.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ');
    const templateIndex = post.id.length % CONTENT_TEMPLATES.length;
    const content = CONTENT_TEMPLATES[templateIndex]
        .replace(/{title}/g, post.title)
        .replace(/{summary}/g, post.summary);
    
    let htmlContent = BLOG_TEMPLATE
        .replace(/{title}/g, post.title)
        .replace(/{date}/g, post.date)
        .replace(/{tags_html}/g, tags_html)
        .replace(/{content}/g, content)
        .replace(/{post_id}/g, post.id);
    
    const filepath = `blogs/${post.id}.html`;
    const dir = path.dirname(filepath);
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, htmlContent, 'utf-8');
    console.log(`Created: ${filepath}`);
}

let count = 0;
BLOG_DATA.forEach(post => {
    generateBlog(post);
    count++;
});

console.log(`\nSuccessfully generated ${count} blog pages!`);
