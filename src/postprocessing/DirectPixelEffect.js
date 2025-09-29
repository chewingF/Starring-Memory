/**
 * 直接照抄学习案例的像素化效果实现
 * 完全按照 webgl_postprocessing_pixel.html 的方式
 */
export class DirectPixelEffect {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // 直接照抄学习案例的初始化
        this.composer = new THREE.EffectComposer(renderer);
        this.renderPixelatedPass = new THREE.RenderPixelatedPass(1, scene, camera);
        this.composer.addPass(this.renderPixelatedPass);
        
        // 像素化参数
        this.params = {
            pixelSize: 1,
            normalEdgeStrength: 1.0,
            depthEdgeStrength: 1.0
        };
        
        console.log('直接像素化效果初始化完成');
    }
    
    render() {
        console.log('使用直接像素化渲染');
        this.composer.render();
    }
    
    setPixelSize(size) {
        this.params.pixelSize = size;
        this.renderPixelatedPass.setPixelSize(size);
        console.log('设置像素大小:', size);
    }
    
    setMode(mode) {
        console.log('直接效果模式切换:', mode);
        if (mode === 'pixel') {
            // 像素化模式 - 重新创建composer
            this.composer = new THREE.EffectComposer(this.renderer);
            this.renderPixelatedPass = new THREE.RenderPixelatedPass(this.params.pixelSize, this.scene, this.camera);
            this.composer.addPass(this.renderPixelatedPass);
        } else {
            // 默认模式 - 清空composer
            this.composer = new THREE.EffectComposer(this.renderer);
        }
    }
    
    updatePixelParams(params) {
        this.params = { ...this.params, ...params };
        if (this.renderPixelatedPass) {
            this.renderPixelatedPass.setPixelSize(this.params.pixelSize);
            this.renderPixelatedPass.normalEdgeStrength = this.params.normalEdgeStrength;
            this.renderPixelatedPass.depthEdgeStrength = this.params.depthEdgeStrength;
        }
    }
}
