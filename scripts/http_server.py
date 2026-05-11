#!/usr/bin/env python3
"""
静态文件服务器
- 支持 HTTP Range 请求（音频 / 视频流式播放）
- 屏蔽客户端断连噪音（BrokenPipeError / ConnectionResetError）
- 多线程处理并发请求
"""

import os
import sys
import signal
import argparse
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

# 客户端主动断连产生的无害异常类型
_CLIENT_GONE = (BrokenPipeError, ConnectionResetError, ConnectionAbortedError)


class RangeRequestHandler(SimpleHTTPRequestHandler):
    """在 SimpleHTTPRequestHandler 基础上增加 Range 支持。"""

    def do_GET(self):
        range_header = self.headers.get('Range')
        if range_header:
            self._serve_range(range_header)
        else:
            super().do_GET()

    def _serve_range(self, range_header: str):
        """处理 Range 请求，返回 206 Partial Content。"""
        path = self.translate_path(self.path)

        if os.path.isdir(path):
            super().do_GET()
            return

        try:
            file_size = os.path.getsize(path)
        except OSError:
            self.send_error(404, 'File not found')
            return

        # 解析 "bytes=start-end"（仅支持单区间）
        try:
            unit, rng = range_header.strip().split('=', 1)
            if unit.strip() != 'bytes':
                raise ValueError('unsupported unit')
            start_s, end_s = rng.split('-', 1)
            start = int(start_s) if start_s else 0
            end   = int(end_s)   if end_s   else file_size - 1
        except (ValueError, AttributeError):
            self.send_error(400, 'Invalid Range header')
            return

        end = min(end, file_size - 1)
        if start > end or start < 0:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{file_size}')
            self.end_headers()
            return

        length = end - start + 1
        ctype  = self.guess_type(path)

        try:
            with open(path, 'rb') as f:
                f.seek(start)
                data = f.read(length)
        except OSError:
            self.send_error(500, 'Read error')
            return

        self.send_response(206)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(length))
        self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()
        try:
            self.wfile.write(data)
        except _CLIENT_GONE:
            pass

    def copyfile(self, source, outputfile):
        """覆盖以屏蔽全量传输时的断连噪音。"""
        try:
            super().copyfile(source, outputfile)
        except _CLIENT_GONE:
            pass

    def log_error(self, fmt, *args):
        """过滤掉客户端断连产生的错误日志。"""
        msg = fmt % args if args else str(fmt)
        if any(k in msg for k in ('Broken pipe', 'Connection reset', 'Connection aborted')):
            return
        super().log_error(fmt, *args)

    def address_string(self):
        return '-'

class StaticServer(ThreadingHTTPServer):
    """多线程 HTTP 服务器，屏蔽客户端断连异常。"""

    def handle_error(self, request, client_address):
        exc = sys.exc_info()[1]
        if isinstance(exc, _CLIENT_GONE):
            return
        super().handle_error(request, client_address)


def main():
    parser = argparse.ArgumentParser(description='静态文件服务器（Range / 多线程）')
    parser.add_argument('--bind',      default='0.0.0.0')
    parser.add_argument('--port',      type=int, default=7861)
    parser.add_argument('--directory', default=os.getcwd())
    args = parser.parse_args()

    os.chdir(args.directory)

    server = StaticServer((args.bind, args.port), RangeRequestHandler)
    print(f'Serving {args.directory}', flush=True)
    print(f'Listening on http://{args.bind}:{args.port}', flush=True)

    def _shutdown(sig, frame):
        print('\nShutting down…', flush=True)
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT,  _shutdown)

    server.serve_forever()


if __name__ == '__main__':
    main()
