#!/bin/bash

# 🌟 土星星环回忆网站 - GitHub Pages 快速部署脚本

set -e

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
    echo "🌟 土星星环回忆网站 - GitHub Pages 部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  setup           设置 GitHub 仓库"
    echo "  deploy          部署到 GitHub Pages"
    echo "  update          更新现有部署"
    echo "  status          检查部署状态"
    echo "  help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 setup        # 设置 GitHub 仓库"
    echo "  $0 deploy       # 部署到 GitHub Pages"
}

# 检查 Git 是否已安装
check_git() {
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装，请先安装 Git"
        exit 1
    fi
    log_success "Git 已安装"
}

# 设置 GitHub 仓库
setup_repository() {
    log_info "设置 GitHub 仓库..."
    
    # 检查是否在 Git 仓库中
    if [ ! -d ".git" ]; then
        log_info "初始化 Git 仓库..."
        git init
    fi
    
    # 检查是否有远程仓库
    if ! git remote get-url origin &> /dev/null; then
        log_warning "未找到远程仓库，请手动添加："
        echo "git remote add origin https://github.com/你的用户名/仓库名.git"
        echo ""
        read -p "请输入你的 GitHub 用户名: " username
        read -p "请输入仓库名 (建议: starring-memories): " repo_name
        
        if [ -z "$repo_name" ]; then
            repo_name="starring-memories"
        fi
        
        git remote add origin "https://github.com/$username/$repo_name.git"
        log_success "已添加远程仓库: https://github.com/$username/$repo_name.git"
    fi
    
    # 创建必要的文件
    create_github_files
    
    # 添加所有文件
    git add .
    
    # 提交更改
    git commit -m "Initial commit: 土星星环回忆网站 - GitHub Pages 版本" || true
    
    log_success "GitHub 仓库设置完成！"
    log_info "下一步："
    echo "1. 推送代码到 GitHub: git push -u origin main"
    echo "2. 在 GitHub 仓库设置中启用 Pages"
    echo "3. 选择 'Deploy from a branch' -> 'main' -> '/ (root)'"
}

# 创建 GitHub Pages 相关文件
create_github_files() {
    log_info "创建 GitHub Pages 相关文件..."
    
    # 复制 GitHub Pages 版本的文件
    if [ -f "index-github-pages.html" ]; then
        cp index-github-pages.html index.html
        log_success "已复制 GitHub Pages 版本的 index.html"
    else
        log_warning "未找到 index-github-pages.html 文件"
    fi
    
    if [ -f "script-github-pages.js" ]; then
        cp script-github-pages.js script.js
        log_success "已复制 GitHub Pages 版本的 script.js"
    else
        log_warning "未找到 script-github-pages.js 文件"
    fi
    
    # 创建 .nojekyll 文件
    touch .nojekyll
    log_success "已创建 .nojekyll 文件"
    
    # 创建 robots.txt
    cat > robots.txt << EOF
User-agent: *
Allow: /

Sitemap: https://your-username.github.io/your-repo-name/sitemap.xml
EOF
    log_success "已创建 robots.txt"
    
    # 创建 README.md（如果不存在）
    if [ ! -f "README.md" ]; then
        cat > README.md << EOF
# 🌟 土星星环回忆网站

一个美丽的3D交互式网站，展示土星和它的星环，点击星星碎片可以查看回忆照片。

## ✨ 功能特点

- 🌌 3D土星和星环动画
- ⭐ 可交互的星星碎片
- 📸 点击星星查看回忆照片
- 📱 支持手机和电脑访问
- 🎨 渐变进入动画效果
- 🌟 动态星空背景

## 🚀 在线访问

🌐 [访问网站](https://your-username.github.io/your-repo-name)

## 📸 添加照片

1. 将照片文件放入 \`photos\` 文件夹
2. 更新 \`script-github-pages.js\` 中的 \`predefinedPhotos\` 数组
3. 提交并推送更改

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript
- **3D图形**: Three.js
- **托管**: GitHub Pages
- **响应式设计**: 支持手机和电脑

## 📁 项目结构

\`\`\`
├── index.html              # 主页面
├── script.js               # 3D场景和交互逻辑
├── photos/                 # 照片文件夹
├── Textures/               # 纹理文件夹
├── .github/workflows/      # GitHub Actions 配置
└── README.md               # 项目说明
\`\`\`

## 🎮 使用说明

1. **查看土星**: 土星会缓慢旋转，展示美丽的星环
2. **点击星星**: 点击星环中的星星碎片查看回忆照片
3. **关闭照片**: 点击照片或关闭按钮返回星环
4. **移动端**: 支持触摸操作，体验流畅

## 🔧 自定义设置

### 修改照片列表

在 \`script-github-pages.js\` 中找到 \`predefinedPhotos\` 数组并修改：

\`\`\`javascript
const predefinedPhotos = [
    'photos/your-photo1.jpg',
    'photos/your-photo2.jpg',
    // 添加更多照片...
];
\`\`\`

### 修改星星数量

在 \`script-github-pages.js\` 中找到 \`this.starFragmentCount = 500\` 并修改数值。

## 🌟 特色效果

- **渐变进入**: 从纯黑背景渐变到3D场景
- **动态星环**: 星星碎片围绕土星缓慢旋转
- **交互反馈**: 点击星星时有放大和发光效果
- **照片浮窗**: 平滑的弹出动画效果
- **星空背景**: 1000个随机分布的星星

## 📞 支持

如果遇到问题，请检查：
1. 照片文件是否存在且格式正确
2. 文件名是否在 \`predefinedPhotos\` 数组中
3. 浏览器是否支持 WebGL

享受你的土星星环回忆之旅！🌟
EOF
        log_success "已创建 README.md"
    fi
}

# 部署到 GitHub Pages
deploy_to_github() {
    log_info "部署到 GitHub Pages..."
    
    # 检查是否在 Git 仓库中
    if [ ! -d ".git" ]; then
        log_error "不在 Git 仓库中，请先运行: $0 setup"
        exit 1
    fi
    
    # 检查是否有远程仓库
    if ! git remote get-url origin &> /dev/null; then
        log_error "未找到远程仓库，请先运行: $0 setup"
        exit 1
    fi
    
    # 创建 GitHub Pages 文件
    create_github_files
    
    # 添加所有文件
    git add .
    
    # 提交更改
    git commit -m "Deploy: 更新土星星环回忆网站" || true
    
    # 推送到 GitHub
    log_info "推送到 GitHub..."
    git push origin main
    
    log_success "部署完成！"
    
    # 获取仓库信息
    remote_url=$(git remote get-url origin)
    if [[ $remote_url =~ github\.com/([^/]+)/([^/]+) ]]; then
        username="${BASH_REMATCH[1]}"
        repo_name="${BASH_REMATCH[2]}"
        repo_name="${repo_name%.git}"  # 移除 .git 后缀
        
        log_info "网站将在以下地址可用："
        echo "🌐 https://$username.github.io/$repo_name"
        echo ""
        log_info "请等待 5-10 分钟让 GitHub Pages 完成部署"
    fi
}

# 更新部署
update_deployment() {
    log_info "更新部署..."
    
    # 检查是否有新的更改
    if git diff --quiet && git diff --cached --quiet; then
        log_warning "没有新的更改需要部署"
        return
    fi
    
    # 创建 GitHub Pages 文件
    create_github_files
    
    # 添加所有文件
    git add .
    
    # 提交更改
    git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # 推送到 GitHub
    git push origin main
    
    log_success "更新完成！"
}

# 检查部署状态
check_status() {
    log_info "检查部署状态..."
    
    # 检查 Git 状态
    if [ -d ".git" ]; then
        log_info "Git 仓库状态:"
        git status --short
        
        # 检查远程仓库
        if git remote get-url origin &> /dev/null; then
            remote_url=$(git remote get-url origin)
            log_info "远程仓库: $remote_url"
            
            # 检查是否有未推送的提交
            if ! git diff --quiet origin/main..HEAD; then
                log_warning "有未推送的提交"
            else
                log_success "所有更改已推送到远程仓库"
            fi
        else
            log_warning "未找到远程仓库"
        fi
    else
        log_warning "不在 Git 仓库中"
    fi
    
    # 检查 GitHub Pages 文件
    log_info "GitHub Pages 文件检查:"
    if [ -f "index.html" ]; then
        log_success "✓ index.html 存在"
    else
        log_error "✗ index.html 不存在"
    fi
    
    if [ -f "script.js" ]; then
        log_success "✓ script.js 存在"
    else
        log_error "✗ script.js 不存在"
    fi
    
    if [ -f ".nojekyll" ]; then
        log_success "✓ .nojekyll 存在"
    else
        log_warning "✗ .nojekyll 不存在"
    fi
    
    if [ -d "photos" ]; then
        photo_count=$(find photos -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" \) | wc -l)
        log_success "✓ photos 文件夹存在，包含 $photo_count 张照片"
    else
        log_warning "✗ photos 文件夹不存在"
    fi
}

# 主函数
main() {
    echo "🌟 土星星环回忆网站 - GitHub Pages 部署脚本"
    echo "=============================================="
    
    check_git
    
    case "${1:-help}" in
        "setup")
            setup_repository
            ;;
        "deploy")
            deploy_to_github
            ;;
        "update")
            update_deployment
            ;;
        "status")
            check_status
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 运行主函数
main "$@"


