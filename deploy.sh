#!/bin/bash

# 🌟 土星星环回忆网站 - 自动化部署脚本
# 支持多种部署方式：Docker、传统VPS、云平台

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "🌟 土星星环回忆网站 - 部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  docker         使用Docker部署"
    echo "  vps            在VPS上部署"
    echo "  cloud          部署到云平台"
    echo "  update         更新现有部署"
    echo "  backup         备份当前部署"
    echo "  restore        恢复备份"
    echo "  status         检查部署状态"
    echo "  logs           查看日志"
    echo "  stop           停止服务"
    echo "  restart        重启服务"
    echo "  help           显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 docker      # 使用Docker部署"
    echo "  $0 vps         # 在VPS上部署"
    echo "  $0 status      # 检查状态"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查Docker
    if command -v docker &> /dev/null; then
        log_success "Docker 已安装"
        DOCKER_AVAILABLE=true
    else
        log_warning "Docker 未安装"
        DOCKER_AVAILABLE=false
    fi
    
    # 检查Docker Compose
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose 已安装"
        COMPOSE_AVAILABLE=true
    else
        log_warning "Docker Compose 未安装"
        COMPOSE_AVAILABLE=false
    fi
    
    # 检查Python
    if command -v python3 &> /dev/null; then
        log_success "Python3 已安装"
        PYTHON_AVAILABLE=true
    else
        log_error "Python3 未安装，请先安装Python3"
        exit 1
    fi
    
    # 检查Nginx
    if command -v nginx &> /dev/null; then
        log_success "Nginx 已安装"
        NGINX_AVAILABLE=true
    else
        log_warning "Nginx 未安装"
        NGINX_AVAILABLE=false
    fi
}

# Docker部署
deploy_docker() {
    log_info "开始Docker部署..."
    
    if [ "$DOCKER_AVAILABLE" = false ]; then
        log_error "Docker 未安装，请先安装Docker"
        exit 1
    fi
    
    if [ "$COMPOSE_AVAILABLE" = false ]; then
        log_error "Docker Compose 未安装，请先安装Docker Compose"
        exit 1
    fi
    
    # 创建必要的目录
    mkdir -p photos Textures logs ssl
    
    # 构建并启动服务
    log_info "构建Docker镜像..."
    docker-compose build
    
    log_info "启动服务..."
    docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        log_success "Docker部署完成！"
        log_info "访问地址: http://localhost"
        log_info "API地址: http://localhost/api/photos"
    else
        log_error "服务启动失败，请检查日志"
        docker-compose logs
        exit 1
    fi
}

# VPS部署
deploy_vps() {
    log_info "开始VPS部署..."
    
    # 检查是否为root用户
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用root用户运行VPS部署"
        exit 1
    fi
    
    # 更新系统
    log_info "更新系统包..."
    apt update && apt upgrade -y
    
    # 安装必要软件
    log_info "安装必要软件..."
    apt install -y python3 python3-pip nginx git ufw curl
    
    # 创建项目目录
    PROJECT_DIR="/var/www/starring"
    log_info "创建项目目录: $PROJECT_DIR"
    mkdir -p $PROJECT_DIR
    cp -r . $PROJECT_DIR/
    chown -R www-data:www-data $PROJECT_DIR
    chmod -R 755 $PROJECT_DIR
    
    # 配置Nginx
    log_info "配置Nginx..."
    cat > /etc/nginx/sites-available/starring << EOF
server {
    listen 80;
    server_name _;
    root $PROJECT_DIR;
    index index.html;
    
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    
    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF
    
    ln -sf /etc/nginx/sites-available/starring /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl reload nginx
    
    # 创建系统服务
    log_info "创建系统服务..."
    cat > /etc/systemd/system/starring.service << EOF
[Unit]
Description=StarRing Python Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/python3 $PROJECT_DIR/server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable starring
    systemctl start starring
    
    # 配置防火墙
    log_info "配置防火墙..."
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw --force enable
    
    # 检查服务状态
    if systemctl is-active --quiet starring; then
        log_success "VPS部署完成！"
        log_info "访问地址: http://$(curl -s ifconfig.me)"
        log_info "本地访问: http://localhost"
    else
        log_error "服务启动失败，请检查日志"
        journalctl -u starring -f
        exit 1
    fi
}

# 云平台部署
deploy_cloud() {
    log_info "开始云平台部署..."
    
    # 检查是否有vercel.json
    if [ -f "vercel.json" ]; then
        log_info "检测到Vercel配置，部署到Vercel..."
        
        if command -v vercel &> /dev/null; then
            vercel --prod
            log_success "Vercel部署完成！"
        else
            log_error "Vercel CLI 未安装，请先安装: npm i -g vercel"
            exit 1
        fi
    else
        log_info "创建Vercel配置文件..."
        cat > vercel.json << EOF
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
EOF
        
        log_info "请安装Vercel CLI: npm i -g vercel"
        log_info "然后运行: vercel --prod"
    fi
}

# 更新部署
update_deployment() {
    log_info "更新部署..."
    
    if [ -f "docker-compose.yml" ] && docker-compose ps | grep -q "Up"; then
        log_info "更新Docker部署..."
        docker-compose pull
        docker-compose up -d --build
        docker-compose restart
        log_success "Docker部署更新完成！"
    elif systemctl is-active --quiet starring; then
        log_info "更新VPS部署..."
        systemctl stop starring
        cp -r . /var/www/starring/
        chown -R www-data:www-data /var/www/starring
        systemctl start starring
        log_success "VPS部署更新完成！"
    else
        log_error "未找到运行中的部署"
        exit 1
    fi
}

# 备份
backup_deployment() {
    log_info "创建备份..."
    
    BACKUP_DIR="./backups"
    BACKUP_FILE="starring_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    mkdir -p $BACKUP_DIR
    
    if [ -f "docker-compose.yml" ] && docker-compose ps | grep -q "Up"; then
        # Docker备份
        docker-compose exec starring tar -czf /tmp/backup.tar.gz /app
        docker cp $(docker-compose ps -q starring):/tmp/backup.tar.gz $BACKUP_DIR/$BACKUP_FILE
        log_success "Docker备份完成: $BACKUP_DIR/$BACKUP_FILE"
    elif [ -d "/var/www/starring" ]; then
        # VPS备份
        tar -czf $BACKUP_DIR/$BACKUP_FILE -C /var/www/starring .
        log_success "VPS备份完成: $BACKUP_DIR/$BACKUP_FILE"
    else
        log_error "未找到可备份的部署"
        exit 1
    fi
}

# 检查状态
check_status() {
    log_info "检查部署状态..."
    
    if [ -f "docker-compose.yml" ]; then
        log_info "Docker服务状态:"
        docker-compose ps
        
        if docker-compose ps | grep -q "Up"; then
            log_success "Docker服务运行正常"
            
            # 检查健康状态
            if curl -f http://localhost/health &> /dev/null; then
                log_success "服务健康检查通过"
            else
                log_warning "服务健康检查失败"
            fi
        else
            log_error "Docker服务未运行"
        fi
    fi
    
    if systemctl is-active --quiet starring; then
        log_success "VPS服务运行正常"
        systemctl status starring --no-pager
    fi
}

# 查看日志
view_logs() {
    log_info "查看服务日志..."
    
    if [ -f "docker-compose.yml" ] && docker-compose ps | grep -q "Up"; then
        docker-compose logs -f
    elif systemctl is-active --quiet starring; then
        journalctl -u starring -f
    else
        log_error "未找到运行中的服务"
        exit 1
    fi
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose down
        log_success "Docker服务已停止"
    fi
    
    if systemctl is-active --quiet starring; then
        systemctl stop starring
        log_success "VPS服务已停止"
    fi
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose restart
        log_success "Docker服务已重启"
    fi
    
    if systemctl is-active --quiet starring; then
        systemctl restart starring
        log_success "VPS服务已重启"
    fi
}

# 主函数
main() {
    echo "🌟 土星星环回忆网站 - 部署脚本"
    echo "=================================="
    
    case "${1:-help}" in
        "docker")
            check_dependencies
            deploy_docker
            ;;
        "vps")
            check_dependencies
            deploy_vps
            ;;
        "cloud")
            check_dependencies
            deploy_cloud
            ;;
        "update")
            update_deployment
            ;;
        "backup")
            backup_deployment
            ;;
        "status")
            check_status
            ;;
        "logs")
            view_logs
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 运行主函数
main "$@"


