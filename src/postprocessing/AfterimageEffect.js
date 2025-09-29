import * as THREE from 'three';
import { EffectComposer } from './EffectComposer.js';
import { RenderPass } from './RenderPass.js';
import { AfterimagePass } from './AfterimagePass.js';

/**
 * 拖尾效果管理器
 * 基于Three.js的AfterimagePass实现拖尾粒子效果
 */
export class AfterimageEffect {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // 拖尾效果参数
        this.params = {
            damp: 0.98,        // 阻尼系数，控制拖尾衰减速度（0.7-0.99，数值越高停留时间越长）
            threshold: 0.01,    // 亮度阈值，只有超过此值的像素才会产生拖尾（降低阈值）
            enabled: true       // 是否启用拖尾效果
        };
        
        // 后处理合成器
        this.composer = null;
        this.afterimagePass = null;
        this.renderPass = null;
        
        this.init();
    }
    
    /**
     * 初始化拖尾效果
     */
    init() {
        // 创建效果合成器
        this.composer = new EffectComposer(this.renderer);
        
        // 渲染通道 - 渲染场景
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);
        
        // 拖尾效果通道
        this.afterimagePass = new AfterimagePass(this.params.damp);
        this.afterimagePass.renderToScreen = true;
        this.composer.addPass(this.afterimagePass);
        
        console.log('拖尾效果初始化完成');
    }
    
    /**
     * 渲染场景
     */
    render() {
        if (this.params.enabled) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * 设置阻尼系数
     * @param {number} damp - 阻尼系数 (0-1)
     */
    setDamp(damp) {
        this.params.damp = Math.max(0, Math.min(1, damp));
        if (this.afterimagePass) {
            this.afterimagePass.damp = this.params.damp;
        }
        console.log('设置拖尾阻尼:', this.params.damp);
    }
    
    /**
     * 启用/禁用拖尾效果
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.params.enabled = enabled;
        console.log('拖尾效果', enabled ? '启用' : '禁用');
    }
    
    /**
     * 更新效果参数
     * @param {Object} params - 参数对象
     */
    updateParams(params) {
        this.params = { ...this.params, ...params };
        
        if (this.afterimagePass) {
            this.afterimagePass.damp = this.params.damp;
        }
        
        console.log('更新拖尾参数:', this.params);
    }
    
    /**
     * 调整渲染器大小
     * @param {number} width - 宽度
     * @param {number} height - 高度
     */
    setSize(width, height) {
        if (this.composer) {
            this.composer.setSize(width, height);
        }
        if (this.afterimagePass) {
            this.afterimagePass.setSize(width, height);
        }
    }
    
    /**
     * 销毁效果
     */
    dispose() {
        if (this.composer) {
            this.composer.dispose();
        }
        if (this.afterimagePass) {
            this.afterimagePass.dispose();
        }
        console.log('拖尾效果已销毁');
    }
}
