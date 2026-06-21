import * as THREE from 'three';

export class Player {
    constructor(scene, nickname = "Player") {
        this.scene = scene;
        this.vrm = null;
        this.isMoving = false;
        this.lastMovingState = false;
        this.speed = 3.5;
        this.nickname = nickname;
        this.nameTagSprite = null; 
    }

    createNameTag(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const context = canvas.getContext('2d');

        context.font = 'bold 45px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        context.lineWidth = 6;
        context.strokeStyle = 'black';
        context.strokeText(text, 256, 64);
        
        context.fillStyle = 'white';
        context.fillText(text, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(material);
        
        sprite.position.set(0, 1.9, 0);
        sprite.scale.set(1.5, 0.375, 1);
        
        return sprite;
    }

    updateNickname(newName) {
        this.nickname = newName;
        
        if (this.vrm) {
            if (this.nameTagSprite) {
                this.vrm.scene.remove(this.nameTagSprite);
                this.nameTagSprite.material.map.dispose();
                this.nameTagSprite.material.dispose();
            }
            
            this.nameTagSprite = this.createNameTag(this.nickname);
            this.vrm.scene.add(this.nameTagSprite);
        }
    }

    setVRM(vrm, startPos = { x: 0, y: 0, z: 0 }, rotationY = Math.PI) {
        if (this.vrm) {
            this.scene.remove(this.vrm.scene);
            if (this.nameTagSprite) this.vrm.scene.remove(this.nameTagSprite);
        }
        
        this.vrm = vrm;
        this.vrm.scene.position.set(startPos.x, startPos.y, startPos.z);
        this.vrm.scene.rotation.y = rotationY;
        
        this.nameTagSprite = this.createNameTag(this.nickname);
        this.vrm.scene.add(this.nameTagSprite);

        this.scene.add(this.vrm.scene);
    }

    remove() {
        if (this.vrm) {
            this.scene.remove(this.vrm.scene);
            if (this.nameTagSprite) {
                this.nameTagSprite.material.map.dispose();
                this.nameTagSprite.material.dispose();
            }
        }
    }

    update(delta, t, input = null, cameraAzimuth = 0) {
        if (!this.vrm) return;

        this.vrm.update(delta);

        if (input) {
            this.isMoving = false;
            const moveDir = new THREE.Vector3(0, 0, 0);
            const forward = new THREE.Vector3(-Math.sin(cameraAzimuth), 0, -Math.cos(cameraAzimuth));
            const right = new THREE.Vector3(Math.cos(cameraAzimuth), 0, -Math.sin(cameraAzimuth));

            if (input.keys.w) { moveDir.add(forward); this.isMoving = true; }
            if (input.keys.s) { moveDir.sub(forward); this.isMoving = true; }
            if (input.keys.a) { moveDir.sub(right); this.isMoving = true; }
            if (input.keys.d) { moveDir.add(right); this.isMoving = true; }

            if (this.isMoving) {
                moveDir.normalize();
                const moveStep = moveDir.clone().multiplyScalar(this.speed * delta);
                this.vrm.scene.position.add(moveStep);
                this.vrm.scene.rotation.y = Math.atan2(moveDir.x, moveDir.z) + Math.PI;
            }
        }

        this.applyProceduralAnimation(t);
    }

    applyProceduralAnimation(t) {
        const leftArm = this.vrm.humanoid.getRawBoneNode('leftUpperArm');
        const rightArm = this.vrm.humanoid.getRawBoneNode('rightUpperArm');
        const leftLeg = this.vrm.humanoid.getRawBoneNode('leftUpperLeg');
        const rightLeg = this.vrm.humanoid.getRawBoneNode('rightUpperLeg');
        const spine = this.vrm.humanoid.getRawBoneNode('spine');
        const head = this.vrm.humanoid.getRawBoneNode('head');

        if (this.isMoving) {
            const walkCycle = t * 15; 
            if (leftArm && rightArm && leftLeg && rightLeg) {
                leftArm.quaternion.setFromEuler(new THREE.Euler(Math.sin(walkCycle) * 0.7, 0, 1.0));
                rightArm.quaternion.setFromEuler(new THREE.Euler(-Math.sin(walkCycle) * 0.7, 0, -1.0));
                leftLeg.quaternion.setFromEuler(new THREE.Euler(-Math.sin(walkCycle) * 0.7, 0, 0));
                rightLeg.quaternion.setFromEuler(new THREE.Euler(Math.sin(walkCycle) * 0.7, 0, 0));
            }
            if (spine) spine.quaternion.setFromEuler(new THREE.Euler(0.2, 0, 0)); 
            if (head) head.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
        } else {
            const breath = Math.sin(t * 1.5) * 0.02;
            const headSway = Math.sin(t * 0.7) * 0.05;

            if (leftArm && rightArm) {
                leftArm.quaternion.setFromEuler(new THREE.Euler(0, 0, 1.3 + breath));
                rightArm.quaternion.setFromEuler(new THREE.Euler(0, 0, -1.3 - breath));
            }
            if (leftLeg && rightLeg) {
                leftLeg.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
                rightLeg.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
            }
            if (spine) spine.quaternion.setFromEuler(new THREE.Euler(breath, 0, 0));
            if (head) head.quaternion.setFromEuler(new THREE.Euler(0, headSway, 0));
        }

        let blinkValue = 0;
        const blinkCycle = t % 4;
        if (blinkCycle > 3.8) blinkValue = Math.sin((blinkCycle - 3.8) * Math.PI * 5);
        
        if (this.vrm.expressionManager) this.vrm.expressionManager.setValue('blink', blinkValue);
        else if (this.vrm.blendShapeProxy) this.vrm.blendShapeProxy.setValue('blink', blinkValue);
    }

    getState() {
        return {
            x: this.vrm.scene.position.x,
            y: this.vrm.scene.position.y,
            z: this.vrm.scene.position.z,
            rotationY: this.vrm.scene.rotation.y,
            isMoving: this.isMoving,
            nickname: this.nickname
        };
    }
}