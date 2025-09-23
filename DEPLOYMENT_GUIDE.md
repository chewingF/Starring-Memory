# 🌟 土星星环回忆网站 - 服务器部署指南

## 📋 项目概述

这是一个基于Three.js的3D交互式网站，展示土星和星环，用户可以通过点击星星碎片查看回忆照片。项目包含：

- **前端**: HTML5 + CSS3 + JavaScript + Three.js
- **后端**: Python HTTP服务器
- **静态资源**: 照片、纹理文件
- **功能**: 3D动画、照片展示、移动端支持

## 🚀 部署方案选择

### 方案一：传统VPS/云服务器部署（推荐）
- **适用场景**: 有服务器管理经验，需要完全控制
- **成本**: 中等（月费20-100元）
- **优势**: 完全控制、可扩展、性能好
- **劣势**: 需要服务器管理知识

### 方案二：Docker容器化部署
- **适用场景**: 熟悉Docker，需要快速部署
- **成本**: 低（可部署到任何支持Docker的平台）
- **优势**: 环境一致、易于迁移、快速部署
- **劣势**: 需要Docker知识

### 方案三：云平台一键部署
- **适用场景**: 新手用户，快速上线
- **成本**: 低（免费额度）
- **优势**: 简单易用、自动扩展
- **劣势**: 功能限制、成本随流量增长

## 🛠️ 方案一：传统VPS部署

### 1. 服务器要求

**最低配置**:
- CPU: 1核心
- 内存: 1GB
- 存储: 20GB
- 带宽: 1Mbps

**推荐配置**:
- CPU: 2核心
- 内存: 2GB
- 存储: 40GB
- 带宽: 5Mbps

**操作系统**: Ubuntu 20.04 LTS 或 CentOS 8

### 2. 环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Python 3
sudo apt install python3 python3-pip -y

# 安装Nginx
sudo apt install nginx -y

# 安装Git
sudo apt install git -y

# 安装防火墙
sudo apt install ufw -y
```

### 3. 项目部署

```bash
# 创建项目目录
sudo mkdir -p /var/www/starring
cd /var/www/starring

# 克隆或上传项目文件
# 方法1: 使用Git（如果有仓库）
# git clone https://github.com/yourusername/starring.git .

# 方法2: 使用SCP上传
# scp -r /path/to/local/starring/* user@server:/var/www/starring/

# 设置权限
sudo chown -R www-data:www-data /var/www/starring
sudo chmod -R 755 /var/www/starring
```

### 4. 配置Nginx

创建Nginx配置文件：

```bash
sudo nano /etc/nginx/sites-available/starring
```

配置文件内容：
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    root /var/www/starring;
    index index.html;
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API路由
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 主页面
    location / {
        try_files $uri $uri/ =404;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

启用站点：
```bash
sudo ln -s /etc/nginx/sites-available/starring /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. 配置系统服务

创建Python服务器系统服务：

```bash
sudo nano /etc/systemd/system/starring.service
```

服务配置：
```ini
[Unit]
Description=StarRing Python Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/starring
ExecStart=/usr/bin/python3 /var/www/starring/server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable starring
sudo systemctl start starring
sudo systemctl status starring
```

### 6. 配置SSL证书（可选但推荐）

使用Let's Encrypt免费SSL证书：

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取SSL证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 7. 配置防火墙

```bash
# 允许SSH、HTTP、HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 🐳 方案二：Docker部署

### 1. 创建Dockerfile

```dockerfile
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 复制项目文件
COPY . .

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["python", "server.py"]
```

### 2. 创建docker-compose.yml

```yaml
version: '3.8'

services:
  starring:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./photos:/app/photos
      - ./Textures:/app/Textures
    restart: unless-stopped
    environment:
      - PYTHONUNBUFFERED=1

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./:/usr/share/nginx/html
    depends_on:
      - starring
    restart: unless-stopped
```

### 3. 部署命令

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## ☁️ 方案三：云平台部署

### 1. Vercel部署

创建`vercel.json`：
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.py"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

部署命令：
```bash
npm i -g vercel
vercel --prod
```

### 2. Netlify部署

创建`netlify.toml`：
```toml
[build]
  command = "echo 'No build needed'"
  publish = "."

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server/:splat"
  status = 200
```

### 3. GitHub Pages + Serverless

使用GitHub Actions自动部署到GitHub Pages，API使用Vercel Functions。

## 📊 性能优化建议

### 1. 静态资源优化

```bash
# 压缩图片
sudo apt install imagemagick -y
find photos/ -name "*.jpg" -exec mogrify -quality 85 -resize 1920x1080\> {} \;

# 启用Gzip压缩
# 在Nginx配置中添加：
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### 2. CDN配置

使用Cloudflare等CDN服务：
- 免费版本即可显著提升全球访问速度
- 自动压缩和缓存静态资源
- DDoS防护

### 3. 数据库优化（如需要）

如果后续需要用户管理等功能：
```bash
# 安装PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# 或使用Redis缓存
sudo apt install redis-server -y
```

## 🔒 安全配置

### 1. 基础安全

```bash
# 禁用不必要的服务
sudo systemctl disable apache2 2>/dev/null || true

# 配置SSH密钥登录
sudo nano /etc/ssh/sshd_config
# 设置：PasswordAuthentication no

# 定期更新系统
sudo crontab -e
# 添加：0 2 * * 0 apt update && apt upgrade -y
```

### 2. 应用安全

```python
# 在server.py中添加安全头
def end_headers(self):
    self.send_header('X-Content-Type-Options', 'nosniff')
    self.send_header('X-Frame-Options', 'SAMEORIGIN')
    self.send_header('X-XSS-Protection', '1; mode=block')
    super().end_headers()
```

## 📈 监控和维护

### 1. 日志监控

```bash
# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 查看应用日志
sudo journalctl -u starring -f
```

### 2. 性能监控

```bash
# 安装htop
sudo apt install htop -y

# 监控系统资源
htop

# 监控磁盘使用
df -h
```

### 3. 备份策略

```bash
# 创建备份脚本
sudo nano /usr/local/bin/backup-starring.sh
```

备份脚本内容：
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/starring"
PROJECT_DIR="/var/www/starring"

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/starring_$DATE.tar.gz -C $PROJECT_DIR .

# 保留最近7天的备份
find $BACKUP_DIR -name "starring_*.tar.gz" -mtime +7 -delete
```

设置定时备份：
```bash
sudo chmod +x /usr/local/bin/backup-starring.sh
sudo crontab -e
# 添加：0 3 * * * /usr/local/bin/backup-starring.sh
```

## 🚨 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   sudo netstat -tlnp | grep :8000
   sudo kill -9 <PID>
   ```

2. **权限问题**
   ```bash
   sudo chown -R www-data:www-data /var/www/starring
   sudo chmod -R 755 /var/www/starring
   ```

3. **Python模块缺失**
   ```bash
   pip3 install -r requirements.txt
   ```

4. **Nginx配置错误**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## 📞 技术支持

如果遇到问题，请检查：
1. 服务器日志：`sudo journalctl -u starring -f`
2. Nginx日志：`sudo tail -f /var/log/nginx/error.log`
3. 防火墙状态：`sudo ufw status`
4. 服务状态：`sudo systemctl status starring`

## 🎯 推荐部署流程

对于大多数用户，推荐以下部署流程：

1. **选择云服务器**：阿里云、腾讯云、AWS等
2. **使用方案一**：传统VPS部署（最稳定）
3. **配置域名**：购买域名并解析到服务器IP
4. **启用SSL**：使用Let's Encrypt免费证书
5. **配置CDN**：使用Cloudflare提升访问速度
6. **设置监控**：配置日志监控和备份

这样您就能获得一个稳定、安全、高性能的土星星环回忆网站！🌟


