// 使用新的复合 Scene（内部组合管理器，保持行为不变）
import { SaturnRingScene } from './core/Scene.js';

window.addEventListener('load', () => {
    const startTime = performance.now();
    const scene = new SaturnRingScene();
    
    // 恋爱天数进度逻辑
    const dayCountElement = document.getElementById('day-count');
    const loveCounterElement = document.getElementById('love-counter');
    const anniversaryMessageElement = document.getElementById('anniversary-message');
    
    // 最小显示时间（2秒）
    const minDisplayTime = 2000;
    let displayStartTime = performance.now();
    let isDisplayComplete = false;
    let isReadyToContinue = false;
    let hasUserClicked = false;
    
    // 开始1-365天的倒计时显示
    const startLoveCountdown = () => {
        let currentDay = 1;
        const maxDays = 365;
        const updateInterval = 2000 / maxDays; // 2秒内完成365天的显示
        
        const updateCounter = () => {
            if (currentDay <= maxDays) {
                dayCountElement.textContent = currentDay;
                currentDay++;
                setTimeout(updateCounter, updateInterval);
            } else {
                // 365天后停顿0.1秒
                setTimeout(() => {
                    // 渐隐恋爱天数
                    loveCounterElement.style.transition = 'opacity 0.3s ease-out';
                    loveCounterElement.style.opacity = '0';
                    
                    // 0.3秒后显示一周年达成消息（带渐显效果）
                    setTimeout(() => {
                        loveCounterElement.style.display = 'none';
                        anniversaryMessageElement.style.display = 'block';
                        anniversaryMessageElement.classList.add('anniversary-fade-in');
                        isDisplayComplete = true;
                        isReadyToContinue = true;
                    }, 300);
                }, 100);
            }
        };
        updateCounter();
    };
    
    // 切换场景的函数
    const fadeOutToScene = () => {
        const loader = document.getElementById('loading-screen');
        if (loader) loader.classList.add('fade-out');
    };
    
    // 添加点击事件监听
    const handleUserClick = () => {
        if (isReadyToContinue && !hasUserClicked) {
            hasUserClicked = true;
            fadeOutToScene();
        }
    };
    
    // 监听点击和触摸事件
    document.addEventListener('click', handleUserClick);
    document.addEventListener('touchstart', handleUserClick);
    
    // 立即开始倒计时显示
    startLoveCountdown();
    
    const onReady = () => {
        const elapsed = performance.now() - startTime;
        const minDuration = 2000;
        const remaining = Math.max(0, minDuration - elapsed);
        
        // 等待倒计时显示完成或最小时间到达
        const checkDisplayComplete = () => {
            const displayElapsed = performance.now() - displayStartTime;
            if (isDisplayComplete || displayElapsed >= minDisplayTime) {
                // 不再自动切换，等待用户点击
                // 这里不做任何操作，让用户手动点击
            } else {
                setTimeout(checkDisplayComplete, 100);
            }
        };
        
        setTimeout(() => {
            checkDisplayComplete();
        }, remaining);
        
        document.removeEventListener('scene-ready', onReady);
    };
    document.addEventListener('scene-ready', onReady);
    if (scene.saturnTextureLoaded && scene.starFragmentsReady) {
        onReady();
    }
});


