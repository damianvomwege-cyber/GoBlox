import { BaseGame } from '../base-game.js';
import { BaseGame3D, mulberry32 as mulberry32_3d } from '../base-game-3d.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';
import * as THREE from 'three';

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
    { name: 'Classic',   primary: '#4caf50', secondary: '#81c784', bg: '#1b2631', food: '#f44336', grid: '#263238', head3d: 0x4caf50, body3d: 0x81c784, food3d: 0xf44336, ground3d: 0x263238, skyTop: 0x4a6a5f, skyBottom: 0x1b2631, fog: 0x2b3641 },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', food: '#ff006e', grid: '#161650', head3d: 0x00ff87, body3d: 0x60efff, food3d: 0xff006e, ground3d: 0x161650, skyTop: 0x0a0a2e, skyBottom: 0x161650, fog: 0x0a0a2e },
    { name: 'Ocean',     primary: '#00b4d8', secondary: '#90e0ef', bg: '#03045e', food: '#ffbe0b', grid: '#0a0a5e', head3d: 0x00b4d8, body3d: 0x90e0ef, food3d: 0xffbe0b, ground3d: 0x0a0a5e, skyTop: 0x03045e, skyBottom: 0x0a0a5e, fog: 0x03045e },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', food: '#ff0000', grid: '#2a1a00', head3d: 0xff6b35, body3d: 0xffd700, food3d: 0xff0000, ground3d: 0x2a1a00, skyTop: 0x1a0a00, skyBottom: 0x3a1a00, fog: 0x1a0a00 },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', food: '#00ff7f', grid: '#3b0022', head3d: 0xff69b4, body3d: 0xffb6c1, food3d: 0x00ff7f, ground3d: 0x3b0022, skyTop: 0xff69b4, skyBottom: 0x2b0012, fog: 0x2b0012 },
    { name: 'Matrix',    primary: '#00ff00', secondary: '#33ff33', bg: '#000a00', food: '#ffffff', grid: '#001a00', head3d: 0x00ff00, body3d: 0x33ff33, food3d: 0xffffff, ground3d: 0x001a00, skyTop: 0x000a00, skyBottom: 0x001a00, fog: 0x000a00 },
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

// ══════════════════════════════════════════════════════════════════════════
// 3D SnakeGame — Tron Light Cycles style
// ══════════════════════════════════════════════════════════════════════════
class SnakeGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32_3d(cfg.seed || 1);
        this.gridSize = cfg.gridSize || 20;
        this.wallMode = cfg.wallMode || 'die';

        // Speed
        const speedMap = { slow: 4, medium: 6, fast: 9, insane: 14 };
        this.stepsPerSecond = speedMap[cfg.speed] || 6;
        this.moveTimer = 0;

        // Disable default player model and physics
        this.playerModel.visible = false;
        this.gravity = 0;
        this.moveSpeed = 0;

        // Cell size in 3D world
        this.cellSize = 1;
        this.arenaSize = this.gridSize * this.cellSize;
        this.arenaHalf = this.arenaSize / 2;

        // Direction state (on XZ plane)
        this.direction = { x: 1, z: 0 };
        this.nextDirection = { x: 1, z: 0 };

        // Snake body (array of {x, z} grid coords, head at [0])
        const midX = Math.floor(this.gridSize / 2);
        const midZ = Math.floor(this.gridSize / 2);
        this.snakeBody = [
            { x: midX, z: midZ },
            { x: midX - 1, z: midZ },
            { x: midX - 2, z: midZ },
        ];
        this.growing = 0;

        // Food
        this.food = null;
        this.foodMesh = null;

        // Build the world
        this.createSky(cfg.theme.skyTop || 0x0a0a2e, cfg.theme.skyBottom || 0x161650, cfg.theme.fog || 0x0a0a2e, 20, 80);
        this.buildArena();
        this.buildSnakeMeshes();
        this.spawnFood3D();

        // HUD
        this.createHUD();

        // Remove pointer lock message
        if (this.lockMsg) this.lockMsg.style.display = 'none';
    }

    buildArena() {
        const t = this.theme;
        // Ground plane
        const groundGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
        const groundMat = new THREE.MeshStandardMaterial({ color: t.ground3d || 0x161650, roughness: 0.9 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(this.arenaHalf - 0.5, 0, this.arenaHalf - 0.5);
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid lines
        const gridMat = new THREE.LineBasicMaterial({ color: t.head3d || 0x00ff87, transparent: true, opacity: 0.08 });
        for (let i = 0; i <= this.gridSize; i++) {
            const points1 = [new THREE.Vector3(i - 0.5, 0.01, -0.5), new THREE.Vector3(i - 0.5, 0.01, this.arenaSize - 0.5)];
            const geo1 = new THREE.BufferGeometry().setFromPoints(points1);
            this.scene.add(new THREE.Line(geo1, gridMat));

            const points2 = [new THREE.Vector3(-0.5, 0.01, i - 0.5), new THREE.Vector3(this.arenaSize - 0.5, 0.01, i - 0.5)];
            const geo2 = new THREE.BufferGeometry().setFromPoints(points2);
            this.scene.add(new THREE.Line(geo2, gridMat));
        }

        // Walls
        const wallH = 1;
        const wallMat = new THREE.MeshStandardMaterial({
            color: t.head3d || 0x00ff87,
            roughness: 0.4,
            metalness: 0.3,
            transparent: true,
            opacity: 0.4,
            emissive: t.head3d || 0x00ff87,
            emissiveIntensity: 0.2,
        });
        const wallThickness = 0.2;

        // North wall (z = -0.5)
        const wallNGeo = new THREE.BoxGeometry(this.arenaSize, wallH, wallThickness);
        const wallN = new THREE.Mesh(wallNGeo, wallMat);
        wallN.position.set(this.arenaHalf - 0.5, wallH / 2, -0.5 - wallThickness / 2);
        this.scene.add(wallN);

        // South wall (z = arenaSize - 0.5)
        const wallS = new THREE.Mesh(wallNGeo, wallMat);
        wallS.position.set(this.arenaHalf - 0.5, wallH / 2, this.arenaSize - 0.5 + wallThickness / 2);
        this.scene.add(wallS);

        // West wall (x = -0.5)
        const wallWGeo = new THREE.BoxGeometry(wallThickness, wallH, this.arenaSize);
        const wallW = new THREE.Mesh(wallWGeo, wallMat);
        wallW.position.set(-0.5 - wallThickness / 2, wallH / 2, this.arenaHalf - 0.5);
        this.scene.add(wallW);

        // East wall
        const wallE = new THREE.Mesh(wallWGeo, wallMat);
        wallE.position.set(this.arenaSize - 0.5 + wallThickness / 2, wallH / 2, this.arenaHalf - 0.5);
        this.scene.add(wallE);
    }

    buildSnakeMeshes() {
        const t = this.theme;
        // Use InstancedMesh for body segments (max ~400)
        this.maxSegments = this.gridSize * this.gridSize;
        const segGeo = new THREE.BoxGeometry(0.85, 0.5, 0.85);
        this.headMat = new THREE.MeshStandardMaterial({
            color: t.head3d || 0x00ff87,
            roughness: 0.3,
            metalness: 0.2,
            emissive: t.head3d || 0x00ff87,
            emissiveIntensity: 0.3,
        });
        this.bodyMat = new THREE.MeshStandardMaterial({
            color: t.body3d || 0x60efff,
            roughness: 0.4,
            metalness: 0.2,
            emissive: t.body3d || 0x60efff,
            emissiveIntensity: 0.15,
        });

        // Head mesh (separate for distinct color)
        const headGeo = new THREE.BoxGeometry(0.9, 0.55, 0.9);
        this.headMesh = new THREE.Mesh(headGeo, this.headMat);
        this.headMesh.castShadow = true;
        this.scene.add(this.headMesh);

        // Body instanced mesh
        this.bodyInstanced = new THREE.InstancedMesh(segGeo, this.bodyMat, this.maxSegments);
        this.bodyInstanced.castShadow = true;
        this.bodyInstanced.count = 0;
        this.scene.add(this.bodyInstanced);
    }

    spawnFood3D() {
        const t = this.theme;
        const occupied = new Set();
        for (const seg of this.snakeBody) {
            occupied.add(`${seg.x},${seg.z}`);
        }
        let fx, fz, tries = 0;
        do {
            fx = Math.floor(this.rng() * this.gridSize);
            fz = Math.floor(this.rng() * this.gridSize);
            tries++;
        } while (occupied.has(`${fx},${fz}`) && tries < 500);

        this.food = { x: fx, z: fz };

        // Remove old food mesh
        if (this.foodMesh) {
            this.scene.remove(this.foodMesh);
        }

        const foodGeo = new THREE.SphereGeometry(0.35, 12, 12);
        const foodMat = new THREE.MeshStandardMaterial({
            color: t.food3d || 0xff006e,
            roughness: 0.2,
            metalness: 0.3,
            emissive: t.food3d || 0xff006e,
            emissiveIntensity: 0.5,
        });
        this.foodMesh = new THREE.Mesh(foodGeo, foodMat);
        this.foodMesh.position.set(fx * this.cellSize, 0.4, fz * this.cellSize);
        this.foodMesh.castShadow = true;
        this.scene.add(this.foodMesh);
    }

    updateSnakeMeshes() {
        // Head
        const head = this.snakeBody[0];
        this.headMesh.position.set(head.x * this.cellSize, 0.3, head.z * this.cellSize);

        // Body
        const dummy = new THREE.Object3D();
        const bodyCount = this.snakeBody.length - 1;
        this.bodyInstanced.count = bodyCount;

        for (let i = 1; i < this.snakeBody.length; i++) {
            const seg = this.snakeBody[i];
            dummy.position.set(seg.x * this.cellSize, 0.25, seg.z * this.cellSize);
            // Slight scale decrease toward tail
            const scale = 1 - (i / this.snakeBody.length) * 0.3;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            this.bodyInstanced.setMatrixAt(i - 1, dummy.matrix);
        }
        if (bodyCount > 0) {
            this.bodyInstanced.instanceMatrix.needsUpdate = true;
        }
    }

    onKeyDown(code) {
        if (this.gameOver) return;
        const d = this.direction;
        switch (code) {
            case 'ArrowUp': case 'KeyW':
                if (d.z !== 1) this.nextDirection = { x: 0, z: -1 }; break;
            case 'ArrowDown': case 'KeyS':
                if (d.z !== -1) this.nextDirection = { x: 0, z: 1 }; break;
            case 'ArrowLeft': case 'KeyA':
                if (d.x !== 1) this.nextDirection = { x: -1, z: 0 }; break;
            case 'ArrowRight': case 'KeyD':
                if (d.x !== -1) this.nextDirection = { x: 1, z: 0 }; break;
        }
    }

    updatePlayer(dt) {
        // No default player physics
    }

    updateCamera(dt) {
        // Overhead view at angle following snake head
        const head = this.snakeBody[0];
        const headX = head.x * this.cellSize;
        const headZ = head.z * this.cellSize;

        const camHeight = this.arenaSize * 0.6 + 5;
        const camOffset = this.arenaSize * 0.3;
        const targetPos = new THREE.Vector3(headX, camHeight, headZ + camOffset);

        const t = 1 - Math.exp(-4 * dt);
        this.camera.position.lerp(targetPos, t);
        this.camera.lookAt(headX, 0, headZ);

        if (this.sunLight) {
            this.sunLight.position.set(headX + 20, 40, headZ + 20);
            this.sunLight.target.position.set(headX, 0, headZ);
        }
    }

    update(dt) {
        if (this.gameOver) return;

        // Animate food bobbing
        if (this.foodMesh) {
            this.foodMesh.position.y = 0.4 + Math.sin(this.clock.elapsedTime * 3) * 0.15;
            this.foodMesh.rotation.y += dt * 2;
        }

        // Movement timer
        this.moveTimer += dt;
        const stepInterval = 1 / this.stepsPerSecond;
        if (this.moveTimer < stepInterval) {
            this.updateSnakeMeshes();
            return;
        }
        this.moveTimer -= stepInterval;

        // Commit direction
        this.direction = this.nextDirection;

        // Calculate new head
        const head = this.snakeBody[0];
        let nx = head.x + this.direction.x;
        let nz = head.z + this.direction.z;

        // Wall handling
        if (this.wallMode === 'wrap') {
            nx = ((nx % this.gridSize) + this.gridSize) % this.gridSize;
            nz = ((nz % this.gridSize) + this.gridSize) % this.gridSize;
        } else {
            if (nx < 0 || nx >= this.gridSize || nz < 0 || nz >= this.gridSize) {
                this.endGame();
                return;
            }
        }

        // Self collision
        const checkLength = this.growing > 0 ? this.snakeBody.length : this.snakeBody.length - 1;
        for (let i = 0; i < checkLength; i++) {
            if (this.snakeBody[i].x === nx && this.snakeBody[i].z === nz) {
                this.endGame();
                return;
            }
        }

        // Move
        this.snakeBody.unshift({ x: nx, z: nz });
        if (this.growing > 0) {
            this.growing--;
        } else {
            this.snakeBody.pop();
        }

        // Check food
        if (this.food && nx === this.food.x && nz === this.food.z) {
            this.score += 10;
            this.growing += 1;
            this.spawnFood3D();
        }

        this.updateSnakeMeshes();
        this.updateHUDScore(this.score);

        if (this.hudInfoEl) {
            this.hudInfoEl.textContent = `Length: ${this.snakeBody.length}`;
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
                    const powerUps = seed % 2 === 0;
                    const is3D = seed % 2 === 0;
                    const name = generateGameName('Snake', seed);
                    variations.push({
                        name: name + (is3D ? ' 3D' : ''),
                        category: 'Snake',
                        is3D,
                        config: {
                            gridSize,
                            speed,
                            wallMode,
                            powerUps,
                            theme,
                            seed,
                            name: name + (is3D ? ' 3D' : ''),
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
GameRegistry.registerTemplate3D('Snake', SnakeGame, SnakeGame3D, generateVariations);
