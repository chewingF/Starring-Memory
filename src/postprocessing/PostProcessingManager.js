import { EffectComposer } from './EffectComposer.js';
import { RenderPixelatedPass } from './RenderPixelatedPass.js';
import { OutputPass } from './OutputPass.js';

/**
 * 后处理效果管理器
 * 负责管理不同的风格化后处理效果
 */
export class PostProcessingManager {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // 当前效果模式
        this.currentMode = 'pixel'; // 'default' 或 'pixel'
        
        // 后处理合成器
        this.composer = null;
        
        // 像素化效果相关
        this.pixelatedPass = null;
        this.outputPass = null;
        
        // 像素化效果参数
        this.pixelParams = {
            pixelSize: 1, // 极小的像素大小，效果非常明显
            normalEdgeStrength: 1.0,
            depthEdgeStrength: 1.0
        };
        
        this.init();
    }
    
    /**
     * 初始化后处理系统
     */
    init() {
        // 创建效果合成器
        this.composer = new EffectComposer(this.renderer);
        
        // 创建像素化渲染通道
        this.pixelatedPass = new RenderPixelatedPass(
            this.pixelParams.pixelSize,
            this.scene,
            this.camera,
            {
                normalEdgeStrength: this.pixelParams.normalEdgeStrength,
                depthEdgeStrength: this.pixelParams.depthEdgeStrength
            }
        );
        
        // 创建输出通道
        this.outputPass = new OutputPass();
        
        // 默认使用像素化渲染
        this.setMode('pixel');
    }
    
    /**
     * 设置后处理模式
     * @param {string} mode - 效果模式：'default' 或 'pixel'
     */
    setMode(mode) {
        if (this.currentMode === mode) return;
        
        console.log(`切换后处理模式: ${this.currentMode} -> ${mode}`);
        this.currentMode = mode;
        
        // 清除所有通道
        this.composer.passes = [];
        
        if (mode === 'pixel') {
            // 添加像素化效果 - 按照学习案例的方式
            this.pixelatedPass.renderToScreen = true; // 直接渲染到屏幕
            this.composer.addPass(this.pixelatedPass);
            console.log('像素化效果已启用，通道数量:', this.composer.passes.length);
        } else {
            // 默认模式，直接渲染到屏幕，不需要额外通道
            console.log('默认模式已启用');
        }
    }
    
    /**
     * 更新像素化参数
     * @param {Object} params - 像素化参数
     */
    updatePixelParams(params) {
        this.pixelParams = { ...this.pixelParams, ...params };
        
        if (this.pixelatedPass) {
            this.pixelatedPass.setPixelSize(this.pixelParams.pixelSize);
            this.pixelatedPass.normalEdgeStrength = this.pixelParams.normalEdgeStrength;
            this.pixelatedPass.depthEdgeStrength = this.pixelParams.depthEdgeStrength;
        }
    }
    
    /**
     * 渲染场景
     */
    render() {
        if (this.currentMode === 'pixel') {
            console.log('使用像素化渲染，像素大小:', this.pixelParams.pixelSize);
            console.log('Composer通道数量:', this.composer.passes.length);
            console.log('Composer是否为空:', this.composer.passes.length === 0);
            this.composer.render();
        } else {
            // 默认模式直接渲染
            console.log('使用默认渲染');
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * 设置渲染尺寸
     * @param {number} width - 宽度
     * @param {number} height - 高度
     */
    setSize(width, height) {
        this.composer.setSize(width, height);
    }
    
    /**
     * 获取当前模式
     * @returns {string} 当前效果模式
     */
    getCurrentMode() {
        return this.currentMode;
    }
    
    /**
     * 获取像素化参数
     * @returns {Object} 像素化参数
     */
    getPixelParams() {
        return { ...this.pixelParams };
    }
    
    /**
     * 销毁资源
     */
    dispose() {
        if (this.composer) {
            this.composer.dispose();
        }
        if (this.pixelatedPass) {
            this.pixelatedPass.dispose();
        }
    }
}
