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
        
        // 旋转速度参数：1分钟转几圈
        this.rotationSpeed = 0.1; // 默认0.3圈/分钟
        
        // 相机参数
        this.cameraDistance = 13.5; // 相机距离（从原点算起）
        this.cameraHeight = 3.5; // 相机高度
        this.cameraFOV = 49; // 相机视野角度
        
        // 星球中心在屏幕上的位置 (0,0)为左下角，(1,1)为右上角
        this.planetScreenPosition = new THREE.Vector2(0.93, 0.39); // 默认屏幕位置
        
        // 控制面板显示状态
        this.isControlPanelOpen = true; // 默认打开
        
        // 详细设置显示状态
        this.isDetailedControlsOpen = false; // 默认收起
        
        // 星星碎片数量
        this.starFragmentCount = 500; // 默认500个碎片
        
        // 星环主体显示状态
        this.isRingVisible = true; //默认打开
        
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
            inner: 0.05,    // 内环：5%
            middle: 0.15,    // 中内环：30%
            outer: 0.65,    // 中外环：55%
            outerMost: 0.15  // 外环：10%
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
        
        this.init();
        this.loadPhotos().then(() => {
            // 照片加载完成后再创建星星碎片
            this.createStarFragments();
        });
        this.animate();
        this.setupEventListeners();
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

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // 将渲染器添加到页面
        const container = document.getElementById('canvas-container');
        container.appendChild(this.renderer.domElement);

        // 创建星空背景
        this.createStarField();
        
        // 创建土星
        this.createSaturn();
        
        // 创建星环
        this.createRings();
        
        // 设置光照
        this.setupLighting();
        
        // 设置相机位置
        this.updateCameraPosition();
        
        // 初始化陀螺仪
        this.initGyroscope();
    }

    // GitHub Pages 适配的照片加载函数
    async loadPhotos() {
        try {
            console.log('开始加载照片列表（GitHub Pages 模式）...');
            
            // 预定义的照片列表 - 你需要根据实际照片文件名修改这里
            const predefinedPhotos = [
                'photos/1ca021cd0e233a042e6100fcee387ded.jpg',
                'photos/2a5ef61afbeebe062a36a5f3bd475e90.jpg',
                // 添加更多照片文件名
                'photos/photo1.jpg',
                'photos/photo2.jpg',
                'photos/memory1.jpg',
                'photos/memory2.jpg',
                'photos/image1.jpg',
                'photos/image2.jpg'
            ];
            
            // 测试哪些照片文件实际存在
            const existingPhotos = [];
            for (const photoPath of predefinedPhotos) {
                try {
                    const response = await fetch(photoPath, { method: 'HEAD' });
                    if (response.ok) {
                        existingPhotos.push(photoPath);
                        console.log(`✅ 找到照片: ${photoPath}`);
                    }
                } catch (error) {
                    console.log(`❌ 照片不存在: ${photoPath}`);
                }
            }
            
            this.photos = existingPhotos;
            console.log(`✅ 成功加载 ${this.photos.length} 张照片:`, this.photos);
            
            // 如果没有照片，显示警告
            if (this.photos.length === 0) {
                console.warn('⚠️ 没有找到任何照片文件');
                console.warn('请确保照片文件存在于 photos/ 文件夹中，并更新 script-github-pages.js 中的 predefinedPhotos 数组');
            }
            
        } catch (error) {
            console.error('❌ 加载照片时出错:', error);
            this.photos = [];
        }
    }

    // 创建星空背景
    createStarField() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 2000;
            positions[i + 1] = (Math.random() - 0.5) * 2000;
            positions[i + 2] = (Math.random() - 0.5) * 2000;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            transparent: true,
            opacity: 0.8
        });
        
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    // 创建土星
    createSaturn() {
        // 创建土星几何体
        const saturnGeometry = new THREE.SphereGeometry(2, 128, 128);
        
        // 创建土星材质
        const saturnMaterial = new THREE.MeshPhongMaterial({
            color: 0xffd700,
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });
        
        this.saturn = new THREE.Mesh(saturnGeometry, saturnMaterial);
        this.saturn.castShadow = true;
        this.saturn.receiveShadow = true;
        this.scene.add(this.saturn);
    }

    // 创建星环
    createRings() {
        const ringGeometry = new THREE.RingGeometry(3, 8, 256);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.rotation.x = Math.PI / 2;
        this.scene.add(this.ring);
    }

    // 设置光照
    setupLighting() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // 主光源
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

    // 创建星星碎片
    createStarFragments() {
        // 清除现有的星星碎片
        this.starFragments.forEach(fragment => {
            this.scene.remove(fragment);
        });
        this.starFragments = [];
        
        const fragmentCount = this.starFragmentCount;
        console.log(`创建 ${fragmentCount} 个星星碎片...`);
        
        for (let i = 0; i < fragmentCount; i++) {
            const fragment = this.createStarFragment(i);
            this.starFragments.push(fragment);
            this.scene.add(fragment);
        }
        
        console.log(`✅ 成功创建 ${this.starFragments.length} 个星星碎片`);
    }

    // 创建单个星星碎片
    createStarFragment(index) {
        const geometry = new THREE.SphereGeometry(0.02, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        const fragment = new THREE.Mesh(geometry, material);
        
        // 随机分布在星环区域
        const radius = 3 + Math.random() * 5;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 0.5;
        
        fragment.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
        
        // 添加照片索引
        fragment.userData = {
            photoIndex: index % this.photos.length,
            originalPosition: fragment.position.clone()
        };
        
        return fragment;
    }

    // 更新相机位置
    updateCameraPosition() {
        const x = Math.cos(this.clock.getElapsedTime() * 0.1) * this.cameraDistance;
        const z = Math.sin(this.clock.getElapsedTime() * 0.1) * this.cameraDistance;
        
        this.camera.position.set(x, this.cameraHeight, z);
        this.camera.lookAt(0, 0, 0);
    }

    // 初始化陀螺仪
    initGyroscope() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            this.isGyroscopeSupported = true;
            console.log('设备支持陀螺仪，但需要用户授权');
        } else if (typeof DeviceOrientationEvent !== 'undefined') {
            this.isGyroscopeSupported = true;
            this.gyroscopePermissionGranted = true;
            console.log('设备支持陀螺仪');
            this.setupGyroscopeListeners();
        } else {
            console.log('设备不支持陀螺仪');
        }
    }

    // 设置陀螺仪监听器
    setupGyroscopeListeners() {
        if (!this.isGyroscopeSupported || !this.gyroscopePermissionGranted) return;
        
        window.addEventListener('deviceorientation', (event) => {
            this.gyroscopeData.alpha = event.alpha || 0;
            this.gyroscopeData.beta = event.beta || 0;
            this.gyroscopeData.gamma = event.gamma || 0;
        });
    }

    // 设置事件监听器
    setupEventListeners() {
        // 窗口大小调整
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // 鼠标点击事件
        window.addEventListener('click', (event) => {
            this.onMouseClick(event);
        });

        // 键盘事件
        window.addEventListener('keydown', (event) => {
            if (event.key === 'c' || event.key === 'C') {
                this.toggleControlPanel();
            }
        });

        // 陀螺仪权限请求
        document.addEventListener('click', () => {
            if (this.isGyroscopeSupported && !this.gyroscopePermissionGranted) {
                DeviceOrientationEvent.requestPermission().then(response => {
                    if (response === 'granted') {
                        this.gyroscopePermissionGranted = true;
                        this.setupGyroscopeListeners();
                        console.log('陀螺仪权限已授予');
                    }
                });
            }
        });
    }

    // 鼠标点击处理
    onMouseClick(event) {
        if (this.isPhotoOpen) {
            this.closePhoto();
            return;
        }

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.starFragments);

        if (intersects.length > 0) {
            const fragment = intersects[0].object;
            const photoIndex = fragment.userData.photoIndex;
            this.showPhoto(photoIndex);
        }
    }

    // 显示照片
    showPhoto(index) {
        if (index >= 0 && index < this.photos.length) {
            this.currentPhotoIndex = index;
            this.isPhotoOpen = true;
            
            const modal = document.getElementById('photo-modal');
            const image = document.getElementById('modal-image');
            const title = document.getElementById('modal-title');
            
            image.src = this.photos[index];
            title.textContent = `回忆照片 ${index + 1}`;
            modal.classList.add('show');
            
            console.log(`显示照片: ${this.photos[index]}`);
        }
    }

    // 关闭照片
    closePhoto() {
        this.isPhotoOpen = false;
        const modal = document.getElementById('photo-modal');
        modal.classList.remove('show');
    }

    // 切换控制面板
    toggleControlPanel() {
        this.isControlPanelOpen = !this.isControlPanelOpen;
        const panel = document.querySelector('.control-panel');
        if (this.isControlPanelOpen) {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }

    // 动画循环
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const elapsedTime = this.clock.getElapsedTime();
        
        // 旋转土星
        if (this.saturn) {
            this.saturn.rotation.y = elapsedTime * this.rotationSpeed * 0.1;
        }
        
        // 旋转星环
        if (this.ring) {
            this.ring.rotation.z = elapsedTime * this.rotationSpeed * 0.05;
        }
        
        // 旋转星星碎片
        this.starFragments.forEach((fragment, index) => {
            const speed = 0.01 + (index % 3) * 0.005;
            fragment.rotation.x += speed;
            fragment.rotation.y += speed * 0.5;
        });
        
        // 更新相机位置
        this.updateCameraPosition();
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 隐藏加载屏幕
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 2000);
    }, 2000);
    
    // 初始化场景
    new SaturnRingScene();
});

