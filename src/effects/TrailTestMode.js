/**
 * 拖尾效果测试模式
 * 增强星星碎片的移动速度，让拖尾效果更明显
 */
export class TrailTestMode {
    constructor(scene) {
        this.scene = scene;
        this.originalRotationSpeed = null;
        this.originalFragmentSpeed = null;
        this.isActive = false;
        this.speedMultiplier = 10; // 默认10倍速度
    }
    
    /**
     * 启用拖尾测试模式
     */
    enable() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // 增强星星碎片的发光效果
        this.enhanceFragmentBrightness();
        
        console.log(`拖尾测试模式已启用 - 星星碎片旋转速度提升${this.speedMultiplier}倍`);
    }
    
    /**
     * 禁用拖尾测试模式
     */
    disable() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // 恢复原始发光效果
        this.restoreFragmentBrightness();
        
        console.log('拖尾测试模式已禁用');
    }
    
    /**
     * 增强星星碎片亮度和缩小体积
     */
    enhanceFragmentBrightness() {
        if (!Array.isArray(this.scene.starFragments)) return;
        
        this.scene.starFragments.forEach(fragment => {
            if (fragment.material && fragment.material.emissiveIntensity !== undefined) {
                fragment.material.emissiveIntensity = 1.5; // 大幅增加发光强度，让拖尾更明显
                fragment.material.opacity = 1.0; // 完全不透明
                // 增加自发光，让星星更亮
                fragment.material.emissive = fragment.material.color;
            }
            
            // 缩小星星碎片体积到原来的1/10
            if (fragment.userData && fragment.userData.originalScale) {
                fragment.scale.setScalar(0.1); // 缩小到1/10
            }
        });
    }
    
    /**
     * 恢复星星碎片原始亮度和体积
     */
    restoreFragmentBrightness() {
        if (!Array.isArray(this.scene.starFragments)) return;
        
        this.scene.starFragments.forEach(fragment => {
            if (fragment.material && fragment.material.emissiveIntensity !== undefined) {
                fragment.material.emissiveIntensity = 0.3; // 恢复原始发光强度
                fragment.material.opacity = 0.9; // 恢复原始透明度
            }
            
            // 恢复星星碎片原始体积
            if (fragment.userData && fragment.userData.originalScale) {
                fragment.scale.setScalar(1.0); // 恢复原始大小
            }
        });
    }
    
    
    /**
     * 设置速度倍数
     * @param {number} multiplier - 速度倍数
     */
    setSpeedMultiplier(multiplier) {
        this.speedMultiplier = Math.max(1, multiplier); // 确保至少是1倍速度
        
        // 如果当前是激活状态，速度会自动通过getter应用
        console.log(`拖尾测试模式速度倍数设置为: ${this.speedMultiplier}x`);
    }
    
    /**
     * 获取当前速度倍数
     * @returns {number} 当前速度倍数
     */
    getSpeedMultiplier() {
        return this.speedMultiplier;
    }
    
    /**
     * 切换拖尾测试模式
     */
    toggle() {
        if (this.isActive) {
            this.disable();
        } else {
            this.enable();
        }
    }
}
