import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class SPAHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) and not self.path.startswith("/assets/"):
            self.path = "/index.html"
        return super().send_head()

    def log_message(self, fmt, *args):
        return


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: spa_server.py <directory> <port>")
    os.chdir(sys.argv[1])
    port = int(sys.argv[2])
    ThreadingHTTPServer(("127.0.0.1", port), SPAHandler).serve_forever()


if __name__ == "__main__":
    main()
