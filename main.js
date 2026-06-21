import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

const socket = io();
const remotePlayers = {};
let currentVrm = null;

const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

let isPointerLocked = false;
let cameraAzimuth = Math.PI; 
let cameraElevation = 0.2;   
let cameraRadius = 4;        

renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
    document.getElementById('aim-overlay').style.display = isPointerLocked ? 'block' : 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isPointerLocked) return;
    const sensitivity = 0.003;
    cameraAzimuth -= e.movementX * sensitivity;
    cameraElevation -= e.movementY * sensitivity;
    cameraElevation = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraElevation));
});

document.addEventListener('wheel', (e) => {
    cameraRadius += e.deltaY * 0.01;
    cameraRadius = Math.max(1.5, Math.min(10, cameraRadius)); 
});

const light = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(light);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(3, 5, 3);
scene.add(dirLight);

const gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0x444444);
scene.add(gridHelper);

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

function loadVRM(url, isLocal = true, playerId = null, startInfo = null) {
    loader.load(
        url, 
        (gltf) => {
            const vrm = gltf.userData.vrm;
            scene.add(vrm.scene);
            
            if (isLocal) {
                if (currentVrm) scene.remove(currentVrm.scene);
                currentVrm = vrm;
                vrm.scene.position.set(0, 0, 0);
                vrm.scene.rotation.y = Math.PI; 
                vrm.scene.userData.lastMovingState = false;
                document.getElementById('error-msg').style.display = 'none';
            } else {
                vrm.scene.position.set(startInfo.x, startInfo.y, startInfo.z);
                vrm.scene.rotation.y = startInfo.rotationY;
                vrm.scene.userData.isMoving = startInfo.isMoving || false;
                remotePlayers[playerId] = vrm;
            }
        },
        undefined,
        (error) => {
            if(isLocal) {
                console.error(error);
                document.getElementById('error-msg').style.display = 'block';
            }
        }
    );
}

loadVRM('./model.vrm');

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadVRM(url);
});

socket.on('currentPlayers', (players) => {
    for (let id in players) {
        if (id !== socket.id) {
            loadVRM('./model.vrm', false, id, players[id]);
        }
    }
});

socket.on('newPlayer', (data) => {
    if (data.id !== socket.id) {
        loadVRM('./model.vrm', false, data.id, data.playerInfo);
    }
});

socket.on('playerMoved', (data) => {
    if (remotePlayers[data.id]) {
        remotePlayers[data.id].scene.position.set(data.playerInfo.x, data.playerInfo.y, data.playerInfo.z);
        remotePlayers[data.id].scene.rotation.y = data.playerInfo.rotationY;
        remotePlayers[data.id].scene.userData.isMoving = data.playerInfo.isMoving; 
    }
});

socket.on('playerDisconnected', (id) => {
    if (remotePlayers[id]) {
        scene.remove(remotePlayers[id].scene);
        delete remotePlayers[id];
    }
});

function applyProceduralAnimation(vrm, t, isMoving) {
    const leftArm = vrm.humanoid.getRawBoneNode('leftUpperArm');
    const rightArm = vrm.humanoid.getRawBoneNode('rightUpperArm');
    const leftLeg = vrm.humanoid.getRawBoneNode('leftUpperLeg');
    const rightLeg = vrm.humanoid.getRawBoneNode('rightUpperLeg');
    const spine = vrm.humanoid.getRawBoneNode('spine');
    const head = vrm.humanoid.getRawBoneNode('head');

    if (isMoving) {
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
    if (vrm.expressionManager) vrm.expressionManager.setValue('blink', blinkValue);
    else if (vrm.blendShapeProxy) vrm.blendShapeProxy.setValue('blink', blinkValue);
}

const clock = new THREE.Clock();
const moveSpeed = 3.5;

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const t = clock.elapsedTime;

    for (let id in remotePlayers) {
        const rVrm = remotePlayers[id];
        rVrm.update(delta);
        const isRemoteMoving = rVrm.scene.userData.isMoving === true;
        applyProceduralAnimation(rVrm, t, isRemoteMoving);
    }

    if (currentVrm) {
        currentVrm.update(delta);

        let isMoving = false;
        const moveDir = new THREE.Vector3(0, 0, 0);

        const forward = new THREE.Vector3(-Math.sin(cameraAzimuth), 0, -Math.cos(cameraAzimuth));
        const right = new THREE.Vector3(Math.cos(cameraAzimuth), 0, -Math.sin(cameraAzimuth));

        if (keys.w) { moveDir.add(forward); isMoving = true; }
        if (keys.s) { moveDir.sub(forward); isMoving = true; }
        if (keys.a) { moveDir.sub(right); isMoving = true; }
        if (keys.d) { moveDir.add(right); isMoving = true; }

        if (isMoving) {
            moveDir.normalize();
            const moveStep = moveDir.clone().multiplyScalar(moveSpeed * delta);
            currentVrm.scene.position.add(moveStep);

            const targetRotation = Math.atan2(moveDir.x, moveDir.z) + Math.PI;
            currentVrm.scene.rotation.y = targetRotation;
        }

        if (isMoving || currentVrm.scene.userData.lastMovingState !== isMoving) {
            socket.emit('playerMovement', {
                x: currentVrm.scene.position.x,
                y: currentVrm.scene.position.y,
                z: currentVrm.scene.position.z,
                rotationY: currentVrm.scene.rotation.y,
                isMoving: isMoving
            });
            currentVrm.scene.userData.lastMovingState = isMoving;
        }

        applyProceduralAnimation(currentVrm, t, isMoving);

        const targetPos = currentVrm.scene.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        camera.position.x = targetPos.x + cameraRadius * Math.sin(cameraAzimuth) * Math.cos(cameraElevation);
        camera.position.y = targetPos.y + cameraRadius * Math.sin(cameraElevation);
        camera.position.z = targetPos.z + cameraRadius * Math.cos(cameraAzimuth) * Math.cos(cameraElevation);
        camera.lookAt(targetPos);
    }

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});