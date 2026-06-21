export class InputManager {
    constructor() {
        this.keys = { w: false, a: false, s: false, d: false };
        this.initListeners();
    }

    initListeners() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = true;
        });
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) this.keys[key] = false;
        });
    }

    get isMoving() {
        return this.keys.w || this.keys.a || this.keys.s || this.keys.d;
    }
}