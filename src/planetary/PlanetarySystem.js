export class PlanetarySystem {
    constructor(scene) {
        this.scene = scene;
    }

    init() {
        this.createSaturn();
        this.createRing();
    }

    update(deltaTime, rotationPerSecond) {
        // 复用现有旋转轴逻辑
        if (this.scene.rotationAxis) {
            this.scene.rotationAxis.rotation.y -= rotationPerSecond * deltaTime;
        }
    }

    createSaturn() {
        const saturnGeometry = new THREE.SphereGeometry(3, 128, 128);
        const saturnTexture = new THREE.TextureLoader().load(
            'Textures/Saturn.jpg',
            (texture) => {
                console.log('NASA土星贴图加载成功');
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = true;
                texture.flipY = false;
                texture.needsUpdate = true;
                this.scene.saturnTextureLoaded = true;
                this.scene.checkReady();
            },
            (progress) => {
                console.log('土星贴图加载进度:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('NASA土星贴图加载失败:', error);
                console.log('使用程序化贴图作为备用');
                this.scene.saturnTextureLoaded = true;
                this.scene.checkReady();
            }
        );
        const saturnMaterial = new THREE.MeshPhongMaterial({
            map: saturnTexture,
            shininess: 1,
            specular: 0x111111,
            transparent: false,
            emissive: new THREE.Color(0x111111),
            emissiveIntensity: 1
        });
        this.scene.saturn = new THREE.Mesh(saturnGeometry, saturnMaterial);
        this.scene.saturn.castShadow = true;
        this.scene.saturn.receiveShadow = true;
        this.scene.saturnSystem = new THREE.Group();
        this.scene.saturnSystem.add(this.scene.saturn);
        this.scene.rotationAxis = new THREE.Group();
        this.scene.rotationAxis.add(this.scene.saturnSystem);
        this.scene.rotationAxis.rotation.x = (27 * Math.PI) / 180;
        this.scene.rotationAxis.rotation.z = (15 * Math.PI) / 180;
        this.scene.scene.add(this.scene.rotationAxis);
        const atmosphereGeometry = new THREE.SphereGeometry(3.05, 64, 64);
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.saturn.add(atmosphere);
        this.createPolarStorms();
        // this.createSaturnShadow();
    }

    createPolarStorms() {
        const northStormGeometry = new THREE.SphereGeometry(3.02, 32, 16, 0, Math.PI * 2, 0, Math.PI / 6);
        const northStormMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B4513,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const northStorm = new THREE.Mesh(northStormGeometry, northStormMaterial);
        this.scene.saturn.add(northStorm);
        const southStormGeometry = new THREE.SphereGeometry(3.02, 32, 16, 0, Math.PI * 2, Math.PI * 5/6, Math.PI / 6);
        const southStormMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B4513,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const southStorm = new THREE.Mesh(southStormGeometry, southStormMaterial);
        this.scene.saturn.add(southStorm);
    }

    createSaturnShadow() {
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
        this.scene.saturnSystem.add(shadow);
    }

    createRing() {
        const ringTexture = this.createRingTexture();
        this.createRingLayer(4, 5.2, ringTexture, this.scene.ringOpacity.inner, 0xd99e29);
        this.createRingLayer(5.8, 7, ringTexture, this.scene.ringOpacity.middle, 0x9c7913);
        this.createRingLayer(7, 8.5, ringTexture, this.scene.ringOpacity.outer, 0xcfa200);
        this.createCassiniGap(5.2, 5.8);
        this.updateRingVisibility();
    }

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

    createRingLayer(innerRadius, outerRadius, texture, opacity, color = 0xffffff) {
        const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 256);
        const ringMaterial = new THREE.MeshPhongMaterial({
            map: texture,
            color: color,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide,
            shininess: 200,
            specular: 0x888888,
            alphaTest: 0.1
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0;
        this.scene.saturnSystem.add(ring);
        const thinRing = new THREE.Mesh(ringGeometry, new THREE.MeshPhongMaterial({
            map: texture,
            color: color,
            transparent: true,
            opacity: opacity * 0.3,
            side: THREE.DoubleSide,
            shininess: 150,
            specular: 0x666666,
            alphaTest: 0.1
        }));
        thinRing.rotation.x = Math.PI / 2;
        thinRing.position.y = 0.05;
        this.scene.saturnSystem.add(thinRing);
    }

    createCassiniGap(innerRadius, outerRadius) {
        const gapGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);
        const gapMaterial = new THREE.MeshPhongMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: this.scene.ringOpacity.cassini,
            side: THREE.DoubleSide
        });
        const gap = new THREE.Mesh(gapGeometry, gapMaterial);
        gap.rotation.x = Math.PI / 2;
        gap.position.y = 0.02;
        this.scene.saturnSystem.add(gap);
    }

    updateRingVisibility() {
        this.scene.scene.children.forEach(child => {
            if (child.geometry && child.geometry.type === 'RingGeometry') {
                child.visible = this.scene.isRingVisible;
            }
        });
        if (this.scene.saturnSystem) {
            this.scene.saturnSystem.children.forEach(child => {
                if (child.geometry && child.geometry.type === 'RingGeometry') {
                    child.visible = this.scene.isRingVisible;
                }
            });
        }
    }

    toggleRingVisibility() {
        this.scene.isRingVisible = !this.scene.isRingVisible;
        this.updateRingVisibility();
    }

    updateRingOpacity() {
        this.recreateRings();
    }

    recreateRings() {
        if (this.scene.saturnSystem) {
            const ringsToRemove = [];
            this.scene.saturnSystem.children.forEach(child => {
                if (child.geometry && child.geometry.type === 'RingGeometry') {
                    ringsToRemove.push(child);
                }
            });
            ringsToRemove.forEach(ring => {
                this.scene.saturnSystem.remove(ring);
            });
        }
        this.createRing();
    }
}


