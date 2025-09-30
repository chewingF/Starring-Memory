import * as THREE from 'three';

/**
 * Toon风格化渲染模式
 * 从webgl_geometry_csg抄背景颜色和球体模型
 * 从webgl_postprocessing_unreal_bloom_selective抄球体颜色作为星星碎片的随机配色
 */
export class ToonMode {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.originalBackground = null;
        this.originalFragmentMaterials = new Map();
        this.toonSpheres = [];
        
        // 从webgl_geometry_csg获取的背景颜色
        this.toonBackgroundColor = 0xfce4ec; // 粉色背景
        
        // 从webgl_postprocessing_unreal_bloom_selective获取的颜色配置
        this.toonColors = this.generateToonColors();
        
        // 保存原始背景的引用
        this.originalBackgroundTexture = null;
        
        // 延迟启用标志
        this.pendingEnable = false;
        
        // 光照增强相关
        this.originalLightIntensities = new Map();
        this.lightIntensityMultipliers = new Map(); // 每个光源的独立倍率
        
        // 光照位置管理
        this.originalLightPositions = new Map();
        this.originalLightTargets = new Map();
        
        // 光照可见性管理
        this.originalLightVisibility = new Map();
        
        // 炫光效果相关
        this.bloomLayer = new THREE.Layers();
        this.bloomLayer.set(1); // 设置图层1用于炫光
        this.bloomParams = {
            exposure: 1,
            bloomStrength: 1.5,
            bloomRadius: 4,
            bloomThreshold: 0.85
        };
        this.bloomEnabled = true;
        
        // 照片窗口背景颜色管理
        this.originalModalBackground = null;
    }
    
    /**
     * 启用Toon风格化渲染模式
     */
    enable() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // 设置Toon风格背景
        this.scene.scene.background = new THREE.Color(this.toonBackgroundColor);
        
        // 隐藏原始土星系统
        this.hideOriginalSaturn();
        
        // 创建Toon风格的球体（替换土星）
        this.createToonSpheres();
        
        // 应用Toon材质到星星碎片
        this.applyToonMaterialsToFragments();
        
        // 设置每个光源的独立倍率（必须在增强光照之前）
        this.setupIndividualLightMultipliers();
        
        // 增强光照强度
        this.enhanceLighting();
        
        // 重新定位光照
        this.repositionLighting();
        
        // 初始化炫光效果
        this.setupBloomEffect();
        
        console.log('Toon风格化渲染模式已启用 - 土星已替换为单个白色球体，所有光源启用并设置独立倍率，炫光效果已启用');
    }
    
    /**
     * 禁用Toon风格化渲染模式
     */
    disable() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // 移除Toon球体
        this.removeToonSpheres();
        
        // 显示原始土星系统
        this.showOriginalSaturn();
        
        // 触发星空背景加载
        if (this.scene.backgroundManager) {
            console.log('禁用Toon模式，开始加载星空背景');
            this.scene.backgroundManager.createStarField();
        } else {
            // 如果没有背景管理器，使用默认深色背景
            this.scene.scene.background = new THREE.Color(0x000011);
            console.log('使用默认深色背景');
        }
        
        // 恢复星星碎片原始材质
        this.restoreFragmentMaterials();
        
        // 恢复原始光照强度
        this.restoreLighting();
        
        // 恢复原始光照位置
        this.restoreLightingPositions();
        
        // 恢复所有光源的原始强度
        this.restoreAllLightIntensities();
        
        // 清理炫光效果
        this.cleanupBloomEffect();
        
        // 恢复照片窗口背景颜色
        this.restorePhotoModalBackground();
        
        console.log('Toon风格化渲染模式已禁用 - 土星已恢复，所有光源强度和位置已恢复，炫光效果已清理，照片窗口背景已恢复');
    }
    
    /**
     * 生成Toon风格的颜色配置
     * 基于webgl_postprocessing_unreal_bloom_selective的颜色生成逻辑
     */
    generateToonColors() {
        const colors = [];
        
        // 生成50个HSL颜色，模拟原示例
        for (let i = 0; i < 50; i++) {
            const color = new THREE.Color();
            color.setHSL(Math.random(), 0.7, Math.random() * 0.2 + 0.05);
            colors.push(color.getHex());
        }
        
        // 添加一些固定的Toon风格颜色
        colors.push(0x80cbc4); // 从webgl_geometry_csg的青色
        colors.push(0xff9800); // 从webgl_geometry_csg的橙色
        colors.push(0xd81b60); // 从webgl_geometry_csg的红色
        colors.push(0x009688); // 从webgl_geometry_csg的绿色
        
        return colors;
    }
    
    /**
     * 创建Toon风格的球体
     * 创建一个带土星贴图的Toon球体来替换土星
     */
    createToonSpheres() {
        // 创建主球体 - 带土星贴图的Toon球体，替换土星（大小增加10%）
        const mainSphereGeometry = new THREE.SphereGeometry(2.2, 32, 32);
        
        // 创建灰度版本的土星贴图
        const createGrayscaleTexture = (originalTexture) => {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // 绘制原始图像
                    ctx.drawImage(img, 0, 0);
                    
                    // 获取图像数据
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    
                    // 转换为灰度
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        
                        // 使用亮度公式计算灰度值
                        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                        
                        data[i] = gray;     // R
                        data[i + 1] = gray; // G
                        data[i + 2] = gray; // B
                        // Alpha通道保持不变
                    }
                    
                    // 将处理后的数据绘制回canvas
                    ctx.putImageData(imageData, 0, 0);
                    
                    // 创建Three.js纹理
                    const texture = new THREE.CanvasTexture(canvas);
                    texture.flipY = false;
                    texture.needsUpdate = true;
                    
                    console.log('灰度土星贴图创建成功');
                    resolve(texture);
                };
                
                img.src = 'Textures/Saturn.jpg';
            });
        };
        
        // 加载原始土星贴图并创建灰度版本
        const textureLoader = new THREE.TextureLoader();
        const saturnTexture = textureLoader.load('Textures/Saturn.jpg', 
            async (texture) => {
                console.log('土星贴图加载成功，创建灰度版本');
                try {
                    // 创建灰度版本的贴图
                    const grayscaleTexture = await createGrayscaleTexture(texture);
                    
                    // 贴图加载完成后更新材质
                    if (this.toonSpheres.length > 0) {
                        const sphere = this.toonSpheres[0];
                        if (sphere && sphere.material) {
                            sphere.material.map = grayscaleTexture;
                            sphere.material.needsUpdate = true;
                            console.log('灰度土星贴图已应用到Toon球体');
                        }
                    }
                } catch (error) {
                    console.error('创建灰度贴图失败:', error);
                    // 使用原始贴图作为备用
                    if (this.toonSpheres.length > 0) {
                        const sphere = this.toonSpheres[0];
                        if (sphere && sphere.material) {
                            sphere.material.map = texture;
                            sphere.material.needsUpdate = true;
                        }
                    }
                }
            },
            (progress) => {
                console.log('土星贴图加载进度:', progress);
            },
            (error) => {
                console.error('土星贴图加载失败:', error);
                console.log('使用纯色材质作为备用');
            }
        );
        
        // 创建Toon材质，使用土星贴图的B值显示
        const mainSphereMaterial = new THREE.MeshToonMaterial({
            color: 0xffffff, // 白色主色调
            map: saturnTexture, // 土星贴图
            shininess: 120, // 光泽度
            specular: 0x444444, // 高光反射
            emissive: 0x1a1a1a, // 微弱的自发光
            emissiveIntensity: 0.1 // 自发光强度
        });
        
        const mainSphere = new THREE.Mesh(mainSphereGeometry, mainSphereMaterial);
        mainSphere.position.set(0, 0, 0);
        mainSphere.castShadow = true;
        mainSphere.receiveShadow = true;
        
        // 为球体添加炫光图层
        mainSphere.layers.enable(1);
        
        // 将Toon球体添加到与原始土星相同的父节点
        if (this.scene.saturn && this.scene.saturn.parent) {
            // 复制原始土星的本地旋转
            mainSphere.rotation.copy(this.scene.saturn.rotation);
            // 添加到相同的父节点
            this.scene.saturn.parent.add(mainSphere);
            console.log('Toon球体已添加到土星的父节点，本地旋转已同步');
        } else {
            // 如果找不到父节点，添加到场景根节点
            this.scene.scene.add(mainSphere);
            console.log('Toon球体已添加到场景根节点');
        }
        
        this.toonSpheres.push(mainSphere);
        
        console.log('Toon球体已创建，带土星贴图，保持白色主色调，本地旋转已同步');
    }
    
    /**
     * 隐藏原始土星（保留星星碎片）
     */
    hideOriginalSaturn() {
        // 只隐藏土星本身，保留星星碎片
        if (this.scene.saturn) {
            this.scene.saturn.visible = false;
            console.log('原始土星已隐藏，星星碎片保留');
        }
    }
    
    /**
     * 显示原始土星
     */
    showOriginalSaturn() {
        // 显示土星
        if (this.scene.saturn) {
            this.scene.saturn.visible = true;
            console.log('原始土星已显示');
        }
    }
    
    /**
     * 增强光照强度
     */
    enhanceLighting() {
        // 遍历场景中的所有光源
        this.scene.scene.traverse((object) => {
            if (object.isLight) {
                // 保存原始强度
                if (!this.originalLightIntensities.has(object.uuid)) {
                    this.originalLightIntensities.set(object.uuid, object.intensity);
                }
                
                // 获取该光源的独立倍率
                const multiplier = this.lightIntensityMultipliers.get(object.uuid) || 1.0;
                
                // 增强光照强度
                object.intensity *= multiplier;
                console.log(`光照增强: ${object.constructor.name} 强度从 ${this.originalLightIntensities.get(object.uuid)} 增强到 ${object.intensity} (倍率: ${multiplier}x)`);
            }
        });
    }
    
    /**
     * 恢复原始光照强度
     */
    restoreLighting() {
        // 恢复所有光源的原始强度
        this.scene.scene.traverse((object) => {
            if (object.isLight && this.originalLightIntensities.has(object.uuid)) {
                const originalIntensity = this.originalLightIntensities.get(object.uuid);
                object.intensity = originalIntensity;
                console.log(`光照恢复: ${object.constructor.name} 强度恢复到 ${originalIntensity}`);
            }
        });
        
        // 清空保存的强度数据
        this.originalLightIntensities.clear();
    }
    
    /**
     * 重新定位光照
     */
    repositionLighting() {
        // 计算相机到土星系统的距离
        const cameraPosition = this.scene.camera.position;
        const saturnPosition = new THREE.Vector3(0, 0, 0); // 土星系统在原点
        const distance = cameraPosition.distanceTo(saturnPosition);
        
        // 计算新的光照位置：相机位置 + 向上一个单位 + 向右一个单位，z设为0
        const newLightPosition = new THREE.Vector3(
            cameraPosition.x + distance, // 向右一个单位
            cameraPosition.y + distance, // 向上一个单位
            0 // z坐标设为0
        );
        
        // 详细日志输出
        console.log('=== 光照重新定位调试信息 ===');
        console.log('相机位置:', cameraPosition);
        console.log('土星系统位置:', saturnPosition);
        console.log('相机到土星距离:', distance);
        console.log('计算的新光照位置:', newLightPosition);
        console.log('光照位置偏移 (向右):', distance);
        console.log('光照位置偏移 (向上):', distance);
        console.log('光照目标: 相机位置');
        
        // 遍历场景中的所有光源并重新定位
        this.scene.scene.traverse((object) => {
            if (object.isLight) {
                // 保存原始位置
                if (!this.originalLightPositions.has(object.uuid)) {
                    this.originalLightPositions.set(object.uuid, object.position.clone());
                }
                
                console.log(`原始光照位置: ${object.constructor.name}`, object.position);
                
                // 设置新位置
                object.position.copy(newLightPosition);
                
                // 如果是定向光，设置目标为相机位置
                if (object.target) {
                    if (!this.originalLightTargets.has(object.uuid)) {
                        this.originalLightTargets.set(object.uuid, object.target.position.clone());
                    }
                    console.log(`原始光照目标: ${object.constructor.name}`, object.target.position);
                    object.target.position.copy(cameraPosition);
                    console.log(`新光照目标: ${object.constructor.name}`, object.target.position);
                }
                
                console.log(`新光照位置: ${object.constructor.name}`, object.position);
                console.log('---');
            }
        });
        
        console.log('=== 光照重新定位完成 ===');
    }
    
    /**
     * 恢复原始光照位置
     */
    restoreLightingPositions() {
        // 恢复所有光源的原始位置
        this.scene.scene.traverse((object) => {
            if (object.isLight) {
                if (this.originalLightPositions.has(object.uuid)) {
                    const originalPosition = this.originalLightPositions.get(object.uuid);
                    object.position.copy(originalPosition);
                    console.log(`光照位置恢复: ${object.constructor.name} 恢复到 ${originalPosition}`);
                }
                
                if (object.target && this.originalLightTargets.has(object.uuid)) {
                    const originalTarget = this.originalLightTargets.get(object.uuid);
                    object.target.position.copy(originalTarget);
                    console.log(`光照目标恢复: ${object.constructor.name} 目标恢复到 ${originalTarget}`);
                }
            }
        });
        
        // 清空保存的位置数据
        this.originalLightPositions.clear();
        this.originalLightTargets.clear();
    }
    
    /**
     * 设置每个光源的独立倍率
     */
    setupIndividualLightMultipliers() {
        let lightCount = 0;
        
        // 遍历场景中的所有光源
        this.scene.scene.traverse((object) => {
            if (object.isLight) {
                lightCount++;
                
                // 根据光源类型设置不同的倍率
                let multiplier = 1.0;
                
                if (object.constructor.name === 'DirectionalLight') {
                    multiplier = 3.0; // 定向光：3倍
                } else if (object.constructor.name === 'HemisphereLight') {
                    multiplier = 50.0; // 半球光：50倍
                } else if (object.constructor.name === 'AmbientLight') {
                    multiplier = 125.0; // 环境光：125倍
                } else if (object.constructor.name === 'PointLight') {
                    multiplier = 80.0; // 点光源：80倍
                } else if (object.constructor.name === 'SpotLight') {
                    multiplier = 90.0; // 聚光灯：90倍
                } else {
                    multiplier = 60.0; // 其他光源：60倍
                }
                
                // 设置该光源的倍率
                this.lightIntensityMultipliers.set(object.uuid, multiplier);
                
                console.log(`设置光源倍率: ${object.constructor.name} = ${multiplier}x`);
            }
        });
        
        console.log(`光照管理: 总共${lightCount}个光源，每个光源都有独立倍率`);
    }
    
    /**
     * 恢复所有光源的原始强度
     */
    restoreAllLightIntensities() {
        // 恢复所有光源的原始强度
        this.scene.scene.traverse((object) => {
            if (object.isLight && this.originalLightIntensities.has(object.uuid)) {
                const originalIntensity = this.originalLightIntensities.get(object.uuid);
                object.intensity = originalIntensity;
                console.log(`恢复光源强度: ${object.constructor.name} 恢复到 ${originalIntensity}`);
            }
        });
        
        // 清空保存的强度数据
        this.originalLightIntensities.clear();
        this.lightIntensityMultipliers.clear();
    }
    
    /**
     * 更新指定类型光源的倍率
     */
    updateLightMultiplier(lightType, multiplier) {
        if (!this.isActive) return;
        
        // 遍历场景中的所有光源
        this.scene.scene.traverse((object) => {
            if (object.isLight && object.constructor.name === lightType) {
                // 更新倍率
                this.lightIntensityMultipliers.set(object.uuid, multiplier);
                
                // 重新计算强度
                if (this.originalLightIntensities.has(object.uuid)) {
                    const originalIntensity = this.originalLightIntensities.get(object.uuid);
                    object.intensity = originalIntensity * multiplier;
                    console.log(`更新光源倍率: ${lightType} 倍率设置为 ${multiplier}x，强度从 ${originalIntensity} 更新到 ${object.intensity}`);
                }
            }
        });
    }
    
    /**
     * 移除Toon球体
     */
    removeToonSpheres() {
        this.toonSpheres.forEach(sphere => {
            this.scene.scene.remove(sphere);
            sphere.geometry.dispose();
            sphere.material.dispose();
        });
        this.toonSpheres = [];
    }
    
    /**
     * 应用Toon材质到星星碎片
     */
    applyToonMaterialsToFragments() {
        if (!Array.isArray(this.scene.starFragments)) return;
        
        this.scene.starFragments.forEach(fragment => {
            // 保存原始材质
            this.originalFragmentMaterials.set(fragment.uuid, fragment.material);
            
            // 使用 Toon 模式独特的随机颜色
            const randomColor = this.toonColors[Math.floor(Math.random() * this.toonColors.length)];
            
            // 创建Toon材质，使用独特的 Toon 颜色
            const toonMaterial = new THREE.MeshToonMaterial({
                color: randomColor,
                transparent: true,
                opacity: 0.9,
                emissive: randomColor, // 使用 Toon 颜色作为自发光
                emissiveIntensity: 1.2 // 进一步增强自发光强度，使发光效果更明显
            });
            
            fragment.material = toonMaterial;
        });
    }
    
    /**
     * 恢复星星碎片原始材质
     */
    restoreFragmentMaterials() {
        if (!Array.isArray(this.scene.starFragments)) return;
        
        this.scene.starFragments.forEach(fragment => {
            const originalMaterial = this.originalFragmentMaterials.get(fragment.uuid);
            if (originalMaterial) {
                fragment.material = originalMaterial;
            }
        });
        
        this.originalFragmentMaterials.clear();
    }
    
    /**
     * 更新Toon球体的动画
     */
    update(deltaTime, elapsedTime) {
        if (!this.isActive) return;
        
        // 同步Toon球体与原始土星的本地旋转
        if (this.scene.saturn && this.toonSpheres.length > 0) {
            const toonSphere = this.toonSpheres[0];
            if (toonSphere) {
                // 复制原始土星的本地旋转状态
                toonSphere.rotation.copy(this.scene.saturn.rotation);
            }
        }
        
        // 应用与原始土星相同的旋转逻辑
        this.toonSpheres.forEach((sphere, index) => {
            // 使用与原始土星相同的旋转速度和方向
            sphere.rotation.x += deltaTime * 0.001;
            sphere.rotation.y += deltaTime * 0.002;
            sphere.rotation.z += deltaTime * 0.0005;
        });
    }
    
    /**
     * 设置炫光效果
     */
    setupBloomEffect() {
        this.bloomEnabled = true;
        console.log('炫光效果已启用 - 使用材质自发光实现');
    }
    
    /**
     * 清理炫光效果
     */
    cleanupBloomEffect() {
        this.bloomEnabled = false;
        console.log('炫光效果已禁用');
    }
    
    /**
     * 渲染炫光效果
     */
    renderBloom() {
        // 炫光效果通过材质自发光实现，无需特殊渲染
        return;
    }
    
    /**
     * 设置照片窗口背景颜色与星星碎片颜色一致
     */
    setPhotoModalBackground(fragment) {
        if (!this.isActive) return;
        
        const modal = document.getElementById('photo-modal');
        if (!modal) return;
        
        // 保存原始背景颜色（只在第一次保存）
        if (!this.originalModalBackground) {
            this.originalModalBackground = modal.style.background;
        }
        
        // 获取碎片的颜色
        let fragmentColor = '#ffffff'; // 默认白色
        if (fragment && fragment.material && fragment.material.color) {
            // 将Three.js颜色转换为CSS颜色
            fragmentColor = '#' + fragment.material.color.getHexString();
        }
        
        // 设置照片窗口背景颜色
        modal.style.background = `linear-gradient(135deg, ${fragmentColor}20, ${fragmentColor}40)`;
        modal.style.border = `2px solid ${fragmentColor}`;
        
        console.log(`照片窗口背景颜色已设置为: ${fragmentColor}`);
    }
    
    /**
     * 恢复照片窗口原始背景颜色
     */
    restorePhotoModalBackground() {
        const modal = document.getElementById('photo-modal');
        if (!modal || !this.originalModalBackground) return;
        
        modal.style.background = this.originalModalBackground;
        modal.style.border = '2px solid #fff';
        
        console.log('照片窗口背景颜色已恢复');
    }
    
    /**
     * 切换Toon风格化渲染模式
     */
    toggle() {
        if (this.isActive) {
            this.disable();
        } else {
            this.enable();
        }
    }
    
    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            isActive: this.isActive,
            sphereCount: this.toonSpheres.length,
            colorCount: this.toonColors.length
        };
    }
}
