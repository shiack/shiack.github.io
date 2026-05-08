# Jenkins 流水线：企业级 CI/CD 解决方案

> Jenkins 是最成熟的 CI/CD 工具，Declarative Pipeline 语法配合共享库，能构建可维护的企业级自动化流水线。

---

## 一、Declarative Pipeline 语法

```groovy
// Jenkinsfile
pipeline {
    agent any  // 在任意可用 agent 上运行

    environment {
        DOCKER_REGISTRY = 'registry.example.com'
        APP_NAME = 'my-service'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()          // 禁止并发构建
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log --oneline -5'
            }
        }

        stage('Build & Test') {
            parallel {  // 并行执行
                stage('Unit Test') {
                    steps {
                        sh 'mvn test -pl core'
                    }
                    post {
                        always {
                            junit 'core/target/surefire-reports/*.xml'
                        }
                    }
                }
                stage('Lint') {
                    steps {
                        sh 'mvn checkstyle:check'
                    }
                }
            }
        }

        stage('Build Docker') {
            steps {
                script {
                    def tag = "${env.BUILD_NUMBER}-${env.GIT_COMMIT[0..6]}"
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-credentials') {
                        def image = docker.build("${DOCKER_REGISTRY}/${APP_NAME}:${tag}")
                        image.push()
                        image.push('latest')
                        env.IMAGE_TAG = tag
                    }
                }
            }
        }

        stage('Deploy Staging') {
            when { branch 'main' }  // 只在 main 分支执行
            steps {
                withKubeConfig([credentialsId: 'k8s-staging']) {
                    sh """
                        kubectl set image deployment/${APP_NAME} \
                          app=${DOCKER_REGISTRY}/${APP_NAME}:${env.IMAGE_TAG} \
                          -n staging
                        kubectl rollout status deployment/${APP_NAME} -n staging
                    """
                }
            }
        }

        stage('Deploy Production') {
            when { branch 'main' }
            input {
                message "部署到生产环境？"
                ok "确认部署"
                parameters {
                    string(name: 'REASON', description: '部署原因')
                }
            }
            steps {
                withKubeConfig([credentialsId: 'k8s-prod']) {
                    sh "kubectl set image deployment/${APP_NAME} app=${DOCKER_REGISTRY}/${APP_NAME}:${env.IMAGE_TAG} -n prod"
                }
            }
        }
    }

    post {
        failure {
            emailext(
                subject: "构建失败: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "查看详情: ${env.BUILD_URL}",
                to: 'team@example.com'
            )
        }
        success {
            slackSend(channel: '#deployments', message: "✅ ${env.JOB_NAME} 部署成功")
        }
        always {
            cleanWs()  // 清理工作目录
        }
    }
}
```

---

## 二、共享库（Shared Libraries）

```
# 目录结构
jenkins-shared-library/
├── vars/
│   ├── deployToK8s.groovy    # 全局变量（可在 Jenkinsfile 直接调用）
│   └── buildDocker.groovy
└── src/
    └── com/example/
        └── Utils.groovy      # 工具类
```

```groovy
// vars/deployToK8s.groovy
def call(Map config) {
    def namespace = config.namespace ?: 'default'
    def image     = config.image
    def app       = config.app

    withKubeConfig([credentialsId: "k8s-${namespace}"]) {
        sh """
            kubectl set image deployment/${app} app=${image} -n ${namespace}
            kubectl rollout status deployment/${app} -n ${namespace} --timeout=5m
        """
    }
}

// Jenkinsfile 中使用
@Library('jenkins-shared-library') _

deployToK8s(
    namespace: 'production',
    app: 'my-service',
    image: "registry.example.com/my-service:${env.BUILD_NUMBER}"
)
```

---

## 三、动态 Agent（Kubernetes Pod）

```groovy
pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: maven
    image: maven:3.9-openjdk-17
    command: [cat]
    tty: true
  - name: docker
    image: docker:24-dind
    securityContext:
      privileged: true
"""
        }
    }
    stages {
        stage('Build') {
            steps {
                container('maven') {
                    sh 'mvn package -DskipTests'
                }
            }
        }
        stage('Docker Build') {
            steps {
                container('docker') {
                    sh 'docker build -t my-app .'
                }
            }
        }
    }
}
```

---

## 四、多分支流水线

```
Jenkins Job 配置：
  ├── Multibranch Pipeline
  │   └── Branch Sources: GitHub/GitLab
  │
  └── 自动扫描分支和 PR
       ├── main      → 部署生产
       ├── staging   → 部署预发
       ├── feature/* → 运行测试
       └── PR#123    → 评论测试结果
```

```groovy
// 根据分支名动态调整行为
stage('Deploy') {
    when {
        anyOf {
            branch 'main'
            branch 'staging'
        }
    }
    steps {
        script {
            def env = env.BRANCH_NAME == 'main' ? 'prod' : 'staging'
            deployToK8s(namespace: env, app: APP_NAME, image: "${IMAGE}:${BUILD_NUMBER}")
        }
    }
}
```

---

## 五、Pipeline 常用技巧

```groovy
// 1. 读取 yaml 配置
def config = readYaml file: 'deploy-config.yaml'
def replicas = config.production.replicas

// 2. 条件跳过
when {
    not { changeset "**/docs/**" }  // docs 变更不触发构建
}

// 3. 重试
retry(3) {
    sh 'docker push ...'
}

// 4. 超时保护
timeout(time: 5, unit: 'MINUTES') {
    sh 'kubectl rollout status ...'
}

// 5. 归档制品
archiveArtifacts artifacts: 'target/*.jar', fingerprint: true
```

---

## 总结

Jenkins Pipeline 关键实践：
- 用 **Declarative Pipeline** 而非 Scripted（更清晰，语法校验更好）
- **共享库** 封装通用步骤，跨项目复用
- **Kubernetes Pod Agent** 动态创建执行环境，资源按需分配
- **input 步骤** 在流水线中实现人工审批门
- 所有凭据通过 `withCredentials` 注入，不写在代码里

---

*本文作者：林墨川 | 更新时间：2024年*
