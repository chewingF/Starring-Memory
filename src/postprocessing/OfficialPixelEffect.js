/**
 * 使用官方Three.js后处理类的像素化效果
 * 直接使用CDN中的后处理模块
 */
export class OfficialPixelEffect {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // 使用官方Three.js后处理类
        this.composer = new THREE.EffectComposer(renderer);
        
        // 创建像素化着色器
        this.pixelShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'resolution': { value: new THREE.Vector2() },
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
        };
        
        this.pixelPass = new THREE.ShaderPass(this.pixelShader);
        this.composer.addPass(this.pixelPass);
        
        // 像素化参数
        this.params = {
            pixelSize: 1
        };
        
        console.log('官方像素化效果初始化完成');
    }
    
    render() {
        console.log('使用官方像素化渲染');
        this.composer.render();
    }
    
    setPixelSize(size) {
        this.params.pixelSize = size;
        this.pixelShader.uniforms.pixelSize.value = size;
        console.log('设置像素大小:', size);
    }
    
    setMode(mode) {
        console.log('官方效果模式切换:', mode);
        if (mode === 'pixel') {
            // 像素化模式
            this.composer.passes = [];
            this.composer.addPass(this.pixelPass);
        } else {
            // 默认模式
            this.composer.passes = [];
        }
    }
    
    updatePixelParams(params) {
        this.params = { ...this.params, ...params };
        this.setPixelSize(this.params.pixelSize);
    }
}
