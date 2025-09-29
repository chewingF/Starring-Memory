import { EffectComposer } from './EffectComposer.js';
import { RenderPixelatedPass } from './RenderPixelatedPass.js';

/**
 * 简化的像素化效果实现
 * 直接按照学习案例的方式实现
 */
export class SimplePixelEffect {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // 创建EffectComposer
        this.composer = new EffectComposer(renderer);
        
        // 创建RenderPixelatedPass
        this.pixelatedPass = new RenderPixelatedPass(1, scene, camera);
        this.composer.addPass(this.pixelatedPass);
        
        console.log('简化像素化效果初始化完成');
    }
    
    render() {
        console.log('使用简化像素化渲染');
        this.composer.render();
    }
    
    setPixelSize(size) {
        this.pixelatedPass.setPixelSize(size);
        console.log('设置像素大小:', size);
    }
    
    setMode(mode) {
        console.log('简化效果模式切换:', mode);
        if (mode === 'pixel') {
            // 像素化模式
            this.composer.passes = [];
            this.composer.addPass(this.pixelatedPass);
        } else {
            // 默认模式
            this.composer.passes = [];
        }
    }
}
