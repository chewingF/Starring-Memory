class SaturnRingScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.saturn = null;
        this.ring = null;
        this.starFragments = [];
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.clock = new THREE.Clock();
        this.photos = [];
        this.currentPhotoIndex = 0;
        this.isPhotoOpen = false;
        this.photoIndexCounter = 0; // 用于照片索引分配
        
        // 菱形几何体角随机缩放（0.6-0.9），默认开启
        this.randomizeDiamondCorners = true;
        
        // 旋转速度参数：1分钟转几圈（默认不转）
        this.rotationSpeed = 0.1; // 默认0圈/分钟
        
        // 相机参数
        this.cameraDistance = 16; // 相机距离（从原点算起）
        this.cameraHeight = 0.5; // 相机高度
        this.cameraFOV = 49; // 相机视野角度
        // this.saturnPositionAngle = 10; // 向光角度（度）- 已移除
        
        // 星球中心在屏幕上的位置 (0,0)为左下角，(1,1)为右上角
        this.planetScreenPosition = new THREE.Vector2(0.93, 0.39); // 默认屏幕位置
        
        // 控制面板显示状态
        this.isControlPanelOpen = false; // 默认打开
        
        // 详细设置显示状态
        this.isDetailedControlsOpen = false; // 默认收起
        
        // 星星碎片数量
        this.starFragmentCount = 500; // 默认200个碎片
        
        // 星星碎片大小比例
        this.starFragmentSizeScale = 1.2; // 默认大小为基准，可设置1-3
        
        // 星环主体显示状态
        this.isRingVisible = false; //默认关闭
        
        // 照片缩略图显示状态
        this.showPhotoThumbnails = false; //默认关闭
        
        // 四个环的透明度控制
        this.ringOpacity = {
            inner: 0.4,    // 内环透明度
            middle: 0.7,   // 中环透明度
            outer: 0.3,    // 外环透明度
            cassini: 0.1   // 卡西尼缝透明度
        };
        
        // 四个环的额外旋转速度倍数
        this.ringRotationMultipliers = {
            inner: 1.5,    // 内环：基础速度 + 50%
            middle: 1.7,   // 中内环：基础速度 + 70%
            outer: 2.2,    // 中外环：基础速度 + 120%
            outerMost: 3.0 // 外环：基础速度 + 200%
        };
        
        // 四个环的碎片比例
        this.ringFragmentRatios = {
            inner: 0.2,    // 内环：5%
            middle: 0.3,    // 中内环：30%
            outer: 0.55,    // 中外环：55%
            outerMost: 0.7  // 外环：10%
        };
                // 星星碎片分布控制：0=完全均匀，1=完全随机
        this.starFragmentDistribution = 1; // 默认中等分布
        
        // 调试计数器
        this.debugFrameCount = 0;
        
        // 陀螺仪相关属性
        this.gyroscopeData = {
            alpha: 0,    // 绕Z轴旋转（设备方向）
            beta: 0,     // 绕X轴旋转（前后倾斜）
            gamma: 0     // 绕Y轴旋转（左右倾斜）
        };
        this.isGyroscopeSupported = false;
        this.gyroscopePermissionGranted = false;
        
        // 流星动画相关属性
        this.meteorAnimations = new Map(); // 存储正在进行的流星动画
        this.animationId = 0; // 动画ID计数器
        
        this.init();
        this.loadPhotos().then(() => {
            // 照片加载完成后再创建星星碎片
            this.createStarFragments();
        });
        this.animate();
        this.setupEventListeners();
        this.initControlPanel(); // 初始化控制面板状态
    }

    init() {
        // 创建场景
        this.scene = new THREE.Scene();
        // 先设置一个临时背景色
        this.scene.background = new THREE.Color(0x000011);

        // 创建相机
        this.camera = new THREE.PerspectiveCamera(
            this.cameraFOV,
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        // 设置初始相机位置
        this.updateCameraPosition();

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // 添加环境光 - 下调20%亮度
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3); // 0.4 * 0.8 = 0.32
        this.scene.add(ambientLight);

        // 添加主光源 - 模拟太阳光，下调20%亮度
        this.directionalLight = new THREE.DirectionalLight(0xfff8dc, 0.7); // 1.0 * 0.8 = 0.8
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 4096;
        this.directionalLight.shadow.mapSize.height = 4096;
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 50;
        this.directionalLight.shadow.camera.left = -20;
        this.directionalLight.shadow.camera.right = 20;
        this.directionalLight.shadow.camera.top = 20;
        this.directionalLight.shadow.camera.bottom = -20;
        this.scene.add(this.directionalLight);

        // 添加补光 - 模拟土星反射的光，下调20%亮度
        this.fillLight = new THREE.DirectionalLight(0xffd700, 0.1); // 0.5 * 0.8 = 0.4
        this.scene.add(this.fillLight);

        // 创建土星
        this.createSaturn();
        
        // 创建星环
        this.createRing();
        
        // 星星碎片将在照片加载完成后创建
        
        // 添加星空背景
        this.createStarField();
        
        // 初始化陀螺仪
        this.initGyroscope();
    }

    // 创建程序化土星表面贴图
    createSaturnTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // 基础土星颜色
        const baseColor = { r: 244, g: 164, b: 96 }; // 沙棕色
        
        // 创建渐变背景
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`);
        gradient.addColorStop(0.7, `rgb(${baseColor.r - 20}, ${baseColor.g - 10}, ${baseColor.b - 5})`);
        gradient.addColorStop(1, `rgb(${baseColor.r - 40}, ${baseColor.g - 20}, ${baseColor.b - 10})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // 添加云带
        this.addCloudBands(ctx, baseColor);
        
        // 添加大气层效果
        this.addAtmosphereEffect(ctx);
        
        // 添加细节纹理
        this.addSurfaceDetails(ctx);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    addCloudBands(ctx, baseColor) {
        const bandCount = 8;
        for (let i = 0; i < bandCount; i++) {
            const y = (i / bandCount) * 512;
            const height = 512 / bandCount;
            
            // 交替的云带颜色
            const isDark = i % 2 === 0;
            const color = isDark ? 
                `rgb(${baseColor.r - 30}, ${baseColor.g - 15}, ${baseColor.b - 8})` :
                `rgb(${baseColor.r + 10}, ${baseColor.g + 5}, ${baseColor.b + 2})`;
            
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(0, y, 512, height);
        }
        ctx.globalAlpha = 1;
    }

    addAtmosphereEffect(ctx) {
        // 添加大气层边缘效果
        const gradient = ctx.createRadialGradient(256, 256, 200, 256, 256, 256);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0)');
        gradient.addColorStop(0.8, 'rgba(255, 215, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0.2)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
    }

    addSurfaceDetails(ctx) {
        // 添加表面细节和风暴
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 20 + 5;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // 创建星环纹理
    createRingTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // 创建径向渐变
        const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
        gradient.addColorStop(0, 'rgba(200, 200, 200, 0)');
        gradient.addColorStop(0.2, 'rgba(180, 180, 180, 0.3)');
        gradient.addColorStop(0.4, 'rgba(160, 160, 160, 0.5)');
        gradient.addColorStop(0.6, 'rgba(140, 140, 140, 0.4)');
        gradient.addColorStop(0.8, 'rgba(120, 120, 120, 0.2)');
        gradient.addColorStop(1, 'rgba(100, 100, 100, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 64);
        
        // 添加环的细节
        this.addRingDetails(ctx);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    addRingDetails(ctx) {
        // 添加环的颗粒感
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 64;
            const size = Math.random() * 2 + 1;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;
    }

    // 创建法线贴图
    createNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // 创建基础法线贴图
        const imageData = ctx.createImageData(512, 512);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % 512;
            const y = Math.floor((i / 4) / 512);
            
            // 生成噪声
            const noise = this.noise(x * 0.01, y * 0.01);
            const normalX = (noise * 0.5 + 0.5) * 255;
            const normalY = (Math.sin(x * 0.02) * 0.5 + 0.5) * 255;
            const normalZ = 255;
            
            data[i] = normalX;     // R
            data[i + 1] = normalY; // G
            data[i + 2] = normalZ; // B
            data[i + 3] = 255;     // A
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    // 简单的噪声函数
    noise(x, y) {
        return Math.sin(x * 10) * Math.cos(y * 10) * 0.5;
    }
    
    // 创建备用纹理（当照片加载失败时使用）
    createFallbackTexture(texture) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // 创建一个简单的渐变背景
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(1, '#ff8c00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        // 添加一些装饰
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📷', 32, 38);
        
        // 将canvas转换为纹理
        const fallbackTexture = new THREE.CanvasTexture(canvas);
        fallbackTexture.wrapS = THREE.ClampToEdgeWrapping;
        fallbackTexture.wrapT = THREE.ClampToEdgeWrapping;
        fallbackTexture.minFilter = THREE.LinearFilter;
        fallbackTexture.magFilter = THREE.LinearFilter;
        
        // 替换原始纹理
        texture.image = fallbackTexture.image;
        texture.needsUpdate = true;
        
        console.log('使用备用纹理');
    }
    
    // 创建菱形几何体（尖角朝上）
    createDiamondGeometry(size, cornerScales = null) {
        const geometry = new THREE.BufferGeometry();
        
        // 角缩放：左右、前、后四个角各自缩放（默认0.6，随机0.6-0.9）
        const scales = cornerScales || {
            left: this.randomizeDiamondCorners ? (Math.random() * 0.3 + 0.6) : 0.6,
            right: this.randomizeDiamondCorners ? (Math.random() * 0.3 + 0.6) : 0.6,
            front: this.randomizeDiamondCorners ? (Math.random() * 0.3 + 0.6) : 0.6,
            back: this.randomizeDiamondCorners ? (Math.random() * 0.3 + 0.6) : 0.6
        };
        
        // 定义菱形的顶点（尖角朝上）
        const vertices = new Float32Array([
            // 上尖角
            0, size, 0,
            // 左角
            -size * scales.left, 0, 0,
            // 右角
            size * scales.right, 0, 0,
            // 下尖角
            0, -size, 0,
            // 前角（Z轴正方向）
            0, 0, size * scales.front,
            // 后角（Z轴负方向）
            0, 0, -size * scales.back
        ]);
        
        // 定义面（三角形）
        const indices = [
            // 上尖角到左角到前角
            0, 1, 4,
            // 上尖角到前角到右角
            0, 4, 2,
            // 上尖角到右角到后角
            0, 2, 5,
            // 上尖角到后角到左角
            0, 5, 1,
            // 下尖角到前角到左角
            3, 4, 1,
            // 下尖角到右角到前角
            3, 2, 4,
            // 下尖角到后角到右角
            3, 5, 2,
            // 下尖角到左角到后角
            3, 1, 5
        ];
        
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        
        // 将角缩放保存在几何体的 userData 中，便于后续尺寸更新复用
        geometry.userData.cornerScales = scales;
        return geometry;
    }
    
    // 更新光源位置，让光源位置和相机位置一样
    updateLightPositions() {
        if (!this.directionalLight || !this.fillLight) return;
        
        // 光源位置和相机位置完全一样
        this.directionalLight.position.copy(this.camera.position);
        this.fillLight.position.copy(this.camera.position);
        
        // 调试计数器（已移除位置日志）
        this.debugFrameCount++;
    }

    updateCameraPosition() {
        // 计算相机位置：固定位置，不再使用向光角度
        const x = 0; // 固定X位置
        const y = this.cameraHeight;
        const z = this.cameraDistance; // 固定Z位置
        
        this.camera.position.set(x, y, z);
        
        // 根据屏幕位置计算土星应该出现的目标位置
        const targetPosition = this.calculateTargetPositionForScreenPosition();
        this.camera.lookAt(targetPosition);
        
        // 更新FOV
        this.camera.fov = this.cameraFOV;
        this.camera.updateProjectionMatrix();
        
        // 更新光源位置，让光源相对于相机位置保持固定
        this.updateLightPositions();
    }
    
    // 计算土星应该出现的目标位置，使得它在屏幕上显示在指定位置
    calculateTargetPositionForScreenPosition() {
        // 将屏幕坐标(0,0)-(1,1)转换为NDC坐标(-1,-1)-(1,1)
        const ndcX = this.planetScreenPosition.x * 2 - 1;
        const ndcY = this.planetScreenPosition.y * 2 - 1;
        
        // 计算相机到土星中心的距离
        const distanceToSaturn = this.camera.position.length();
        
        // 计算视野角度
        const fovRad = (this.cameraFOV * Math.PI) / 180;
        const aspect = window.innerWidth / window.innerHeight;
        
        // 计算在土星距离处的视野范围
        const viewHeight = 2 * Math.tan(fovRad / 2) * distanceToSaturn;
        const viewWidth = viewHeight * aspect;
        
        // 计算土星应该偏移的位置
        const offsetX = ndcX * viewWidth * 0.5;
        const offsetY = ndcY * viewHeight * 0.5;
        
        // 计算相机的前方向向量（从相机指向土星中心）
        const cameraToSaturn = new THREE.Vector3(0, 0, 0).sub(this.camera.position).normalize();
        
        // 计算相机的右方向向量
        const cameraRight = new THREE.Vector3().crossVectors(cameraToSaturn, new THREE.Vector3(0, 1, 0)).normalize();
        
        // 计算相机的上方向向量
        const cameraUp = new THREE.Vector3().crossVectors(cameraRight, cameraToSaturn).normalize();
        
        // 计算土星应该出现的目标位置
        const targetPosition = new THREE.Vector3(
            offsetX * cameraRight.x + offsetY * cameraUp.x,
            offsetX * cameraRight.y + offsetY * cameraUp.y,
            offsetX * cameraRight.z + offsetY * cameraUp.z
        );
        
        return targetPosition;
    }
    
    // 设置星球在屏幕上的位置
    setPlanetScreenPosition(x, y) {
        // 确保坐标在有效范围内
        this.planetScreenPosition.x = Math.max(0, Math.min(1, x));
        this.planetScreenPosition.y = Math.max(0, Math.min(1, y));
        this.updateCameraPosition();
    }
    
    // 切换控制面板显示状态
    toggleControlPanel() {
        this.isControlPanelOpen = !this.isControlPanelOpen;
        const controlPanel = document.querySelector('.control-panel');
        if (controlPanel) {
            controlPanel.style.display = this.isControlPanelOpen ? 'block' : 'none';
            console.log(`控制面板${this.isControlPanelOpen ? '显示' : '隐藏'}`);
        }
    }
    
    // 初始化控制面板状态
    initControlPanel() {
        const controlPanel = document.querySelector('.control-panel');
        if (controlPanel) {
            controlPanel.style.display = this.isControlPanelOpen ? 'block' : 'none';
            console.log(`控制面板初始化：${this.isControlPanelOpen ? '显示' : '隐藏'}`);
        }
    }
    
    // 切换详细设置显示状态
    toggleDetailedControls() {
        this.isDetailedControlsOpen = !this.isDetailedControlsOpen;
        const detailedControls = document.getElementById('detailed-controls');
        const toggleBtn = document.getElementById('toggleDetails');
        
        if (detailedControls && toggleBtn) {
            if (this.isDetailedControlsOpen) {
                detailedControls.classList.remove('collapsed');
                toggleBtn.textContent = '-';
            } else {
                detailedControls.classList.add('collapsed');
                toggleBtn.textContent = '+';
            }
        }
    }
    
    // 更新星星碎片数量
    updateStarFragmentCount(newCount) {
        this.starFragmentCount = newCount;
        
        // 移除现有的星星碎片
        this.starFragments.forEach(fragment => {
            this.saturnSystem.remove(fragment);
        });
        this.starFragments = [];
        
        // 创建新的星星碎片
        this.createStarFragments();
    }
    
    // 更新星星碎片分布
    updateStarFragmentDistribution(newDistribution) {
        this.starFragmentDistribution = newDistribution;
        
        // 移除现有的星星碎片
        this.starFragments.forEach(fragment => {
            this.saturnSystem.remove(fragment);
        });
        this.starFragments = [];
        
        // 重新创建星星碎片
        this.createStarFragments();
    }
    
    // 更新星星碎片大小比例
    updateStarFragmentSizeScale(newSizeScale) {
        this.starFragmentSizeScale = newSizeScale;
        
        // 更新所有现有星星碎片的大小
        this.starFragments.forEach(fragment => {
            if (fragment.userData.baseSize) {
                // 基于基础大小计算新的缩放比例
                const newScale = fragment.userData.baseSize * this.starFragmentSizeScale;
                
                // 更新几何体大小
                if (fragment.userData.isPhotoThumbnail) {
                    // 对于照片缩略图（平面几何体），更新尺寸
                    fragment.geometry.dispose(); // 释放旧几何体
                    fragment.geometry = new THREE.PlaneGeometry(newScale, newScale);
                } else {
                    // 对于菱形几何体，需要重新创建
                    fragment.geometry.dispose(); // 释放旧几何体
                    const cornerScales = (fragment.userData && fragment.userData.cornerScales)
                        ? fragment.userData.cornerScales
                        : undefined; // 若无记录，走默认逻辑
                    fragment.geometry = this.createDiamondGeometry(newScale, cornerScales);
                }
                
                // 更新用户数据中的原始大小
                fragment.userData.originalSize = newScale;
            }
        });
        
        console.log(`星星碎片大小比例已更新为: ${this.starFragmentSizeScale}`);
    }

    createSaturn() {
        // 土星主体 - 使用高精度几何体和NASA土星贴图
        const saturnGeometry = new THREE.SphereGeometry(3, 128, 128);
        
        // 加载NASA土星贴图
        const saturnTexture = new THREE.TextureLoader().load(
            'Textures/Saturn.jpg',
            (texture) => {
                console.log('NASA土星贴图加载成功');
                // 设置贴图参数
                texture.wrapS = THREE.ClampToEdgeWrapping; // 改为边缘夹紧，避免接缝
                texture.wrapT = THREE.ClampToEdgeWrapping; // 改为边缘夹紧，避免接缝
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = true;
                texture.flipY = false; // 禁用Y轴翻转，保持贴图方向
                texture.needsUpdate = true;
            },
            (progress) => {
                console.log('土星贴图加载进度:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('NASA土星贴图加载失败:', error);
                console.log('使用程序化贴图作为备用');
            }
        );
        
        // 创建更真实的土星材质（暂时移除法线贴图）
        const saturnMaterial = new THREE.MeshPhongMaterial({
            map: saturnTexture,
            // normalMap: normalMap, // 暂时移除法线贴图
            shininess: 1, // 降低光泽度，减少反射
            specular: 0x111111, // 降低镜面反射强度
            transparent: false,
            // 添加环境光反射，减少暗部，下调20%亮度
            emissive: new THREE.Color(0x111111), // 轻微自发光
            emissiveIntensity: 1 // 0.1 * 0.8 = 0.08
        });
        
        this.saturn = new THREE.Mesh(saturnGeometry, saturnMaterial);
        this.saturn.castShadow = true;
        this.saturn.receiveShadow = true;
        
        // 创建土星系统容器，用于整体旋转
        this.saturnSystem = new THREE.Group();
        this.saturnSystem.add(this.saturn);
        
        // 创建旋转轴容器，用于控制旋转
        this.rotationAxis = new THREE.Group();
        this.rotationAxis.add(this.saturnSystem);
        
        // 设置土星系统倾斜27°，并顺时针调整倾角方向
        this.rotationAxis.rotation.x = (27 * Math.PI) / 180; // 27度转换为弧度
        this.rotationAxis.rotation.z = (15 * Math.PI) / 180; // 顺时针调整15度
        
        this.scene.add(this.rotationAxis);
        
        // 土星大气层效果
        const atmosphereGeometry = new THREE.SphereGeometry(3.05, 64, 64);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.saturn.add(atmosphere);
        
        // 添加土星极地风暴
        this.createPolarStorms();
        
        // 添加土星阴影 - 暂时关闭
        // this.createSaturnShadow();
    }

    createPolarStorms() {
        // 北极风暴
        const northStormGeometry = new THREE.SphereGeometry(3.02, 32, 16, 0, Math.PI * 2, 0, Math.PI / 6);
        const northStormMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B4513,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const northStorm = new THREE.Mesh(northStormGeometry, northStormMaterial);
        this.saturn.add(northStorm);
        
        // 南极风暴
        const southStormGeometry = new THREE.SphereGeometry(3.02, 32, 16, 0, Math.PI * 2, Math.PI * 5/6, Math.PI / 6);
        const southStormMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B4513,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const southStorm = new THREE.Mesh(southStormGeometry, southStormMaterial);
        this.saturn.add(southStorm);
    }

    createSaturnShadow() {
        // 创建土星在星环上的阴影
        const shadowGeometry = new THREE.RingGeometry(4, 8.5, 64);
        const shadowMaterial = new THREE.MeshPhongMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.rotation.x = Math.PI / 2;
        shadow.position.y = -0.1;
        this.saturnSystem.add(shadow);
    }

    createSaturnBands() {
        // 创建土星云带
        const bandCount = 5;
        for (let i = 0; i < bandCount; i++) {
            const bandGeometry = new THREE.SphereGeometry(3.01, 32, 32, 0, Math.PI * 2, i * Math.PI / bandCount, Math.PI / bandCount);
            const bandMaterial = new THREE.MeshPhongMaterial({
                color: i % 2 === 0 ? 0xe6ac7a : 0xd4a574, // 交替的云带颜色
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            
            const band = new THREE.Mesh(bandGeometry, bandMaterial);
            this.saturn.add(band);
        }
    }

    createRing() {
        // 创建程序化星环贴图
        const ringTexture = this.createRingTexture();
        
        // 创建多层星环系统，使用可控制的透明度
        this.createRingLayer(4, 5.2, ringTexture, this.ringOpacity.inner, 0xd99e29); // 内环 - 浅黄色
        this.createRingLayer(5.8, 7, ringTexture, this.ringOpacity.middle, 0x9c7913); // 中环 - 金黄色
        this.createRingLayer(7, 8.5, ringTexture, this.ringOpacity.outer, 0xcfa200); // 外环 - 橙色
        
        // 创建卡西尼缝（环之间的空隙）
        this.createCassiniGap(5.2, 5.8);
        
        // 根据状态设置星环的可见性
        this.updateRingVisibility();
    }

    createRingLayer(innerRadius, outerRadius, texture, opacity, color = 0xffffff) {
        const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 256);
        const ringMaterial = new THREE.MeshPhongMaterial({
            map: texture,
            color: color, // 添加颜色
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide,
            shininess: 200, // 增加光泽度，增强反射
            specular: 0x888888, // 增加镜面反射颜色
            alphaTest: 0.1
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0;
        this.saturnSystem.add(ring);
        
        // 添加轻微的厚度变化
        const thinRing = new THREE.Mesh(ringGeometry, new THREE.MeshPhongMaterial({
            map: texture,
            color: color, // 添加颜色
            transparent: true,
            opacity: opacity * 0.3,
            side: THREE.DoubleSide,
            shininess: 150, // 增加光泽度
            specular: 0x666666, // 镜面反射颜色
            alphaTest: 0.1
        }));
        thinRing.rotation.x = Math.PI / 2;
        thinRing.position.y = 0.05;
        this.saturnSystem.add(thinRing);
    }

    createCassiniGap(innerRadius, outerRadius) {
        const gapGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);
        const gapMaterial = new THREE.MeshPhongMaterial({
            color: 0x87CEEB, // 浅蓝色 (Sky Blue)
            transparent: true,
            opacity: this.ringOpacity.cassini, // 使用可控制的透明度
            side: THREE.DoubleSide
        });
        
        const gap = new THREE.Mesh(gapGeometry, gapMaterial);
        gap.rotation.x = Math.PI / 2;
        gap.position.y = 0.02;
        this.saturnSystem.add(gap);
    }

    createStarFragments() {
        // 定义4个环的参数，避开卡西尼缝(5.2-5.8)，使用可调节的比例
        const rings = [
            { name: 'A', innerRadius: 4.0, outerRadius: 4.8, color: 0xffd700, count: Math.floor(this.starFragmentCount * this.ringFragmentRatios.inner) }, // 内环 - 金色
            { name: 'B', innerRadius: 4.8, outerRadius: 5.2, color: 0xffed4e, count: Math.floor(this.starFragmentCount * this.ringFragmentRatios.middle) }, // 中内环 - 亮金色，避开卡西尼缝
            { name: 'C', innerRadius: 5.8, outerRadius: 7.2, color: 0xffa500, count: Math.floor(this.starFragmentCount * this.ringFragmentRatios.outer) }, // 中外环 - 橙色，从卡西尼缝后开始
            { name: 'D', innerRadius: 7.6, outerRadius: 8.4, color: 0xff8c00, count: Math.floor(this.starFragmentCount * this.ringFragmentRatios.outerMost) }  // 外环 - 深橙色
        ];
        
        // 为每个环创建星星碎片
        rings.forEach((ring, ringIndex) => {
            for (let i = 0; i < ring.count; i++) {
                const fragment = this.createStarFragment(ring, ringIndex);
                this.starFragments.push(fragment);
                this.saturnSystem.add(fragment);
            }
        });
    }

    createStarFragment(ring, ringIndex) {
        let geometry, material;
        let size, baseSize; // 声明变量，使其在整个函数中可用
        
        if (this.showPhotoThumbnails) {
            // 照片缩略图模式
            baseSize = 0.15; // 基础大小，适合显示缩略图
            size = baseSize * this.starFragmentSizeScale; // 应用大小比例
            geometry = new THREE.PlaneGeometry(size, size);
            
            // 获取照片索引
            const photoIndex = this.getPhotoIndex();
            const photoPath = this.photos[photoIndex] || this.photos[0];
            
            console.log(`创建照片缩略图星星碎片，照片路径: ${photoPath}, 索引: ${photoIndex}`);
            
            // 创建照片纹理
            const textureLoader = new THREE.TextureLoader();
            const photoTexture = textureLoader.load(
                photoPath,
                (texture) => {
                    // 纹理加载成功
                    console.log(`照片纹理加载成功: ${photoPath}`);
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.needsUpdate = true;
                },
                (progress) => {
                    console.log(`照片加载进度: ${photoPath}`, progress);
                },
                (error) => {
                    console.error(`照片纹理加载失败: ${photoPath}`, error);
                    // 如果加载失败，使用一个简单的颜色纹理作为备用
                    this.createFallbackTexture(photoTexture);
                }
            );
            
            material = new THREE.MeshBasicMaterial({
                map: photoTexture,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide // 双面显示
            });
        } else {
            // 传统菱形模式
            const minSize = 0.06;
            const maxSize = 0.08; // 0.1
            baseSize = Math.random() * (maxSize - minSize) + minSize;
            size = baseSize * this.starFragmentSizeScale; // 应用大小比例
            
            // 创建真正的菱形几何体（尖角朝上），为每个碎片生成并保存随机角缩放
            const cornerScales = this.randomizeDiamondCorners ? {
                left: Math.random() * 0.3 + 0.6,
                right: Math.random() * 0.3 + 0.6,
                front: Math.random() * 0.3 + 0.6,
                back: Math.random() * 0.3 + 0.6
            } : { left: 0.6, right: 0.6, front: 0.6, back: 0.6 };
            geometry = this.createDiamondGeometry(size, cornerScales);
            
            // 使用环的指定颜色
            const color = ring.color;
            
            material = new THREE.MeshPhongMaterial({
                color: color,
                transparent: true,
                opacity: 0.9,
                shininess: 2, // 增加光泽度
                specular: 0x888888, // 白色镜面反射，增强对光的反射
                emissive: color, // 轻微自发光
                emissiveIntensity: 0.1 // 0.1 * 0.8 = 0.08
            });
        }
        
        const fragment = new THREE.Mesh(geometry, material);
        
        // 根据分布参数生成位置：0=完全均匀，1=完全随机
        let angle, radius, height;
        
        if (this.starFragmentDistribution === 0) {
            // 完全均匀分布 - 考虑环形区域的几何特性
            const currentFragmentIndex = this.starFragments.length;
            const fragmentsInThisRing = ring.count;
            const fragmentIndexInRing = currentFragmentIndex % fragmentsInThisRing;
            
            // 角度均匀分布
            angle = (fragmentIndexInRing * (Math.PI * 2) / fragmentsInThisRing) + (Math.random() - 0.5) * 0.1; // 添加微小随机偏移避免完全重叠
            
            // 半径按面积均匀分布（考虑环形面积随半径增加）
            // 环形面积 = π * (R² - r²)，所以半径的平方应该均匀分布
            const innerRadiusSquared = ring.innerRadius * ring.innerRadius;
            const outerRadiusSquared = ring.outerRadius * ring.outerRadius;
            const radiusSquaredRange = outerRadiusSquared - innerRadiusSquared;
            const uniformRadiusSquared = innerRadiusSquared + (fragmentIndexInRing / fragmentsInThisRing) * radiusSquaredRange;
            radius = Math.sqrt(uniformRadiusSquared);
            
            height = 0; // 均匀分布时高度为0
        } else if (this.starFragmentDistribution === 1) {
            // 完全随机分布
            angle = Math.random() * Math.PI * 2;
            radius = Math.random() * (ring.outerRadius - ring.innerRadius) + ring.innerRadius;
            height = (Math.random() - 0.5) * 0.1;
        } else {
            // 混合分布：在均匀和随机之间插值
            const currentFragmentIndex = this.starFragments.length;
            const fragmentsInThisRing = ring.count;
            const fragmentIndexInRing = currentFragmentIndex % fragmentsInThisRing;
            
            // 均匀分布计算
            const uniformAngle = (fragmentIndexInRing * (Math.PI * 2) / fragmentsInThisRing);
            const innerRadiusSquared = ring.innerRadius * ring.innerRadius;
            const outerRadiusSquared = ring.outerRadius * ring.outerRadius;
            const radiusSquaredRange = outerRadiusSquared - innerRadiusSquared;
            const uniformRadiusSquared = innerRadiusSquared + (fragmentIndexInRing / fragmentsInThisRing) * radiusSquaredRange;
            const uniformRadius = Math.sqrt(uniformRadiusSquared);
            const uniformHeight = 0;
            
            // 随机分布计算
            const randomAngle = Math.random() * Math.PI * 2;
            const randomRadius = Math.random() * (ring.outerRadius - ring.innerRadius) + ring.innerRadius;
            const randomHeight = (Math.random() - 0.5) * 0.1;
            
            // 线性插值
            angle = uniformAngle + (randomAngle - uniformAngle) * this.starFragmentDistribution;
            radius = uniformRadius + (randomRadius - uniformRadius) * this.starFragmentDistribution;
            height = uniformHeight + (randomHeight - uniformHeight) * this.starFragmentDistribution;
        }
        
        fragment.position.x = Math.cos(angle) * radius;
        fragment.position.z = Math.sin(angle) * radius;
        // 让星星碎片显示在星环前面，避免被遮挡
        fragment.position.y = height + 0.1; // 在原有高度基础上增加0.1，确保在星环前面
        
        // 根据环的索引获取对应的旋转速度倍数
        const rotationMultipliers = ['inner', 'middle', 'outer', 'outerMost'];
        const ringBaseMultiplier = this.ringRotationMultipliers[rotationMultipliers[ringIndex]] || 1.0;
        
        // 为每个星星碎片生成90%-110%的随机速度倍数
        const randomSpeedMultiplier = Math.random() * 0.2 + 0.9; // 0.9 到 1.1 之间的随机数
        
        // 最终速度倍数 = 星环基础速度 × 随机速度倍数
        const rotationMultiplier = ringBaseMultiplier * randomSpeedMultiplier;
        
        // 存储原始位置用于动画
        fragment.userData = {
            originalPosition: fragment.position.clone(),
            originalAngle: angle,
            radius: radius,
            speed: Math.random() * 0.01 + 0.005,
            rotationMultiplier: rotationMultiplier, // 存储最终旋转速度倍数
            ringBaseMultiplier: ringBaseMultiplier, // 存储星环基础速度倍数
            randomSpeedMultiplier: randomSpeedMultiplier, // 存储随机速度倍数（90%-110%）
            isClicked: false,
            ringName: ring.name, // 存储环的名称
            ringIndex: ringIndex, // 存储环的索引
            // 闪烁相关数据
            isDimming: false, // 是否正在变暗
            dimStartTime: 0, // 变暗开始时间
            dimDuration: 0, // 变暗持续时间
            nextDimTime: Math.random() * 50 + 30, // 下次变暗的时间（30-80秒后）
            // 显示模式
            isPhotoThumbnail: this.showPhotoThumbnails, // 记录当前显示模式
            // 大小相关数据
            originalSize: size, // 存储原始大小（已应用比例）
            baseSize: this.showPhotoThumbnails ? 0.15 : baseSize, // 存储基础大小（未应用比例）
            // 随机大小变化效果
            sizeVariation: {
                enabled: true, // 是否启用大小变化
                minScale: 0.7, // 最小缩放比例
                maxScale: 1.3, // 最大缩放比例
                speed: Math.random() * 0.02 + 0.01, // 大小变化速度（0.01-0.03）
                phase: Math.random() * Math.PI * 2, // 初始相位
                currentScale: 1.0 // 当前缩放比例
            },
            // 自旋转效果
            selfRotation: {
                enabled: true, // 是否启用自旋转
                // 固定的旋转速度（初始化时随机设置一次）
                speedX: (Math.random() * 0.8 + 0.1) * 1, // X轴旋转速度
                speedY: (Math.random() * 0.8 + 0.1) * 2, // Y轴旋转速度
                speedZ: (Math.random() * 0.8 + 0.1) * 0.5, // Z轴旋转速度
                // 当前旋转角度
                currentRotationX: 0,
                currentRotationY: 0,
                currentRotationZ: 0
            }
        };
        
        // 根据显示模式添加特定数据
        if (this.showPhotoThumbnails) {
            const photoIndex = this.getPhotoIndex();
            fragment.userData.photoIndex = photoIndex; // 存储分配的照片索引
            fragment.userData.photoTexture = photoTexture; // 存储照片纹理
        }
        
        // 记录角缩放，便于后续尺寸更新保持形状一致
        if (!fragment.userData) fragment.userData = {};
        fragment.userData.cornerScales = geometry.userData && geometry.userData.cornerScales
            ? { ...geometry.userData.cornerScales }
            : cornerScales;
        
        return fragment;
    }
    
    // 更新星星碎片的闪烁效果
    updateFragmentFlicker(fragment, elapsedTime) {
        const userData = fragment.userData;
        
        // 检查是否到了变暗的时间
        if (!userData.isDimming && elapsedTime >= userData.nextDimTime) {
            userData.isDimming = true;
            userData.dimStartTime = elapsedTime;
            userData.dimDuration = Math.random() * 0.5 + 0.3; // 变暗持续0.3-0.8秒
        }
        
        if (userData.isDimming) {
            const dimElapsed = elapsedTime - userData.dimStartTime;
            
            if (dimElapsed < userData.dimDuration) {
                // 变暗阶段：从明亮到暗
                const dimProgress = dimElapsed / userData.dimDuration;
                const opacity = 0.9 - (dimProgress * 0.6); // 从0.9变到0.3
                fragment.material.opacity = opacity;
            } else if (dimElapsed < userData.dimDuration * 2) {
                // 变亮阶段：从暗到明亮
                const brightProgress = (dimElapsed - userData.dimDuration) / userData.dimDuration;
                const opacity = 0.3 + (brightProgress * 0.6); // 从0.3变到0.9
                fragment.material.opacity = opacity;
            } else {
                // 闪烁完成，恢复正常明亮状态
                userData.isDimming = false;
                fragment.material.opacity = 0.9;
                // 设置下次变暗时间（30-80秒后）
                userData.nextDimTime = elapsedTime + Math.random() * 50 + 30;
            }
        } else {
            // 正常明亮状态
            fragment.material.opacity = 0.9;
        }
    }
    
    // 更新星星碎片的随机大小变化效果
    updateFragmentSizeVariation(fragment, deltaTime) {
        const userData = fragment.userData;
        
        if (!userData.sizeVariation || !userData.sizeVariation.enabled) {
            return;
        }
        
        const sizeVar = userData.sizeVariation;
        
        // 使用正弦波计算大小变化
        const time = performance.now() * 0.001; // 转换为秒
        const wave = Math.sin(time * sizeVar.speed + sizeVar.phase);
        
        // 将正弦波从[-1,1]映射到[minScale, maxScale]
        const normalizedWave = (wave + 1) / 2; // 映射到[0,1]
        sizeVar.currentScale = sizeVar.minScale + normalizedWave * (sizeVar.maxScale - sizeVar.minScale);
        
        // 应用缩放
        fragment.scale.setScalar(sizeVar.currentScale);
    }
    
    // 更新星星碎片的自旋转效果
    updateFragmentSelfRotation(fragment, deltaTime) {
        const userData = fragment.userData;
        
        if (!userData.selfRotation || !userData.selfRotation.enabled) {
            return;
        }
        
        const selfRot = userData.selfRotation;
        
        // 更新旋转角度（使用固定的初始速度）
        selfRot.currentRotationX += selfRot.speedX * deltaTime;
        selfRot.currentRotationY += selfRot.speedY * deltaTime;
        selfRot.currentRotationZ += selfRot.speedZ * deltaTime;
        
        // 应用旋转（相对于原始旋转）
        fragment.rotation.x = selfRot.currentRotationX;
        fragment.rotation.y = selfRot.currentRotationY;
        fragment.rotation.z = selfRot.currentRotationZ;
    }
    
    // 更新星环可见性
    updateRingVisibility() {
        // 检查场景中的所有子对象
        this.scene.children.forEach(child => {
            if (child.geometry && child.geometry.type === 'RingGeometry') {
                child.visible = this.isRingVisible;
            }
        });
        
        // 检查土星系统中的星环对象
        if (this.saturnSystem) {
            this.saturnSystem.children.forEach(child => {
                if (child.geometry && child.geometry.type === 'RingGeometry') {
                    child.visible = this.isRingVisible;
                }
            });
        }
    }
    
    // 切换星环显示状态
    toggleRingVisibility() {
        this.isRingVisible = !this.isRingVisible;
        this.updateRingVisibility();
    }
    
    // 切换照片缩略图显示模式
    togglePhotoThumbnails() {
        this.showPhotoThumbnails = !this.showPhotoThumbnails;
        
        // 移除现有的星星碎片
        this.starFragments.forEach(fragment => {
            this.saturnSystem.remove(fragment);
        });
        this.starFragments = [];
        
        // 重新创建星星碎片
        this.createStarFragments();
        
        console.log(`照片缩略图模式: ${this.showPhotoThumbnails ? '开启' : '关闭'}`);
    }
    
    // 更新环碎片比例
    updateRingFragmentRatios() {
        // 移除现有的星星碎片
        this.starFragments.forEach(fragment => {
            this.saturnSystem.remove(fragment);
        });
        this.starFragments = [];
        
        // 重新创建星星碎片
        this.createStarFragments();
        
        console.log('环碎片比例已更新:', this.ringFragmentRatios);
    }
    
    // 更新环的透明度
    updateRingOpacity() {
        // 重新创建星环以应用新的透明度
        this.recreateRings();
    }
    
    // 重新创建星环
    recreateRings() {
        // 移除现有的星环
        if (this.saturnSystem) {
            const ringsToRemove = [];
            this.saturnSystem.children.forEach(child => {
                if (child.geometry && child.geometry.type === 'RingGeometry') {
                    ringsToRemove.push(child);
                }
            });
            ringsToRemove.forEach(ring => {
                this.saturnSystem.remove(ring);
            });
        }
        
        // 重新创建星环
        this.createRing();
    }
    
    // 智能分配照片索引
    getPhotoIndex() {
        const photoCount = this.photos.length;
        
        if (photoCount === 0) {
            return 0; // 如果没有照片，返回0
        } else if (photoCount >= this.starFragmentCount) {
            // 照片数量足够，随机选择
            return Math.floor(Math.random() * photoCount);
        } else {
            // 照片数量不足，使用智能分配策略
            // 先按顺序分配，然后添加随机偏移
            const baseIndex = this.photoIndexCounter % photoCount;
            this.photoIndexCounter++;
            
            // 添加一些随机性，但保持相对均匀的分布
            const randomOffset = Math.floor(Math.random() * Math.min(photoCount, 3));
            return (baseIndex + randomOffset) % photoCount;
        }
    }

    createStarField() {
        console.log('开始加载背景纹理...');
        
        // 检查是否通过HTTP服务器访问
        const isHttpServer = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        
        if (!isHttpServer) {
            console.warn('⚠️ 检测到使用file://协议访问，这会导致CORS错误');
            console.warn('请通过HTTP服务器访问：');
            console.warn('1. 运行 start.bat 或 python server.py');
            console.warn('2. 然后访问 http://localhost:8000');
            console.warn('现在使用纯色背景作为备用');
            this.scene.background = new THREE.Color(0x000011);
            return;
        }
        
        // 使用简单的纹理加载方式
        const textureLoader = new THREE.TextureLoader();
        
        // 立即加载纹理
        const texture = textureLoader.load(
            'Textures/bg.jpg',
            (loadedTexture) => {
                console.log('背景纹理加载成功');
                // 设置纹理参数，实现cover效果（保持长宽比，铺满屏幕，超出部分裁剪）
                loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
                loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
                loadedTexture.minFilter = THREE.LinearFilter;
                loadedTexture.magFilter = THREE.LinearFilter;
                
                // 计算纹理的缩放比例，实现cover效果，并放大10%
                const aspect = window.innerWidth / window.innerHeight;
                const textureAspect = loadedTexture.image.width / loadedTexture.image.height;
                const scaleFactor = 0.9; // 放大10%（repeat值越小，纹理越大）
                
                if (aspect > textureAspect) {
                    // 屏幕更宽，纹理需要放大以覆盖整个屏幕宽度，垂直方向会超出
                    loadedTexture.repeat.x = scaleFactor;
                    loadedTexture.repeat.y = (textureAspect / aspect) * scaleFactor;
                    loadedTexture.offset.x = (1 - loadedTexture.repeat.x) / 2;
                    loadedTexture.offset.y = (1 - loadedTexture.repeat.y) / 2;
                } else {
                    // 屏幕更高，纹理需要放大以覆盖整个屏幕高度，水平方向会超出
                    loadedTexture.repeat.x = (aspect / textureAspect) * scaleFactor;
                    loadedTexture.repeat.y = scaleFactor;
                    loadedTexture.offset.x = (1 - loadedTexture.repeat.x) / 2;
                    loadedTexture.offset.y = (1 - loadedTexture.repeat.y) / 2;
                }
                
                // 立即设置为场景背景
                this.scene.background = loadedTexture;
                console.log('背景已设置为纹理，左右铺满且保持长宽比');
            },
            (progress) => {
                console.log('加载进度:', progress);
            },
            (error) => {
                console.error('背景纹理加载失败:', error);
                // 使用纯色背景作为备用
                this.scene.background = new THREE.Color(0x000011);
                console.log('使用纯色背景作为备用');
            }
        );
        
        console.log('纹理加载器已创建');
    }
    
    // 更新背景纹理比例
    updateBackgroundTexture() {
        if (this.scene.background && this.scene.background.isTexture) {
            const texture = this.scene.background;
            const aspect = window.innerWidth / window.innerHeight;
            const textureAspect = texture.image.width / texture.image.height;
            const scaleFactor = 0.9; // 放大10%（repeat值越小，纹理越大）
            
            if (aspect > textureAspect) {
                // 屏幕更宽，纹理需要放大以覆盖整个屏幕宽度，垂直方向会超出
                texture.repeat.x = scaleFactor;
                texture.repeat.y = (textureAspect / aspect) * scaleFactor;
                texture.offset.x = (1 - texture.repeat.x) / 2;
                texture.offset.y = (1 - texture.repeat.y) / 2;
            } else {
                // 屏幕更高，纹理需要放大以覆盖整个屏幕高度，水平方向会超出
                texture.repeat.x = (aspect / textureAspect) * scaleFactor;
                texture.repeat.y = scaleFactor;
                texture.offset.x = (1 - texture.repeat.x) / 2;
                texture.offset.y = (1 - texture.repeat.y) / 2;
            }
            
            texture.needsUpdate = true;
            console.log('背景纹理比例已更新（cover效果，放大10%）');
            
            // 重新应用陀螺仪视差效果
            this.updateBackgroundParallax();
        }
    }

    // 初始化陀螺仪
    initGyroscope() {
        // 检查是否支持陀螺仪
        if (typeof DeviceOrientationEvent !== 'undefined') {
            this.isGyroscopeSupported = true;
            console.log('✅ 设备支持陀螺仪');
            
            // 请求权限（iOS 13+需要）
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                console.log('📱 检测到iOS设备，需要请求陀螺仪权限');
                this.requestGyroscopePermission();
            } else {
                // 非iOS设备直接添加事件监听器
                this.addGyroscopeListener();
            }
        } else {
            console.log('❌ 设备不支持陀螺仪');
        }
    }

    // 请求陀螺仪权限（iOS 13+）
    async requestGyroscopePermission() {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                this.gyroscopePermissionGranted = true;
                console.log('✅ 陀螺仪权限已授予');
                this.addGyroscopeListener();
            } else {
                console.log('❌ 陀螺仪权限被拒绝');
            }
        } catch (error) {
            console.error('❌ 请求陀螺仪权限时出错:', error);
        }
    }

    // 添加陀螺仪事件监听器
    addGyroscopeListener() {
        window.addEventListener('deviceorientation', (event) => {
            this.gyroscopeData.alpha = event.alpha || 0;  // 绕Z轴旋转
            this.gyroscopeData.beta = event.beta || 0;    // 绕X轴旋转（前后倾斜）
            this.gyroscopeData.gamma = event.gamma || 0;  // 绕Y轴旋转（左右倾斜）
            
            // 更新背景位置
            this.updateBackgroundParallax();
        });
        
        console.log('✅ 陀螺仪事件监听器已添加');
    }

    // 根据陀螺仪数据更新背景视差效果
    updateBackgroundParallax() {
        if (!this.scene.background || !this.scene.background.isTexture) {
            return;
        }

        const texture = this.scene.background;
        
        // 计算视差偏移量（轻微移动效果）
        // 使用beta（前后倾斜）和gamma（左右倾斜）来控制背景移动
        const maxOffset = 0.05; // 最大偏移量（5%）
        
        // 将陀螺仪角度转换为偏移量
        // beta: -180到180度，gamma: -90到90度
        const betaOffset = (this.gyroscopeData.beta / 180) * maxOffset;
        const gammaOffset = (this.gyroscopeData.gamma / 90) * maxOffset;
        
        // 计算新的偏移位置
        const baseOffsetX = (1 - texture.repeat.x) / 2;
        const baseOffsetY = (1 - texture.repeat.y) / 2;
        
        // 应用视差偏移
        texture.offset.x = baseOffsetX + gammaOffset;
        texture.offset.y = baseOffsetY + betaOffset;
        
        // 确保偏移量在合理范围内
        texture.offset.x = Math.max(0, Math.min(1 - texture.repeat.x, texture.offset.x));
        texture.offset.y = Math.max(0, Math.min(1 - texture.repeat.y, texture.offset.y));
        
        texture.needsUpdate = true;
    }

    // 创建流星飞行动画
    createMeteorAnimation(fragment, targetPosition, duration = 1.0, onComplete = null) {
        const animationId = ++this.animationId;
        const startPosition = fragment.position.clone();
        const startTime = performance.now();
        
        // 计算弧线轨迹的控制点
        const midPoint = new THREE.Vector3().addVectors(startPosition, targetPosition).multiplyScalar(0.5);
        // 在Y轴上增加高度，形成弧线
        midPoint.y += 3; // 弧线高度
        // 在X轴上偏移，让弧线向同一方向延伸
        midPoint.x += (startPosition.x > 0 ? 4 : -4); // 右侧向右偏移，左侧向左偏移
        
        const animation = {
            id: animationId,
            fragment: fragment,
            startPosition: startPosition,
            targetPosition: targetPosition,
            midPoint: midPoint,
            startTime: startTime,
            duration: duration * 1000, // 转换为毫秒
            onComplete: onComplete,
            isActive: true
        };
        
        this.meteorAnimations.set(animationId, animation);
        return animationId;
    }

    // 更新流星动画
    updateMeteorAnimations() {
        const currentTime = performance.now();
        
        for (const [id, animation] of this.meteorAnimations) {
            if (!animation.isActive) continue;
            
            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            
            // 使用缓动函数让动画更自然
            const easeProgress = this.easeInOutCubic(progress);
            
            // 使用二次贝塞尔曲线计算位置
            const t = easeProgress;
            const oneMinusT = 1 - t;
            
            // 二次贝塞尔曲线: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
            const position = new THREE.Vector3();
            position.addScaledVector(animation.startPosition, oneMinusT * oneMinusT);
            position.addScaledVector(animation.midPoint, 2 * oneMinusT * t);
            position.addScaledVector(animation.targetPosition, t * t);
            
            // 更新碎片位置
            animation.fragment.position.copy(position);
            
            // 添加旋转效果，让碎片在飞行时旋转
            const rotationSpeed = 0.15;
            animation.fragment.rotation.x += rotationSpeed;
            animation.fragment.rotation.y += rotationSpeed;
            animation.fragment.rotation.z += rotationSpeed * 0.5;
            
            // 添加缩放效果，飞行时稍微放大
            const scale = 1 + Math.sin(progress * Math.PI) * 0.4;
            animation.fragment.scale.setScalar(scale);
            
            // 添加发光效果和拖尾效果
            if (animation.isReturnAnimation) {
                this.addMeteorReturnTrailEffect(animation.fragment, progress);
            } else {
                this.addMeteorTrailEffect(animation.fragment, progress);
            }
            
            // 检查动画是否完成
            if (progress >= 1) {
                animation.isActive = false;
                this.meteorAnimations.delete(id);
                
                // 恢复原始缩放
                animation.fragment.scale.setScalar(1);
                
                // 恢复原始发光
                if (animation.fragment.material.emissive) {
                    animation.fragment.material.emissiveIntensity = 0;
                }
                
                // 执行完成回调
                if (animation.onComplete) {
                    animation.onComplete();
                }
            }
        }
    }

    // 缓动函数 - 三次贝塞尔缓动
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // 添加流星拖尾效果
    addMeteorTrailEffect(fragment, progress) {
        // 增强发光效果
        if (fragment.material.emissive) {
            const intensity = Math.sin(progress * Math.PI * 3) * 0.3 + 0.7;
            fragment.material.emissive.setHex(0xffd700);
            fragment.material.emissiveIntensity = intensity * 0.5;
        }
        
        // 增强透明度变化
        const opacity = 0.9 + Math.sin(progress * Math.PI * 2) * 0.1;
        fragment.material.opacity = opacity;
        
        // 增强光泽度
        fragment.material.shininess = 200 + Math.sin(progress * Math.PI * 4) * 50;
    }

    // 添加流星返回拖尾效果
    addMeteorReturnTrailEffect(fragment, progress) {
        // 返回时的发光效果（稍微柔和一些）
        if (fragment.material.emissive) {
            const intensity = Math.sin(progress * Math.PI * 2) * 0.2 + 0.6;
            fragment.material.emissive.setHex(0xffa500); // 橙色发光
            fragment.material.emissiveIntensity = intensity * 0.3;
        }
        
        // 返回时的透明度变化（逐渐恢复）
        const opacity = 0.7 + Math.sin(progress * Math.PI) * 0.2;
        fragment.material.opacity = opacity;
        
        // 返回时的光泽度（逐渐恢复）
        fragment.material.shininess = 150 + Math.sin(progress * Math.PI * 2) * 30;
    }

    // 创建流星返回动画
    createMeteorReturnAnimation(fragment, originalPosition, duration = 1.0, onComplete = null) {
        const animationId = ++this.animationId;
        const startPosition = fragment.position.clone();
        const startTime = performance.now();
        
        // 计算返回弧线轨迹的控制点
        const midPoint = new THREE.Vector3().addVectors(startPosition, originalPosition).multiplyScalar(0.5);
        // 在Y轴上增加高度，形成返回弧线
        midPoint.y += 2; // 返回弧线高度
        // 在X轴上偏移，让返回弧线向同一方向延伸
        midPoint.x += (startPosition.x > 0 ? 3 : -3); // 右侧向右偏移，左侧向左偏移
        
        const animation = {
            id: animationId,
            fragment: fragment,
            startPosition: startPosition,
            targetPosition: originalPosition,
            midPoint: midPoint,
            startTime: startTime,
            duration: duration * 1000, // 转换为毫秒
            onComplete: onComplete,
            isActive: true,
            isReturnAnimation: true // 标记这是返回动画
        };
        
        this.meteorAnimations.set(animationId, animation);
        return animationId;
    }

    async loadPhotos() {
        try {
            console.log('开始加载照片列表...');
            
            // 首先尝试使用API获取照片列表
            try {
                // 尝试多个可能的API端点
                const apiEndpoints = [
                    '/api/photos',
                    'http://localhost:8000/photos',
                    'http://127.0.0.1:8000/photos',
                    'http://127.0.0.1:5500/photos'
                ];
                
                let response = null;
                let apiEndpoint = null;
                
                for (const endpoint of apiEndpoints) {
                    try {
                        console.log(`尝试API端点: ${endpoint}`);
                        response = await fetch(endpoint);
                        if (response.ok) {
                            apiEndpoint = endpoint;
                            console.log(`✅ 成功连接到API端点: ${endpoint}`);
                            break;
                        }
                    } catch (error) {
                        console.log(`❌ API端点失败: ${endpoint}`, error.message);
                    }
                }
                
                if (!response || !response.ok) {
                    throw new Error('所有API端点都不可用');
                }
                
                console.log('API响应状态:', response.status);
                
                if (response.ok) {
                    // 检查响应内容类型
                    const contentType = response.headers.get('content-type');
                    console.log('响应内容类型:', contentType);
                    
                    if (contentType && contentType.includes('application/json')) {
                        // 处理JSON响应（来自我们的API）
                        const apiResponse = await response.json();
                        console.log('API响应数据:', apiResponse);
                        
                        if (apiResponse.success) {
                            // 服务器已经过滤了图片文件，直接使用
                            this.photos = apiResponse.photos.map(file => `photos/${file}`);
                            console.log(`✅ 通过API成功加载 ${this.photos.length} 张照片:`, this.photos);
                            
                            // 如果没有照片，显示警告
                            if (this.photos.length === 0) {
                                console.warn('⚠️ 在photos文件夹中没有找到任何图片文件');
                                console.warn('请将图片文件（.jpg, .jpeg, .png, .gif, .bmp, .webp）放入photos文件夹中');
                            }
                            return; // 成功加载，直接返回
                        }
                    } else {
                        // 处理HTML响应（来自文件服务器）
                        console.log('收到HTML响应，尝试解析照片文件列表');
                        const htmlText = await response.text();
                        
                        // 从HTML中提取照片文件链接
                        const photoLinks = this.extractPhotoLinksFromHTML(htmlText);
                        if (photoLinks.length > 0) {
                            this.photos = photoLinks;
                            console.log(`✅ 从HTML成功解析 ${this.photos.length} 张照片:`, this.photos);
                            return; // 成功加载，直接返回
                        }
                    }
                }
            } catch (apiError) {
                console.log('API请求失败，尝试备用方案:', apiError.message);
            }
            
            // 备用方案：尝试直接访问已知的照片文件
            console.log('🔄 使用备用方案：尝试直接访问照片文件');
            
            // 扩展的照片列表，包含更多可能的文件名
            const knownPhotos = [
                'photos/1ca021cd0e233a042e6100fcee387ded.jpg',
                'photos/2a5ef61afbeebe062a36a5f3bd475e90.jpg',
                // 添加一些常见的照片文件名模式
                'photos/photo1.jpg',
                'photos/photo2.jpg',
                'photos/image1.jpg',
                'photos/image2.jpg',
                'photos/pic1.jpg',
                'photos/pic2.jpg',
                'photos/memory1.jpg',
                'photos/memory2.jpg'
            ];
            
            // 测试哪些照片文件实际存在
            const existingPhotos = [];
            for (const photoPath of knownPhotos) {
                try {
                    const response = await fetch(photoPath, { method: 'HEAD' });
                    if (response.ok) {
                        existingPhotos.push(photoPath);
                        console.log(`✅ 找到照片: ${photoPath}`);
                    } else {
                        console.log(`❌ 照片不存在: ${photoPath}`);
                    }
                } catch (error) {
                    console.log(`❌ 无法访问照片: ${photoPath}`, error.message);
                }
            }
            
            if (existingPhotos.length > 0) {
                this.photos = existingPhotos;
                console.log(`✅ 使用备用照片列表，共 ${this.photos.length} 张照片:`, this.photos);
            } else {
                // 最后的备用方案：使用硬编码列表
                this.photos = knownPhotos.slice(0, 2); // 只使用前两个已知存在的照片
                console.log(`⚠️ 无法验证照片存在性，使用硬编码列表，共 ${this.photos.length} 张照片:`, this.photos);
            }
            
        } catch (error) {
            console.error('❌ 加载照片列表完全失败:', error);
            
            // 最后的备用方案：使用硬编码的照片列表
            this.photos = [
                'photos/1ca021cd0e233a042e6100fcee387ded.jpg',
                'photos/2a5ef61afbeebe062a36a5f3bd475e90.jpg'
            ];
            
            console.log(`✅ 使用最终备用照片列表，共 ${this.photos.length} 张照片:`, this.photos);
        }
        
        // 确保有照片可用
        if (this.photos.length === 0) {
            this.photos = ['photos/1ca021cd0e233a042e6100fcee387ded.jpg'];
            console.log('⚠️ 没有找到照片，使用默认照片');
        }
        
        console.log('照片列表加载完成，共', this.photos.length, '张照片');
        return Promise.resolve();
    }

    // 从HTML中提取照片文件链接
    extractPhotoLinksFromHTML(htmlText) {
        try {
            // 创建临时DOM元素来解析HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            
            // 查找所有链接
            const links = doc.querySelectorAll('a[href]');
            const photoFiles = [];
            
            // 支持的图片扩展名
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
            
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href) {
                    // 检查是否是图片文件
                    const isImage = imageExtensions.some(ext => 
                        href.toLowerCase().endsWith(ext)
                    );
                    
                    if (isImage) {
                        // 处理路径格式
                        let photoPath = href;
                        
                        // 如果链接已经包含photos/前缀，直接使用
                        if (photoPath.startsWith('photos/')) {
                            // 已经是正确格式，直接使用
                        } else if (photoPath.startsWith('/photos/')) {
                            // 去掉开头的斜杠
                            photoPath = photoPath.substring(1);
                        } else {
                            // 添加photos/前缀
                            photoPath = `photos/${photoPath}`;
                        }
                        
                        photoFiles.push(photoPath);
                    }
                }
            });
            
            console.log('从HTML解析到的照片文件:', photoFiles);
            return photoFiles;
            
        } catch (error) {
            console.error('解析HTML时出错:', error);
            return [];
        }
    }

    setupEventListeners() {
        // 处理点击/触摸事件的通用函数
        const handleInteraction = (event) => {
            // 如果照片已经打开，点击任意地方关闭照片
            if (this.isPhotoOpen) {
                this.hidePhoto();
                return;
            }
            
            // 获取触摸或鼠标坐标
            let clientX, clientY;
            if (event.touches && event.touches.length > 0) {
                // 触摸事件
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else {
                // 鼠标事件
                clientX = event.clientX;
                clientY = event.clientY;
            }
            
            this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
            
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.starFragments);
            
            if (intersects.length > 0) {
                const clickedFragment = intersects[0].object;
                this.showPhoto(clickedFragment);
            }
        };

        // 鼠标点击事件
        window.addEventListener('click', handleInteraction);
        
        // 触摸事件
        window.addEventListener('touchstart', (event) => {
            // 阻止默认的触摸行为（如滚动、缩放等）
            event.preventDefault();
            handleInteraction(event);
        }, { passive: false });
        
        // 防止触摸时的默认行为
        window.addEventListener('touchmove', (event) => {
            event.preventDefault();
        }, { passive: false });
        
        // 防止双击缩放
        let lastTouchEnd = 0;
        window.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // 防止长按选择文本
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        // 窗口大小调整
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            
            // 重新计算背景纹理比例
            this.updateBackgroundTexture();
        });

        // 旋转速度控制
        const rotationSlider = document.getElementById('rotationSpeed');
        const rotationValue = document.getElementById('rotationValue');
        
        rotationSlider.addEventListener('input', (e) => {
            this.rotationSpeed = parseFloat(e.target.value);
            rotationValue.textContent = `${this.rotationSpeed} 圈/分钟`;
        });

        // 相机距离控制
        const cameraDistanceSlider = document.getElementById('cameraDistance');
        const cameraDistanceValue = document.getElementById('cameraDistanceValue');
        
        cameraDistanceSlider.addEventListener('input', (e) => {
            this.cameraDistance = parseFloat(e.target.value);
            cameraDistanceValue.textContent = this.cameraDistance;
            this.updateCameraPosition();
        });

        // 相机高度控制
        const cameraHeightSlider = document.getElementById('cameraHeight');
        const cameraHeightValue = document.getElementById('cameraHeightValue');
        
        cameraHeightSlider.addEventListener('input', (e) => {
            this.cameraHeight = parseFloat(e.target.value);
            cameraHeightValue.textContent = this.cameraHeight;
            this.updateCameraPosition();
        });

        // 相机FOV控制
        const cameraFOVSlider = document.getElementById('cameraFOV');
        const cameraFOVValue = document.getElementById('cameraFOVValue');
        
        cameraFOVSlider.addEventListener('input', (e) => {
            this.cameraFOV = parseFloat(e.target.value);
            cameraFOVValue.textContent = `${this.cameraFOV}°`;
            this.updateCameraPosition();
        });

        // 土星水平位置控制 - 已移除
        // const saturnPositionSlider = document.getElementById('saturnPosition');
        // const saturnPositionValue = document.getElementById('saturnPositionValue');
        // 
        // saturnPositionSlider.addEventListener('input', (e) => {
        //     this.saturnPositionAngle = parseFloat(e.target.value);
        //     saturnPositionValue.textContent = `${this.saturnPositionAngle}°`;
        //     this.updateCameraPosition();
        // });

        // 星球屏幕位置控制
        const planetScreenXSlider = document.getElementById('planetScreenX');
        const planetScreenXValue = document.getElementById('planetScreenXValue');
        const planetScreenYSlider = document.getElementById('planetScreenY');
        const planetScreenYValue = document.getElementById('planetScreenYValue');
        
        if (planetScreenXSlider && planetScreenXValue) {
            planetScreenXSlider.addEventListener('input', (e) => {
                const x = parseFloat(e.target.value);
                this.setPlanetScreenPosition(x, this.planetScreenPosition.y);
                planetScreenXValue.textContent = x.toFixed(2);
            });
        }
        
        if (planetScreenYSlider && planetScreenYValue) {
            planetScreenYSlider.addEventListener('input', (e) => {
                const y = parseFloat(e.target.value);
                this.setPlanetScreenPosition(this.planetScreenPosition.x, y);
                planetScreenYValue.textContent = y.toFixed(2);
            });
        }

        // 星星碎片数量控制
        const starFragmentCountSlider = document.getElementById('starFragmentCount');
        const starFragmentCountValue = document.getElementById('starFragmentCountValue');
        
        if (starFragmentCountSlider && starFragmentCountValue) {
            starFragmentCountSlider.addEventListener('input', (e) => {
                const newCount = parseInt(e.target.value);
                this.updateStarFragmentCount(newCount);
                starFragmentCountValue.textContent = newCount;
            });
        }

        // 星星碎片分布控制
        const starFragmentDistributionSlider = document.getElementById('starFragmentDistribution');
        const starFragmentDistributionValue = document.getElementById('starFragmentDistributionValue');
        
        if (starFragmentDistributionSlider && starFragmentDistributionValue) {
            starFragmentDistributionSlider.addEventListener('input', (e) => {
                const newDistribution = parseFloat(e.target.value);
                this.updateStarFragmentDistribution(newDistribution);
                starFragmentDistributionValue.textContent = newDistribution.toFixed(2);
            });
        }

        // 星星碎片大小比例控制
        const starFragmentSizeScaleSlider = document.getElementById('starFragmentSizeScale');
        const starFragmentSizeScaleValue = document.getElementById('starFragmentSizeScaleValue');
        
        if (starFragmentSizeScaleSlider && starFragmentSizeScaleValue) {
            starFragmentSizeScaleSlider.addEventListener('input', (e) => {
                const newSizeScale = parseFloat(e.target.value);
                this.updateStarFragmentSizeScale(newSizeScale);
                starFragmentSizeScaleValue.textContent = newSizeScale.toFixed(1);
            });
        }

        // 星环显示控制
        const ringVisibilityCheckbox = document.getElementById('ringVisibility');
        if (ringVisibilityCheckbox) {
            ringVisibilityCheckbox.addEventListener('change', (e) => {
                this.isRingVisible = e.target.checked;
                this.updateRingVisibility();
            });
        }

        // 照片缩略图显示控制
        const photoThumbnailsCheckbox = document.getElementById('photoThumbnails');
        if (photoThumbnailsCheckbox) {
            photoThumbnailsCheckbox.addEventListener('change', (e) => {
                this.showPhotoThumbnails = e.target.checked;
                this.togglePhotoThumbnails();
            });
        }

        // 环碎片比例控制
        const innerRingRatioSlider = document.getElementById('innerRingRatio');
        const innerRingRatioValue = document.getElementById('innerRingRatioValue');
        if (innerRingRatioSlider && innerRingRatioValue) {
            innerRingRatioSlider.addEventListener('input', (e) => {
                this.ringFragmentRatios.inner = parseFloat(e.target.value);
                innerRingRatioValue.textContent = `${Math.round(this.ringFragmentRatios.inner * 100)}%`;
                this.updateRingFragmentRatios();
            });
        }

        const middleRingRatioSlider = document.getElementById('middleRingRatio');
        const middleRingRatioValue = document.getElementById('middleRingRatioValue');
        if (middleRingRatioSlider && middleRingRatioValue) {
            middleRingRatioSlider.addEventListener('input', (e) => {
                this.ringFragmentRatios.middle = parseFloat(e.target.value);
                middleRingRatioValue.textContent = `${Math.round(this.ringFragmentRatios.middle * 100)}%`;
                this.updateRingFragmentRatios();
            });
        }

        const outerRingRatioSlider = document.getElementById('outerRingRatio');
        const outerRingRatioValue = document.getElementById('outerRingRatioValue');
        if (outerRingRatioSlider && outerRingRatioValue) {
            outerRingRatioSlider.addEventListener('input', (e) => {
                this.ringFragmentRatios.outer = parseFloat(e.target.value);
                outerRingRatioValue.textContent = `${Math.round(this.ringFragmentRatios.outer * 100)}%`;
                this.updateRingFragmentRatios();
            });
        }

        const outerMostRingRatioSlider = document.getElementById('outerMostRingRatio');
        const outerMostRingRatioValue = document.getElementById('outerMostRingRatioValue');
        if (outerMostRingRatioSlider && outerMostRingRatioValue) {
            outerMostRingRatioSlider.addEventListener('input', (e) => {
                this.ringFragmentRatios.outerMost = parseFloat(e.target.value);
                outerMostRingRatioValue.textContent = `${Math.round(this.ringFragmentRatios.outerMost * 100)}%`;
                this.updateRingFragmentRatios();
            });
        }

        // 星环透明度控制
        const innerRingOpacitySlider = document.getElementById('innerRingOpacity');
        const innerRingOpacityValue = document.getElementById('innerRingOpacityValue');
        if (innerRingOpacitySlider && innerRingOpacityValue) {
            innerRingOpacitySlider.addEventListener('input', (e) => {
                this.ringOpacity.inner = parseFloat(e.target.value);
                innerRingOpacityValue.textContent = this.ringOpacity.inner.toFixed(2);
                this.updateRingOpacity();
            });
        }

        const middleRingOpacitySlider = document.getElementById('middleRingOpacity');
        const middleRingOpacityValue = document.getElementById('middleRingOpacityValue');
        if (middleRingOpacitySlider && middleRingOpacityValue) {
            middleRingOpacitySlider.addEventListener('input', (e) => {
                this.ringOpacity.middle = parseFloat(e.target.value);
                middleRingOpacityValue.textContent = this.ringOpacity.middle.toFixed(2);
                this.updateRingOpacity();
            });
        }

        const outerRingOpacitySlider = document.getElementById('outerRingOpacity');
        const outerRingOpacityValue = document.getElementById('outerRingOpacityValue');
        if (outerRingOpacitySlider && outerRingOpacityValue) {
            outerRingOpacitySlider.addEventListener('input', (e) => {
                this.ringOpacity.outer = parseFloat(e.target.value);
                outerRingOpacityValue.textContent = this.ringOpacity.outer.toFixed(2);
                this.updateRingOpacity();
            });
        }

        const cassiniGapOpacitySlider = document.getElementById('cassiniGapOpacity');
        const cassiniGapOpacityValue = document.getElementById('cassiniGapOpacityValue');
        if (cassiniGapOpacitySlider && cassiniGapOpacityValue) {
            cassiniGapOpacitySlider.addEventListener('input', (e) => {
                this.ringOpacity.cassini = parseFloat(e.target.value);
                cassiniGapOpacityValue.textContent = this.ringOpacity.cassini.toFixed(2);
                this.updateRingOpacity();
            });
        }

        // 详细设置切换按钮
        const toggleDetailsBtn = document.getElementById('toggleDetails');
        if (toggleDetailsBtn) {
            toggleDetailsBtn.addEventListener('click', () => {
                this.toggleDetailedControls();
            });
        }

        // 键盘快捷键：按 'C' 键切换控制面板显示/隐藏
        window.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'c') {
                this.toggleControlPanel();
            }
        });
    }

    showPhoto(fragment) {
        // 如果已经有照片打开，不处理新的点击
        if (this.isPhotoOpen) {
            return;
        }
        
        // 标记碎片为已点击
        fragment.userData.isClicked = true;
        
        // 记录星星碎片的相对位置和父节点
        const originalParent = fragment.parent;
        const relativePosition = fragment.position.clone();
        const relativeRotation = fragment.rotation.clone();
        const relativeScale = fragment.scale.clone();
        
        // 先计算世界位置（在脱离父节点之前）
        const worldPosition = new THREE.Vector3();
        fragment.getWorldPosition(worldPosition);
        
        // 将星星碎片脱离父节点
        originalParent.remove(fragment);
        this.scene.add(fragment);
        
        // 设置世界位置，保持位置不变
        fragment.position.copy(worldPosition);
        
        // 计算屏幕中央位置（相机正中心射线与土星距离一半的交点）
        const screenCenterNDC = new THREE.Vector3(0, 0, 0.5); // 屏幕中心，深度为0.5
        const screenCenter = screenCenterNDC.unproject(this.camera); // 将屏幕坐标转换为3D世界坐标
        
        // 计算从相机到屏幕中心的射线方向
        const cameraToScreenCenter = screenCenter.sub(this.camera.position).normalize();
        const saturnDistance = this.camera.position.length(); // 相机到土星的距离
        const targetDistance = saturnDistance * 0.5; // 土星距离的一半
        const targetPoint = this.camera.position.clone().add(cameraToScreenCenter.multiplyScalar(targetDistance));
        
        // 存储原始信息到用户数据中
        fragment.userData.originalParent = originalParent;
        fragment.userData.relativePosition = relativePosition;
        fragment.userData.relativeRotation = relativeRotation;
        fragment.userData.relativeScale = relativeScale;
        fragment.userData.originalWorldPosition = worldPosition.clone();
        
        // 创建流星飞行动画
        this.createMeteorAnimation(
            fragment, 
            targetPoint, 
            1.2, // 动画持续时间1.2秒
            () => {
                // 动画完成后的回调
                this.showPhotoModal(fragment);
            }
        );
        
        console.log('开始流星飞行动画');
    }

    showPhotoModal(fragment) {
        // 随机选择照片，而不是使用固定的索引
        const photoIndex = Math.floor(Math.random() * this.photos.length);
        const modal = document.getElementById('photo-modal');
        const modalImage = document.getElementById('modal-image');
        const modalTitle = document.getElementById('modal-title');
        
        // 设置照片
        modalImage.src = this.photos[photoIndex];
        
        // 从照片路径中提取文件名（去掉photos/前缀和扩展名）
        const photoPath = this.photos[photoIndex];
        const fileName = photoPath.split('/').pop(); // 获取文件名
        const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.'); // 去掉扩展名
        
        // 显示文件名作为标题
        modalTitle.textContent = fileNameWithoutExt;
        
        // 显示模态框
        modal.classList.add('show');
        
        // 标记照片已打开
        this.isPhotoOpen = true;
        
        // 添加点击效果
        fragment.scale.set(1.5, 1.5, 1.5);
        if (fragment.userData.isPhotoThumbnail) {
            fragment.material.opacity = 1.0; // 照片缩略图点击时完全不透明
        } else {
            fragment.material.shininess = 200; // 小球点击时增强光泽度
            fragment.material.specular = new THREE.Color(0xffffff); // 增强镜面反射
        }
        
        console.log(`显示照片: ${fileNameWithoutExt} (索引: ${photoIndex})`);
    }

    hidePhoto() {
        const modal = document.getElementById('photo-modal');
        modal.classList.remove('show');
        
        // 标记照片已关闭
        this.isPhotoOpen = false;
        
        // 找到被点击的碎片并创建返回动画
        this.starFragments.forEach(fragment => {
            if (fragment.userData.isClicked) {
                // 计算当前应该返回的世界位置
                const targetWorldPosition = this.calculateTargetWorldPosition(fragment);
                
                // 创建流星返回动画
                this.createMeteorReturnAnimation(
                    fragment,
                    targetWorldPosition,
                    1.0, // 返回动画持续时间1秒
                    () => {
                        // 返回动画完成后的回调
                        this.restoreFragmentToParent(fragment);
                    }
                );
                
                console.log('开始流星返回动画');
            }
        });
    }

    // 计算目标世界位置（基于相对位置和当前父节点状态）
    calculateTargetWorldPosition(fragment) {
        const originalParent = fragment.userData.originalParent;
        const relativePosition = fragment.userData.relativePosition;
        
        // 创建一个临时对象来计算世界位置
        const tempObject = new THREE.Object3D();
        tempObject.position.copy(relativePosition);
        originalParent.add(tempObject);
        
        // 获取世界位置
        const worldPosition = new THREE.Vector3();
        tempObject.getWorldPosition(worldPosition);
        
        // 移除临时对象
        originalParent.remove(tempObject);
        
        return worldPosition;
    }

    // 恢复碎片到父节点
    restoreFragmentToParent(fragment) {
        const originalParent = fragment.userData.originalParent;
        const relativePosition = fragment.userData.relativePosition;
        const relativeRotation = fragment.userData.relativeRotation;
        const relativeScale = fragment.userData.relativeScale;
        
        // 从场景中移除碎片
        this.scene.remove(fragment);
        
        // 恢复相对变换
        fragment.position.copy(relativePosition);
        fragment.rotation.copy(relativeRotation);
        fragment.scale.copy(relativeScale);
        
        // 重新加入原始父节点
        originalParent.add(fragment);
        
        // 重置碎片的点击状态
        fragment.userData.isClicked = false;
        
        // 清理存储的数据
        delete fragment.userData.originalParent;
        delete fragment.userData.relativePosition;
        delete fragment.userData.relativeRotation;
        delete fragment.userData.relativeScale;
        delete fragment.userData.originalWorldPosition;
        
        console.log('碎片已恢复到原始父节点');
    }

    resetFragment(fragment) {
        // 重置碎片的点击状态
        fragment.userData.isClicked = false;
        fragment.scale.set(1, 1, 1);
        
        if (fragment.userData.isPhotoThumbnail) {
            fragment.material.opacity = 0.9; // 照片缩略图恢复透明度
        } else {
            fragment.material.shininess = 100; // 小球恢复光泽度
            fragment.material.specular = new THREE.Color(0xffffff); // 保持镜面反射
        }
        
        // 恢复原始旋转
        fragment.rotation.set(0, 0, 0);
        
        console.log('碎片已重置到原始位置');
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta(); // 获取上一帧到这一帧的时间差（秒）
        const elapsedTime = this.clock.getElapsedTime(); // 总经过时间
        
        // 计算每帧的旋转角度
        // rotationSpeed 是圈/分钟，转换为弧度/秒
        const rotationPerSecond = (this.rotationSpeed * Math.PI * 2) / 60;
        
        // 土星系统整体旋转（土星+星环+星星碎片一起旋转）
        // 现在旋转轴容器进行旋转，保持水平旋转效果
        if (this.rotationAxis) {
            this.rotationAxis.rotation.y -= rotationPerSecond * deltaTime;
        }
        
        // 在动画循环中更新光源位置
        this.updateLightPositions();
        
        // 更新流星动画
        this.updateMeteorAnimations();
        
        // 星星碎片动画
        this.starFragments.forEach((fragment, index) => {
            // 只处理没有脱离父节点的碎片
            if (!fragment.userData.isClicked && fragment.parent !== this.scene) {
                // 保持固定高度，确保在星环前面
                fragment.position.y = fragment.userData.originalPosition.y;
                
                // 为每个星星碎片添加额外的旋转速度（星环基础速度 × 90%-110%随机倍数）
                const rotationMultiplier = fragment.userData.rotationMultiplier || 1.0;
                const additionalRotation = rotationPerSecond * rotationMultiplier * deltaTime;
                
                // 计算新的角度位置
                fragment.userData.originalAngle += additionalRotation;
                
                // 更新星星碎片的位置
                fragment.position.x = Math.cos(fragment.userData.originalAngle) * fragment.userData.radius;
                fragment.position.z = Math.sin(fragment.userData.originalAngle) * fragment.userData.radius;
                
                // 只有照片缩略图模式才需要始终面向相机（billboard效果）
                if (fragment.userData.isPhotoThumbnail) {
                    fragment.lookAt(this.camera.position);
                }
                
                // 新的闪烁效果：保持明亮，随机变暗再变亮
                this.updateFragmentFlicker(fragment, elapsedTime);
                
                // 更新随机大小变化效果
                this.updateFragmentSizeVariation(fragment, deltaTime);
                
                // 更新自旋转效果
                this.updateFragmentSelfRotation(fragment, deltaTime);
            }
        });
        
        this.renderer.render(this.scene, this.camera);
    }
}

// 页面加载完成后启动
window.addEventListener('load', () => {
    // 延迟启动以显示加载动画
    setTimeout(() => {
        new SaturnRingScene();
        
        // 隐藏加载屏幕
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('fade-out');
        }, 1000);
    }, 2000);
});
