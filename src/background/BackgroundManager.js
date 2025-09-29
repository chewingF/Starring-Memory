import * as THREE from 'three';

export class BackgroundManager {
    constructor(scene) {
        this.scene = scene;
    }

    init() {
        this.createStarField();
    }

    onResize() {
        this.updateBackgroundTexture();
    }

    update() {
        // 目前背景无需逐帧更新
    }

    createStarField() {
        console.log('开始加载背景纹理...');
        const isHttpServer = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (!isHttpServer) {
            console.warn('⚠️ 检测到使用file://协议访问，这会导致CORS错误');
            console.warn('请通过HTTP服务器访问：');
            console.warn('1. 运行 start.bat 或 python server.py');
            console.warn('2. 然后访问 http://localhost:8000');
            console.warn('现在使用纯色背景作为备用');
            this.scene.scene.background = new THREE.Color(0x000011);
            return;
        }
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            'Textures/bg.jpg',
            (loadedTexture) => {
                console.log('背景纹理加载成功');
                loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
                loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
                loadedTexture.minFilter = THREE.LinearFilter;
                loadedTexture.magFilter = THREE.LinearFilter;
                
                // 设置纹理颜色空间，避免过亮
                if (loadedTexture.colorSpace !== undefined) {
                    loadedTexture.colorSpace = THREE.SRGBColorSpace;
                }
                const aspect = window.innerWidth / window.innerHeight;
                const textureAspect = loadedTexture.image.width / loadedTexture.image.height;
                const scaleFactor = 0.9;
                if (aspect > textureAspect) {
                    loadedTexture.repeat.x = scaleFactor;
                    loadedTexture.repeat.y = (textureAspect / aspect) * scaleFactor;
                    loadedTexture.offset.x = (1 - loadedTexture.repeat.x) / 2;
                    loadedTexture.offset.y = (1 - loadedTexture.repeat.y) / 2;
                } else {
                    loadedTexture.repeat.x = (aspect / textureAspect) * scaleFactor;
                    loadedTexture.repeat.y = scaleFactor;
                    loadedTexture.offset.x = (1 - loadedTexture.repeat.x) / 2;
                    loadedTexture.offset.y = (1 - loadedTexture.repeat.y) / 2;
                }
                this.scene.scene.background = loadedTexture;
                console.log('背景已设置为纹理，左右铺满且保持长宽比');
            },
            (progress) => {
                console.log('加载进度:', progress);
            },
            (error) => {
                console.error('背景纹理加载失败:', error);
                this.scene.scene.background = new THREE.Color(0x000011);
                console.log('使用纯色背景作为备用');
            }
        );
        console.log('纹理加载器已创建');
    }

    updateBackgroundTexture() {
        if (this.scene.scene.background && this.scene.scene.background.isTexture) {
            const texture = this.scene.scene.background;
            const aspect = window.innerWidth / window.innerHeight;
            const textureAspect = texture.image.width / texture.image.height;
            const scaleFactor = 0.9;
            if (aspect > textureAspect) {
                texture.repeat.x = scaleFactor;
                texture.repeat.y = (textureAspect / aspect) * scaleFactor;
                texture.offset.x = (1 - texture.repeat.x) / 2;
                texture.offset.y = (1 - texture.repeat.y) / 2;
            } else {
                texture.repeat.x = (aspect / textureAspect) * scaleFactor;
                texture.repeat.y = scaleFactor;
                texture.offset.x = (1 - texture.repeat.x) / 2;
                texture.offset.y = (1 - texture.repeat.y) / 2;
            }
            texture.needsUpdate = true;
            console.log('背景纹理比例已更新（cover效果，放大10%）');
            if (typeof this.scene.updateBackgroundParallax === 'function') {
                this.scene.updateBackgroundParallax();
            }
        }
    }
}


