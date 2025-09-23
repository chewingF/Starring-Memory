#!/usr/bin/env python3
"""
简单的HTTP服务器，用于在本地网络中提供网站服务
手机可以通过局域网IP访问此网站
"""

import http.server
import socketserver
import socket
import webbrowser
import os
import sys
import json
import glob

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器，添加API端点"""
    
    def do_GET(self):
        """处理GET请求"""
        if self.path == '/api/photos':
            self.handle_photos_api()
        else:
            # 对于其他请求，使用默认处理
            super().do_GET()
    
    def handle_photos_api(self):
        """处理照片列表API请求"""
        try:
            # 获取photos文件夹中的所有文件
            photos_dir = 'photos'
            
            if not os.path.exists(photos_dir):
                # 如果photos文件夹不存在，返回空列表
                photo_files = []
            else:
                # 获取所有图片文件
                image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.bmp', '*.webp']
                photo_files = []
                for ext in image_extensions:
                    photo_files.extend(glob.glob(os.path.join(photos_dir, ext)))
                    photo_files.extend(glob.glob(os.path.join(photos_dir, ext.upper())))
                
                # 只保留文件名，去掉路径
                photo_files = [os.path.basename(f) for f in photo_files]
                # 去重并排序
                photo_files = sorted(list(set(photo_files)))
            
            # 返回JSON响应
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response_data = {
                'success': True,
                'photos': photo_files,
                'count': len(photo_files)
            }
            
            self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            # 错误处理
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = {
                'success': False,
                'error': str(e),
                'photos': [],
                'count': 0
            }
            
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))

def get_local_ip():
    """获取本机局域网IP地址"""
    try:
        # 创建一个socket连接来获取本机IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def start_server(port=8000):
    """启动HTTP服务器"""
    # 切换到脚本所在目录
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # 创建HTTP服务器，使用自定义处理器
    handler = CustomHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            local_ip = get_local_ip()
            
            print("=" * 60)
            print("🌟 土星星环回忆网站服务器已启动！")
            print("=" * 60)
            print(f"📱 手机访问地址：")
            print(f"   http://{local_ip}:{port}")
            print(f"💻 电脑访问地址：")
            print(f"   http://localhost:{port}")
            print("=" * 60)
            print("📋 使用说明：")
            print("1. 确保手机和电脑连接在同一个WiFi网络")
            print("2. 在手机浏览器中输入上面的IP地址")
            print("3. 将照片放在 'photos' 文件夹中")
            print("4. 按 Ctrl+C 停止服务器")
            print("=" * 60)
            
            # 自动打开浏览器
            webbrowser.open(f"http://localhost:{port}")
            
            # 启动服务器
            httpd.serve_forever()
            
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"❌ 端口 {port} 已被占用，尝试使用端口 {port + 1}")
            start_server(port + 1)
        else:
            print(f"❌ 启动服务器失败：{e}")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n🛑 服务器已停止")
        sys.exit(0)

if __name__ == "__main__":
    start_server()
