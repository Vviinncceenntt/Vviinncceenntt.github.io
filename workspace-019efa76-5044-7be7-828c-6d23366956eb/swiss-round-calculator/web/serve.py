#!/usr/bin/env python3
"""
Local preview server with correct MIME types for fonts and modern web assets.

Python's built-in http.server reports text/plain for .woff2 / .ttf / .otf,
which Safari (more strict than Chrome) refuses to decode as a font. This
wrapper registers the right types before delegating to SimpleHTTPRequestHandler.

Usage (from inside the web/ folder):
    python serve.py            # listens on http://0.0.0.0:8765
    python serve.py 9000       # custom port
"""
import http.server
import mimetypes
import socketserver
import sys

# Register MIME types Python misses or gets wrong.
mimetypes.add_type('font/woff2', '.woff2')
mimetypes.add_type('font/woff',  '.woff')
mimetypes.add_type('font/ttf',   '.ttf')
mimetypes.add_type('font/otf',   '.otf')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
BIND = '0.0.0.0'        # force IPv4 wildcard (Python 3.14 defaults to IPv6)

class Handler(http.server.SimpleHTTPRequestHandler):
    # Allow Safari to fetch fonts cross-origin during dev.
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

class V4Server(socketserver.TCPServer):
    address_family = __import__('socket').AF_INET  # force IPv4
    allow_reuse_address = True

with V4Server((BIND, PORT), Handler) as httpd:
    print(f"Serving HTTP on {BIND} port {PORT} (http://{BIND}:{PORT}/) ...")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
