import { BaseGame } from '../base-game.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';
import { drawCharacter } from '../character.js';

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
    { name: 'Dungeon',  primary: '#fdcb6e', secondary: '#f39c12', bg: '#1a1a2e', wall: '#2d3436', path: '#0a0a1e', player: '#00b894', exit: '#e74c3c', fog: '#0a0a1e', text: '#dfe6e9' },
    { name: 'Neon',     primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', wall: '#6c5ce7', path: '#161650', player: '#00ff87', exit: '#ff006e', fog: '#0a0a2e', text: '#ffffff' },
    { name: 'Ice',      primary: '#74b9ff', secondary: '#dfe6e9', bg: '#0c1021', wall: '#b2bec3', path: '#1c2031', player: '#00cec9', exit: '#ff6b6b', fog: '#0c1021', text: '#dfe6e9' },
    { name: 'Forest',   primary: '#00b894', secondary: '#55efc4', bg: '#0a2e0a', wall: '#2d6a2d', path: '#0a1a0a', player: '#feca57', exit: '#e74c3c', fog: '#0a2e0a', text: '#dfe6e9' },
    { name: 'Lava',     primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0500', wall: '#4a1500', path: '#0a0200', player: '#00b4d8', exit: '#ffd700', fog: '#1a0500', text: '#ffffff' },
    { name: 'Ocean',    primary: '#00b4d8', secondary: '#90e0ef', bg: '#03045e', wall: '#023e8a', path: '#010225', player: '#feca57', exit: '#ff6b6b', fog: '#03045e', text: '#caf0f8' },
    { name: 'Royal',    primary: '#6c5ce7', secondary: '#a29bfe', bg: '#1a0a2e', wall: '#4a3480', path: '#100520', player: '#fdcb6e', exit: '#e74c3c', fog: '#1a0a2e', text: '#dfe6e9' },
    { name: 'Sunset',   primary: '#e84393', secondary: '#fd79a8', bg: '#2d1b0e', wall: '#6d3b1e', path: '#1d0b00', player: '#55efc4', exit: '#feca57', fog: '#2d1b0e', text: '#ffffff' },
];

// ── Wall bits (bitmask) ─────────────────────────────────────────────────
const N = 1, S = 2, E = 4, W = 8;
const DX = { [N]: 0, [S]: 0, [E]: 1, [W]: -1 };
const DY = { [N]: -1, [S]: 1, [E]: 0, [W]: 0 };
const OPPOSITE = { [N]: S, [S]: N, [E]: W, [W]: E };

// ── Maze Generation (Recursive Backtracker, seeded) ─────────────────────
function generateMaze(width, height, rng) {
    // Each cell stores a bitmask of which walls have been removed (passages)
    const grid = [];
    for (let y = 0; y < height; y++) {
        grid[y] = [];
        for (let x = 0; x < width; x++) {
            grid[y][x] = 0;
        }
    }

    const stack = [];
    const visited = [];
    for (let y = 0; y < height; y++) {
        visited[y] = [];
        for (let x = 0; x < width; x++) {
            visited[y][x] = false;
        }
    }

    // Start at top-left
    let cx = 0, cy = 0;
    visited[cy][cx] = true;
    stack.push({ x: cx, y: cy });

    while (stack.length > 0) {
        const { x, y } = stack[stack.length - 1];

        // Find unvisited neighbors
        const dirs = [];
        for (const dir of [N, S, E, W]) {
            const nx = x + DX[dir];
            const ny = y + DY[dir];
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny][nx]) {
                dirs.push(dir);
            }
        }

        if (dirs.length === 0) {
            // Backtrack
            stack.pop();
        } else {
            // Pick random direction
            const dir = dirs[Math.floor(rng() * dirs.length)];
            const nx = x + DX[dir];
            const ny = y + DY[dir];

            // Remove wall between current and neighbor
            grid[y][x] |= dir;
            grid[ny][nx] |= OPPOSITE[dir];

            visited[ny][nx] = true;
            stack.push({ x: nx, y: ny });
        }
    }

    return grid;
}

// ── MazeGame ────────────────────────────────────────────────────────────
class MazeGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);
        this.mazeW = cfg.size;
        this.mazeH = cfg.size;
        this.visibility = cfg.visibility; // 'full' or 'fog'
        this.timeLimit = cfg.timeLimit;
        this.timeLeft = this.timeLimit;
        this.elapsed = 0;

        // Generate maze
        this.grid = generateMaze(this.mazeW, this.mazeH, this.rng);

        // Canvas layout
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        this.cellSize = Math.floor(Math.min((canvasW - 30) / this.mazeW, (canvasH - 60) / this.mazeH));
        this.offsetX = Math.floor((canvasW - this.cellSize * this.mazeW) / 2);
        this.offsetY = Math.floor((canvasH - this.cellSize * this.mazeH) / 2) + 15;

        // Fog of war visibility radius in cells
        this.fogRadius = this.visibility === 'fog' ? 2.5 : 999;

        // Player position (grid coords)
        this.playerX = 0;
        this.playerY = 0;
        this.playerDirection = 'right';

        // Exit position
        this.exitX = this.mazeW - 1;
        this.exitY = this.mazeH - 1;

        // Movement cooldown to prevent too-fast key repeat
        this.moveCooldown = 0;

        // Trail (visited cells)
        this.visited = new Set();
        this.visited.add('0,0');

        // Win state
        this.won = false;

        // Particles
        this.particles = [];

        // Exit pulse animation
        this.exitPulse = 0;
    }

    canMove(x, y, dir) {
        return (this.grid[y][x] & dir) !== 0;
    }

    movePlayer(dx, dy) {
        if (this.won || this.gameOver) return;

        let dir;
        if (dx === 1) dir = E;
        else if (dx === -1) dir = W;
        else if (dy === -1) dir = N;
        else if (dy === 1) dir = S;
        else return;

        if (this.canMove(this.playerX, this.playerY, dir)) {
            this.playerX += dx;
            this.playerY += dy;
            this.visited.add(`${this.playerX},${this.playerY}`);

            // Track direction for character facing
            if (dx === 1) this.playerDirection = 'right';
            else if (dx === -1) this.playerDirection = 'left';
            else if (dy === 1) this.playerDirection = 'down';
            else if (dy === -1) this.playerDirection = 'up';

            // Check win
            if (this.playerX === this.exitX && this.playerY === this.exitY) {
                this.won = true;
                this.score = Math.max(1, Math.floor(this.timeLimit > 0 ? this.timeLeft : 1000 - this.elapsed));

                // Win particles
                const cx = this.offsetX + this.exitX * this.cellSize + this.cellSize / 2;
                const cy = this.offsetY + this.exitY * this.cellSize + this.cellSize / 2;
                for (let i = 0; i < 15; i++) {
                    this.particles.push({
                        x: cx, y: cy,
                        vx: (Math.random() - 0.5) * 250,
                        vy: -50 - Math.random() * 200,
                        life: 1.0, maxLife: 1.0,
                        color: this.theme.exit,
                    });
                }

                this.endGame();
            }
        }
    }

    update(dt) {
        // Timer
        this.elapsed += dt;
        if (this.timeLimit > 0 && !this.won) {
            this.timeLeft = this.timeLimit - this.elapsed;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.score = 0;
                this.endGame();
                return;
            }
        }

        // Movement cooldown
        if (this.moveCooldown > 0) {
            this.moveCooldown -= dt;
        }

        // Handle held keys for continuous movement
        if (this.moveCooldown <= 0) {
            let moved = false;
            if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
                this.movePlayer(0, -1); moved = true;
            } else if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
                this.movePlayer(0, 1); moved = true;
            } else if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
                this.movePlayer(-1, 0); moved = true;
            } else if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
                this.movePlayer(1, 0); moved = true;
            }
            if (moved) {
                this.moveCooldown = 0.12; // limit to ~8 moves/sec for smooth feel
            }
        }

        // Exit pulse
        this.exitPulse += dt * 3;

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 150 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    onKeyDown(key) {
        // Handled in update via this.keys for continuous movement
    }

    render() {
        const ctx = this.ctx;
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        const t = this.theme;
        const cs = this.cellSize;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Draw maze
        for (let y = 0; y < this.mazeH; y++) {
            for (let x = 0; x < this.mazeW; x++) {
                const cx = this.offsetX + x * cs;
                const cy = this.offsetY + y * cs;
                const cell = this.grid[y][x];

                // Fog of war check
                const dist = Math.sqrt(
                    (x - this.playerX) ** 2 + (y - this.playerY) ** 2
                );
                if (dist > this.fogRadius + 0.5) {
                    // Hidden — draw fog
                    ctx.fillStyle = t.fog;
                    ctx.fillRect(cx, cy, cs, cs);
                    continue;
                }

                const fogAlpha = dist > this.fogRadius - 0.5
                    ? 1 - (this.fogRadius + 0.5 - dist)
                    : 0;

                // Path
                const isVisited = this.visited.has(`${x},${y}`);
                ctx.fillStyle = isVisited ? t.path + 'cc' : t.path;
                ctx.fillRect(cx, cy, cs, cs);

                // Visited trail subtle highlight
                if (isVisited) {
                    ctx.fillStyle = t.player + '15';
                    ctx.fillRect(cx, cy, cs, cs);
                }

                // Walls
                ctx.strokeStyle = t.wall;
                ctx.lineWidth = 2;

                // Top wall
                if (!(cell & N)) {
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + cs, cy);
                    ctx.stroke();
                }
                // Bottom wall
                if (!(cell & S)) {
                    ctx.beginPath();
                    ctx.moveTo(cx, cy + cs);
                    ctx.lineTo(cx + cs, cy + cs);
                    ctx.stroke();
                }
                // Left wall
                if (!(cell & W)) {
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx, cy + cs);
                    ctx.stroke();
                }
                // Right wall
                if (!(cell & E)) {
                    ctx.beginPath();
                    ctx.moveTo(cx + cs, cy);
                    ctx.lineTo(cx + cs, cy + cs);
                    ctx.stroke();
                }

                // Apply fog fade
                if (fogAlpha > 0) {
                    ctx.fillStyle = t.fog;
                    ctx.globalAlpha = fogAlpha;
                    ctx.fillRect(cx, cy, cs, cs);
                    ctx.globalAlpha = 1;
                }
            }
        }

        // Outer border
        ctx.strokeStyle = t.primary + '80';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.offsetX, this.offsetY, this.mazeW * cs, this.mazeH * cs);

        // Exit marker (pulsing star)
        const exitDist = Math.sqrt(
            (this.exitX - this.playerX) ** 2 + (this.exitY - this.playerY) ** 2
        );
        if (exitDist <= this.fogRadius + 0.5) {
            const ex = this.offsetX + this.exitX * cs + cs / 2;
            const ey = this.offsetY + this.exitY * cs + cs / 2;
            const pulse = 0.7 + Math.sin(this.exitPulse) * 0.3;

            // Glow
            ctx.fillStyle = t.exit + '30';
            ctx.beginPath();
            ctx.arc(ex, ey, cs * 0.5 * pulse, 0, Math.PI * 2);
            ctx.fill();

            // Star shape
            ctx.fillStyle = t.exit;
            ctx.beginPath();
            const r = cs * 0.3 * pulse;
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                const method = i === 0 ? 'moveTo' : 'lineTo';
                ctx[method](ex + Math.cos(angle) * r, ey + Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Player
        const px = this.offsetX + this.playerX * cs + cs / 2;
        const py = this.offsetY + this.playerY * cs + cs / 2;

        // Character with torch
        const charSize = cs * 0.85;
        drawCharacter(ctx, px, py, charSize, this.playerDirection, 'torch', this.elapsed * 3);

        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = t.text;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        if (this.timeLimit > 0) {
            ctx.fillStyle = this.timeLeft < 10 ? '#ff6b6b' : t.text;
            ctx.fillText(`Time: ${Math.ceil(this.timeLeft)}s`, 12, 8);
        } else {
            ctx.fillStyle = t.text + '99';
            ctx.font = '14px monospace';
            ctx.fillText(`Time: ${Math.floor(this.elapsed)}s`, 12, 10);
        }

        // Fog indicator
        if (this.visibility === 'fog') {
            ctx.fillStyle = t.primary + 'aa';
            ctx.font = '12px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('FOG', canvasW - 12, 10);
        }

        // Maze size
        ctx.fillStyle = t.text + '60';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${this.mazeW}x${this.mazeH}`, canvasW - 12, 24);

        // Instructions
        if (this.elapsed < 3) {
            ctx.fillStyle = t.text + 'bb';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Arrow keys / WASD to move', canvasW / 2, canvasH - 10);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvasW, canvasH);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (this.won) {
                ctx.fillStyle = t.exit;
                ctx.font = 'bold 40px monospace';
                ctx.fillText('ESCAPE!', canvasW / 2, canvasH / 2 - 40);

                ctx.fillStyle = t.secondary;
                ctx.font = 'bold 22px monospace';
                ctx.fillText(`Time: ${Math.floor(this.elapsed)}s`, canvasW / 2, canvasH / 2 + 5);

                ctx.font = '18px monospace';
                ctx.fillText(`Score: ${this.score}`, canvasW / 2, canvasH / 2 + 35);
            } else {
                ctx.fillStyle = '#ff6b6b';
                ctx.font = 'bold 40px monospace';
                ctx.fillText('TIME UP!', canvasW / 2, canvasH / 2 - 30);

                ctx.fillStyle = t.text + 'cc';
                ctx.font = '18px monospace';
                ctx.fillText('Could not escape in time', canvasW / 2, canvasH / 2 + 10);
            }

            ctx.fillStyle = t.text + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', canvasW / 2, canvasH / 2 + 70);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const sizes = [10, 15, 20];
    const visibilities = ['full', 'fog'];
    const timeLimits = [30, 60, 120];
    let seed = 1;

    for (const size of sizes) {
        for (const visibility of visibilities) {
            for (const timeLimit of timeLimits) {
                for (const theme of themes) {
                    variations.push({
                        name: generateGameName('Maze', seed),
                        category: 'Maze',
                        config: {
                            size,
                            visibility,
                            timeLimit,
                            theme,
                            seed,
                        },
                        thumbnail: generateThumbnail('Maze', { theme }, seed),
                    });
                    seed++;
                }
            }
        }
    }
    // 3 * 2 * 3 * 8 = 144 — add extra with 0 time limit (untimed)
    for (const size of sizes) {
        for (const visibility of visibilities) {
            for (const theme of themes) {
                variations.push({
                    name: generateGameName('Maze', seed),
                    category: 'Maze',
                    config: {
                        size,
                        visibility,
                        timeLimit: 0,
                        theme,
                        seed,
                    },
                    thumbnail: generateThumbnail('Maze', { theme }, seed),
                });
                seed++;
            }
        }
    }
    // 144 + 48 = 192
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Maze', MazeGame, generateVariations);
