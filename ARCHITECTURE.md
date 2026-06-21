# Architecture Documentation

This document provides a technical overview of the VRM Multiplayer Viewer architecture. The project follows a simple Client-Server architecture utilizing Python on the backend and modern JavaScript on the frontend.

## 1. Project Structure
- `index.html`: The entry point for the application. Contains the UI and Three.js import maps.
- `main.js`: The core client-side logic. Handles rendering, animations, camera controls, and socket communication.
- `servers.py`: The asynchronous Python server built with `aiohttp` and `python-socketio`.
- `model.vrm`: The default 3D avatar file loaded on initialization.

## 2. Client-Side (Frontend)
The frontend relies heavily on **Three.js** and **@pixiv/three-vrm** for rendering.

### Initialization & Setup
- An ambient and directional light are added to illuminate the `.vrm` models.
- The `VRMLoaderPlugin` is registered with Three.js's `GLTFLoader` to allow the engine to parse bone structures and blend shapes of the VRM format.

### Camera Controls
- Uses a **PointerLock** strategy (GTA/First-person style). 
- `cameraAzimuth` and `cameraElevation` are mapped to mouse movements `movementX` and `movementY`.
- The camera dynamically follows the local player, using `Math.sin` and `Math.cos` to orbit smoothly around the character's coordinates.

### Procedural Animations (`applyProceduralAnimation`)
Because full physics and motion capture data are expensive over a network, this project utilizes procedural bone rotations:
- **Idle State:** Utilizes sine waves tied to Three.js's clock (`clock.elapsedTime`) to simulate breathing, head swaying, and random blinking.
- **Moving State:** Calculates a walk cycle by shifting the upper arms and upper legs using Euler angles. 

## 3. Multiplayer Logic & Server (`servers.py`)
The backend is an asynchronous server that acts as a message broker.

- **Connection:** When a client joins, the server assigns a unique Socket ID, saves default coordinates (`x`, `y`, `z`, `rotationY`), and broadcasts the `newPlayer` event to others.
- **Movement Loop:** The client evaluates keystrokes (W, A, S, D). If position or rotation changes, or the `isMoving` boolean flips, `main.js` emits a `playerMovement` event to the server.
- **State Synchronization:** The server updates its internal dictionary and immediately broadcasts `playerMoved` to all other clients. The clients then update the transform vectors inside their local `remotePlayers` object.
- **Disconnection:** The server listens for socket drops, removes the player from the dictionary, and emits `playerDisconnected` so clients can safely call `scene.remove()` to clean up the mesh.