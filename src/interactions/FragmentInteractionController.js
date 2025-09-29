export class FragmentInteractionController {
    constructor(scene) {
        this.scene = scene;
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (typeof this.scene.setupEventListeners === 'function') {
            // 如果基类里已经绑定，这里避免重复绑定
            return;
        }
        const onPointer = (event) => {
            const rect = this.scene.renderer.domElement.getBoundingClientRect();
            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;
            this.scene.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            this.scene.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            this.scene.raycaster.setFromCamera(this.scene.mouse, this.scene.camera);
            const intersects = this.scene.raycaster.intersectObjects(this.scene.starFragments);
            if (intersects.length > 0) {
                const fragment = intersects[0].object;
                if (!fragment.userData.isClicked) {
                    if (typeof this.scene.onFragmentClick === 'function') {
                        this.scene.onFragmentClick(fragment);
                    }
                } else {
                    if (typeof this.scene.onFragmentReset === 'function') {
                        this.scene.onFragmentReset(fragment);
                    }
                }
            } else {
                if (typeof this.scene.closePhoto === 'function') {
                    this.scene.closePhoto();
                }
            }
        };
        this.scene.renderer.domElement.addEventListener('click', onPointer);
        this.scene.renderer.domElement.addEventListener('touchstart', onPointer, { passive: true });
        window.addEventListener('resize', () => {
            this.scene.camera.aspect = window.innerWidth / window.innerHeight;
            this.scene.camera.updateProjectionMatrix();
            this.scene.renderer.setSize(window.innerWidth, window.innerHeight);
            if (this.scene.backgroundManager) this.scene.backgroundManager.onResize();
        });
    }
}


