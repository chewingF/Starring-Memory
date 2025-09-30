import * as THREE from 'three';

export class StarFragmentManager {
    constructor(scene) {
        this.scene = scene;
    }

    init() {
        // 确保土星系统已创建后再创建碎片
        if (this.scene.saturnSystem) {
            this.createStarFragments();
        } else {
            // 如果土星系统还没创建，延迟创建
            setTimeout(() => {
                if (this.scene.saturnSystem) {
                    this.createStarFragments();
                }
            }, 100);
        }
    }

    update(deltaTime, elapsedTime, rotationPerSecond) {
        if (!Array.isArray(this.scene.starFragments)) return;
        this.scene.starFragments.forEach((fragment) => {
            if (!fragment.userData.isClicked && fragment.parent !== this.scene.scene) {
                fragment.position.y = fragment.userData.originalPosition.y;
                const rotationMultiplier = fragment.userData.rotationMultiplier || 1.0;
                const additionalRotation = rotationPerSecond * rotationMultiplier * deltaTime;
                fragment.userData.originalAngle += additionalRotation;
                fragment.position.x = Math.cos(fragment.userData.originalAngle) * fragment.userData.radius;
                fragment.position.z = Math.sin(fragment.userData.originalAngle) * fragment.userData.radius;
                if (fragment.userData.isPhotoThumbnail) {
                    fragment.lookAt(this.scene.camera.position);
                }
                this.updateFragmentFlicker(fragment, elapsedTime);
                this.updateFragmentSizeVariation(fragment, deltaTime);
                this.updateFragmentSelfRotation(fragment, deltaTime);
            }
        });
    }

    createStarFragments() {
        // 清理旧碎片
        this.disposeFragments();

        // RenderBundle 风格：将碎片放入一个组内，模拟示例中的 BundleGroup
        const useRB = !!this.scene.useRenderBundleStyle;
        if (useRB) {
            this.scene.starFragmentGroup = new THREE.Group();
            // 与示例保持一致：动态时 static=false
            this.scene.starFragmentGroup.static = false;
            this.scene.saturnSystem.add(this.scene.starFragmentGroup);
        } else {
            this.scene.starFragmentGroup = null;
        }

        const rings = [
            { name: 'A', innerRadius: 4.0, outerRadius: 4.8, color: 0xffd700, count: Math.floor(this.scene.starFragmentCount * this.scene.ringFragmentRatios.inner) },
            { name: 'B', innerRadius: 4.8, outerRadius: 5.2, color: 0xffed4e, count: Math.floor(this.scene.starFragmentCount * this.scene.ringFragmentRatios.middle) },
            { name: 'C', innerRadius: 5.8, outerRadius: 7.2, color: 0xffa500, count: Math.floor(this.scene.starFragmentCount * this.scene.ringFragmentRatios.outer) },
            { name: 'D', innerRadius: 7.6, outerRadius: 8.4, color: 0xff8c00, count: Math.floor(this.scene.starFragmentCount * this.scene.ringFragmentRatios.outerMost) }
        ];
        rings.forEach((ring, ringIndex) => {
            for (let i = 0; i < ring.count; i++) {
                const fragment = this.createStarFragment(ring, ringIndex);
                this.scene.starFragments.push(fragment);
                if (useRB && this.scene.starFragmentGroup) {
                    this.scene.starFragmentGroup.add(fragment);
                } else {
                    this.scene.saturnSystem.add(fragment);
                }
            }
        });
        this.scene.starFragmentsReady = true;
        this.scene.checkReady();
    }

    recreateFragments() {
        this.createStarFragments();
        
        // 如果 Toon 模式是激活的，重新应用 Toon 材质
        if (this.scene.toonMode && this.scene.toonMode.isActive) {
            this.scene.toonMode.applyToonMaterialsToFragments();
        }
    }

    disposeFragments() {
        if (Array.isArray(this.scene.starFragments) && this.scene.starFragments.length > 0) {
            this.scene.starFragments.forEach((fragment) => {
                if (fragment.parent) fragment.parent.remove(fragment);
                if (fragment.geometry) fragment.geometry.dispose();
                if (fragment.material) {
                    if (Array.isArray(fragment.material)) {
                        fragment.material.forEach(m => m.dispose && m.dispose());
                    } else {
                        fragment.material.dispose && fragment.material.dispose();
                    }
                }
            });
        }
        this.scene.starFragments = [];
        if (this.scene.starFragmentGroup && this.scene.starFragmentGroup.parent) {
            this.scene.starFragmentGroup.parent.remove(this.scene.starFragmentGroup);
        }
        this.scene.starFragmentGroup = null;
        this.scene.starFragmentsReady = false;
    }

    createStarFragment(ring, ringIndex) {
        const minSize = 0.06;
        const maxSize = 0.08;
        const baseSize = Math.random() * (maxSize - minSize) + minSize;
        const size = baseSize * this.scene.starFragmentSizeScale;
        
        // 使用随机几何体（参考 renderbundle 示例）
        const geometries = [
            new THREE.ConeGeometry(1.0, 2.0, 3, 1),
            new THREE.BoxGeometry(2.0, 2.0, 2.0),
            new THREE.PlaneGeometry(2.0, 2, 1, 1),
            new THREE.CapsuleGeometry(),
            new THREE.CircleGeometry(1.0, 3),
            new THREE.CylinderGeometry(1.0, 1.0, 2.0, 3, 1),
            new THREE.DodecahedronGeometry(1.0, 0),
            new THREE.IcosahedronGeometry(1.0, 0),
            new THREE.OctahedronGeometry(1.0, 0),
            new THREE.SphereGeometry(1.0, 3, 2),
            new THREE.TetrahedronGeometry(1.0, 0),
            new THREE.TorusGeometry(1.0, 0.5, 3, 3),
            new THREE.TorusKnotGeometry(1.0, 0.5, 20, 3, 1, 1)
        ];
        
        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        geometry.scale(size, size, size);
        
        const material = new THREE.MeshPhongMaterial({
            color: ring.color,
            transparent: true,
            opacity: 0.9,
            shininess: 2,
            specular: 0x888888,
            emissive: ring.color,
            emissiveIntensity: 0.3 // 增强自发光强度，使发光效果更明显
        });
        const fragment = new THREE.Mesh(geometry, material);
        let angle, radius, height;
        if (this.scene.starFragmentDistribution === 0) {
            const currentFragmentIndex = this.scene.starFragments.length;
            const fragmentsInThisRing = ring.count;
            const fragmentIndexInRing = currentFragmentIndex % fragmentsInThisRing;
            angle = (fragmentIndexInRing * (Math.PI * 2) / fragmentsInThisRing) + (Math.random() - 0.5) * 0.1;
            const innerRadiusSquared = ring.innerRadius * ring.innerRadius;
            const outerRadiusSquared = ring.outerRadius * ring.outerRadius;
            const radiusSquaredRange = outerRadiusSquared - innerRadiusSquared;
            const uniformRadiusSquared = innerRadiusSquared + (fragmentIndexInRing / fragmentsInThisRing) * radiusSquaredRange;
            radius = Math.sqrt(uniformRadiusSquared);
            height = 0;
        } else if (this.scene.starFragmentDistribution === 1) {
            angle = Math.random() * Math.PI * 2;
            radius = Math.random() * (ring.outerRadius - ring.innerRadius) + ring.innerRadius;
            height = (Math.random() - 0.5) * 0.1;
        } else {
            const currentFragmentIndex = this.scene.starFragments.length;
            const fragmentsInThisRing = ring.count;
            const fragmentIndexInRing = currentFragmentIndex % fragmentsInThisRing;
            const uniformAngle = (fragmentIndexInRing * (Math.PI * 2) / fragmentsInThisRing);
            const innerRadiusSquared = ring.innerRadius * ring.innerRadius;
            const outerRadiusSquared = ring.outerRadius * ring.outerRadius;
            const radiusSquaredRange = outerRadiusSquared - innerRadiusSquared;
            const uniformRadiusSquared = innerRadiusSquared + (fragmentIndexInRing / fragmentsInThisRing) * radiusSquaredRange;
            const uniformRadius = Math.sqrt(uniformRadiusSquared);
            const uniformHeight = 0;
            const randomAngle = Math.random() * Math.PI * 2;
            const randomRadius = Math.random() * (ring.outerRadius - ring.innerRadius) + ring.innerRadius;
            const randomHeight = (Math.random() - 0.5) * 0.1;
            angle = uniformAngle + (randomAngle - uniformAngle) * this.scene.starFragmentDistribution;
            radius = uniformRadius + (randomRadius - uniformRadius) * this.scene.starFragmentDistribution;
            height = uniformHeight + (randomHeight - uniformHeight) * this.scene.starFragmentDistribution;
        }
        fragment.position.x = Math.cos(angle) * radius;
        fragment.position.z = Math.sin(angle) * radius;
        fragment.position.y = height + 0.1;
        const rotationMultipliers = ['inner', 'middle', 'outer', 'outerMost'];
        const ringBaseMultiplier = this.scene.ringRotationMultipliers[rotationMultipliers[ringIndex]] || 1.0;
        const randomSpeedMultiplier = Math.random() * 0.2 + 0.9;
        const rotationMultiplier = ringBaseMultiplier * randomSpeedMultiplier;
        fragment.userData = {
            originalPosition: fragment.position.clone(),
            originalAngle: angle,
            radius: radius,
            speed: Math.random() * 0.01 + 0.005,
            rotationMultiplier: rotationMultiplier,
            ringBaseMultiplier: ringBaseMultiplier,
            randomSpeedMultiplier: randomSpeedMultiplier,
            isClicked: false,
            ringName: ring.name,
            ringIndex: ringIndex,
            isDimming: false,
            dimStartTime: 0,
            dimDuration: 0,
            nextDimTime: Math.random() * 50 + 30,
            originalSize: size,
            baseSize: baseSize,
            originalScale: 1.0, // 保存原始缩放比例
            sizeVariation: {
                enabled: true,
                minScale: 0.7,
                maxScale: 1.3,
                speed: Math.random() * 0.02 + 0.01,
                phase: Math.random() * Math.PI * 2,
                currentScale: 1.0
            },
            selfRotation: {
                enabled: true,
                speedX: (Math.random() * 0.8 + 0.1) * 1,
                speedY: (Math.random() * 0.8 + 0.1) * 2,
                speedZ: (Math.random() * 0.8 + 0.1) * 0.5,
                currentRotationX: 0,
                currentRotationY: 0,
                currentRotationZ: 0
            }
        };
        if (!fragment.userData) fragment.userData = {};
        // 对于随机几何体，不需要保存 cornerScales
        return fragment;
    }

    updateFragmentFlicker(fragment, elapsedTime) {
        const userData = fragment.userData;
        if (!userData.isDimming && elapsedTime >= userData.nextDimTime) {
            userData.isDimming = true;
            userData.dimStartTime = elapsedTime;
            userData.dimDuration = Math.random() * 0.5 + 0.3;
        }
        if (userData.isDimming) {
            const dimElapsed = elapsedTime - userData.dimStartTime;
            if (dimElapsed < userData.dimDuration) {
                const dimProgress = dimElapsed / userData.dimDuration;
                const opacity = 0.9 - (dimProgress * 0.6);
                fragment.material.opacity = opacity;
            } else if (dimElapsed < userData.dimDuration * 2) {
                const brightProgress = (dimElapsed - userData.dimDuration) / userData.dimDuration;
                const opacity = 0.3 + (brightProgress * 0.6);
                fragment.material.opacity = opacity;
            } else {
                userData.isDimming = false;
                fragment.material.opacity = 0.9;
                userData.nextDimTime = elapsedTime + Math.random() * 50 + 30;
            }
        } else {
            fragment.material.opacity = 0.9;
        }
    }

    updateFragmentSizeVariation(fragment, deltaTime) {
        const userData = fragment.userData;
        if (!userData.sizeVariation || !userData.sizeVariation.enabled) return;
        const sizeVar = userData.sizeVariation;
        const time = performance.now() * 0.001;
        const wave = Math.sin(time * sizeVar.speed + sizeVar.phase);
        const normalizedWave = (wave + 1) / 2;
        sizeVar.currentScale = sizeVar.minScale + normalizedWave * (sizeVar.maxScale - sizeVar.minScale);
        fragment.scale.setScalar(sizeVar.currentScale);
    }

    updateFragmentSelfRotation(fragment, deltaTime) {
        const userData = fragment.userData;
        if (!userData.selfRotation || !userData.selfRotation.enabled) return;
        const selfRot = userData.selfRotation;
        selfRot.currentRotationX += selfRot.speedX * deltaTime;
        selfRot.currentRotationY += selfRot.speedY * deltaTime;
        selfRot.currentRotationZ += selfRot.speedZ * deltaTime;
        fragment.rotation.x = selfRot.currentRotationX;
        fragment.rotation.y = selfRot.currentRotationY;
        fragment.rotation.z = selfRot.currentRotationZ;
    }

    createDiamondGeometry(size, cornerScales = null) {
        const geometry = new THREE.BufferGeometry();
        
        // 角缩放：左右、前、后四个角各自缩放（默认0.6，随机0.6-0.9）
        const scales = cornerScales || {
            left: this.scene.randomizeDiamondCorners ? (Math.random() * 0.3 + 0.6) : 0.6,
            right: this.scene.randomizeDiamondCorners ? (Math.random() * 0.3 + 0.6) : 0.6,
            front: this.scene.randomizeDiamondCorners ? (Math.random() * 0.3 + 0.6) : 0.6,
            back: this.scene.randomizeDiamondCorners ? (Math.random() * 0.3 + 0.6) : 0.6
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
}


