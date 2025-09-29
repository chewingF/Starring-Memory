/**
 * 使用测试项目中验证有效的像素化效果实现
 * 直接复制测试项目的成功方法
 */
export class TestedPixelEffect {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // 直接使用Three.js全局对象，就像测试项目一样
        this.composer = new THREE.EffectComposer(renderer);
        
        // 创建像素化通道
        this.renderPixelatedPass = new THREE.RenderPixelatedPass(1, scene, camera);
        this.composer.addPass(this.renderPixelatedPass);
        
        // 创建输出通道
        this.outputPass = new THREE.OutputPass();
        this.composer.addPass(this.outputPass);
        
        // 像素化参数
        this.params = {
            pixelSize: 1,
            normalEdgeStrength: 1.0,
            depthEdgeStrength: 1.0
        };
        
        this.isPixelMode = true;
        
        console.log('测试验证的像素化效果初始化完成');
    }
    
    render() {
        if (this.isPixelMode) {
            console.log('使用测试验证的像素化渲染');
            this.composer.render();
        } else {
            console.log('使用默认渲染');
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    setPixelSize(size) {
        this.params.pixelSize = size;
        this.renderPixelatedPass.setPixelSize(size);
        console.log('设置像素大小:', size);
    }
    
    setMode(mode) {
        console.log('测试验证效果模式切换:', mode);
        this.isPixelMode = (mode === 'pixel');
        
        if (mode === 'pixel') {
            // 像素化模式
            this.composer.passes = [];
            this.composer.addPass(this.renderPixelatedPass);
            this.composer.addPass(this.outputPass);
        } else {
            // 默认模式
            this.composer.passes = [];
        }
    }
    
    updatePixelParams(params) {
        this.params = { ...this.params, ...params };
        this.setPixelSize(this.params.pixelSize);
        this.renderPixelatedPass.normalEdgeStrength = this.params.normalEdgeStrength;
        this.renderPixelatedPass.depthEdgeStrength = this.params.depthEdgeStrength;
    }
    
    getCurrentMode() {
        return this.isPixelMode ? 'pixel' : 'default';
    }
}
