export class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        this.isPointerLocked = false;
        this.azimuth = Math.PI; 
        this.elevation = 0.2;   
        this.radius = 4;        

        this.initListeners();
    }
і
    initListeners() {
        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.domElement;
            document.getElementById('aim-overlay').style.display = this.isPointerLocked ? 'block' : 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isPointerLocked) return;
            const sensitivity = 0.003;
            
            this.azimuth -= e.movementX * sensitivity;
            
            this.elevation += e.movementY * sensitivity; 
            
            this.elevation = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.elevation));
        });

        document.addEventListener('wheel', (e) => {
            this.radius += e.deltaY * 0.01;
            this.radius = Math.max(1.5, Math.min(10, this.radius)); 
        });
    }

    updatePosition(targetPos) {
        this.camera.position.x = targetPos.x + this.radius * Math.sin(this.azimuth) * Math.cos(this.elevation);
        this.camera.position.y = targetPos.y + this.radius * Math.sin(this.elevation);
        this.camera.position.z = targetPos.z + this.radius * Math.cos(this.azimuth) * Math.cos(this.elevation);
        this.camera.lookAt(targetPos);
    }
}