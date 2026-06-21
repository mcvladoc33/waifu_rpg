import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

import { InputManager } from './InputManager.js';
import { CameraController } from './CameraController.js';
import { Player } from './Player.js';

class GameApp {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        
        this.inputManager = new InputManager();
        this.cameraController = new CameraController(this.camera, this.renderer.domElement);
        
        const initialNickname = document.getElementById('nicknameInput').value;
        this.localPlayer = new Player(this.scene, initialNickname);
        this.remotePlayers = {}; 

        this.socket = io();

        this.setupEnvironment();
        this.setupLoaders();
        this.setupNetworking();
        this.setupUI();

        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        this.animate = this.animate.bind(this);
        this.animate();
    }

    setupEnvironment() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(3, 5, 3);
        this.scene.add(dirLight);

        const gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0x444444);
        this.scene.add(gridHelper);
    }

    setupLoaders() {
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
        this.loadVRMModel('./assets/model.vrm', true);
    }

    loadVRMModel(url, isLocal = true, playerId = null, startInfo = null) {
        this.gltfLoader.load(
            url,
            (gltf) => {
                const vrm = gltf.userData.vrm;
                
                if (isLocal) {
                    this.localPlayer.setVRM(vrm);
                    document.getElementById('error-msg').style.display = 'none';
                    this.socket.emit('playerMovement', this.localPlayer.getState());
                } else {
                    const nickname = (startInfo && startInfo.nickname) ? startInfo.nickname : "Unknown";
                    const rPlayer = new Player(this.scene, nickname);
                    rPlayer.setVRM(vrm, startInfo, startInfo.rotationY);
                    rPlayer.isMoving = startInfo.isMoving || false;
                    this.remotePlayers[playerId] = rPlayer;
                }
            },
            undefined,
            (error) => {
                if (isLocal) {
                    console.error(error);
                    document.getElementById('error-msg').style.display = 'block';
                }
            }
        );
    }

    setupNetworking() {
        this.socket.on('currentPlayers', (players) => {
            for (let id in players) {
                                if (id !== this.socket.id) this.loadVRMModel('./assets/model.vrm', false, id, players[id]);
            }
        });

        this.socket.on('newPlayer', (data) => {
            if (data.id !== this.socket.id) this.loadVRMModel('./assets/model.vrm', false, data.id, data.playerInfo);
        });

        this.socket.on('playerMoved', (data) => {
            const rPlayer = this.remotePlayers[data.id];
            if (rPlayer && rPlayer.vrm) {
                rPlayer.vrm.scene.position.set(data.playerInfo.x, data.playerInfo.y, data.playerInfo.z);
                rPlayer.vrm.scene.rotation.y = data.playerInfo.rotationY;
                rPlayer.isMoving = data.playerInfo.isMoving;
                
                if (data.playerInfo.nickname && data.playerInfo.nickname !== rPlayer.nickname) {
                    rPlayer.updateNickname(data.playerInfo.nickname);
                }
            }
        });

        this.socket.on('playerDisconnected', (id) => {
            if (this.remotePlayers[id]) {
                this.remotePlayers[id].remove();
                delete this.remotePlayers[id];
            }
        });
    }

    setupUI() {
        document.getElementById('fileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            this.loadVRMModel(url, true);
        });

        const nicknameInput = document.getElementById('nicknameInput');
        nicknameInput.addEventListener('input', (e) => {
            const newName = e.target.value || "Гравець";
            this.localPlayer.updateNickname(newName);
            
            if (this.localPlayer.vrm) {
                this.socket.emit('playerMovement', this.localPlayer.getState());
            }
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate);
        
        const delta = this.clock.getDelta();
        const t = this.clock.elapsedTime;

        for (let id in this.remotePlayers) {
            this.remotePlayers[id].update(delta, t);
        }

        if (this.localPlayer.vrm) {
            this.localPlayer.update(delta, t, this.inputManager, this.cameraController.azimuth);

            if (this.localPlayer.isMoving || this.localPlayer.lastMovingState !== this.localPlayer.isMoving) {
                this.socket.emit('playerMovement', this.localPlayer.getState());
                this.localPlayer.lastMovingState = this.localPlayer.isMoving;
            }

            const targetPos = this.localPlayer.vrm.scene.position.clone().add(new THREE.Vector3(0, 1.2, 0));
            this.cameraController.updatePosition(targetPos);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

const app = new GameApp();