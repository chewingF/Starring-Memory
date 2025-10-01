import * as THREE from 'three';

export class MeteorShowerManager {
    constructor(scene) {
        this.scene = scene;
        this.meteors = [];
        this.meteorGroup = new THREE.Group();
        this.isActive = false;
        
        // 流星雨参数
        this.meteorCount = 20; // 同时存在的流星数量
        this.spawnRate = 0.3; // 每秒生成流星的概率
        this.lastSpawnTime = 0;
        
        // 流星参数
        this.meteorSpeed = 0.5; // 流星速度
        this.meteorLength = 0.8; // 拖尾长度
        this.meteorWidth = 0.02; // 拖尾宽度
        this.meteorLifetime = 3; // 流星生命周期（秒）
        
        // 发射区域（右上角）
        this.spawnArea = {
            x: { min: 15, max: 25 }, // 右上角X范围
            y: { min: 8, max: 15 },  // 右上角Y范围
            z: { min: -20, max: -10 } // 深度范围
        };
        
        // 目标区域（左下角）
        this.targetArea = {
            x: { min: -25, max: -15 },
            y: { min: -15, max: -8 },
            z: { min: -20, max: -10 }
        };
        
    }
    
    init() {
        console.log('流星雨管理器初始化');
        this.scene.add(this.meteorGroup);
    }
    
    toggle() {
        this.isActive = !this.isActive;
        if (this.isActive) {
            console.log('流星雨效果已启用');
        } else {
            console.log('流星雨效果已禁用');
            this.clearAllMeteors();
        }
    }
    
    update(deltaTime) {
        if (!this.isActive) return;
        
        // 更新现有流星
        this.updateMeteors(deltaTime);
        
        // 生成新流星
        this.spawnMeteors(deltaTime);
    }
    
    updateMeteors(deltaTime) {
        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const meteor = this.meteors[i];
            meteor.lifetime -= deltaTime;
            
            if (meteor.lifetime <= 0) {
                // 移除过期流星
                this.meteorGroup.remove(meteor.mesh);
                this.meteors.splice(i, 1);
                continue;
            }
            
            // 更新流星位置
            meteor.position.add(meteor.velocity.clone().multiplyScalar(deltaTime));
            meteor.mesh.position.copy(meteor.position);
            
            // 更新拖尾透明度
            const alpha = meteor.lifetime / meteor.maxLifetime;
            meteor.material.opacity = alpha;
            
            // 更新拖尾长度（根据速度）
            const speed = meteor.velocity.length();
            const length = Math.max(0.1, speed * this.meteorLength);
            meteor.mesh.scale.set(length, 1, 1);
        }
    }
    
    spawnMeteors(deltaTime) {
        this.lastSpawnTime += deltaTime;
        
        // 检查是否需要生成新流星
        if (this.meteors.length < this.meteorCount && 
            Math.random() < this.spawnRate * deltaTime) {
            this.createMeteor();
        }
    }
    
    createMeteor() {
        // 生成起始位置（右上角）
        const startX = this.randomBetween(this.spawnArea.x.min, this.spawnArea.x.max);
        const startY = this.randomBetween(this.spawnArea.y.min, this.spawnArea.y.max);
        const startZ = this.randomBetween(this.spawnArea.z.min, this.spawnArea.z.max);
        
        // 生成目标位置（左下角）
        const targetX = this.randomBetween(this.targetArea.x.min, this.targetArea.x.max);
        const targetY = this.randomBetween(this.targetArea.y.min, this.targetArea.y.max);
        const targetZ = this.randomBetween(this.targetArea.z.min, this.targetArea.z.max);
        
        // 计算方向向量
        const direction = new THREE.Vector3(targetX - startX, targetY - startY, targetZ - startZ);
        direction.normalize();
        
        // 创建流星几何体（拖尾效果）
        const geometry = new THREE.CylinderGeometry(
            this.meteorWidth / 2, // 顶部半径
            this.meteorWidth,    // 底部半径
            this.meteorLength,   // 高度
            8,                   // 径向分段
            1,                   // 高度分段
            true                 // 开放端
        );
        
        // 旋转几何体使其指向运动方向
        geometry.rotateX(Math.PI / 2);
        
        // 创建材质
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(
                0.1 + Math.random() * 0.1, // 橙黄色调
                0.8 + Math.random() * 0.2, // 高饱和度
                0.6 + Math.random() * 0.4  // 中等亮度
            ),
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide
        });
        
        // 创建流星网格
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(startX, startY, startZ);
        
        // 计算旋转使流星指向运动方向
        const rotationAxis = new THREE.Vector3(0, 0, 1).cross(direction);
        const rotationAngle = Math.acos(new THREE.Vector3(0, 0, 1).dot(direction));
        if (rotationAxis.length() > 0) {
            mesh.quaternion.setFromAxisAngle(rotationAxis, rotationAngle);
        }
        
        this.meteorGroup.add(mesh);
        
        // 创建流星对象
        const meteor = {
            mesh: mesh,
            position: new THREE.Vector3(startX, startY, startZ),
            velocity: direction.multiplyScalar(this.meteorSpeed * (0.8 + Math.random() * 0.4)),
            lifetime: this.meteorLifetime * (0.8 + Math.random() * 0.4),
            maxLifetime: this.meteorLifetime,
            material: material
        };
        
        this.meteors.push(meteor);
    }
    
    clearAllMeteors() {
        // 清除所有流星
        this.meteors.forEach(meteor => {
            this.meteorGroup.remove(meteor.mesh);
        });
        this.meteors = [];
    }
    
    setMeteorCount(count) {
        this.meteorCount = Math.max(0, Math.min(50, count));
    }
    
    setSpawnRate(rate) {
        this.spawnRate = Math.max(0, Math.min(2, rate));
    }
    
    setMeteorSpeed(speed) {
        this.meteorSpeed = Math.max(0.1, Math.min(2, speed));
    }
    
    setMeteorLength(length) {
        this.meteorLength = Math.max(0.1, Math.min(2, length));
    }
    
    randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }
    
    dispose() {
        this.clearAllMeteors();
        this.scene.remove(this.meteorGroup);
    }
}
