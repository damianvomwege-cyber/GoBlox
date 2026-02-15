import { BaseGame } from '../base-game.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';

// ── Seeded PRNG ─────────────────────────────────────────────────────────
function mulberry32(seed) {
    let s = seed | 0;
    return function () {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ── Themes ──────────────────────────────────────────────────────────────
const themes = [
    { name: 'Classic',   primary: '#4caf50', secondary: '#81c784', bg: '#1b2631', food: '#f44336', grid: '#263238' },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', food: '#ff006e', grid: '#161650' },
    { name: 'Ocean',     primary: '#00b4d8', secondary: '#90e0ef', bg: '#03045e', food: '#ffbe0b', grid: '#0a0a5e' },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', food: '#ff0000', grid: '#2a1a00' },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', food: '#00ff7f', grid: '#3b0022' },
    { name: 'Matrix',    primary: '#00ff00', secondary: '#33ff33', bg: '#000a00', food: '#ffffff', grid: '#001a00' },
];

// ── Direction vectors ───────────────────────────────────────────────────
const DIR = {
    UP:    { x:  0, y: -1 },
    DOWN:  { x:  0, y:  1 },
    LEFT:  { x: -1, y:  0 },
    RIGHT: { x:  1, y:  0 },
};

// ── SnakeGame ───────────────────────────────────────────────────────────
class SnakeGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.gridSize = cfg.gridSize;
        this.wallMode = cfg.wallMode;
        this.hasPowerUps = cfg.powerUps;
        this.rng = mulberry32(cfg.seed || 1);

        // Speed: steps per second
        const speedMap = { slow: 5, medium: 8, fast: 12, insane: 18 };
        this.stepsPerSecond = speedMap[cfg.speed] || 8;
        this.moveTimer = 0;

        // Calculate cell size from canvas
        const W = this.canvas.width;
        const H = this.canvas.height;
        this.cellSize = Math.floor(Math.min(W, H) / this.gridSize);
        this.offsetX = Math.floor((W - this.cellSize * this.gridSize) / 2);
        this.offsetY = Math.floor((H - this.cellSize * this.gridSize) / 2);

        // Snake body (array of {x, y} grid positions, head at [0])
        const midX = Math.floor(this.gridSize / 2);
        const midY = Math.floor(this.gridSize / 2);
        this.snake = [
            { x: midX, y: midY },
            { x: midX - 1, y: midY },
            { x: midX - 2, y: midY },
        ];
        this.direction = DIR.RIGHT;
        this.nextDirection = DIR.RIGHT;
        this.growing = 0;

        // Food
        this.food = null;
        this.spawnFood();

        // Power-ups
        this.powerUp = null;
        this.powerUpTimer = 0;
        this.activeEffect = null; // { type, remaining }
        this.effectTimer = 0;

        // Score multiplier (from power-ups)
        this.scoreMultiplier = 1;

        // Trail particles
        this.particles = [];
    }

    spawnFood() {
        const occupied = new Set();
        for (const seg of this.snake) {
            occupied.add(`${seg.x},${seg.y}`);
        }
        let x, y;
        let tries = 0;
        do {
            x = Math.floor(this.rng() * this.gridSize);
            y = Math.floor(this.rng() * this.gridSize);
            tries++;
        } while (occupied.has(`${x},${y}`) && tries < 500);
        this.food = { x, y };
    }

    spawnPowerUp() {
        if (!this.hasPowerUps || this.powerUp) return;
        if (this.rng() > 0.15) return; // 15% chance after eating

        const occupied = new Set();
        for (const seg of this.snake) occupied.add(`${seg.x},${seg.y}`);
        if (this.food) occupied.add(`${this.food.x},${this.food.y}`);

        let x, y, tries = 0;
        do {
            x = Math.floor(this.rng() * this.gridSize);
            y = Math.floor(this.rng() * this.gridSize);
            tries++;
        } while (occupied.has(`${x},${y}`) && tries < 500);

        const type = this.rng() > 0.5 ? 'speed' : 'multiplier';
        this.powerUp = { x, y, type };
        this.powerUpTimer = 8; // disappears after 8 seconds
    }

    update(dt) {
        // Power-up timer
        if (this.powerUp) {
            this.powerUpTimer -= dt;
            if (this.powerUpTimer <= 0) {
                this.powerUp = null;
            }
        }

        // Active effect timer
        if (this.activeEffect) {
            this.activeEffect.remaining -= dt;
            if (this.activeEffect.remaining <= 0) {
                if (this.activeEffect.type === 'speed') {
                    this.stepsPerSecond = this.activeEffect.originalSpeed;
                } else if (this.activeEffect.type === 'multiplier') {
                    this.scoreMultiplier = 1;
                }
                this.activeEffect = null;
            }
        }

        // Movement timer
        this.moveTimer += dt;
        const stepInterval = 1 / this.stepsPerSecond;
        if (this.moveTimer < stepInterval) return;
        this.moveTimer -= stepInterval;

        // Commit direction change
        this.direction = this.nextDirection;

        // Calculate new head position
        const head = this.snake[0];
        let nx = head.x + this.direction.x;
        let ny = head.y + this.direction.y;

        // Wall handling
        if (this.wallMode === 'wrap') {
            nx = ((nx % this.gridSize) + this.gridSize) % this.gridSize;
            ny = ((ny % this.gridSize) + this.gridSize) % this.gridSize;
        } else {
            // die on wall
            if (nx < 0 || nx >= this.gridSize || ny < 0 || ny >= this.gridSize) {
                this.endGame();
                return;
            }
        }

        // Self collision (skip last segment if not growing, since tail moves)
        const checkLength = this.growing > 0 ? this.snake.length : this.snake.length - 1;
        for (let i = 0; i < checkLength; i++) {
            if (this.snake[i].x === nx && this.snake[i].y === ny) {
                this.endGame();
                return;
            }
        }

        // Move
        this.snake.unshift({ x: nx, y: ny });
        if (this.growing > 0) {
            this.growing--;
        } else {
            this.snake.pop();
        }

        // Check food
        if (this.food && nx === this.food.x && ny === this.food.y) {
            this.score += 10 * this.scoreMultiplier;
            this.growing += 1;
            this.spawnFood();
            this.spawnPowerUp();

            // Eat particles
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: this.food.x * this.cellSize + this.offsetX + this.cellSize / 2,
                    y: this.food.y * this.cellSize + this.offsetY + this.cellSize / 2,
                    vx: (Math.random() - 0.5) * 120,
                    vy: (Math.random() - 0.5) * 120,
                    life: 0.4,
                    maxLife: 0.4,
                    color: this.theme.food,
                });
            }
        }

        // Check power-up
        if (this.powerUp && nx === this.powerUp.x && ny === this.powerUp.y) {
            if (this.powerUp.type === 'speed') {
                const origSpeed = this.stepsPerSecond;
                this.stepsPerSecond = Math.floor(this.stepsPerSecond * 1.5);
                this.activeEffect = { type: 'speed', remaining: 5, originalSpeed: origSpeed };
            } else if (this.powerUp.type === 'multiplier') {
                this.scoreMultiplier = 3;
                this.activeEffect = { type: 'multiplier', remaining: 6 };
            }
            this.powerUp = null;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * stepInterval;
            p.y += p.vy * stepInterval;
            p.life -= stepInterval;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    onKeyDown(key) {
        if (this.gameOver) return;
        const d = this.direction;
        switch (key) {
            case 'ArrowUp':    case 'w': case 'W':
                if (d !== DIR.DOWN)  this.nextDirection = DIR.UP;    break;
            case 'ArrowDown':  case 's': case 'S':
                if (d !== DIR.UP)    this.nextDirection = DIR.DOWN;  break;
            case 'ArrowLeft':  case 'a': case 'A':
                if (d !== DIR.RIGHT) this.nextDirection = DIR.LEFT;  break;
            case 'ArrowRight': case 'd': case 'D':
                if (d !== DIR.LEFT)  this.nextDirection = DIR.RIGHT; break;
        }
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;
        const cs = this.cellSize;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Grid
        ctx.strokeStyle = t.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= this.gridSize; i++) {
            const x = this.offsetX + i * cs;
            const y = this.offsetY + i * cs;
            ctx.beginPath();
            ctx.moveTo(x, this.offsetY);
            ctx.lineTo(x, this.offsetY + this.gridSize * cs);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.offsetX, y);
            ctx.lineTo(this.offsetX + this.gridSize * cs, y);
            ctx.stroke();
        }

        // Grid border
        ctx.strokeStyle = t.primary + '60';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.offsetX, this.offsetY, this.gridSize * cs, this.gridSize * cs);

        // Food
        if (this.food) {
            const fx = this.offsetX + this.food.x * cs + cs / 2;
            const fy = this.offsetY + this.food.y * cs + cs / 2;
            const fr = cs * 0.38;

            // Glow
            ctx.fillStyle = t.food + '30';
            ctx.beginPath();
            ctx.arc(fx, fy, fr * 1.6, 0, Math.PI * 2);
            ctx.fill();

            // Food circle
            ctx.fillStyle = t.food;
            ctx.beginPath();
            ctx.arc(fx, fy, fr, 0, Math.PI * 2);
            ctx.fill();

            // Shine
            ctx.fillStyle = '#ffffff50';
            ctx.beginPath();
            ctx.arc(fx - fr * 0.25, fy - fr * 0.25, fr * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Power-up
        if (this.powerUp) {
            const px = this.offsetX + this.powerUp.x * cs + cs / 2;
            const py = this.offsetY + this.powerUp.y * cs + cs / 2;
            const pr = cs * 0.35;

            const puColor = this.powerUp.type === 'speed' ? '#ffff00' : '#ff00ff';
            ctx.fillStyle = puColor + '40';
            ctx.beginPath();
            ctx.arc(px, py, pr * 1.8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = puColor;
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();

            // Icon
            ctx.fillStyle = '#000';
            ctx.font = `bold ${Math.floor(cs * 0.45)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.powerUp.type === 'speed' ? 'S' : 'X', px, py);
        }

        // Snake body
        for (let i = this.snake.length - 1; i >= 0; i--) {
            const seg = this.snake[i];
            const sx = this.offsetX + seg.x * cs;
            const sy = this.offsetY + seg.y * cs;
            const pad = 1;

            if (i === 0) {
                // Head — brighter
                ctx.fillStyle = t.primary;
                ctx.beginPath();
                ctx.roundRect(sx + pad, sy + pad, cs - pad * 2, cs - pad * 2, cs * 0.25);
                ctx.fill();

                // Eyes
                const eyeSize = cs * 0.15;
                const eyeOff = cs * 0.22;
                ctx.fillStyle = t.bg;
                let ex1, ey1, ex2, ey2;
                if (this.direction === DIR.RIGHT) {
                    ex1 = sx + cs * 0.65; ey1 = sy + cs * 0.28;
                    ex2 = sx + cs * 0.65; ey2 = sy + cs * 0.65;
                } else if (this.direction === DIR.LEFT) {
                    ex1 = sx + cs * 0.25; ey1 = sy + cs * 0.28;
                    ex2 = sx + cs * 0.25; ey2 = sy + cs * 0.65;
                } else if (this.direction === DIR.UP) {
                    ex1 = sx + cs * 0.28; ey1 = sy + cs * 0.25;
                    ex2 = sx + cs * 0.65; ey2 = sy + cs * 0.25;
                } else {
                    ex1 = sx + cs * 0.28; ey1 = sy + cs * 0.65;
                    ex2 = sx + cs * 0.65; ey2 = sy + cs * 0.65;
                }
                ctx.beginPath();
                ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Body — gradient from secondary to darker
                const frac = i / this.snake.length;
                ctx.globalAlpha = 1 - frac * 0.3;
                ctx.fillStyle = t.secondary;
                ctx.beginPath();
                ctx.roundRect(sx + pad, sy + pad, cs - pad * 2, cs - pad * 2, cs * 0.2);
                ctx.fill();

                // Inner highlight
                ctx.fillStyle = t.primary + '30';
                const inPad = cs * 0.2;
                ctx.beginPath();
                ctx.roundRect(sx + inPad, sy + inPad, cs - inPad * 2, cs - inPad * 2, cs * 0.12);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // HUD - Score
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        // Active effect indicator
        if (this.activeEffect) {
            const label = this.activeEffect.type === 'speed' ? 'SPEED BOOST' : 'x3 SCORE';
            const remaining = Math.ceil(this.activeEffect.remaining);
            ctx.fillStyle = this.activeEffect.type === 'speed' ? '#ffff00' : '#ff00ff';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${label} ${remaining}s`, W - 12, 12);
        }

        // Wall mode indicator
        ctx.fillStyle = t.secondary + '80';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this.wallMode === 'wrap' ? 'Walls: Wrap' : 'Walls: Solid', 12, 38);

        // Instructions at start
        if (this.score === 0) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Arrow keys / WASD to move', W / 2, H - 12);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', W / 2, H / 2 - 30);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 15);

            ctx.font = '16px monospace';
            ctx.fillText(`Length: ${this.snake.length}`, W / 2, H / 2 + 48);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 80);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const gridSizes = [15, 20, 25];
    const speeds = ['slow', 'medium', 'fast', 'insane'];
    const wallModes = ['die', 'wrap'];
    const powerUpOptions = [false, true];
    let seed = 1;

    for (const gridSize of gridSizes) {
        for (const speed of speeds) {
            for (const wallMode of wallModes) {
                for (const theme of themes) {
                    // Alternate power-ups based on seed to keep ~150
                    const powerUps = seed % 2 === 0;
                    variations.push({
                        name: generateGameName('Snake', seed),
                        category: 'Snake',
                        config: {
                            gridSize,
                            speed,
                            wallMode,
                            powerUps,
                            theme,
                            seed
                        },
                        thumbnail: generateThumbnail('Snake', { theme }, seed)
                    });
                    seed++;
                }
            }
        }
    }
    // 3 * 4 * 2 * 6 = 144
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Snake', SnakeGame, generateVariations);
