import http.server
import socketserver
import socket
import os

# 获取本机IP
def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

# 启动服务器
PORT = 8000
ip = get_ip()

print("=" * 50)
print("🌟 土星星环回忆网站")
print("=" * 50)
print(f"💻 电脑访问: http://localhost:{PORT}")
print(f"📱 手机访问: http://{ip}:{PORT}")
print("=" * 50)
print("按 Ctrl+C 停止服务器")
print("=" * 50)

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
