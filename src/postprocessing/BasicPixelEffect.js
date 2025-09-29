/**
 * 最基本的像素化效果实现
 * 使用简单的着色器实现像素化
 */
export class BasicPixelEffect {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // 创建渲染目标
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight
        );
        
        // 创建像素化材质
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
        
        this.scene.add(this.quad);
        
        // 像素化参数
        this.params = {
            pixelSize: 1
        };
        
        this.isPixelMode = true;
        
        console.log('基本像素化效果初始化完成');
    }
    
    render() {
        if (this.isPixelMode) {
            console.log('使用基本像素化渲染');
            // 先渲染到目标
            this.renderer.setRenderTarget(this.renderTarget);
            this.renderer.render(this.scene, this.camera);
            
            // 设置纹理并渲染到屏幕
            this.pixelMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.scene, this.camera);
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
        console.log('基本效果模式切换:', mode);
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
