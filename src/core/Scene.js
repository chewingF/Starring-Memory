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

            this.renderer.render(this.scene, this.camera);
        };
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


