// 使用新的复合 Scene（内部组合管理器，保持行为不变）
import { SaturnRingScene } from './core/Scene.js';

window.addEventListener('load', () => {
    const startTime = performance.now();
    const scene = new SaturnRingScene();
    const onReady = () => {
        const elapsed = performance.now() - startTime;
        const minDuration = 2000;
        const remaining = Math.max(0, minDuration - elapsed);
        setTimeout(() => {
            const loader = document.getElementById('loading-screen');
            if (loader) loader.classList.add('fade-out');
        }, remaining);
        document.removeEventListener('scene-ready', onReady);
    };
    document.addEventListener('scene-ready', onReady);
    if (scene.saturnTextureLoaded && scene.starFragmentsReady) {
        onReady();
    }
});


