#!/usr/bin/env python3
"""Lightweight helper to serve the network admin login interface locally.

Running this script will start a small HTTP server bound to localhost and
open the login page in the default browser so it can be visualised without
needing any external tooling.
"""
from __future__ import annotations

import contextlib
import http.server
import os
import socket
import socketserver
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WEB_DIR = ROOT / "web"
DEFAULT_PORT = int(os.environ.get("LOGIN_PORT", "8000"))


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


class RequestHandler(http.server.SimpleHTTPRequestHandler):
    """Serve files from the /web directory."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def log_message(self, format: str, *args) -> None:  # noqa: A003 - following base signature
        # Quiet down the server output to keep the console clean.
        pass


def find_available_port(start_port: int) -> int:
    port = start_port
    while True:
        with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
        port += 1


def main() -> None:
    port = find_available_port(DEFAULT_PORT)
    server_address = ("127.0.0.1", port)
    httpd = ThreadedHTTPServer(server_address, RequestHandler)
    url = f"http://{server_address[0]}:{port}/login.html"

    print(f"Servidor disponible en {url}")
    webbrowser.open(url)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nCerrando servidor...")
    finally:
        httpd.shutdown()
        httpd.server_close()


if __name__ == "__main__":
    if not WEB_DIR.exists():
        raise SystemExit("No se encontró el directorio 'web'.")
    main()
