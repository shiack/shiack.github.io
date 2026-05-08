// blog-data.js - 所有博客的元数据
// 新增博客时：1. 在下方添加记录  2. 在 blogs/assets/posts/ 目录创建对应的 Markdown 文件

const BLOG_CONFIG = {
    BLOG_FOLDER: 'src/pages/blogs',
    POSTS_FOLDER: 'src/assets/posts',
    USE_CLEAN_URL: false,
    MARKDOWN_EXT: '.md',
};

const TAG_CATEGORIES = {
    backend: {
        name: '后端技术',
        priority: 1,
        tags: ['Java', 'JVM', 'Go', 'Rust', 'Spring Boot', 'Spring Cloud', 'MySQL', 'Redis', 'Kafka', '微服务', '分布式', 'Nginx']
    },
    frontend: {
        name: '前端技术',
        priority: 2,
        tags: ['React', 'Vue', 'TypeScript', 'Node.js', 'CSS', 'Vite', 'WebAssembly', 'Tailwind CSS', '性能优化', 'Web安全']
    },
    ai: {
        name: 'AI & 大模型',
        priority: 3,
        tags: ['LLM', 'RAG', 'LangChain', 'Prompt Engineering', '向量数据库', 'AI Agent', 'Embedding', 'LLM微调', '多模态', '深度学习']
    },
    testdev: {
        name: '测试开发',
        priority: 4,
        tags: ['自动化测试', 'Playwright', 'Selenium', 'Pytest', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Docker', 'Kubernetes', 'Prometheus', 'Grafana']
    },
    automation: {
        name: '自动化工具',
        priority: 5,
        tags: ['Python', 'Airflow', 'Celery', 'ETL', 'RPA', '数据处理']
    }
};

const TAG_TO_CATEGORY = {
    // 后端技术
    'Java': 'backend',
    'JVM': 'backend',
    'GC调优': 'backend',
    'Go': 'backend',
    'Goroutine': 'backend',
    'Rust': 'backend',
    'Spring Boot': 'backend',
    'Spring Cloud': 'backend',
    'MySQL': 'backend',
    'Redis': 'backend',
    'Kafka': 'backend',
    '微服务': 'backend',
    '服务治理': 'backend',
    '分布式': 'backend',
    '分布式事务': 'backend',
    '高并发': 'backend',
    'Nginx': 'backend',
    '负载均衡': 'backend',

    // 前端技术
    'React': 'frontend',
    'Vue': 'frontend',
    'Composition API': 'frontend',
    'TypeScript': 'frontend',
    'Node.js': 'frontend',
    'CSS': 'frontend',
    'Vite': 'frontend',
    'WebAssembly': 'frontend',
    'Tailwind CSS': 'frontend',
    '性能优化': 'frontend',
    'Web Vitals': 'frontend',
    'Web安全': 'frontend',

    // AI & 大模型
    'LLM': 'ai',
    'RAG': 'ai',
    'LangChain': 'ai',
    'Prompt Engineering': 'ai',
    '向量数据库': 'ai',
    'AI Agent': 'ai',
    'Embedding': 'ai',
    'LLM微调': 'ai',
    '多模态': 'ai',
    '深度学习': 'ai',
    'NLP': 'ai',
    'LLM部署': 'ai',

    // 测试开发
    '自动化测试': 'testdev',
    '测试策略': 'testdev',
    'Playwright': 'testdev',
    'Selenium': 'testdev',
    'CI/CD': 'testdev',
    'Jenkins': 'testdev',
    'GitHub Actions': 'testdev',
    'Docker': 'testdev',
    'Kubernetes': 'testdev',
    '容器化': 'testdev',
    'Helm': 'testdev',
    'Istio': 'testdev',
    '服务网格': 'testdev',
    'Prometheus': 'testdev',
    'Grafana': 'testdev',
    '可观测性': 'testdev',
    'DevOps': 'testdev',

    // 自动化工具
    'Python': 'automation',
    'Airflow': 'automation',
    'Celery': 'automation',
    'ETL': 'automation',
    'RPA': 'automation',
    '数据处理': 'automation',
    '网络爬虫': 'automation',
    '任务调度': 'automation',
};

const BLOG_PATH = BLOG_CONFIG.BLOG_FOLDER;
const BLOG_INDEX_PATH = BLOG_PATH + '/blog-list.html';

// ========== 后端技术博客 (10篇) ==========
const BACKEND_POSTS = [
    {
        id: "backend/1_java-virtual-machine-deep-dive",
        title: "深入理解 Java 虚拟机：内存模型与垃圾回收",
        date: "2025-03-01",
        tags: ["Java", "JVM", "GC调优"],
        category: "backend",
        weight: 98,
        summary: "深入剖析 JVM 内存结构、GC 算法原理，以及如何通过调优提升应用性能。"
    },
    {
        id: "backend/2_spring-boot-3-best-practices",
        title: "Spring Boot 3.x 最佳实践：从入门到精通",
        date: "2025-03-05",
        tags: ["Spring Boot", "Java", "微服务"],
        category: "backend",
        weight: 95,
        summary: "涵盖依赖管理、配置优化、安全加固、性能监控等企业级开发要点。"
    },
    {
        id: "backend/3_go-concurrent-programming",
        title: "Go 并发编程：Goroutine 与 Channel 深度解析",
        date: "2025-03-10",
        tags: ["Go", "Goroutine", "高并发"],
        category: "backend",
        weight: 93,
        summary: "系统学习 Go 并发模型，掌握 Goroutine 调度机制和 Channel 通信模式。"
    },
    {
        id: "backend/4_rust-memory-safety",
        title: "Rust 内存安全：所有权、借用与生命周期",
        date: "2025-03-15",
        tags: ["Rust", "分布式"],
        category: "backend",
        weight: 96,
        summary: "深入理解 Rust 的核心特性，掌握零成本抽象下的内存安全保证。"
    },
    {
        id: "backend/5_mysql-optimization-guide",
        title: "MySQL 性能优化完全指南：索引与查询调优",
        date: "2025-03-20",
        tags: ["MySQL", "高并发"],
        category: "backend",
        weight: 92,
        summary: "从索引设计到查询优化，全面提升数据库性能的实战技巧。"
    },
    {
        id: "backend/6_redis-cluster-deployment",
        title: "Redis 集群部署与高可用方案设计",
        date: "2025-03-25",
        tags: ["Redis", "分布式"],
        category: "backend",
        weight: 90,
        summary: "详解 Redis Cluster 架构、哨兵模式以及数据持久化策略。"
    },
    {
        id: "backend/7_kafka-stream-processing",
        title: "Kafka 流式处理：从消息队列到实时计算",
        date: "2025-04-01",
        tags: ["Kafka", "分布式"],
        category: "backend",
        weight: 94,
        summary: "深入 Kafka 核心概念，掌握流式处理和消息传递最佳实践。"
    },
    {
        id: "backend/8_microservices-architecture",
        title: "微服务架构设计：服务拆分与治理策略",
        date: "2025-04-05",
        tags: ["微服务", "Spring Cloud", "服务治理"],
        category: "backend",
        weight: 97,
        summary: "探讨微服务拆分原则、服务发现、负载均衡和熔断降级策略。"
    },
    {
        id: "backend/9_nginx-high-performance",
        title: "Nginx 高性能配置：反向代理与负载均衡",
        date: "2025-04-10",
        tags: ["Nginx", "负载均衡", "高并发"],
        category: "backend",
        weight: 88,
        summary: "优化 Nginx 配置，实现高并发场景下的高性能服务。"
    },
    {
        id: "backend/10_distributed-transaction",
        title: "分布式事务解决方案：理论与实践",
        date: "2025-04-15",
        tags: ["分布式", "分布式事务"],
        category: "backend",
        weight: 91,
        summary: "分析分布式事务的 CAP 理论，对比各种解决方案的优缺点。"
    }
];

// ========== 前端技术博客 (10篇) ==========
const FRONTEND_POSTS = [
    {
        id: "frontend/1_react-18-new-features",
        title: "React 18 新特性详解：并发模式与 Suspense",
        date: "2025-03-02",
        tags: ["React", "性能优化"],
        category: "frontend",
        weight: 96,
        summary: "深入理解 React 18 的并发特性、自动批处理和 Suspense 新能力。"
    },
    {
        id: "frontend/2_typescript-5-features",
        title: "TypeScript 5.0 装饰器与类型推断增强",
        date: "2025-03-07",
        tags: ["TypeScript"],
        category: "frontend",
        weight: 94,
        summary: "TypeScript 5.0 的装饰器语法、标准化的类型参数默认值及 JSDoc 类型推断改进。"
    },
    {
        id: "frontend/3_vue-3-composition-api",
        title: "Vue 3 Composition API 完全指南",
        date: "2025-03-12",
        tags: ["Vue", "Composition API"],
        category: "frontend",
        weight: 92,
        summary: "深入学习组合式 API 的设计理念和最佳实践。"
    },
    {
        id: "frontend/4_css-grid-flexbox-mastery",
        title: "CSS Grid 与 Flexbox 精通指南",
        date: "2025-03-17",
        tags: ["CSS"],
        category: "frontend",
        weight: 90,
        summary: "掌握现代 CSS 布局技术，构建灵活响应式界面。"
    },
    {
        id: "frontend/5_webassembly-performance",
        title: "WebAssembly 性能优化：从入门到实战",
        date: "2025-03-22",
        tags: ["WebAssembly", "性能优化"],
        category: "frontend",
        weight: 93,
        summary: "利用 WebAssembly 提升前端应用性能的实践指南。"
    },
    {
        id: "frontend/6_vite-build-optimization",
        title: "Vite 构建优化：从开发到生产",
        date: "2025-03-27",
        tags: ["Vite", "性能优化"],
        category: "frontend",
        weight: 89,
        summary: "深入 Vite 核心原理，优化构建速度和产物体积。"
    },
    {
        id: "frontend/7_nodejs-backend-development",
        title: "Node.js 后端开发：Express 与 Koa 实战",
        date: "2025-04-02",
        tags: ["Node.js"],
        category: "frontend",
        weight: 91,
        summary: "使用 Node.js 构建高性能 RESTful API 的最佳实践。"
    },
    {
        id: "frontend/8_tailwindcss-best-practices",
        title: "Tailwind CSS 最佳实践：原子化 CSS 设计",
        date: "2025-04-07",
        tags: ["Tailwind CSS", "CSS"],
        category: "frontend",
        weight: 88,
        summary: "掌握 Tailwind CSS 的设计模式和组件化开发技巧。"
    },
    {
        id: "frontend/9_frontend-performance-checklist",
        title: "前端性能优化清单：从加载到渲染",
        date: "2025-04-12",
        tags: ["性能优化", "Web Vitals"],
        category: "frontend",
        weight: 95,
        summary: "全面的前端性能优化指南，涵盖加载优化、运行时优化等方面。"
    },
    {
        id: "frontend/10_web-security-best-practices",
        title: "Web 安全最佳实践：XSS、CSRF 与 CSP",
        date: "2025-04-17",
        tags: ["Web安全"],
        category: "frontend",
        weight: 93,
        summary: "深入理解常见 Web 安全威胁及其防护策略。"
    }
];

// ========== 大模型技术博客 (10篇) ==========
const AI_POSTS = [
    {
        id: "ai/1_langchain-rag-knowledge-base",
        title: "LangChain 与 RAG：构建企业级知识库问答系统",
        date: "2025-03-03",
        tags: ["LangChain", "RAG", "向量数据库"],
        category: "ai",
        weight: 97,
        summary: "使用 LangChain 框架和 RAG 技术构建企业级知识库问答系统的完整指南。"
    },
    {
        id: "ai/2_prompt-engineering-advanced",
        title: "Prompt Engineering 进阶：思维链与结构化输出",
        date: "2025-03-08",
        tags: ["Prompt Engineering", "LLM"],
        category: "ai",
        weight: 95,
        summary: "掌握 Chain of Thought 推理和 Structured Output 技术，提升 LLM 应用效果。"
    },
    {
        id: "ai/3_rag-implementation",
        title: "RAG 技术实现：检索增强生成实战",
        date: "2025-03-13",
        tags: ["RAG", "向量数据库", "LLM"],
        category: "ai",
        weight: 94,
        summary: "构建基于 RAG 的问答系统，实现知识库增强。"
    },
    {
        id: "ai/4_langchain-tutorial",
        title: "LangChain 实战：构建 LLM 应用程序",
        date: "2025-03-18",
        tags: ["LangChain", "AI Agent", "LLM"],
        category: "ai",
        weight: 92,
        summary: "利用 LangChain 框架快速构建复杂的 LLM 应用。"
    },
    {
        id: "ai/5_vector-database-comparison",
        title: "向量数据库对比：Pinecone vs Weaviate vs Milvus",
        date: "2025-03-23",
        tags: ["向量数据库", "RAG", "Embedding"],
        category: "ai",
        weight: 90,
        summary: "分析主流向量数据库的特性、性能和适用场景。"
    },
    {
        id: "ai/6_llm-fine-tuning",
        title: "LLM 微调实战：从数据准备到部署",
        date: "2025-03-28",
        tags: ["LLM微调", "深度学习", "LLM"],
        category: "ai",
        weight: 96,
        summary: "完整的 LLM 微调流程，包括数据准备、训练和部署。"
    },
    {
        id: "ai/7_embedding-techniques",
        title: "Embedding 技术详解：从 BERT 到 Sentence-BERT",
        date: "2025-04-03",
        tags: ["Embedding", "NLP", "LLM"],
        category: "ai",
        weight: 91,
        summary: "深入理解文本嵌入技术及其在语义搜索中的应用。"
    },
    {
        id: "ai/8_llm-agent-framework",
        title: "LLM Agent 框架：构建智能代理系统",
        date: "2025-04-08",
        tags: ["AI Agent", "LangChain", "LLM"],
        category: "ai",
        weight: 93,
        summary: "学习如何构建能够自主完成任务的 LLM Agent。"
    },
    {
        id: "ai/9_multimodal-llm",
        title: "多模态大模型：文本与图像的融合",
        date: "2025-04-13",
        tags: ["多模态", "深度学习", "LLM"],
        category: "ai",
        weight: 94,
        summary: "探索多模态大模型的架构设计和应用场景。"
    },
    {
        id: "ai/10_llm-deployment-best-practices",
        title: "LLM 部署最佳实践：性能优化与成本控制",
        date: "2025-04-18",
        tags: ["LLM部署", "LLM"],
        category: "ai",
        weight: 92,
        summary: "掌握 LLM 部署的关键技术，平衡性能与成本。"
    }
];

// ========== 测试开发技术博客 (10篇) ==========
const TESTDEV_POSTS = [
    {
        id: "testdev/1_kubernetes-production-guide",
        title: "Kubernetes 核心原理与生产环境集群搭建",
        date: "2025-03-04",
        tags: ["Kubernetes", "Docker", "DevOps"],
        category: "testdev",
        weight: 95,
        summary: "深入解析 K8s 核心概念与架构，提供生产环境集群搭建指南。"
    },
    {
        id: "testdev/2_github-actions-cicd",
        title: "GitHub Actions 进阶：多环境部署与缓存策略",
        date: "2025-03-09",
        tags: ["GitHub Actions", "CI/CD"],
        category: "testdev",
        weight: 93,
        summary: "使用 GitHub Actions 实现多环境部署、智能缓存和自定义 action 开发。"
    },
    {
        id: "testdev/3_kubernetes-fundamentals",
        title: "Kubernetes 基础：Pod、Service 与 Deployment",
        date: "2025-03-14",
        tags: ["Kubernetes", "容器化"],
        category: "testdev",
        weight: 96,
        summary: "深入理解 K8s 核心概念和资源对象。"
    },
    {
        id: "testdev/4_github-actions-workflow",
        title: "GitHub Actions 工作流：自动化部署实战",
        date: "2025-03-19",
        tags: ["GitHub Actions", "CI/CD"],
        category: "testdev",
        weight: 91,
        summary: "利用 GitHub Actions 实现自动化构建和部署。"
    },
    {
        id: "testdev/5_jenkins-pipeline",
        title: "Jenkins 流水线：企业级 CI/CD 解决方案",
        date: "2025-03-24",
        tags: ["Jenkins", "CI/CD"],
        category: "testdev",
        weight: 89,
        summary: "构建企业级 Jenkins 流水线，实现自动化运维。"
    },
    {
        id: "testdev/6_helm-chart-development",
        title: "Helm Chart 开发：K8s 应用包管理",
        date: "2025-03-29",
        tags: ["Helm", "Kubernetes"],
        category: "testdev",
        weight: 90,
        summary: "学习 Helm Chart 的设计模式和最佳实践。"
    },
    {
        id: "testdev/7_istio-service-mesh",
        title: "Istio 服务网格：微服务治理实战",
        date: "2025-04-04",
        tags: ["Istio", "服务网格", "Kubernetes"],
        category: "testdev",
        weight: 94,
        summary: "利用 Istio 实现微服务的流量管理和安全控制。"
    },
    {
        id: "testdev/8_prometheus-monitoring",
        title: "Prometheus 监控：指标采集与告警配置",
        date: "2025-04-09",
        tags: ["Prometheus", "可观测性"],
        category: "testdev",
        weight: 92,
        summary: "构建全面的监控体系，实现智能化告警。"
    },
    {
        id: "testdev/9_grafana-dashboard",
        title: "Grafana 仪表盘：可视化监控数据",
        date: "2025-04-14",
        tags: ["Grafana", "可观测性"],
        category: "testdev",
        weight: 90,
        summary: "创建美观的监控仪表盘，实时掌握系统状态。"
    },
    {
        id: "testdev/10_automated-testing-strategy",
        title: "自动化测试策略：单元测试到端到端测试",
        date: "2025-04-19",
        tags: ["自动化测试", "测试策略"],
        category: "testdev",
        weight: 93,
        summary: "制定全面的自动化测试策略，保障软件质量。"
    }
];

// ========== 自动化技术博客 (10篇) ==========
const AUTOMATION_POSTS = [
    {
        id: "automation/1_python-web-scraping",
        title: "Python 爬虫进阶：反爬策略与异步并发",
        date: "2025-03-05",
        tags: ["Python", "网络爬虫"],
        category: "automation",
        weight: 90,
        summary: "掌握 Python 爬虫的反反爬策略、异步并发爬取和大规模数据存储方案。"
    },
    {
        id: "automation/2_python-automation-office",
        title: "Python 自动化办公：Excel、PDF 与邮件处理实战",
        date: "2025-03-10",
        tags: ["Python", "数据处理"],
        category: "automation",
        weight: 92,
        summary: "使用 Python 处理 Excel 数据、PDF 文档操作和邮件自动发送，提升办公效率。"
    },
    {
        id: "automation/3_selenium-web-automation",
        title: "Selenium 网页自动化：浏览器操作与测试",
        date: "2025-03-15",
        tags: ["Selenium", "自动化测试"],
        category: "automation",
        weight: 91,
        summary: "利用 Selenium 实现网页自动化操作和测试。"
    },
    {
        id: "automation/4_playwright-modern-automation",
        title: "Playwright：新一代浏览器自动化工具",
        date: "2025-03-20",
        tags: ["Playwright", "自动化测试"],
        category: "automation",
        weight: 93,
        summary: "体验 Playwright 的强大功能，实现可靠的端到端测试。"
    },
    {
        id: "automation/5_etl-pipeline-design",
        title: "ETL 流水线设计：数据抽取、转换与加载",
        date: "2025-03-25",
        tags: ["ETL", "数据处理"],
        category: "automation",
        weight: 94,
        summary: "设计高效的 ETL 流程，实现数据自动化处理。"
    },
    {
        id: "automation/6_airflow-workflow-orchestration",
        title: "Airflow 工作流编排：任务调度与监控",
        date: "2025-03-30",
        tags: ["Airflow", "任务调度"],
        category: "automation",
        weight: 92,
        summary: "利用 Airflow 编排复杂的数据流和任务依赖。"
    },
    {
        id: "automation/7_rpa-introduction",
        title: "RPA 机器人流程自动化：概念与实践",
        date: "2025-04-05",
        tags: ["RPA"],
        category: "automation",
        weight: 89,
        summary: "了解 RPA 技术，实现重复性工作的自动化。"
    },
    {
        id: "automation/8_celery-task-queue",
        title: "Celery 任务队列：异步任务处理",
        date: "2025-04-10",
        tags: ["Celery", "Python"],
        category: "automation",
        weight: 90,
        summary: "构建分布式任务队列，处理耗时操作。"
    },
    {
        id: "automation/9_python-data-processing",
        title: "Python 数据处理：Pandas 与 NumPy 实战",
        date: "2025-04-15",
        tags: ["Python", "数据处理"],
        category: "automation",
        weight: 91,
        summary: "掌握 Pandas 和 NumPy 的数据处理技巧。"
    },
    {
        id: "automation/10_automation-best-practices",
        title: "自动化最佳实践：可维护性与扩展性",
        date: "2025-04-20",
        tags: ["Python", "自动化测试"],
        category: "automation",
        weight: 93,
        summary: "设计可维护、可扩展的自动化系统的关键原则。"
    }
];

// 合并所有博客
const BLOG_POSTS = [
    ...BACKEND_POSTS,
    ...FRONTEND_POSTS,
    ...AI_POSTS,
    ...TESTDEV_POSTS,
    ...AUTOMATION_POSTS
].sort((a, b) => b.weight - a.weight);
