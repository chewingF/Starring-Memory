# 使用Python 3.9官方镜像作为基础镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements.txt（如果存在）
COPY requirements.txt* ./

# 安装Python依赖
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 复制项目文件
COPY . .

# 创建必要的目录
RUN mkdir -p photos Textures

# 设置权限
RUN chmod -R 755 /app

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# 启动命令
CMD ["python", "server.py"]


