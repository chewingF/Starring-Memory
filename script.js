// 导入Three.js模块
import * as THREE from 'three';
import { MeteorShowerManager } from './src/background/MeteorShowerManager.js';

export class SaturnRingScene {
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
        this.isPhotoOpen = false;
        
        // 用于弹出照片的最小照片列表（保留点击碎片后的弹窗逻辑）
        this.photos = [
            'photos/1ca021cd0e233a042e6100fcee387ded.jpg',
            'photos/2a5ef61afbeebe062a36a5f3bd475e90.jpg'
        ];
        
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

        // RenderBundle 风格碎片生成开关（默认开启）
        this.useRenderBundleStyle = true;
        
        
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
        this.hasGyroEvent = false; // 是否收到过陀螺仪事件
        this.cameraBaseQuaternion = new THREE.Quaternion(); // 作为陀螺仪偏移的基准视角
        
        // 流星动画相关属性
        this.meteorAnimations = new Map(); // 存储正在进行的流星动画
        this.animationId = 0; // 动画ID计数器
        
        // 资源就绪标记
        this.saturnTextureLoaded = false; // 土星贴图是否已加载（成功或失败都视为完成）
        this.starFragmentsReady = false; // 星星碎片是否已创建完成
        
        // 后处理效果管理器
        this.postProcessingManager = null;
        
        // 流星雨管理器
        this.meteorShowerManager = null;
        
        // 点击音效（星星碎片被点击时播放）
        this.clickSound = null;
        try {
            this.clickSound = new Audio('audio/pop-atmos.mp3');
            this.clickSound.preload = 'auto';
            this.clickSound.volume = 0.8;
        } catch (e) {
            // 在不支持 Audio 的环境中忽略
        }

        this.init();
        // 延迟启动动画循环，让子类有机会覆盖animate方法
        setTimeout(() => {
            if (typeof this.animate === 'function') {
                this.animate();
            }
        }, 0);
        this.setupEventListeners();
        this.initControlPanel(); // 初始化控制面板状态
        
        // 加载照片列表
        this.loadPhotos();
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
        
        // 暂时移除颜色空间设置，测试是否是这些设置导致画面过亮
        // 如果画面仍然过亮，可能需要调整光照强度
        
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

        // 土星、星环、背景由管理器接管，不在基类 init() 中直接调用
        
        // 初始化陀螺仪
        this.initGyroscope();
        
        // 初始化后处理管理器 - 异步创建，完全按照test-pixel-effect的方式
        this.initPostProcessingSync();
        
        // 初始化流星雨管理器
        this.meteorShowerManager = new MeteorShowerManager(this.scene);
        this.meteorShowerManager.init();
    }


    // 创建星环纹理（委托到 PlanetarySystem）
    createRingTexture() {
        if (this.planetarySystem && typeof this.planetarySystem.createRingTexture === 'function') {
            return this.planetarySystem.createRingTexture();
        }
        throw new Error('PlanetarySystem not initialized');
    }

    addRingDetails(ctx) {
        if (this.planetarySystem && typeof this.planetarySystem.addRingDetails === 'function') {
            return this.planetarySystem.addRingDetails(ctx);
        }
        throw new Error('PlanetarySystem not initialized');
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

        // 记录当前相机朝向为基准视角（供陀螺仪在其上叠加微小偏移）
        if (this.camera && this.camera.quaternion) {
            this.cameraBaseQuaternion.copy(this.camera.quaternion);
        }
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
                    // 对于随机几何体，直接缩放
                    fragment.scale.setScalar(newScale / fragment.userData.originalSize);
                }
                
                // 更新用户数据中的原始大小
                fragment.userData.originalSize = newScale;
            }
        });
        
        console.log(`星星碎片大小比例已更新为: ${this.starFragmentSizeScale}`);
    }

    createSaturn() {
        if (this.planetarySystem && typeof this.planetarySystem.createSaturn === 'function') {
            return this.planetarySystem.createSaturn();
        }
        throw new Error('PlanetarySystem not initialized');
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


    createRing() {
        if (this.planetarySystem && typeof this.planetarySystem.createRing === 'function') {
            return this.planetarySystem.createRing();
        }
        throw new Error('PlanetarySystem not initialized');
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

        // 标记星星碎片准备就绪
        this.starFragmentsReady = true;
        this.checkReady();
    }

    createStarFragment(ring, ringIndex) {
        // 菱形模式
        const minSize = 0.06;
        const maxSize = 0.08;
        const baseSize = Math.random() * (maxSize - minSize) + minSize;
        const size = baseSize * this.starFragmentSizeScale; // 应用大小比例
        
        // 创建真正的菱形几何体（尖角朝上），为每个碎片生成并保存随机角缩放
        const cornerScales = this.randomizeDiamondCorners ? {
            left: Math.random() * 0.3 + 0.6,
            right: Math.random() * 0.3 + 0.6,
            front: Math.random() * 0.3 + 0.6,
            back: Math.random() * 0.3 + 0.6
        } : { left: 0.6, right: 0.6, front: 0.6, back: 0.6 };
        const geometry = this.createDiamondGeometry(size, cornerScales);
        
        // 使用环的指定颜色
        const color = ring.color;
        
        const material = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            shininess: 2, // 增加光泽度
            specular: 0x888888, // 白色镜面反射，增强对光的反射
            emissive: color, // 轻微自发光
            emissiveIntensity: 0.1 // 0.1 * 0.8 = 0.08
        });
        
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
            // 大小相关数据
            originalSize: size, // 存储原始大小（已应用比例）
            baseSize: baseSize, // 存储基础大小（未应用比例）
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
    

    createStarField() {
        if (this.backgroundManager) return this.backgroundManager.createStarField();
    }
    
    // 更新背景纹理比例
    updateBackgroundTexture() {
        if (this.backgroundManager) return this.backgroundManager.updateBackgroundTexture();
    }

    // 初始化后处理管理器 - 异步导入官方模块
    async initPostProcessingSync() {
        try {
            // 动态导入Three.js官方后处理模块 - 使用importmap映射
            const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
            const { RenderPixelatedPass } = await import('three/addons/postprocessing/RenderPixelatedPass.js');
            const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');
            
            // 创建效果合成器 - 完全按照test-pixel-effect的方式
            this.composer = new EffectComposer(this.renderer);
            const renderPixelatedPass = new RenderPixelatedPass(6, this.scene, this.camera);
            this.composer.addPass(renderPixelatedPass);
            
            const outputPass = new OutputPass();
            this.composer.addPass(outputPass);
            
            console.log('Three.js官方后处理效果初始化成功 - 像素大小: 6');
        } catch (error) {
            console.error('Three.js官方后处理效果初始化失败:', error);
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
                console.log('📱 检测到iOS设备，需要用户交互来请求陀螺仪权限');
                // 不立即请求权限，等待用户交互
                this.setupGyroscopePermissionRequest();
            } else {
                // 非iOS设备直接添加事件监听器
                this.addGyroscopeListener();
                this.updateGyroStatus('陀螺仪已启用，倾斜设备查看效果');
            }
        } else {
            console.log('❌ 设备不支持陀螺仪');
        }
    }

    // 设置陀螺仪权限请求（等待用户交互）
    setupGyroscopePermissionRequest() {
        // 添加一次性点击/触摸事件监听器来请求权限
        const requestPermissionOnInteraction = async () => {
            if (!this.gyroscopePermissionGranted) {
                console.log('📱 用户交互检测到，请求陀螺仪权限...');
                await this.requestGyroscopePermission();
                // 移除事件监听器，避免重复请求
                document.removeEventListener('click', requestPermissionOnInteraction);
                document.removeEventListener('touchstart', requestPermissionOnInteraction);
            }
        };
        
        // 添加事件监听器
        document.addEventListener('click', requestPermissionOnInteraction, { once: true });
        document.addEventListener('touchstart', requestPermissionOnInteraction, { once: true });
        
        console.log('📱 已设置陀螺仪权限请求，等待用户交互...');
    }

    // 请求陀螺仪权限（iOS 13+）
    async requestGyroscopePermission() {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                this.gyroscopePermissionGranted = true;
                console.log('✅ 陀螺仪权限已授予');
                this.addGyroscopeListener();
                this.updateGyroStatus('陀螺仪已启用，倾斜设备查看效果');
            } else {
                console.log('❌ 陀螺仪权限被拒绝');
                this.updateGyroStatus('陀螺仪权限被拒绝');
            }
        } catch (error) {
            console.error('❌ 请求陀螺仪权限时出错:', error);
            this.updateGyroStatus('陀螺仪权限请求失败');
        }
    }

    // 更新陀螺仪状态显示
    updateGyroStatus(message) {
        const statusElement = document.getElementById('gyro-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    // 添加陀螺仪事件监听器
    addGyroscopeListener() {
        window.addEventListener('deviceorientation', (event) => {
            this.gyroscopeData.alpha = event.alpha || 0;  // 绕Z轴旋转
            this.gyroscopeData.beta = event.beta || 0;    // 绕X轴旋转（前后倾斜）
            this.gyroscopeData.gamma = event.gamma || 0;  // 绕Y轴旋转（左右倾斜）
            this.hasGyroEvent = true;
            
            // 调试信息：每100帧输出一次陀螺仪数据
            if (this.debugFrameCount % 100 === 0) {
                console.log('📱 陀螺仪数据:', {
                    alpha: this.gyroscopeData.alpha.toFixed(2),
                    beta: this.gyroscopeData.beta.toFixed(2),
                    gamma: this.gyroscopeData.gamma.toFixed(2)
                });
            }
            
            // 更新背景位置
            this.updateBackgroundParallax();
            
            // 更新相机旋转
            this.updateCameraGyroscopeRotation();
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

    // 根据陀螺仪数据更新相机旋转（最多3度）
    updateCameraGyroscopeRotation() {
        if (!this.camera) return;
        
        // 最大旋转角度限制（3度）
        const maxRotationDegrees = 3;
        const maxRotationRadians = (maxRotationDegrees * Math.PI) / 180;
        
        // 计算陀螺仪旋转偏移量
        // beta: 前后倾斜，影响相机的pitch（上下看）
        // gamma: 左右倾斜，影响相机的yaw（左右看）
        const betaRadians = (this.gyroscopeData.beta * Math.PI) / 180;
        const gammaRadians = (this.gyroscopeData.gamma * Math.PI) / 180;
        
        // 限制旋转角度在3度以内
        const limitedBeta = Math.max(-maxRotationRadians, Math.min(maxRotationRadians, betaRadians * 0.1));
        const limitedGamma = Math.max(-maxRotationRadians, Math.min(maxRotationRadians, gammaRadians * 0.1));
        
        // 在基准视角上叠加小角度偏移
        const deltaEuler = new THREE.Euler(limitedBeta, limitedGamma, 0, 'YXZ');
        const deltaQuat = new THREE.Quaternion().setFromEuler(deltaEuler);
        this.camera.quaternion.copy(this.cameraBaseQuaternion).multiply(deltaQuat);
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
            
            // 直接使用备用方案，不尝试API
            console.log('🔄 使用照片文件列表方案');
            
            // 备用方案：直接扫描photos目录下的所有图片文件
            console.log('🔄 使用备用方案：扫描photos目录');
            
            // 基于实际文件列表的照片路径
            const photoFiles = [
                '66f22888b46e4a947f015f19a12fce90.JPG',
                '6db3aa054e4b906ae1b3498c9bcce663.JPG',
                '835ce35b6705d78c0a1203b5cca32aa8.JPG',
                'b1865c909cc1f4c8022c6a916560e6ca.JPG',
                'db59fc0e1b7aa7060ca8bcc33523b19a.jpg',
                'eb6c72fb3dafcd9bc023964c7484471d.jpg',
                'edc742971be4927e16ebc1f68ed7f055.JPG',
                'IMG_0026.jpg',
                'IMG_1537.jpg',
                'IMG_1764.jpg',
                'IMG_1813.JPG',
                'IMG_2119.JPG',
                'IMG_2393.JPG',
                'IMG_2589 2.JPG',
                'IMG_2725.JPG',
                'IMG_2880.JPG',
                'IMG_2882.JPG',
                'IMG_3011.JPG',
                'IMG_3012.JPG',
                'IMG_3017.JPG',
                'IMG_3380.JPG',
                'IMG_3438.JPG',
                'IMG_3452.JPG',
                'IMG_3453.JPG',
                'IMG_3455.JPG',
                'IMG_3457.JPG',
                'IMG_3994.JPG',
                'IMG_4631.JPG',
                'IMG_4632.JPG',
                'IMG_4633.JPG',
                'IMG_4635.JPG',
                'IMG_4638.JPG',
                'IMG_4760.JPG',
                'IMG_4764.JPG',
                'IMG_4769.JPG',
                'IMG_4770.JPG',
                'IMG_4772.JPG',
                'IMG_4773.JPG',
                'IMG_4775.JPG',
                'IMG_4780.JPG',
                'IMG_4786.JPG',
                'IMG_4787.JPG',
                'IMG_4789.JPG',
                'IMG_4793.JPG',
                'IMG_4804.JPG',
                'IMG_4807.JPG',
                'IMG_4815.jpg',
                'IMG_4847.JPG',
                'IMG_4851 2.JPG',
                'IMG_4851.JPG',
                'IMG_4859.JPG',
                'IMG_4890.JPG',
                'IMG_4893.JPG',
                'IMG_4900.JPG',
                'IMG_4924.JPG',
                'IMG_4926.JPG',
                'IMG_4934.JPG',
                'IMG_4938.JPG',
                'IMG_4940.JPG',
                'IMG_4945.JPG',
                'IMG_4960.JPG',
                'IMG_4986.JPG',
                'IMG_4993.JPG',
                'IMG_4994.JPG',
                'IMG_4998.JPG',
                'IMG_5025.JPG',
                'IMG_5039.JPG',
                'IMG_5040.JPG',
                'IMG_5046.JPG',
                'IMG_5055.JPG',
                'IMG_5060.JPG',
                'IMG_5071.JPG',
                'IMG_5072.jpg',
                'IMG_5073 (1).JPG',
                'IMG_5073.jpg',
                'IMG_5112.JPG',
                'IMG_5114.JPG',
                'IMG_5115.JPG',
                'IMG_5119.JPG',
                'IMG_5121.JPG',
                'IMG_5125.JPG',
                'IMG_5126.JPG',
                'IMG_5134.JPG',
                'IMG_5136.JPG',
                'IMG_5138.JPG',
                'IMG_5139.JPG',
                'IMG_5154.JPG',
                'IMG_5157.JPG',
                'IMG_5165 (1).JPG',
                'IMG_5165.jpg',
                'IMG_5169.JPG',
                'IMG_5226 2.jpg',
                'IMG_5237.JPG',
                'IMG_5277.JPG',
                'IMG_5279.jpg',
                'IMG_5289.JPG',
                'IMG_5292.JPG',
                'IMG_5318.JPG',
                'IMG_5348.JPG',
                'IMG_5391.JPG',
                'IMG_5392.JPG',
                'IMG_5580.JPG',
                'IMG_5597.JPG',
                'IMG_5603.JPG',
                'IMG_5618.JPG',
                'IMG_5619.JPG',
                'IMG_5620.JPG',
                'IMG_5642.JPG',
                'IMG_5643.JPG',
                'IMG_5658.JPG',
                'IMG_5693.JPG',
                'IMG_5803.JPG',
                'IMG_5818.JPG',
                'IMG_5917.JPG',
                'IMG_5919.JPG',
                'IMG_5922.JPG',
                'IMG_5941.JPG',
                'IMG_5942.JPG',
                'IMG_7517.jpg',
                'IMG_7522.JPG',
                'IMG_7525.JPG',
                'IMG_7541.JPG',
                'IMG_7563.JPG',
                'IMG_7570.JPG',
                'IMG_7596.JPG',
                'IMG_7648.JPG',
                'IMG_7653.JPG',
                'IMG_7662.JPG',
                'IMG_7676.JPG',
                'IMG_7706.JPG',
                'IMG_7708.JPG',
                'IMG_7717.JPG',
                'IMG_7770.JPG',
                'IMG_7771.JPG',
                'IMG_7773.jpg',
                'IMG_7774.JPG',
                'IMG_7775.JPG',
                'IMG_7776.JPG',
                'IMG_7777.JPG',
                'IMG_7778.JPG',
                'IMG_7828.JPG',
                'IMG_7832.JPG',
                'IMG_7836.JPG',
                'IMG_7846.JPG',
                'IMG_7849.JPG',
                'IMG_7936.JPG',
                'IMG_7971.JPG',
                'IMG_7972.JPG',
                'IMG_7977.JPG',
                'IMG_7979.JPG',
                'IMG_8002.JPG',
                'IMG_8138.JPG',
                'IMG_8145.JPG',
                'IMG_8207.JPG',
                'IMG_8209.JPG',
                'IMG_8265.JPG',
                'IMG_8270.JPG',
                'IMG_8272.JPG',
                'IMG_8276.JPG',
                'IMG_8282.JPG',
                'IMG_8285.JPG',
                'IMG_8345.JPG',
                'IMG_8348.JPG',
                'IMG_8366.JPG',
                'IMG_8403.JPG',
                'IMG_8418.JPG',
                'IMG_8419.JPG',
                'IMG_8424.JPG',
                'IMG_8425.JPG',
                'IMG_8443.JPG',
                'IMG_8452.JPG',
                'IMG_8458.JPG',
                'IMG_8459.JPG',
                'IMG_8460.JPG',
                'IMG_8461.JPG',
                'IMG_8478.JPG',
                'IMG_8931.JPG',
                'IMG_9388 (1).JPG',
                'IMG_9388 2.jpg',
                'IMG_9388.jpg',
                'IMG_9389.jpg',
                'IMG_9390.jpg',
                'IMG_9391.jpg',
                'IMG_9405.jpg',
                'IMG_9406.jpg',
                'IMG_9415.jpg',
                'IMG_9551.JPG',
                'IMG_9557.JPG',
                'IMG_9560.JPG',
                'IMG_9561.JPG',
                'IMG_9562.JPG',
                'IMG_9563.JPG',
                'IMG_9566.JPG',
                'IMG_9567.JPG',
                'IMG_9568.JPG'
            ];
            
            // 构建完整的照片路径
            this.photos = photoFiles.map(file => `photos/${file}`);
            console.log(`✅ 成功加载 ${this.photos.length} 张照片`);
            
        } catch (error) {
            console.error('❌ 加载照片列表失败:', error);
            
            // 最后的备用方案：使用硬编码的照片列表
            this.photos = [
                'photos/66f22888b46e4a947f015f19a12fce90.JPG',
                'photos/IMG_1537.jpg',
                'photos/IMG_2880.JPG',
                'photos/IMG_3452.JPG',
                'photos/IMG_4631.JPG'
            ];
            
            console.log(`✅ 使用备用照片列表，共 ${this.photos.length} 张照片`);
        }
        
        // 确保有照片可用
        if (this.photos.length === 0) {
            this.photos = ['photos/66f22888b46e4a947f015f19a12fce90.JPG'];
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
                // 播放点击音效（允许重叠播放）
                if (this.clickSound) {
                    try {
                        const node = this.clickSound.cloneNode();
                        node.volume = this.clickSound.volume;
                        node.play().catch(() => {});
                    } catch (e) {
                        // 忽略播放错误
                    }
                }
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
            
            // 更新后处理合成器尺寸 - 完全按照test-pixel-effect的方式
            if (this.composer) {
                this.composer.setSize(window.innerWidth, window.innerHeight);
            }
            
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

        // RenderBundle 风格切换（同时模拟开启 WebGL 与 dynamic）
        const rbStyleToggle = document.getElementById('rbStyleToggle');
        if (rbStyleToggle) {
            rbStyleToggle.addEventListener('change', (e) => {
                this.useRenderBundleStyle = !!e.target.checked;
                // 重新创建碎片
                if (this.starFragmentManager && typeof this.starFragmentManager.recreateFragments === 'function') {
                    this.starFragmentManager.recreateFragments();
                } else if (typeof this.createStarFragments === 'function') {
                    // 兼容旧路径
                    // 移除现有碎片
                    this.starFragments.forEach(f => f.parent && f.parent.remove(f));
                    this.starFragments = [];
                    this.createStarFragments();
                }
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
        
        // 后处理效果控制
        this.setupPostProcessingControls();
        
        // Toon模式控制
        this.setupToonControls();
        
        // 流星雨效果控制
        this.setupMeteorShowerControls();
        
        // 添加调试快捷键
        this.setupDebugControls();
    }
    
    // 设置流星雨效果控制
    setupMeteorShowerControls() {
        // 流星雨开关
        const meteorShowerToggle = document.getElementById('meteorShowerToggle');
        if (meteorShowerToggle) {
            meteorShowerToggle.addEventListener('change', (e) => {
                if (this.meteorShowerManager) {
                    this.meteorShowerManager.toggle();
                }
            });
        }
        
        // 流星数量控制
        const meteorCountSlider = document.getElementById('meteorCount');
        const meteorCountValue = document.getElementById('meteorCountValue');
        if (meteorCountSlider && meteorCountValue) {
            meteorCountSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                meteorCountValue.textContent = value;
                if (this.meteorShowerManager) {
                    this.meteorShowerManager.setMeteorCount(value);
                }
            });
        }
        
        // 生成频率控制
        const meteorSpawnRateSlider = document.getElementById('meteorSpawnRate');
        const meteorSpawnRateValue = document.getElementById('meteorSpawnRateValue');
        if (meteorSpawnRateSlider && meteorSpawnRateValue) {
            meteorSpawnRateSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                meteorSpawnRateValue.textContent = value.toFixed(1);
                if (this.meteorShowerManager) {
                    this.meteorShowerManager.setSpawnRate(value);
                }
            });
        }
        
        // 流星速度控制
        const meteorSpeedSlider = document.getElementById('meteorSpeed');
        const meteorSpeedValue = document.getElementById('meteorSpeedValue');
        if (meteorSpeedSlider && meteorSpeedValue) {
            meteorSpeedSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                meteorSpeedValue.textContent = value.toFixed(1);
                if (this.meteorShowerManager) {
                    this.meteorShowerManager.setMeteorSpeed(value);
                }
            });
        }
        
        // 拖尾长度控制
        const meteorLengthSlider = document.getElementById('meteorLength');
        const meteorLengthValue = document.getElementById('meteorLengthValue');
        if (meteorLengthSlider && meteorLengthValue) {
            meteorLengthSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                meteorLengthValue.textContent = value.toFixed(1);
                if (this.meteorShowerManager) {
                    this.meteorShowerManager.setMeteorLength(value);
                }
            });
        }
    }
    
    // 设置后处理效果控制
    setupPostProcessingControls() {
        // 后处理模式选择
        const modeSelect = document.getElementById('postProcessingMode');
        const pixelControls = document.getElementById('pixelControls');
        const pixelControls2 = document.getElementById('pixelControls2');
        const pixelControls3 = document.getElementById('pixelControls3');
        const toonControls = document.getElementById('toonControls');
        const toonControls2 = document.getElementById('toonControls2');
        const toonControls3 = document.getElementById('toonControls3');
        const toonControls4 = document.getElementById('toonControls4');
        const toonControls5 = document.getElementById('toonControls5');
        const toonControls6 = document.getElementById('toonControls6');
        
        if (modeSelect) {
            modeSelect.addEventListener('change', (e) => {
                const mode = e.target.value;
                console.log('UI模式切换:', mode);
                
                // 显示/隐藏像素化控制
                const showPixelControls = mode === 'pixel';
                if (pixelControls) pixelControls.style.display = showPixelControls ? 'block' : 'none';
                if (pixelControls2) pixelControls2.style.display = showPixelControls ? 'block' : 'none';
                if (pixelControls3) pixelControls3.style.display = showPixelControls ? 'block' : 'none';
                
                // 显示/隐藏Toon控制
                const showToonControls = mode === 'toon';
                if (toonControls) toonControls.style.display = showToonControls ? 'block' : 'none';
                if (toonControls2) toonControls2.style.display = showToonControls ? 'block' : 'none';
                if (toonControls3) toonControls3.style.display = showToonControls ? 'block' : 'none';
                if (toonControls4) toonControls4.style.display = showToonControls ? 'block' : 'none';
                if (toonControls5) toonControls5.style.display = showToonControls ? 'block' : 'none';
                if (toonControls6) toonControls6.style.display = showToonControls ? 'block' : 'none';
                
                console.log('模式切换完成:', mode, '像素控制显示:', showPixelControls);
            });
        }
        
        // 像素大小控制
        const pixelSizeSlider = document.getElementById('pixelSize');
        const pixelSizeValue = document.getElementById('pixelSizeValue');
        
        if (pixelSizeSlider && pixelSizeValue) {
            pixelSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                pixelSizeValue.textContent = value;
                if (this.composer) {
                    // 更新RenderPixelatedPass的像素大小
                    const renderPixelatedPass = this.composer.passes.find(pass => pass.constructor.name === 'RenderPixelatedPass');
                    if (renderPixelatedPass) {
                        renderPixelatedPass.setPixelSize(value);
                    }
                }
            });
        }
        
        // 法线边缘强度控制
        const normalEdgeSlider = document.getElementById('normalEdgeStrength');
        const normalEdgeValue = document.getElementById('normalEdgeStrengthValue');
        
        if (normalEdgeSlider && normalEdgeValue) {
            normalEdgeSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                normalEdgeValue.textContent = value.toFixed(2);
                if (this.composer) {
                    // 更新RenderPixelatedPass的法线边缘强度
                    const renderPixelatedPass = this.composer.passes.find(pass => pass.constructor.name === 'RenderPixelatedPass');
                    if (renderPixelatedPass) {
                        renderPixelatedPass.normalEdgeStrength = value;
                    }
                }
            });
        }
        
        // 深度边缘强度控制
        const depthEdgeSlider = document.getElementById('depthEdgeStrength');
        const depthEdgeValue = document.getElementById('depthEdgeStrengthValue');
        
        if (depthEdgeSlider && depthEdgeValue) {
            depthEdgeSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                depthEdgeValue.textContent = value.toFixed(2);
                if (this.composer) {
                    // 更新RenderPixelatedPass的深度边缘强度
                    const renderPixelatedPass = this.composer.passes.find(pass => pass.constructor.name === 'RenderPixelatedPass');
                    if (renderPixelatedPass) {
                        renderPixelatedPass.depthEdgeStrength = value;
                    }
                }
            });
        }
    }

    // 设置调试控制
    setupDebugControls() {
        // 添加调试快捷键：按 'P' 键切换像素化效果
        window.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'p') {
                if (this.composer) {
                    // 切换所有pass的启用状态
                    const allEnabled = this.composer.passes.every(pass => pass.enabled);
                    this.composer.passes.forEach(pass => pass.enabled = !allEnabled);
                    console.log(`调试：切换到${allEnabled ? 'default' : 'pixel'}模式`);
                }
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
        
        // 隐藏标题文字
        modalTitle.style.display = 'none';
        
        // 设置照片并等待加载完成
        modalImage.onload = () => {
            // 照片加载完成后，根据照片尺寸设置弹窗尺寸
            const maxWidth = window.innerWidth * 0.9;
            const maxHeight = window.innerHeight * 0.9;
            
            let imageWidth = modalImage.naturalWidth;
            let imageHeight = modalImage.naturalHeight;
            
            // 计算缩放比例，确保照片不超出屏幕
            const scaleX = maxWidth / imageWidth;
            const scaleY = maxHeight / imageHeight;
            const scale = Math.min(scaleX, scaleY, 1);
            
            // 设置弹窗尺寸，比照片大50像素（上下左右各25像素）
            modal.style.width = (imageWidth * scale + 50) + 'px';
            modal.style.height = (imageHeight * scale + 50) + 'px';
            
            // 显示模态框
            modal.classList.add('show');
        };
        
        // 设置照片源，触发加载
        modalImage.src = this.photos[photoIndex];
        
        // 标记照片已打开
        this.isPhotoOpen = true;
        
        // 在Toon模式下设置照片窗口背景颜色与星星碎片颜色一致
        if (this.toonMode && this.toonMode.isActive) {
            this.toonMode.setPhotoModalBackground(fragment);
        }
        
        // 添加点击效果
        fragment.scale.set(1.5, 1.5, 1.5);
        if (fragment.userData.isPhotoThumbnail) {
            fragment.material.opacity = 1.0; // 照片缩略图点击时完全不透明
        } else {
            fragment.material.shininess = 200; // 小球点击时增强光泽度
            fragment.material.specular = new THREE.Color(0xffffff); // 增强镜面反射
        }
        
        console.log(`显示照片 (索引: ${photoIndex})`);
    }

    hidePhoto() {
        const modal = document.getElementById('photo-modal');
        const modalTitle = document.getElementById('modal-title');
        
        // 获取当前模态框的实际尺寸
        const currentWidth = modal.style.width || modal.offsetWidth + 'px';
        const currentHeight = modal.style.height || modal.offsetHeight + 'px';
        
        // 移除显示类，但保持当前尺寸
        modal.classList.remove('show');
        
        // 保持当前尺寸，不立即重置
        modal.style.width = currentWidth;
        modal.style.height = currentHeight;
        
        // 恢复标题显示
        modalTitle.style.display = 'block';
        
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
                        
                        // 动画完成后才重置弹窗尺寸
                        modal.style.width = '';
                        modal.style.height = '';
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
        
        // 更新陀螺仪相机旋转（仅在收到陀螺仪事件后才叠加变化）
        if (this.isGyroscopeSupported && this.hasGyroEvent) {
            this.updateCameraGyroscopeRotation();
        }
        
        // 更新流星动画
        this.updateMeteorAnimations();
        
        // 更新流星雨效果
        if (this.meteorShowerManager) {
            this.meteorShowerManager.update(deltaTime);
        }
        
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
        
        // 使用官方后处理合成器渲染 - 完全按照test-pixel-effect的方式
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // 检查是否可以结束初始加载界面
    checkReady() {
        if (this.saturnTextureLoaded && this.starFragmentsReady) {
            // 只触发一次
            if (!this._readyDispatched) {
                this._readyDispatched = true;
                const event = new Event('scene-ready');
                document.dispatchEvent(event);
            }
        }
    }
    
    // 设置Toon模式控制
    setupToonControls() {
        // Toon模式切换按钮
        const toonModeToggle = document.getElementById('toonModeToggle');
        if (toonModeToggle) {
            toonModeToggle.addEventListener('click', () => {
                if (this.toonMode) {
                    this.toonMode.toggle();
                    const isActive = this.toonMode.isActive;
                    toonModeToggle.textContent = isActive ? '禁用Toon风格' : '启用Toon风格';
                    toonModeToggle.style.background = isActive ? 
                        'rgba(76,175,80,0.2)' : 'rgba(255,193,7,0.2)';
                    toonModeToggle.style.borderColor = isActive ? '#4caf50' : '#ffc107';
                    toonModeToggle.style.color = isActive ? '#4caf50' : '#ffc107';
                }
            });
        }
        
        // Toon球体数量控制
        const toonSphereCountSlider = document.getElementById('toonSphereCount');
        const toonSphereCountValue = document.getElementById('toonSphereCountValue');
        
        if (toonSphereCountSlider && toonSphereCountValue) {
            toonSphereCountSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                toonSphereCountValue.textContent = value;
                // 这里可以更新Toon球体数量
                if (this.toonMode) {
                    // 可以添加更新球体数量的逻辑
                    console.log('Toon球体数量:', value);
                }
            });
        }
        
        // 颜色饱和度控制
        const toonSaturationSlider = document.getElementById('toonSaturation');
        const toonSaturationValue = document.getElementById('toonSaturationValue');
        
        if (toonSaturationSlider && toonSaturationValue) {
            toonSaturationSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                toonSaturationValue.textContent = value.toFixed(1);
                // 这里可以更新颜色饱和度
                if (this.toonMode) {
                    // 可以添加更新颜色饱和度的逻辑
                    console.log('Toon颜色饱和度:', value);
                }
            });
        }
        
        // 定向光倍率控制
        const directionalLightSlider = document.getElementById('directionalLightMultiplier');
        const directionalLightValue = document.getElementById('directionalLightMultiplierValue');
        
        if (directionalLightSlider && directionalLightValue) {
            directionalLightSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                directionalLightValue.textContent = value + 'x';
                if (this.toonMode) {
                    this.toonMode.updateLightMultiplier('DirectionalLight', value);
                }
            });
        }
        
        // 半球光倍率控制
        const hemisphereLightSlider = document.getElementById('hemisphereLightMultiplier');
        const hemisphereLightValue = document.getElementById('hemisphereLightMultiplierValue');
        
        if (hemisphereLightSlider && hemisphereLightValue) {
            hemisphereLightSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                hemisphereLightValue.textContent = value + 'x';
                if (this.toonMode) {
                    this.toonMode.updateLightMultiplier('HemisphereLight', value);
                }
            });
        }
        
        // 环境光倍率控制
        const ambientLightSlider = document.getElementById('ambientLightMultiplier');
        const ambientLightValue = document.getElementById('ambientLightMultiplierValue');
        
        if (ambientLightSlider && ambientLightValue) {
            ambientLightSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                ambientLightValue.textContent = value + 'x';
                if (this.toonMode) {
                    this.toonMode.updateLightMultiplier('AmbientLight', value);
                }
            });
        }
    }
}

// 启动逻辑已移动到 src/main.js
