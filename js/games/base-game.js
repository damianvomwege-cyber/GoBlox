export class BaseGame {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        this.running = false;
        this.score = 0;
        this.gameOver = false;
        this.animationFrame = null;
        this.keys = {};
        this.lastTime = 0;

        // Input handlers bound to this instance for clean add/remove
        this._onKeyDown = (e) => { this.keys[e.key] = true; this.onKeyDown(e.key); };
        this._onKeyUp = (e) => { this.keys[e.key] = false; this.onKeyUp(e.key); };
        this._onClick = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.onClick(e.clientX - rect.left, e.clientY - rect.top);
        };
        this._onMouseMove = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.onMouseMove(e.clientX - rect.left, e.clientY - rect.top);
        };
    }

    start() {
        this.running = true;
        this.gameOver = false;
        this.score = 0;
        this.lastTime = performance.now();

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        this.canvas.addEventListener('click', this._onClick);
        this.canvas.addEventListener('mousemove', this._onMouseMove);

        this.init();
        this.loop(performance.now());
    }

    stop() {
        this.running = false;
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        this.canvas.removeEventListener('click', this._onClick);
        this.canvas.removeEventListener('mousemove', this._onMouseMove);
    }

    loop(timestamp) {
        if (!this.running) return;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        if (!this.gameOver) {
            this.update(dt);
        }
        this.render();
        this.animationFrame = requestAnimationFrame((t) => this.loop(t));
    }

    endGame() {
        this.gameOver = true;
        this.onGameOver(this.score);
    }

    // Override in subclasses
    init() {}
    update(dt) {}
    render() {}
    onKeyDown(key) {}
    onKeyUp(key) {}
    onClick(x, y) {}
    onMouseMove(x, y) {}
    onGameOver(score) {}
}
