export class InputManager {
    constructor() {
        this.keys = { w: false, a: false, s: false, d: false };
        this.keyMap = {
            'KeyW': 'w',
            'KeyA': 'a',
            'KeyS': 's',
            'KeyD': 'd'
        };
        this.initListeners();
    }

    initListeners() {
        window.addEventListener('keydown', (e) => {
            const mappedKey = this.keyMap[e.code];
            if (mappedKey) this.keys[mappedKey] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            const mappedKey = this.keyMap[e.code];
            if (mappedKey) this.keys[mappedKey] = false;
        });
    }

    get isMoving() {
        return this.keys.w || this.keys.a || this.keys.s || this.keys.d;
    }
}