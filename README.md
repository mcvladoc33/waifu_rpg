# VRM Viewer GTA Style Multiplayer

A web-based, multiplayer 3D character viewer using Three.js, `@pixiv/three-vrm`, and Python. This project features GTA-style camera controls (PointerLock) and real-time multiplayer synchronization using Socket.IO.

## Features

* **3D VRM Support:** Load and view any `.vrm` 3D anime-style avatars.
* **GTA-Style Controls:** First-person/Third-person hybrid camera with crosshair targeting.
* **Real-time Multiplayer:** See other users move and rotate their avatars in real-time.
* **Procedural Animations:** Idle breathing, blinking, and dynamic walking animations.
* **Custom Model Loading:** Upload your own `.vrm` files directly via the browser interface.

## Project Structure

* `index.html` - The frontend client (Three.js, Socket.IO client, UI).
* `servers.py` - The backend server (Python, aiohttp, Socket.IO server).
* `requirements.txt` - Python dependencies.
* `model.vrm` - The default 3D avatar (make sure to place your own `model.vrm` in the root directory).

## Prerequisites

Make sure you have [Python 3.8+](https://www.python.org/downloads/) installed on your system.

## Installation & Running

Follow these steps to run the application locally:

1. **Clone the repository** (or download the project folder) and navigate to it in your terminal.

2. **Create a virtual environment:**
   ```bash
   python -m venv venv

```

3. **Activate the virtual environment:**
* On Windows:
```bash
venv\Scripts\activate

```


* On macOS / Linux:
```bash
source venv/bin/activate

```


4. **Install the required dependencies:**
```bash
pip install -r requirements.txt

```


5. **Run the server:**
```bash
python servers.py

```


*Note: If the server fails to bind to port 80 due to permission issues, change `port=80` to `port=8080` in `servers.py` and run it again.*
6. **Open the App:**
Open your web browser and go to `http://localhost` (or `http://localhost:8080` if you changed the port). Open multiple tabs or browsers to test the multiplayer functionality!

## Controls

* **Click on the screen** to lock the pointer and enable mouse look.
* **W, A, S, D** to move the character.
* **Scroll Wheel** to zoom the camera in and out.
* **ESC** to release the mouse cursor.

```

```