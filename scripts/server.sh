#!/usr/bin/env bash
# HTTP 静态服务器 PID 管理脚本
# 用法: ./scripts/server.sh {start|stop|restart|status}

set -euo pipefail

# ── 配置 ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

HOST="0.0.0.0"
PORT="7861"
PID_FILE="$SCRIPT_DIR/app.pid"
LOG_FILE="$SCRIPT_DIR/app.log"

# SIGTERM 后等待进程退出的最长秒数，超时则 SIGKILL
STOP_TIMEOUT=5

# ── 工具函数 ──────────────────────────────────────────────────────────────────

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# 检查 PID 文件中的进程是否仍在运行
is_running() {
    [[ -f "$PID_FILE" ]] || return 1
    local pid
    pid=$(cat "$PID_FILE")
    [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

# 读取已保存的 PID（不做存活检查）
saved_pid() {
    cat "$PID_FILE" 2>/dev/null || echo ""
}

# 检测端口是否被任意进程占用
port_in_use() {
    if command -v ss &>/dev/null; then
        ss -tlnp "sport = :$PORT" 2>/dev/null | grep -q ":$PORT"
    elif command -v lsof &>/dev/null; then
        lsof -i ":$PORT" -sTCP:LISTEN -t &>/dev/null
    else
        # 降级：尝试连接
        (echo >/dev/tcp/127.0.0.1/$PORT) 2>/dev/null
    fi
}

# ── 子命令 ────────────────────────────────────────────────────────────────────

cmd_start() {
    if is_running; then
        log "服务器已在运行 (PID=$(saved_pid))，跳过启动。"
        return 0
    fi

    if port_in_use; then
        log "错误：端口 $PORT 已被其他进程占用，无法启动。"
        exit 1
    fi

    log "启动服务器：scripts/http_server.py  $HOST:$PORT"
    log "工作目录：$ROOT_DIR"
    log "日志文件：$LOG_FILE"

    # 后台启动，将 stdout/stderr 追加到日志
    nohup python3 "$SCRIPT_DIR/http_server.py" \
        --bind "$HOST" --port "$PORT" --directory "$ROOT_DIR" \
        >> "$LOG_FILE" 2>&1 &
    
    local pid=$!
    echo "$pid" > "$PID_FILE"

    # 等待进程稳定（最多 2 秒）
    local i=0
    while (( i < 4 )); do
        sleep 0.5
        if ! kill -0 "$pid" 2>/dev/null; then
            log "错误：进程启动后立即退出，请检查日志：$LOG_FILE"
            rm -f "$PID_FILE"
            exit 1
        fi
        (( i++ ))
    done

    log "服务器已启动 (PID=$pid)  →  http://$HOST:$PORT"
}

cmd_stop() {
    if ! is_running; then
        log "服务器未运行。"
        [[ -f "$PID_FILE" ]] && rm -f "$PID_FILE"
        return 0
    fi

    local pid
    pid=$(saved_pid)
    log "正在停止服务器 (PID=$pid)…"

    kill -TERM "$pid" 2>/dev/null || true

    # 等待退出
    local i=0
    while kill -0 "$pid" 2>/dev/null; do
        sleep 1
        (( i++ ))
        if (( i >= STOP_TIMEOUT )); then
            log "警告：进程未在 ${STOP_TIMEOUT}s 内退出，发送 SIGKILL…"
            kill -KILL "$pid" 2>/dev/null || true
            break
        fi
    done

    rm -f "$PID_FILE"
    log "服务器已停止。"
}

cmd_restart() {
    cmd_stop
    sleep 0.5
    cmd_start
}

cmd_status() {
    if is_running; then
        local pid
        pid=$(saved_pid)
        echo "● 运行中  PID=$pid  http://$HOST:$PORT"
        echo "  日志：$LOG_FILE"
    else
        echo "○ 未运行"
        if [[ -f "$PID_FILE" ]]; then
            echo "  (遗留 PID 文件 PID=$(saved_pid)，进程已不存在)"
        fi
    fi
}

# ── 入口 ──────────────────────────────────────────────────────────────────────

case "${1:-}" in
    start)   cmd_start   ;;
    stop)    cmd_stop    ;;
    restart) cmd_restart ;;
    status)  cmd_status  ;;
    *)
        echo "用法: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
