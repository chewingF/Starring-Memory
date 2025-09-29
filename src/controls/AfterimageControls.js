/**
 * 拖尾效果控制器
 * 处理拖尾效果的用户界面控制
 */
export class AfterimageControls {
    constructor(scene) {
        this.scene = scene;
        this.afterimageEffect = null;
        this.init();
    }
    
    init() {
        // 等待拖尾效果初始化完成
        this.waitForAfterimageEffect();
        
        // 绑定控制面板事件
        this.bindControls();
    }
    
    /**
     * 等待拖尾效果初始化完成
     */
    waitForAfterimageEffect() {
        const checkAfterimageEffect = () => {
            if (this.scene.afterimageEffect) {
                this.afterimageEffect = this.scene.afterimageEffect;
                console.log('拖尾效果控制器已连接');
                return true;
            }
            return false;
        };
        
        if (checkAfterimageEffect()) return;
        
        // 等待拖尾效果初始化
        const maxRetries = 50;
        let retries = 0;
        
        const waitForEffect = () => {
            if (checkAfterimageEffect() || retries >= maxRetries) {
                if (retries >= maxRetries) {
                    console.warn('拖尾效果初始化超时');
                }
                return;
            }
            
            retries++;
            setTimeout(waitForEffect, 100);
        };
        
        waitForEffect();
    }
    
    /**
     * 绑定控制面板事件
     */
    bindControls() {
        // 模式切换事件
        const modeSelect = document.getElementById('postProcessingMode');
        if (modeSelect) {
            modeSelect.addEventListener('change', (e) => {
                this.handleModeChange(e.target.value);
            });
            
            // 默认显示拖尾效果控制面板
            this.handleModeChange('afterimage');
        }
        
        // 拖尾停留时间控制
        const dampSlider = document.getElementById('afterimageDamp');
        const dampValue = document.getElementById('afterimageDampValue');
        if (dampSlider && dampValue) {
            dampSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                
                // 显示更直观的停留时间描述
                let timeDescription = '';
                if (value < 0.8) {
                    timeDescription = '很短';
                } else if (value < 0.85) {
                    timeDescription = '短';
                } else if (value < 0.9) {
                    timeDescription = '中等';
                } else if (value < 0.95) {
                    timeDescription = '长';
                } else if (value < 0.98) {
                    timeDescription = '很长';
                } else {
                    timeDescription = '超长';
                }
                
                dampValue.textContent = timeDescription;
                
                if (this.afterimageEffect) {
                    this.afterimageEffect.setDamp(value);
                }
            });
        }
        
        // 拖尾强度控制
        const strengthSlider = document.getElementById('afterimageStrength');
        const strengthValue = document.getElementById('afterimageStrengthValue');
        if (strengthSlider && strengthValue) {
            strengthSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                strengthValue.textContent = value.toFixed(2);
                if (this.afterimageEffect) {
                    this.afterimageEffect.updateParams({ 
                        damp: this.afterimageEffect.params.damp * value 
                    });
                }
            });
        }
        
        // 速度倍数控制
        const speedMultiplierSlider = document.getElementById('trailSpeedMultiplier');
        const speedMultiplierValue = document.getElementById('trailSpeedMultiplierValue');
        if (speedMultiplierSlider && speedMultiplierValue) {
            speedMultiplierSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                speedMultiplierValue.textContent = value + 'x';
                if (this.scene.trailTestMode) {
                    this.scene.trailTestMode.setSpeedMultiplier(value);
                }
            });
        }
        
        // 拖尾测试模式按钮
        const trailTestToggle = document.getElementById('trailTestToggle');
        if (trailTestToggle) {
            // 设置初始状态为已启用
            const updateButtonState = () => {
                if (this.scene.trailTestMode) {
                    const isActive = this.scene.trailTestMode.isActive;
                    const speed = this.scene.trailTestMode.getSpeedMultiplier();
                    trailTestToggle.textContent = isActive ? `拖尾测试模式 (已启用 ${speed}x)` : `拖尾测试模式 (加速旋转)`;
                    trailTestToggle.style.background = isActive ? 'rgba(107,255,107,0.2)' : 'rgba(255,107,107,0.2)';
                    trailTestToggle.style.borderColor = isActive ? '#6bff6b' : '#ff6b6b';
                    trailTestToggle.style.color = isActive ? '#6bff6b' : '#ff6b6b';
                }
            };
            
            // 延迟更新按钮状态，确保拖尾测试模式已初始化
            setTimeout(updateButtonState, 1500);
            
            trailTestToggle.addEventListener('click', () => {
                if (this.scene.trailTestMode) {
                    this.scene.trailTestMode.toggle();
                    updateButtonState();
                }
            });
        }
    }
    
    /**
     * 处理模式切换
     * @param {string} mode - 模式名称
     */
    handleModeChange(mode) {
        // 隐藏所有控制面板
        this.hideAllControls();
        
        // 显示对应的控制面板
        if (mode === 'pixel') {
            this.showPixelControls();
        } else if (mode === 'afterimage') {
            this.showAfterimageControls();
        }
        
        // 当切换到非拖尾模式时，自动关闭拖尾测试模式
        if (mode !== 'afterimage' && this.scene.trailTestMode && this.scene.trailTestMode.isActive) {
            this.scene.trailTestMode.disable();
            console.log('已自动关闭拖尾测试模式');
        }
        
        console.log('切换到模式:', mode);
    }
    
    /**
     * 隐藏所有控制面板
     */
    hideAllControls() {
        const controls = [
            'pixelControls', 'pixelControls2', 'pixelControls3',
            'afterimageControls', 'afterimageControls2', 'afterimageControls3', 'afterimageControls4'
        ];
        
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    }
    
    /**
     * 显示像素控制面板
     */
    showPixelControls() {
        const controls = ['pixelControls', 'pixelControls2', 'pixelControls3'];
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'block';
            }
        });
    }
    
    /**
     * 显示拖尾效果控制面板
     */
    showAfterimageControls() {
        const controls = ['afterimageControls', 'afterimageControls2', 'afterimageControls3', 'afterimageControls4'];
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'block';
            }
        });
    }
}
