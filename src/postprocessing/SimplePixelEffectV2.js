/**
 * 简化像素化效果V2 - 不依赖外部模块
 * 直接使用Three.js内置功能实现像素化
 */
export class SimplePixelEffectV2 {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // 创建渲染目标
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight
        );
        
        // 创建像素化着色器材质
        this.pixelMaterial = new THREE.ShaderMaterial({
            uniforms: {
                'tDiffuse': { value: null },
                'resolution': { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                'pixelSize': { value: 1 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 resolution;
                uniform float pixelSize;
                varying vec2 vUv;
                
                void main() {
                    vec2 dxy = pixelSize / resolution;
                    vec2 coord = dxy * floor(vUv / dxy);
                    gl_FragColor = texture2D(tDiffuse, coord);
                }
            `
        });
        
        // 创建全屏四边形
        this.quad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.pixelMaterial
        );
        
        // 创建像素化场景
        this.pixelScene = new THREE.Scene();
        this.pixelScene.add(this.quad);
        
        // 创建像素化相机
        this.pixelCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // 像素化参数
        this.params = {
            pixelSize: 1
        };
        
        this.isPixelMode = true;
        
        console.log('简化像素化效果V2初始化完成');
    }
    
    render() {
        if (this.isPixelMode) {
            console.log('使用简化像素化V2渲染');
            // 先渲染主场景到目标
            this.renderer.setRenderTarget(this.renderTarget);
            this.renderer.render(this.scene, this.camera);
            
            // 设置纹理并渲染像素化效果到屏幕
            this.pixelMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.pixelScene, this.pixelCamera);
        } else {
            console.log('使用默认渲染');
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    setPixelSize(size) {
        this.params.pixelSize = size;
        this.pixelMaterial.uniforms.pixelSize.value = size;
        console.log('设置像素大小:', size);
    }
    
    setMode(mode) {
        console.log('简化效果V2模式切换:', mode);
        this.isPixelMode = (mode === 'pixel');
    }
    
    updatePixelParams(params) {
        this.params = { ...this.params, ...params };
        this.setPixelSize(this.params.pixelSize);
    }
    
    getCurrentMode() {
        return this.isPixelMode ? 'pixel' : 'default';
    }
}
