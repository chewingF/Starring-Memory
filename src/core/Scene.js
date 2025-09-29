import { SaturnRingScene as LegacyScene } from '../../script.js';
import { BackgroundManager } from '../background/BackgroundManager.js';
import { PlanetarySystem } from '../planetary/PlanetarySystem.js';
import { StarFragmentManager } from '../fragments/StarFragmentManager.js';
import { FragmentInteractionController } from '../interactions/FragmentInteractionController.js';

export class SaturnRingScene extends LegacyScene {
    constructor() {
        // 必须先调用 super() 才能访问 this
        super();
        
        // 初始化管理器
        this._wireManagers();
        
        // 覆盖动画循环，改为由管理器驱动，保持视觉行为一致
        this.clock = this.clock || new THREE.Clock();
        this.animate = () => {
            requestAnimationFrame(() => this.animate());

            const deltaTime = this.clock.getDelta();
            const elapsedTime = this.clock.getElapsedTime();

            const rotationPerSecond = (this.rotationSpeed * Math.PI * 2) / 60;

            // 行星系统（包含旋转轴）
            if (this.planetarySystem && typeof this.planetarySystem.update === 'function') {
                this.planetarySystem.update(deltaTime, rotationPerSecond);
            }

            // 光照与流星维持原逻辑
            if (typeof this.updateLightPositions === 'function') {
                this.updateLightPositions();
            }
            if (typeof this.updateMeteorAnimations === 'function') {
                this.updateMeteorAnimations();
            }

            // 碎片逐帧更新
            if (this.starFragmentManager && typeof this.starFragmentManager.update === 'function') {
                this.starFragmentManager.update(deltaTime, elapsedTime, rotationPerSecond);
            }

            // 检查当前模式，决定使用哪种渲染方式
            const modeSelect = document.getElementById('postProcessingMode');
            const currentMode = modeSelect ? modeSelect.value : 'default';
            
            // 检查composer是否可用且像素模式是否启用
            const useComposer = this.composer && currentMode === 'pixel';
            
            if (useComposer) {
                // 像素模式：使用后处理合成器
                this.composer.render();
            } else {
                // 默认模式：直接渲染，确保与原来效果一致
                this.renderer.render(this.scene, this.camera);
            }
        };
        
        // 等待后处理系统初始化完成
        this._waitForPostProcessing();
    }
    
    /**
     * 等待后处理系统初始化完成
     */
    async _waitForPostProcessing() {
        // 等待composer初始化完成
        const checkComposer = () => {
            if (this.composer) {
                console.log('后处理合成器已就绪');
                return true;
            }
            return false;
        };
        
        // 如果composer已经存在，直接返回
        if (checkComposer()) return;
        
        // 否则等待一段时间后重试
        const maxRetries = 50; // 最多等待5秒
        let retries = 0;
        
        const waitForComposer = () => {
            if (checkComposer() || retries >= maxRetries) {
                if (retries >= maxRetries) {
                    console.warn('后处理合成器初始化超时，使用默认渲染');
                }
                return;
            }
            
            retries++;
            setTimeout(waitForComposer, 100);
        };
        
        waitForComposer();
    }

    _wireManagers() {
        this.backgroundManager = new BackgroundManager(this);
        this.planetarySystem = new PlanetarySystem(this);
        this.starFragmentManager = new StarFragmentManager(this);
        this.fragmentInteractionController = new FragmentInteractionController(this);

        this._managers = [
            this.backgroundManager,
            this.planetarySystem,
            this.starFragmentManager,
            this.fragmentInteractionController
        ];
        // 立即初始化管理器，确保在基类构造期间可用
        this._managers.forEach(m => m.init && m.init());
    }
}


